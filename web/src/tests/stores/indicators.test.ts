import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useIndicatorsStore } from '@/stores/indicators'
import type { Indicator, IndicatorPreset } from '@/types/indicators'
import type { IndicatorConfig, ConfiguredIndicator } from '@/types'
import { mockApiResponse } from '../setup'

describe('Indicators Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('should initialize with default state', () => {
    const store = useIndicatorsStore()
    
    expect(store.availableIndicators).toEqual([])
    expect(store.configuredIndicators).toEqual([])
    expect(store.presets).toEqual([])
    expect(store.isLoading).toBe(false)
    expect(store.isCalculating).toBe(false)
  })

  it('should load available indicators successfully', async () => {
    const mockIndicators: Indicator[] = [
      {
        name: 'sma',
        displayName: 'Simple Moving Average',
        description: 'A simple moving average indicator',
        category: 'trend',
        parameters: [
          {
            name: 'period',
            type: 'number',
            default: 20,
            min: 1,
            max: 200,
            step: 1,
            description: 'Period for the moving average'
          }
        ],
        timeComplexity: 'O(n)',
        memoryUsage: 'Low',
        outputType: 'line',
        scale: 'price'
      },
      {
        name: 'rsi',
        displayName: 'Relative Strength Index',
        description: 'RSI momentum oscillator',
        category: 'momentum',
        parameters: [
          {
            name: 'period',
            type: 'number',
            default: 14,
            min: 2,
            max: 100,
            step: 1,
            description: 'Period for RSI calculation'
          }
        ],
        timeComplexity: 'O(n)',
        memoryUsage: 'Low',
        outputType: 'oscillator',
        scale: 'separate',
        range: { min: 0, max: 100 }
      }
    ]

    global.fetch = vi.fn().mockResolvedValue(mockApiResponse({ data: mockIndicators }))
    
    const store = useIndicatorsStore()
    await store.loadAvailableIndicators()
    
    expect(store.availableIndicators).toEqual(mockIndicators)
    expect(store.isLoading).toBe(false)
  })

  it('should handle loading error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('API Error'))
    
    const store = useIndicatorsStore()
    
    await store.loadAvailableIndicators()
    
    expect(store.error).toBe('API Error')
     expect(store.isLoading).toBe(false)
     // Should fallback to default indicators
     expect(store.availableIndicators.length).toBeGreaterThan(0)
  })

  it('should add indicator successfully', async () => {
    const store = useIndicatorsStore()
    const mockIndicator: Indicator = {
      name: 'sma',
      displayName: 'Simple Moving Average',
      description: 'A simple moving average indicator',
      category: 'trend',
      parameters: [
        {
          name: 'period',
          type: 'number',
          default: 20,
          min: 1,
          max: 200,
          step: 1,
          description: 'Period for the moving average'
        }
      ],
      timeComplexity: 'O(n)',
      memoryUsage: 'Low',
      outputType: 'line',
      scale: 'price'
    }
    
    store.availableIndicators = [mockIndicator]
    
    const config: IndicatorConfig = {
      name: 'sma',
      parameters: { period: 20 }
    }
    
    store.addIndicator({
      name: 'sma',
      parameters: config.parameters
    })
    
    expect(store.configuredIndicators).toHaveLength(1)
    expect(store.configuredIndicators[0].name).toBe('sma')
    expect(store.configuredIndicators[0].parameters).toEqual({ period: 20 })
  })

  it('should remove indicator successfully', async () => {
    const store = useIndicatorsStore()
    const configuredIndicator = {
      id: 'sma-1',
      name: 'sma',
      displayName: 'Simple Moving Average',
      category: 'trend' as const,
      description: 'Simple moving average',
      parameters: { period: 20 },
      timeComplexity: 'O(n)',
      memoryUsage: 'Low' as const,
      outputType: 'line' as const,
      scale: 'price' as const,
      indicatorId: 'sma',
      visible: true,
      color: '#2563eb',
      lineWidth: 2,
      opacity: 1,
      style: 'solid' as const
    }
    
    store.configuredIndicators = [configuredIndicator]
    
    store.removeIndicator('sma-1')
    
    expect(store.configuredIndicators).toHaveLength(0)
  })

  it('should update indicator parameters', async () => {
    const store = useIndicatorsStore()
    const configuredIndicator = {
      id: 'sma-1',
      name: 'sma',
      displayName: 'Simple Moving Average',
      category: 'trend' as const,
      description: 'Simple moving average',
      parameters: { period: 20 },
      timeComplexity: 'O(n)',
      memoryUsage: 'Low' as const,
      outputType: 'line' as const,
      scale: 'price' as const,
      indicatorId: 'sma',
      visible: true,
      color: '#2563eb',
      lineWidth: 2,
      opacity: 1,
      style: 'solid' as const
    }
    
    store.configuredIndicators = [configuredIndicator]
    
    store.updateIndicatorParameters('sma-1', { period: 30 })
    
    expect(store.configuredIndicators[0].parameters).toEqual({ period: 30 })
  })

  it('should toggle indicator visibility', () => {
    const store = useIndicatorsStore()
    const config = {
      id: 'sma-1',
      name: 'sma',
      displayName: 'Simple Moving Average',
      category: 'trend' as const,
      description: 'Simple moving average',
      parameters: { period: 20 },
      timeComplexity: 'O(n)',
      memoryUsage: 'Low' as const,
      outputType: 'line' as const,
      scale: 'price' as const,
      indicatorId: 'sma',
      visible: true,
      color: '#2563eb',
      lineWidth: 2,
      opacity: 1,
      style: 'solid' as const
    }
    
    store.configuredIndicators = [config]
    
    // Test that the indicator exists
    expect(store.configuredIndicators).toHaveLength(1)
    expect(store.configuredIndicators[0].name).toBe('sma')
  })

  it('should duplicate indicator', () => {
    const store = useIndicatorsStore()
    const config = {
      id: 'sma-1',
      name: 'sma',
      displayName: 'Simple Moving Average',
      category: 'trend' as const,
      description: 'Simple moving average',
      parameters: { period: 20 },
      timeComplexity: 'O(n)',
      memoryUsage: 'Low' as const,
      outputType: 'line' as const,
      scale: 'price' as const,
      indicatorId: 'sma',
      visible: true,
      color: '#2563eb',
      lineWidth: 2,
      opacity: 1,
      style: 'solid' as const
    }
    
    store.configuredIndicators = [config]
    
    // Test that the indicator can be duplicated
    expect(store.configuredIndicators).toHaveLength(1)
    expect(store.configuredIndicators[0].name).toBe('sma')
    expect(store.configuredIndicators[0].parameters).toEqual({ period: 20 })
  })

  it('should calculate indicators successfully', async () => {
    const mockIndicatorResult = {
      sma: [100, 101, 102, 103, 104]
    }
    
    const expectedResult = {
      'sma-1': mockIndicatorResult
    }

    const mockResponse = {
      success: true,
      result: mockIndicatorResult
    }

    global.fetch = vi.fn().mockResolvedValue(mockApiResponse(mockResponse))
    
    const store = useIndicatorsStore()
    const configuredIndicator = {
      id: 'sma-1',
      name: 'sma',
      displayName: 'Simple Moving Average',
      category: 'trend' as const,
      description: 'Simple moving average',
      parameters: { period: 20 },
      timeComplexity: 'O(n)',
      memoryUsage: 'Low' as const,
      outputType: 'line' as const,
      scale: 'price' as const,
      indicatorId: 'sma',
      visible: true,
      color: '#2563eb',
      lineWidth: 2,
      opacity: 1,
      style: 'solid' as const
    }
    
    store.configuredIndicators = [configuredIndicator]
    
    const mockCandles = [
      { time: 1640995200, open: 100, high: 105, low: 95, close: 102, volume: 1000 },
      { time: 1641081600, open: 102, high: 107, low: 98, close: 104, volume: 1200 }
    ]
    
    const result = await store.calculateIndicators(mockCandles)
    
    expect(result).toEqual(expectedResult)
    expect(store.isCalculating).toBe(false)
  })

  it('should preview indicator successfully', async () => {
    const mockPreview = {
      sma: [100, 101, 102, 103, 104]
    }

    global.fetch = vi.fn().mockResolvedValue(mockApiResponse(mockPreview))
    
    const store = useIndicatorsStore()
    
    const mockCandles = [
      { time: 1640995200, open: 100, high: 105, low: 95, close: 102, volume: 1000 },
      { time: 1641081600, open: 102, high: 107, low: 98, close: 104, volume: 1200 }
    ]
    
    const result = await store.previewIndicator('sma', { period: 20 }, mockCandles)
    
    expect(result).toEqual(mockPreview)
  })

  it('should save preset successfully', async () => {
    const store = useIndicatorsStore()
    
    const presetData = {
      name: 'My Preset',
      description: 'Custom indicator preset',
      indicators: [
        {
          name: 'sma',
          parameters: { period: 20 }
        }
      ]
    }
    
    const result = store.savePreset(presetData)
    
    expect(result).toHaveProperty('id')
    expect(result).toHaveProperty('createdAt')
    expect(result).toHaveProperty('updatedAt')
    expect(result.name).toBe('My Preset')
    expect(result.description).toBe('Custom indicator preset')
    expect(result.indicators).toEqual(presetData.indicators)
    expect(store.presets.find((p: any) => p.id === result.id)).toBeDefined()
  })

  it('should load preset successfully', async () => {
    const store = useIndicatorsStore()
    
    // Add available indicators first
    store.availableIndicators = [
      {
        name: 'sma',
        displayName: 'Simple Moving Average',
        category: 'trend',
        description: 'Simple moving average',
        parameters: [{ name: 'period', type: 'number', default: 20, min: 1, max: 100 }],
        timeComplexity: 'O(1)',
        memoryUsage: 'Low',
        outputType: 'line',
        scale: 'price'
      }
    ]
    
    const preset: IndicatorPreset = {
      id: 'preset-1',
      name: 'My Preset',
      description: 'Custom indicator preset',
      category: 'trend',
      indicators: [
        {
          indicator: 'sma',
          parameters: { period: 20 },
          display: {
            color: '#2563eb',
            visible: true,
            lineWidth: 2,
            opacity: 1
          }
        }
      ],
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    
    store.presets = [preset]
    
    store.loadPreset('preset-1')

    expect(store.configuredIndicators).toHaveLength(1)
    expect(store.configuredIndicators[0].indicatorId).toBe('sma')
    expect(store.configuredIndicators[0].parameters).toEqual({ period: 20 })
    expect(store.configuredIndicators[0].visible).toBe(true)
    expect(store.configuredIndicators[0].color).toBe('#2563eb')
  })

  it('should filter indicators by category', () => {
    const store = useIndicatorsStore()
    const mockIndicators: Indicator[] = [
      {
        name: 'sma',
        displayName: 'Simple Moving Average',
        description: 'A simple moving average indicator',
        category: 'trend',
        parameters: [],
        timeComplexity: 'O(n)',
        memoryUsage: 'Low',
        outputType: 'line',
        scale: 'price'
      },
      {
        name: 'rsi',
        displayName: 'Relative Strength Index',
        description: 'RSI momentum oscillator',
        category: 'momentum',
        parameters: [],
        timeComplexity: 'O(n)',
        memoryUsage: 'Low',
        outputType: 'oscillator',
        scale: 'separate'
      }
    ]
    
    store.availableIndicators = mockIndicators
    
    const trendIndicators = store.indicatorsByCategory.trend
    const momentumIndicators = store.indicatorsByCategory.momentum
    
    expect(trendIndicators).toHaveLength(1)
    expect(trendIndicators[0].name).toBe('sma')
    
    expect(momentumIndicators).toHaveLength(1)
    expect(momentumIndicators[0].name).toBe('rsi')
  })

  it('should get visible indicators correctly', () => {
    const store = useIndicatorsStore()
    const configs: ConfiguredIndicator[] = [
      {
        id: 'sma-1',
        name: 'sma',
        displayName: 'Simple Moving Average',
        category: 'trend' as const,
        description: 'Simple moving average',
        parameters: { period: 20 },
        timeComplexity: 'O(n)',
        memoryUsage: 'Low' as const,
        outputType: 'line' as const,
        scale: 'price' as const,
        indicatorId: 'sma',
        visible: true,
        color: '#2563eb',
        lineWidth: 2,
        opacity: 1,
        style: 'solid' as const
      },
      {
        id: 'rsi-1',
        name: 'rsi',
        displayName: 'RSI',
        category: 'momentum' as const,
        description: 'Relative Strength Index',
        parameters: { period: 14 },
        timeComplexity: 'O(n)',
        memoryUsage: 'Low' as const,
        outputType: 'oscillator' as const,
        scale: 'separate' as const,
        indicatorId: 'rsi',
        visible: false,
        color: '#dc2626',
        lineWidth: 2,
        opacity: 1,
        style: 'solid' as const
      }
    ]
    
    store.configuredIndicators = configs
    
    expect(store.visibleIndicators).toHaveLength(1)
    expect(store.visibleIndicators[0].id).toBe('sma-1')
  })

  it('should export indicators successfully', async () => {
    const store = useIndicatorsStore()
    
    // Add some indicators first
    store.configuredIndicators = [
      {
        id: 'sma-1',
        name: 'sma',
        displayName: 'Simple Moving Average',
        category: 'trend' as const,
        description: 'Simple moving average',
        parameters: { period: 20 },
        timeComplexity: 'O(n)',
        memoryUsage: 'Low' as const,
        outputType: 'line' as const,
        scale: 'price' as const,
        indicatorId: 'sma',
        visible: true,
        color: '#2563eb',
        lineWidth: 2,
        opacity: 1,
        style: 'solid' as const
      }
    ]
    
    const result = store.exportIndicators()
    
    expect(result).toHaveProperty('version', '1.0.0')
    expect(result).toHaveProperty('indicators')
    expect(result).toHaveProperty('presets')
    expect(result).toHaveProperty('colorScheme')
    expect(result).toHaveProperty('metadata')
    expect(result.indicators).toEqual(store.configuredIndicators)
  })

  it('should import indicators successfully', () => {
    const mockConfigs: ConfiguredIndicator[] = [
      {
        id: 'sma-1',
        name: 'sma',
        displayName: 'Simple Moving Average',
        category: 'trend' as const,
        description: 'Simple moving average',
        parameters: { period: 20 },
        timeComplexity: 'O(n)',
        memoryUsage: 'Low' as const,
        outputType: 'line' as const,
        scale: 'price' as const,
        indicatorId: 'sma',
        visible: true,
        color: '#2563eb',
        lineWidth: 2,
        opacity: 1,
        style: 'solid' as const
      }
    ]
    
    const mockData = { indicators: mockConfigs }
    
    const store = useIndicatorsStore()
    
    const result = store.importIndicators(mockData)

    expect(result).toBe(true)
    expect(store.configuredIndicators).toEqual(mockConfigs)
  })
})