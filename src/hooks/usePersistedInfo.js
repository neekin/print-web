import { useState, useCallback } from 'react'

function readStoreInfo() {
  try {
    const text = localStorage.getItem('info')
    return text ? JSON.parse(text) : {}
  } catch {
    return {}
  }
}

export function usePersistedInfo() {
  const stored = readStoreInfo()
  const [formData, setFormData] = useState({
    storeAddress: stored.storeAddress || '',
    machineCode: stored.machineCode || '',
    drawNumber: stored.drawNumber || '',
    salePeriod: stored.salePeriod || '',
    copywriting: stored.copywriting || '',
    activity: stored.activity || false,
    saleTime: stored.saleTime || ''
  })

  const persist = useCallback((key, value) => {
    try {
      const current = readStoreInfo()
      localStorage.setItem('info', JSON.stringify({ ...current, [key]: value }))
    } catch {}
  }, [])

  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    persist(field, value)
  }, [persist])

  return { formData, setFormData, handleInputChange }
}