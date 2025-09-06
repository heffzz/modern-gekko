import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  Indicator,
  ConfiguredIndicator,
  IndicatorPreset,
  IndicatorCalculationRequest,
  IndicatorCalculationResponse,
  AnyIndicatorResult,
  IndicatorColorScheme
} from '@/types/indicators'
import { useNotificationStore } from './notifications'

// Default color schemes for indicators
const DEFAULT_COLOR_SCHEMES: IndicatorColorScheme[] = [
  {
    id: 'default',
    name: 'Default',
    colors: ['#2563eb', '#dc2626', '#16a34a', '#ca8a04', '#9333ea', '#c2410c', '#0891b2', '#be123c']
  },
  {
    id: 'warm',
    name: 'Warm',
    colors: ['#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#0891b2', '#2563eb', '#9333ea', '#be123c']
  },
  {
    id: 'cool',
    name: 'Cool',
    colors: ['#2563eb', '#0891b2', '#16a34a', '#9333ea', '#6366f1', '#0d9488', '#059669', '#7c3aed']
  },
  {
    id: 'monochrome',
    name: 'Monochrome',
    colors: ['#374151', '#6b7280', '#9ca3af', '#d1d5db', '#111827', '#1f2937', '#4b5563', '#f9fafb']
  }
]

export const useIndicatorsStore = defineStore('indicators', () => {
  // State
  const availableIndicators = ref<Indicator[]>([])
  const configuredIndicators = ref<ConfiguredIndicator[]>([])
  const presets = ref<IndicatorPreset[]>([])
  const colorSchemes = ref<IndicatorColorScheme[]>([...DEFAULT_COLOR_SCHEMES])
  const selectedColorScheme = ref<string>('Default')
  const isLoading = ref(false)
  const isCalculating = ref(false)
  const error = ref<string | null>(null)
  const lastUpdate = ref<number | null>(null)
  const calculationCache = ref<Map<string, AnyIndicatorResult>>(new Map())
  
  // Current color index for auto-assigning colors
  const currentColorIndex = ref(0)
  
  // Computed
  const currentColorScheme = computed(() => {
    return colorSchemes.value.find(scheme => scheme.name === selectedColorScheme.value) ||
           colorSchemes.value[0]
  })
  
  const visibleIndicators = computed(() => {
    return configuredIndicators.value.filter(indicator => indicator.visible)
  })
  
  const indicatorsByCategory = computed(() => {
    const grouped: Record<string, Indicator[]> = {}
    availableIndicators.value.forEach(indicator => {
      if (!grouped[indicator.category]) {
        grouped[indicator.category] = []
      }
      grouped[indicator.category].push(indicator)
    })
    return grouped
  })
  
  const hasConfiguredIndicators = computed(() => {
    return configuredIndicators.value.length > 0
  })
  
  // Actions
  const loadAvailableIndicators = async () => {
    try {
      isLoading.value = true
      error.value = null
      
      const response = await fetch('http://localhost:3000/api/indicators')
      if (!response.ok) {
        throw new Error(`Failed to load indicators: ${response.statusText}`)
      }
      
      const data = await response.json()
      availableIndicators.value = data.data || []
      lastUpdate.value = Date.now()
      
    } catch (err) {
      console.error('Load indicators error:', err)
      error.value = err instanceof Error ? err.message : 'Unknown error'
      
      // Fallback to default indicators if API fails
      availableIndicators.value = getDefaultIndicators()
      
    } finally {
      isLoading.value = false
    }
  }
  
  const addIndicator = (indicator: Omit<ConfiguredIndicator, 'id' | 'color'>) => {
    const id = `${indicator.indicatorId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const color = getNextColor()
    
    const configuredIndicator: ConfiguredIndicator = {
      ...indicator,
      id,
      color,
      visible: true,
      lineWidth: 2,
      opacity: 1,
      style: 'solid'
    }
    
    configuredIndicators.value.push(configuredIndicator)
    
    // Clear cache for this indicator
    clearIndicatorCache(indicator.indicatorId)
    
    return configuredIndicator
  }
  
  const removeIndicator = (id: string) => {
    const index = configuredIndicators.value.findIndex(indicator => indicator.id === id)
    if (index !== -1) {
      const indicator = configuredIndicators.value[index]
      configuredIndicators.value.splice(index, 1)
      
      // Clear cache for this indicator
      clearIndicatorCache(indicator.name)
    }
  }
  
  const updateIndicator = (id: string, updates: Partial<ConfiguredIndicator>) => {
    const index = configuredIndicators.value.findIndex(indicator => indicator.id === id)
    if (index !== -1) {
      const indicator = configuredIndicators.value[index]
      configuredIndicators.value[index] = { ...indicator, ...updates }
      
      // Clear cache if parameters changed
      if (updates.parameters) {
        clearIndicatorCache(indicator.name)
      }
    }
  }
  
  const updateIndicatorParameters = (id: string, parameters: Record<string, any>) => {
    const index = configuredIndicators.value.findIndex(indicator => indicator.id === id)
    if (index !== -1) {
      const indicator = configuredIndicators.value[index]
      configuredIndicators.value[index] = { 
        ...indicator, 
        parameters: { ...indicator.parameters, ...parameters }
      }
      
      // Clear cache since parameters changed
      clearIndicatorCache(indicator.indicatorId)
    }
  }
  
  const toggleIndicatorVisibility = (id: string) => {
    const indicator = configuredIndicators.value.find(ind => ind.id === id)
    if (indicator) {
      indicator.visible = !indicator.visible
    }
  }
  
  const duplicateIndicator = (id: string) => {
    const indicator = configuredIndicators.value.find(ind => ind.id === id)
    if (indicator) {
      const duplicate = {
        ...indicator,
        displayName: `${indicator.displayName} (Copy)`
      }
      delete (duplicate as any).id
      delete (duplicate as any).color
      
      return addIndicator(duplicate)
    }
    return null
  }
  
  const clearAllIndicators = () => {
    configuredIndicators.value = []
    calculationCache.value.clear()
    currentColorIndex.value = 0
  }
  
  const getNextColor = (): string => {
    const scheme = currentColorScheme.value
    const color = scheme.colors[currentColorIndex.value % scheme.colors.length]
    currentColorIndex.value++
    return color
  }
  
  const calculateIndicator = async (request: IndicatorCalculationRequest): Promise<AnyIndicatorResult | null> => {
    try {
      // Check cache first
      const cacheKey = generateCacheKey(request)
      if (calculationCache.value.has(cacheKey)) {
        return calculationCache.value.get(cacheKey)!
      }
      
      const response = await fetch('/api/indicators/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      })
      
      if (!response.ok) {
        throw new Error(`Calculation failed: ${response.statusText}`)
      }
      
      const data: IndicatorCalculationResponse = await response.json()
      
      if (!data.success || !data.result) {
        throw new Error(data.error || 'Calculation failed')
      }
      
      // Cache the result
      calculationCache.value.set(cacheKey, data.result)
      
      return data.result
      
    } catch (err) {
      console.error('Indicator calculation error:', err)
      try {
        const notificationStore = useNotificationStore()
        if (notificationStore && notificationStore.add) {
          notificationStore.add({
            type: 'error',
            title: 'Calculation Error',
            message: err instanceof Error ? err.message : 'Unknown calculation error',
            duration: 5000
          })
        }
      } catch {
        // Notification store not available (e.g., in tests)
      }
      return null
    }
  }
  
  const previewIndicator = async (indicator: string, parameters: Record<string, any>) => {
    try {
      const response = await fetch(`/api/indicators/${indicator}/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ parameters })
      })
      
      if (!response.ok) {
        throw new Error(`Preview failed: ${response.statusText}`)
      }
      
      return await response.json()
      
    } catch (err) {
      console.error('Indicator preview error:', err)
      throw err
    }
  }
  
  const savePreset = (preset: Omit<IndicatorPreset, 'id' | 'createdAt' | 'updatedAt'>) => {
    const id = `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const now = Date.now()
    
    const newPreset: IndicatorPreset = {
      ...preset,
      id,
      createdAt: now,
      updatedAt: now
    }
    
    presets.value.push(newPreset)
    return newPreset
  }
  
  const loadPreset = (presetId: string) => {
    const preset = presets.value.find(p => p.id === presetId)
    if (!preset) return false
    
    // Clear current indicators
    clearAllIndicators()
    
    // Add indicators from preset
    preset.indicators.forEach(presetIndicator => {
      const baseIndicator = availableIndicators.value.find(ind => ind.name === presetIndicator.indicator)
      if (baseIndicator) {
        const configuredIndicator: ConfiguredIndicator = {
          ...baseIndicator,
          id: `${presetIndicator.indicator}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          indicatorId: presetIndicator.indicator,
          parameters: presetIndicator.parameters,
          visible: presetIndicator.display?.visible || true,
          color: presetIndicator.display?.color || getNextColor(),
          lineWidth: presetIndicator.display?.lineWidth || 2,
          opacity: presetIndicator.display?.opacity || 1,
          style: 'solid'
        }
        configuredIndicators.value.push(configuredIndicator)
      }
    })
    
    return true
  }
  
  const deletePreset = (presetId: string) => {
    const index = presets.value.findIndex(p => p.id === presetId)
    if (index !== -1) {
      presets.value.splice(index, 1)
    }
  }
  
  const exportIndicators = () => {
    return {
      version: '1.0.0',
      timestamp: Date.now(),
      indicators: configuredIndicators.value,
      presets: presets.value,
      colorScheme: selectedColorScheme.value,
      metadata: {
        exportedBy: 'Gekko Trading Bot',
        description: 'Indicator configuration export'
      }
    }
  }
  
  const importIndicators = (data: any) => {
    try {
      if (data.indicators && Array.isArray(data.indicators)) {
        configuredIndicators.value = data.indicators
      }
      
      if (data.presets && Array.isArray(data.presets)) {
        presets.value = [...presets.value, ...data.presets]
      }
      
      if (data.colorScheme && typeof data.colorScheme === 'string') {
        selectedColorScheme.value = data.colorScheme
      }
      
      // Clear cache after import
      calculationCache.value.clear()
      
      return true
    } catch (err) {
      console.error('Import error:', err)
      return false
    }
  }
  
  const setColorScheme = (schemeName: string) => {
    const scheme = colorSchemes.value.find(s => s.name === schemeName)
    if (scheme) {
      selectedColorScheme.value = schemeName
      currentColorIndex.value = 0
      
      // Update existing indicator colors
      configuredIndicators.value.forEach((indicator, index) => {
        indicator.color = scheme.colors[index % scheme.colors.length]
      })
    }
  }
  
  const addColorScheme = (scheme: IndicatorColorScheme) => {
    const existing = colorSchemes.value.find(s => s.name === scheme.name)
    if (existing) {
      Object.assign(existing, scheme)
    } else {
      colorSchemes.value.push(scheme)
    }
  }
  
  // Helper functions
  const generateCacheKey = (request: IndicatorCalculationRequest): string => {
    return `${request.indicator}_${JSON.stringify(request.parameters)}_${request.data.timestamps.length}`
  }

  const clearIndicatorCache = (indicatorName?: string) => {
    if (indicatorName) {
      // Clear cache entries for specific indicator
      for (const [key] of calculationCache.value) {
        if (key.startsWith(indicatorName)) {
          calculationCache.value.delete(key)
        }
      }
    } else {
      // Clear all cache
      calculationCache.value.clear()
    }
  }

  const fetchIndicators = async () => {
    try {
      isLoading.value = true
      error.value = null
      
      // This would typically fetch from an API
      // For now, we'll use the loadAvailableIndicators function
      await loadAvailableIndicators()
      
      lastUpdate.value = Date.now()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch indicators'
      console.error('Failed to fetch indicators:', err)
    } finally {
      isLoading.value = false
    }
  }

  const calculateIndicators = async (candles: any[]) => {
    if (!candles || candles.length === 0) return {}
    
    isCalculating.value = true
    
    try {
      const results: Record<string, any> = {}
      
      for (const config of configuredIndicators.value) {
        if (config.visible) {
          const request: IndicatorCalculationRequest = {
            indicator: config.indicatorId,
            parameters: config.parameters,
            data: {
              timestamps: candles.map(c => c.time),
              open: candles.map(c => c.open),
              high: candles.map(c => c.high),
              low: candles.map(c => c.low),
              close: candles.map(c => c.close),
              volume: candles.map(c => c.volume)
            }
          }
          
          const result = await calculateIndicator(request)
          if (result) {
            results[config.id] = result
          }
        }
      }
      
      return results
    } finally {
      isCalculating.value = false
    }
  }
  
  const getDefaultIndicators = (): Indicator[] => {
    return [
      {
        name: 'sma',
        displayName: 'Simple Moving Average',
        category: 'trend',
        description: 'Average price over a specified number of periods',
        parameters: [
          { name: 'period', type: 'number', default: 20, min: 1, max: 200 }
        ],
        timeComplexity: 'O(1)',
        memoryUsage: 'Low',
        outputType: 'line',
        scale: 'price'
      },
      {
        name: 'ema',
        displayName: 'Exponential Moving Average',
        category: 'trend',
        description: 'Weighted average giving more importance to recent prices',
        parameters: [
          { name: 'period', type: 'number', default: 20, min: 1, max: 200 }
        ],
        timeComplexity: 'O(1)',
        memoryUsage: 'Low',
        outputType: 'line',
        scale: 'price'
      },
      {
        name: 'rsi',
        displayName: 'Relative Strength Index',
        category: 'momentum',
        description: 'Momentum oscillator measuring speed and change of price movements',
        parameters: [
          { name: 'period', type: 'number', default: 14, min: 2, max: 100 }
        ],
        timeComplexity: 'O(1)',
        memoryUsage: 'Medium',
        outputType: 'oscillator',
        scale: 'separate',
        range: { min: 0, max: 100 }
      }
    ]
  }
  
  // Initialize
  const initialize = async () => {
    await loadAvailableIndicators()
  }
  
  return {
    // State
    availableIndicators,
    configuredIndicators,
    presets,
    colorSchemes,
    selectedColorScheme,
    isLoading,
    isCalculating,
    error,
    lastUpdate,
    
    // Computed
    currentColorScheme,
    visibleIndicators,
    indicatorsByCategory,
    hasConfiguredIndicators,
    
    // Actions
    initialize,
    loadAvailableIndicators,
    fetchIndicators,
    addIndicator,
    removeIndicator,
    updateIndicator,
    updateIndicatorParameters,
    toggleIndicatorVisibility,
    duplicateIndicator,
    clearAllIndicators,
    getNextColor,
    calculateIndicator,
    calculateIndicators,
    previewIndicator,
    savePreset,
    loadPreset,
    deletePreset,
    exportIndicators,
    importIndicators,
    setColorScheme,
    addColorScheme,
    clearIndicatorCache
  }
})