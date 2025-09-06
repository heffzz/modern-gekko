import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  Strategy,
  StrategyTemplate,
  StrategyBacktestRequest,
  StrategyBacktestResult,
  StrategyValidationResult,
  StrategyOptimizationRequest,
  StrategyOptimizationResult,
  StrategyComparison,
  StrategyPortfolio,
  StrategySignal,
  StrategyAlert,
  StrategyCategory,
  StrategyType,
  StrategyStatus
} from '@/types/strategy'
import { useNotificationStore } from './notifications'

export const useStrategyStore = defineStore('strategy', () => {
  // State
  const strategies = ref<Strategy[]>([])
  const templates = ref<StrategyTemplate[]>([])
  const backtestResults = ref<StrategyBacktestResult[]>([])
  const optimizationResults = ref<StrategyOptimizationResult[]>([])
  const portfolios = ref<StrategyPortfolio[]>([])
  const signals = ref<StrategySignal[]>([])
  const alerts = ref<StrategyAlert[]>([])
  
  const currentStrategy = ref<Strategy | null>(null)
  const currentBacktest = ref<StrategyBacktestResult | null>(null)
  const currentOptimization = ref<StrategyOptimizationResult | null>(null)
  
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const lastUpdate = ref<number | null>(null)
  
  // Filters and sorting
  const filters = ref({
    category: '' as StrategyCategory | '',
    type: '' as StrategyType | '',
    status: '' as StrategyStatus | '',
    search: '',
    tags: [] as string[]
  })
  
  const sortBy = ref<'name' | 'createdAt' | 'lastModified' | 'performance'>('lastModified')
  const sortOrder = ref<'asc' | 'desc'>('desc')
  
  // Computed
  const filteredStrategies = computed(() => {
    let filtered = strategies.value
    
    // Apply filters
    if (filters.value.category) {
      filtered = filtered.filter(s => s.category === filters.value.category)
    }
    
    if (filters.value.type) {
      filtered = filtered.filter(s => s.type === filters.value.type)
    }
    
    if (filters.value.search) {
      const search = filters.value.search.toLowerCase()
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(search) ||
        s.description?.toLowerCase().includes(search) ||
        s.author?.toLowerCase().includes(search)
      )
    }
    
    if (filters.value.tags.length > 0) {
      filtered = filtered.filter(s => 
        s.tags?.some(tag => filters.value.tags.includes(tag))
      )
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any
      let bValue: any
      
      switch (sortBy.value) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case 'createdAt':
          aValue = a.createdAt
          bValue = b.createdAt
          break
        case 'lastModified':
          aValue = a.lastModified || a.createdAt
          bValue = b.lastModified || b.createdAt
          break
        case 'performance':
          aValue = a.performance?.totalReturn || 0
          bValue = b.performance?.totalReturn || 0
          break
        default:
          return 0
      }
      
      if (aValue < bValue) return sortOrder.value === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder.value === 'asc' ? 1 : -1
      return 0
    })
    
    return filtered
  })
  
  const strategiesByCategory = computed(() => {
    const grouped: Record<string, Strategy[]> = {}
    strategies.value.forEach(strategy => {
      if (!grouped[strategy.category]) {
        grouped[strategy.category] = []
      }
      grouped[strategy.category].push(strategy)
    })
    return grouped
  })
  
  const activeStrategies = computed(() => {
    return strategies.value.filter(s => s.isActive)
  })
  
  const recentBacktests = computed(() => {
    return backtestResults.value
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 10)
  })
  
  const unreadAlerts = computed(() => {
    return alerts.value.filter(alert => !alert.acknowledged)
  })
  
  const criticalAlerts = computed(() => {
    return alerts.value.filter(alert => 
      alert.severity === 'critical' && !alert.acknowledged
    )
  })
  
  // Actions
  const loadStrategies = async () => {
    try {
      isLoading.value = true
      error.value = null
      
      const response = await fetch('/api/strategies')
      if (!response.ok) {
        throw new Error(`Failed to load strategies: ${response.statusText}`)
      }
      
      const data = await response.json()
      strategies.value = data.strategies || []
      lastUpdate.value = Date.now()
      
    } catch (err) {
      console.error('Load strategies error:', err)
      error.value = err instanceof Error ? err.message : 'Unknown error'
      
      // Fallback to default strategies
      strategies.value = getDefaultStrategies()
      
    } finally {
      isLoading.value = false
    }
  }
  
  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/strategies/templates')
      if (!response.ok) {
        throw new Error(`Failed to load templates: ${response.statusText}`)
      }
      
      const data = await response.json()
      templates.value = data.templates || getDefaultTemplates()
      
    } catch (err) {
      console.error('Load templates error:', err)
      templates.value = getDefaultTemplates()
    }
  }
  
  const createStrategy = async (strategyData: Omit<Strategy, 'id' | 'createdAt'>): Promise<Strategy> => {
    try {
      const response = await fetch('/api/strategies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(strategyData)
      })
      
      if (!response.ok) {
        throw new Error(`Failed to create strategy: ${response.statusText}`)
      }
      
      const strategy = await response.json()
      strategies.value.push(strategy)
      
      const notificationStore = useNotificationStore()
      notificationStore.add({
        type: 'success',
        title: 'Strategy Created',
        message: `Strategy "${strategy.name}" created successfully`
      })
      
      return strategy
      
    } catch (err) {
      console.error('Create strategy error:', err)
      throw err
    }
  }
  
  const updateStrategy = async (id: string, updates: Partial<Strategy>): Promise<Strategy> => {
    try {
      const response = await fetch(`/api/strategies/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...updates,
          lastModified: Date.now()
        })
      })
      
      if (!response.ok) {
        throw new Error(`Failed to update strategy: ${response.statusText}`)
      }
      
      const updatedStrategy = await response.json()
      
      const index = strategies.value.findIndex(s => s.id === id)
      if (index !== -1) {
        strategies.value[index] = updatedStrategy
      }
      
      if (currentStrategy.value?.id === id) {
        currentStrategy.value = updatedStrategy
      }
      
      return updatedStrategy
      
    } catch (err) {
      console.error('Update strategy error:', err)
      throw err
    }
  }
  
  const deleteStrategy = async (id: string) => {
    try {
      const response = await fetch(`/api/strategies/${id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error(`Failed to delete strategy: ${response.statusText}`)
      }
      
      const index = strategies.value.findIndex(s => s.id === id)
      if (index !== -1) {
        const strategy = strategies.value[index]
        strategies.value.splice(index, 1)
        
        const notificationStore = useNotificationStore()
        notificationStore.add({
          type: 'info',
          title: 'Strategy Deleted',
          message: `Strategy "${strategy.name}" deleted successfully`
        })
      }
      
      if (currentStrategy.value?.id === id) {
        currentStrategy.value = null
      }
      
      // Clean up related data
      backtestResults.value = backtestResults.value.filter(r => r.strategyId !== id)
      optimizationResults.value = optimizationResults.value.filter(r => r.strategyId !== id)
      signals.value = signals.value.filter(s => s.strategyId !== id)
      alerts.value = alerts.value.filter(a => a.strategyId !== id)
      
    } catch (err) {
      console.error('Delete strategy error:', err)
      throw err
    }
  }
  
  const duplicateStrategy = async (id: string): Promise<Strategy> => {
    const original = strategies.value.find(s => s.id === id)
    if (!original) {
      throw new Error('Strategy not found')
    }
    
    const duplicate = {
      ...original,
      name: `${original.name} (Copy)`,
      isActive: false
    }
    
    delete (duplicate as any).id
    delete (duplicate as any).createdAt
    delete (duplicate as any).lastModified
    delete (duplicate as any).performance
    
    return createStrategy(duplicate)
  }
  
  const validateStrategy = async (code: string): Promise<StrategyValidationResult> => {
    try {
      const response = await fetch('/api/strategies/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code })
      })
      
      if (!response.ok) {
        throw new Error(`Validation failed: ${response.statusText}`)
      }
      
      return await response.json()
      
    } catch (err) {
      console.error('Validation error:', err)
      throw err
    }
  }
  
  const runBacktest = async (request: StrategyBacktestRequest): Promise<StrategyBacktestResult> => {
    try {
      isLoading.value = true
      
      const response = await fetch('/api/backtest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      })
      
      if (!response.ok) {
        throw new Error(`Backtest failed: ${response.statusText}`)
      }
      
      const result = await response.json()
      backtestResults.value.push(result)
      currentBacktest.value = result
      
      // Update strategy performance
      const strategy = strategies.value.find(s => s.id === request.strategyId)
      if (strategy) {
        strategy.performance = result.performance
        strategy.lastModified = Date.now()
      }
      
      const notificationStore = useNotificationStore()
      notificationStore.add({
        type: 'success',
        title: 'Backtest Complete',
        message: `Backtest completed with ${result.performance.totalReturn.toFixed(2)}% return`
      })
      
      return result
      
    } catch (err) {
      console.error('Backtest error:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }
  
  const optimizeStrategy = async (request: StrategyOptimizationRequest): Promise<StrategyOptimizationResult> => {
    try {
      isLoading.value = true
      
      const response = await fetch('/api/strategies/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      })
      
      if (!response.ok) {
        throw new Error(`Optimization failed: ${response.statusText}`)
      }
      
      const result = await response.json()
      optimizationResults.value.push(result)
      currentOptimization.value = result
      
      const notificationStore = useNotificationStore()
      notificationStore.add({
        type: 'success',
        title: 'Optimization Complete',
        message: `Found optimal parameters with ${result.bestPerformance.totalReturn.toFixed(2)}% return`
      })
      
      return result
      
    } catch (err) {
      console.error('Optimization error:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }
  
  const compareStrategies = async (strategyIds: string[]): Promise<StrategyComparison> => {
    try {
      const response = await fetch('/api/strategies/compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ strategyIds })
      })
      
      if (!response.ok) {
        throw new Error(`Comparison failed: ${response.statusText}`)
      }
      
      return await response.json()
      
    } catch (err) {
      console.error('Comparison error:', err)
      throw err
    }
  }
  
  const exportStrategy = (strategy: Strategy) => {
    const exportData = {
      version: '1.0.0',
      timestamp: Date.now(),
      strategy: {
        ...strategy,
        id: undefined // Remove ID for export
      },
      metadata: {
        exportedBy: 'Gekko Trading Bot',
        description: 'Strategy export'
      }
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    })
    
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${strategy.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  
  const importStrategy = async (file: File): Promise<Strategy> => {
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      
      if (!data.strategy) {
        throw new Error('Invalid strategy file format')
      }
      
      const strategy = data.strategy
      delete strategy.id
      delete strategy.createdAt
      delete strategy.lastModified
      delete strategy.performance
      
      strategy.name = `${strategy.name} (Imported)`
      strategy.type = 'imported'
      
      return await createStrategy(strategy)
      
    } catch (err) {
      console.error('Import strategy error:', err)
      throw err
    }
  }
  
  const setCurrentStrategy = (strategy: Strategy | null) => {
    currentStrategy.value = strategy
  }
  
  const setCurrentBacktest = (result: StrategyBacktestResult | null) => {
    currentBacktest.value = result
  }
  
  const updateFilters = (newFilters: Partial<typeof filters.value>) => {
    Object.assign(filters.value, newFilters)
  }
  
  const updateSorting = (field: typeof sortBy.value, order?: typeof sortOrder.value) => {
    if (sortBy.value === field && !order) {
      sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
    } else {
      sortBy.value = field
      sortOrder.value = order || 'desc'
    }
  }
  
  const acknowledgeAlert = async (alertId: string) => {
    const alert = alerts.value.find(a => a.id === alertId)
    if (alert) {
      alert.acknowledged = true
      alert.acknowledgedAt = Date.now()
      
      try {
        await fetch(`/api/alerts/${alertId}/acknowledge`, {
          method: 'POST'
        })
      } catch (err) {
        console.error('Acknowledge alert error:', err)
      }
    }
  }
  
  const clearAllAlerts = async () => {
    try {
      await fetch('/api/alerts', {
        method: 'DELETE'
      })
      
      alerts.value = []
      
    } catch (err) {
      console.error('Clear alerts error:', err)
    }
  }
  
  // Helper functions
  const getDefaultStrategies = (): Strategy[] => {
    return [
      {
        id: 'sample-sma-crossover',
        name: 'SMA Crossover',
        description: 'Simple moving average crossover strategy',
        code: getSampleStrategyCode('sma-crossover'),
        type: 'built-in',
        category: 'trend',
        author: 'Gekko',
        version: '1.0.0',
        createdAt: Date.now(),
        tags: ['sma', 'crossover', 'trend'],
        parameters: [
          { name: 'fastPeriod', type: 'number', default: 10, min: 1, max: 100 },
          { name: 'slowPeriod', type: 'number', default: 20, min: 1, max: 200 }
        ]
      },
      {
        id: 'sample-rsi-strategy',
        name: 'RSI Strategy',
        description: 'RSI-based momentum strategy',
        code: getSampleStrategyCode('rsi'),
        type: 'built-in',
        category: 'momentum',
        author: 'Gekko',
        version: '1.0.0',
        createdAt: Date.now(),
        tags: ['rsi', 'momentum', 'oscillator'],
        parameters: [
          { name: 'period', type: 'number', default: 14, min: 2, max: 100 },
          { name: 'oversold', type: 'number', default: 30, min: 10, max: 50 },
          { name: 'overbought', type: 'number', default: 70, min: 50, max: 90 }
        ]
      }
    ]
  }
  
  const getDefaultTemplates = (): StrategyTemplate[] => {
    return [
      {
        id: 'basic-template',
        name: 'Basic Strategy Template',
        description: 'A basic template for creating new strategies',
        category: 'custom',
        code: getSampleStrategyCode('template'),
        parameters: [],
        author: 'Gekko',
        version: '1.0.0',
        tags: ['template', 'basic'],
        difficulty: 'beginner',
        estimatedTime: '30 minutes'
      }
    ]
  }
  
  const getSampleStrategyCode = (type: string): string => {
    switch (type) {
      case 'sma-crossover':
        return `
// SMA Crossover Strategy
const strategy = {
  // Strategy parameters
  fastPeriod: 10,
  slowPeriod: 20,
  
  // Initialize indicators
  init() {
    this.addIndicator('fastSMA', 'SMA', { period: this.fastPeriod });
    this.addIndicator('slowSMA', 'SMA', { period: this.slowPeriod });
  },
  
  // Update indicators with new candle
  update(candle) {
    // Indicators are automatically updated
  },
  
  // Check for trading signals
  check(candle) {
    const fastSMA = this.indicators.fastSMA.result;
    const slowSMA = this.indicators.slowSMA.result;
    
    if (fastSMA === undefined || slowSMA === undefined) {
      return;
    }
    
    // Buy signal: fast SMA crosses above slow SMA
    if (fastSMA > slowSMA && this.indicators.fastSMA.previous < this.indicators.slowSMA.previous) {
      this.advice('buy');
    }
    
    // Sell signal: fast SMA crosses below slow SMA
    if (fastSMA < slowSMA && this.indicators.fastSMA.previous > this.indicators.slowSMA.previous) {
      this.advice('sell');
    }
  },
  
  // Handle trade events
  onTrade(trade) {
    this.log('Trade executed:', trade);
  }
};

module.exports = strategy;
`
      
      case 'rsi':
        return `
// RSI Strategy
const strategy = {
  // Strategy parameters
  period: 14,
  oversold: 30,
  overbought: 70,
  
  // Initialize indicators
  init() {
    this.addIndicator('rsi', 'RSI', { period: this.period });
  },
  
  // Update indicators with new candle
  update(candle) {
    // Indicators are automatically updated
  },
  
  // Check for trading signals
  check(candle) {
    const rsi = this.indicators.rsi.result;
    
    if (rsi === undefined) {
      return;
    }
    
    // Buy signal: RSI crosses above oversold level
    if (rsi > this.oversold && this.indicators.rsi.previous <= this.oversold) {
      this.advice('buy');
    }
    
    // Sell signal: RSI crosses below overbought level
    if (rsi < this.overbought && this.indicators.rsi.previous >= this.overbought) {
      this.advice('sell');
    }
  },
  
  // Handle trade events
  onTrade(trade) {
    this.log('Trade executed:', trade);
  }
};

module.exports = strategy;
`
      
      case 'template':
      default:
        return `
// Strategy Template
const strategy = {
  // Strategy parameters (can be optimized)
  // Add your parameters here
  
  // Initialize strategy
  init() {
    // Add indicators here
    // Example: this.addIndicator('sma', 'SMA', { period: 20 });
  },
  
  // Update with new market data
  update(candle) {
    // Process new candle data
    // Indicators are automatically updated
  },
  
  // Generate trading signals
  check(candle) {
    // Implement your trading logic here
    // Use this.advice('buy'), this.advice('sell'), or this.advice('hold')
    
    // Example:
    // const sma = this.indicators.sma.result;
    // if (candle.close > sma) {
    //   this.advice('buy');
    // } else {
    //   this.advice('sell');
    // }
  },
  
  // Handle trade execution events
  onTrade(trade) {
    // Optional: handle trade events
    this.log('Trade executed:', trade);
  }
};

module.exports = strategy;
`
    }
  }
  
  // Initialize
  const initialize = async () => {
    await Promise.all([
      loadStrategies(),
      loadTemplates()
    ])
  }
  
  return {
    // State
    strategies,
    templates,
    backtestResults,
    optimizationResults,
    portfolios,
    signals,
    alerts,
    currentStrategy,
    currentBacktest,
    currentOptimization,
    isLoading,
    error,
    lastUpdate,
    filters,
    sortBy,
    sortOrder,
    
    // Computed
    filteredStrategies,
    strategiesByCategory,
    activeStrategies,
    recentBacktests,
    unreadAlerts,
    criticalAlerts,
    
    // Actions
    initialize,
    loadStrategies,
    loadTemplates,
    createStrategy,
    updateStrategy,
    deleteStrategy,
    duplicateStrategy,
    validateStrategy,
    runBacktest,
    optimizeStrategy,
    compareStrategies,
    exportStrategy,
    importStrategy,
    setCurrentStrategy,
    setCurrentBacktest,
    updateFilters,
    updateSorting,
    acknowledgeAlert,
    clearAllAlerts
  }
})