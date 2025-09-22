export function httpRequest({ url, method = 'GET', data = '' }) {
  return new Promise((resolve, reject) => {
    const requestId = Date.now() + Math.random().toString(36).substr(2, 9);

    function handleMessage(event) {
      try {
        const msg = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (msg.type === 'httpResponse' && msg.requestId === requestId) {
          window.chrome.webview.removeEventListener('message', handleMessage);
          // 自动解析 result 为 JSON
          let result = msg.result;
          try {
            result = typeof result === 'string' ? JSON.parse(result) : result;
          } catch {
            // 如果不是 JSON 字符串则原样返回
          }
          resolve(result);
        }
      } catch (err) {
        window.chrome.webview.removeEventListener('message', handleMessage);
        reject(err);
      }
    }

    window.chrome.webview.addEventListener('message', handleMessage);

    window.chrome.webview.postMessage(
      JSON.stringify({
        type: 'httpRequest',
        url,
        method,
        data,
        requestId
      })
    );
  });
}