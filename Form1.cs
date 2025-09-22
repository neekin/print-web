// C#7 兼容重写：
// 1. 去掉 C#8 的 using var / range(..) 写法；使用传统 using 与 Substring。
// 2. 移除重复的 CoreWebView2_WebMessageReceived / GetCurrentPrinterDpi 定义。
// 3. 打印函数保持 1:1 点阵，支持超长分页；无需动态 LINQ / 现代语法。
// 4. 若 .NET Framework 旧版本需安装 System.ValueTuple，可把 (int,int) 改为自定义 struct；这里沿用 C#7 ValueTuple。

using Microsoft.Web.WebView2.Core;
// 【新增】引入 WebView2 相关的命名空间
using Microsoft.Web.WebView2.WinForms;
using Microsoft.Win32;
using Newtonsoft.Json;
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Drawing.Printing;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace print_client
{
    public partial class Form1 : Form
    {
        // 【新增】一个隐藏的 WebView2 控件，专门用于执行打印任务
        private WebView2 printWebView;

        // 打印机及点阵规格 (与前端 receiptTemplate.js 同步)
        private const int PRINTER_DPI_DEFAULT = 203;          // 203 DPI
        private const float PAPER_WIDTH_MM = 80f;             // 纸物理宽

        public Form1()
        {
            InitializeComponent();
            // 【新增】初始化用于打印的 WebView
            InitializePrintWebView();
            this.webView.CoreWebView2InitializationCompleted += WebView_CoreWebView2InitializationCompleted;

            foreach (string printer in PrinterSettings.InstalledPrinters)
                printComboBox.Items.Add(printer);
            if (printComboBox.Items.Count > 0)
                printComboBox.SelectedIndex = 0;
        }

        // 【新增】初始化隐藏的 WebView2 控件的方法
        private async void InitializePrintWebView()
        {
            printWebView = new WebView2();
            printWebView.Visible = false;
            // 必须将其添加到窗体控件集合中，它才能完成初始化
            this.Controls.Add(printWebView);
            await printWebView.EnsureCoreWebView2Async(null);
        }

        private async void WebView_CoreWebView2InitializationCompleted(object sender, Microsoft.Web.WebView2.Core.CoreWebView2InitializationCompletedEventArgs e)
        {
            string clientKey = "YOUR_SECRET_KEY";
            string machineCode = GetMachineCode();
            string script = "window.__clientKey='" + clientKey + "';window.__machineCode='" + machineCode + "';";
            await webView.ExecuteScriptAsync(script);
            if (e.IsSuccess)
                webView.CoreWebView2.WebMessageReceived += CoreWebView2_WebMessageReceived;
        }

        private async void CoreWebView2_WebMessageReceived(object sender, Microsoft.Web.WebView2.Core.CoreWebView2WebMessageReceivedEventArgs e)
        {
            string message = e.TryGetWebMessageAsString();
            if (string.IsNullOrWhiteSpace(message)) return;

            if (message.StartsWith("{") && message.EndsWith("}"))
            {
                dynamic req;
                try { req = JsonConvert.DeserializeObject(message); } catch { return; }
                string type = req.type;
                switch (type)
                {
                    case "httpRequest":
                        {
                            string url = req.url;
                            string method = req.method;
                            string data = req.data;
                            string requestId = req.requestId;
                            string result = await HttpRequestAsync(url, method, data);
                            PostJson(new { type = "httpResponse", requestId, result });
                            break;
                        }
                    // 【核心修改】新增 printHtml 消息处理，替换旧的 showImage
                    case "printHtml":
                        {
                            try
                            {
                                string htmlContent = req.html;
                                // 调用新的 HTML 打印方法
                                await PrintHtmlAsync(htmlContent);
                                PostJson(new { type = "printResult", ok = true });
                            }
                            catch (Exception ex)
                            {
                                PostJson(new { type = "printResult", ok = false, error = ex.Message });
                                MessageBox.Show("HTML 打印失败: " + ex.Message);
                            }
                            break;
                        }
                    default:
                        break;
                }
            }
            else
            {
                if (message == "buttonClicked")
                {
                    string machineCode = GetMachineCode();
                    PostJson(new { type = "greeting", text = "你好，React！", machineCode });
                }
            }
        }

        // 【新增】直接打印 HTML 的核心方法
        private async Task PrintHtmlAsync(string htmlContent)
        {
            // 【新增用于调试】创建一个新窗口来预览 HTML 内容
            using (var previewForm = new Form())
            {
                previewForm.Text = "HTML 打印预览";
                previewForm.Width = 600; // 预览窗口宽度
                previewForm.Height = 800; // 预览窗口高度
                previewForm.StartPosition = FormStartPosition.CenterParent;

                var previewWebView = new WebView2();
                previewWebView.Dock = DockStyle.Fill;
                previewForm.Controls.Add(previewWebView);

                // 等待预览窗口中的 WebView2 初始化
                await previewWebView.EnsureCoreWebView2Async(null);
                // 加载 HTML 内容
                previewWebView.CoreWebView2.NavigateToString(htmlContent);

                // 以模态对话框形式显示预览窗口
                previewForm.ShowDialog();
            }


            if (printWebView == null || printWebView.CoreWebView2 == null)
            {
                throw new InvalidOperationException("用于打印的 WebView 未初始化。");
            }

            // 创建一个任务完成源，以便在页面加载完成后继续执行
            var navigationCompleted = new TaskCompletionSource<bool>();
            // 使用 EventHandler 确保事件只被处理一次
            EventHandler<CoreWebView2NavigationCompletedEventArgs> navigationHandler = null;
            navigationHandler = (s, e) => {
                // 注销事件，避免重复触发
                printWebView.CoreWebView2.NavigationCompleted -= navigationHandler;
                if (e.IsSuccess)
                {
                    navigationCompleted.TrySetResult(true);
                }
                else
                {
                    navigationCompleted.TrySetException(new Exception("导航到HTML内容失败: " + e.WebErrorStatus));
                }
            };
            printWebView.CoreWebView2.NavigationCompleted += navigationHandler;

            // 将 HTML 字符串加载到隐藏的 WebView 中
            printWebView.CoreWebView2.NavigateToString(htmlContent);

            // 等待页面完全加载
            await navigationCompleted.Task;

            // 【关键修复】增加一个短暂延时，确保页面完全渲染
            await Task.Delay(100); // 等待 100 毫秒

            // 获取打印机名称
            string printerName = (printComboBox != null && printComboBox.SelectedItem != null)
                ? printComboBox.SelectedItem.ToString()
                : new PrinterSettings().PrinterName; // 默认打印机

            // 创建打印设置
            var printSettings = printWebView.CoreWebView2.Environment.CreatePrintSettings();
            printSettings.ShouldPrintBackgrounds = true;
            // 注意：WebView2 的 API 无法直接在代码中设置打印机名称以实现完全静默打印。
            // 调用 window.print() 会弹出系统打印对话框，并默认选中系统的默认打印机。
            // 要实现静默打印，需要用户在打印对话框中将目标打印机设置为默认，并勾选相应选项，或使用更底层的打印库。

            // 执行 JavaScript 的 window.print() 命令，这将触发打印对话框
            await printWebView.CoreWebView2.PrintAsync(printSettings);
        }

        private void PostJson(object obj)
        {
            try
            {
                webView.CoreWebView2.PostWebMessageAsJson(JsonConvert.SerializeObject(obj));
            }
            catch { }
        }

        private async Task<string> HttpRequestAsync(string url, string method, string data)
        {
            using (var httpClient = new HttpClient())
            {
                var request = new HttpRequestMessage(new HttpMethod(method ?? "GET"), url);
                if (!string.IsNullOrEmpty(data))
                    request.Content = new StringContent(data, Encoding.UTF8, "application/json");
                var resp = await httpClient.SendAsync(request);
                return await resp.Content.ReadAsStringAsync();
            }
        }

        private string GetMachineCode()
        {
            try
            {
                RegistryView view = Environment.Is64BitOperatingSystem ? RegistryView.Registry64 : RegistryView.Registry32;
                using (var key = RegistryKey.OpenBaseKey(RegistryHive.LocalMachine, view).OpenSubKey(@"SOFTWARE\Microsoft\Cryptography"))
                {
                    if (key != null)
                    {
                        object guid = key.GetValue("MachineGuid");
                        if (guid != null)
                        {
                            using (var sha256 = SHA256.Create())
                            {
                                byte[] hash = sha256.ComputeHash(Encoding.UTF8.GetBytes(guid.ToString()));
                                var sb = new StringBuilder();
                                foreach (byte b in hash) sb.Append(b.ToString("x2"));
                                return sb.ToString();
                            }
                        }
                    }
                }
            }
            catch { }
            return Guid.NewGuid().ToString("N");
        }

        // 【保留】此方法仍可用于获取打印机信息，无需修改
        private Tuple<int, int> GetCurrentPrinterDpi(string printerName)
        {
            try
            {
                using (var pd = new PrintDocument())
                {
                    if (!string.IsNullOrEmpty(printerName))
                        pd.PrinterSettings.PrinterName = printerName;

                    int dx = PRINTER_DPI_DEFAULT, dy = PRINTER_DPI_DEFAULT;
                    foreach (PrinterResolution r in pd.PrinterSettings.PrinterResolutions)
                    {
                        if (r.Kind != PrinterResolutionKind.Custom && r.X > dx && r.Y > dy)
                        {
                            dx = r.X; dy = r.Y;
                        }
                    }
                    return Tuple.Create(dx, dy);
                }
            }
            catch
            {
                return Tuple.Create(PRINTER_DPI_DEFAULT, PRINTER_DPI_DEFAULT);
            }
        }



        private void ShowImageFromBase64(string base64)
        {
            try
            {
                int comma = base64.IndexOf(',');
                if (comma >= 0) base64 = base64.Substring(comma + 1);
                byte[] imageBytes = Convert.FromBase64String(base64);
                using (var ms = new System.IO.MemoryStream(imageBytes))
                {
                    Image img = Image.FromStream(ms);
                    var f = new Form();
                    f.Text = "图片预览";
                    f.Width = img.Width + 40;
                    f.Height = img.Height + 60;
                    var pb = new PictureBox();
                    pb.Image = img;
                    pb.Dock = DockStyle.Fill;
                    pb.SizeMode = PictureBoxSizeMode.Zoom;
                    f.FormClosed += delegate { img.Dispose(); };
                    f.Controls.Add(pb);
                    f.Show();
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("图片显示失败: " + ex.Message);
            }
        }


    }
}