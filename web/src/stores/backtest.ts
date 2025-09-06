import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { BacktestResult, Candle } from '@/types'
import { apiService } from '@/services/api'
import { useMainStore } from './main'

export const useBacktestStore = defineStore('backtest', () => {
  const mainStore = useMainStore()
  
  // State
  const results = ref<BacktestResult[]>([])
  const currentResult = ref<BacktestResult | null>(null)
  const running = ref(false)
  const progress = ref<number | null>(null)
  const candles = ref<Candle[]>([])
  const selectedFile = ref<File | null>(null)
  const selectedStrategy = ref<string>('')
  const parameters = ref<Record<string, any>>({})
  const backtests = ref<any[]>([])
  const filters = ref<any>({})
  const currentBacktest = ref<any>(null)
  const loading = ref(false)
  const isLoading = computed(() => loading.value)
  const isRunning = ref(false)
  
  // Parameter sweep state
  const parameterSweep = ref({
    enabled: false,
    parameters: {} as Record<string, { min: number; max: number; step: number }>,
    results: [] as Array<{ params: Record<string, any>; result: BacktestResult }>
  })

  // Getters
  const hasResults = computed(() => results.value.length > 0)
  const currentTrades = computed(() => currentResult.value?.trades || [])
  const currentEquity = computed(() => currentResult.value?.equity || [])
  const currentMetrics = computed(() => currentResult.value?.metrics)
  
  const bestResult = computed(() => {
    if (results.value.length === 0) return null
    return results.value.reduce((best, current) => 
      current.metrics.roi > best.metrics.roi ? current : best
    )
  })
  
  const worstResult = computed(() => {
    if (results.value.length === 0) return null
    return results.value.reduce((worst, current) => 
      current.metrics.roi < worst.metrics.roi ? current : worst
    )
  })

  const averageMetrics = computed(() => {
    if (results.value.length === 0) return null
    
    const totals = results.value.reduce((acc, result) => {
      acc.totalTrades += result.metrics.totalTrades
      acc.winRate += result.metrics.winRate
      acc.profit += result.metrics.profit
      acc.maxDrawdown += result.metrics.maxDrawdown
      acc.roi += result.metrics.roi
      acc.totalReturn += result.metrics.roi // Using ROI as totalReturn
      acc.profitFactor += result.metrics.profit > 0 ? Math.abs(result.metrics.profit) / Math.max(Math.abs(result.metrics.maxDrawdown), 1) : 0
      return acc
    }, {
      totalTrades: 0,
      winRate: 0,
      profit: 0,
      maxDrawdown: 0,
      roi: 0,
      totalReturn: 0,
      profitFactor: 0
    })
    
    const count = results.value.length
    return {
      totalTrades: Math.round(totals.totalTrades / count),
      winRate: totals.winRate / count,
      profit: totals.profit / count,
      maxDrawdown: totals.maxDrawdown / count,
      roi: totals.roi / count,
      totalReturn: totals.totalReturn / count,
      profitFactor: totals.profitFactor / count
    }
  })

  const runningBacktests = computed(() => {
    return backtests.value.filter(backtest => backtest.status === 'running')
  })

  const filteredBacktests = computed(() => {
    let filtered = backtests.value
    
    if (filters.value.status && filters.value.status.length > 0) {
      filtered = filtered.filter(backtest => filters.value.status.includes(backtest.status))
    }
    
    if (filters.value.strategy && filters.value.strategy.length > 0) {
      filtered = filtered.filter(backtest => filters.value.strategy.includes(backtest.strategyId))
    }
    
    if (filters.value.search && filters.value.search.trim()) {
      const searchTerm = filters.value.search.toLowerCase()
      filtered = filtered.filter(backtest => 
        backtest.dataSource?.symbol?.toLowerCase().includes(searchTerm) ||
        backtest.strategyId?.toLowerCase().includes(searchTerm)
      )
    }
    
    return filtered
  })

  // Actions
  async function runBacktest(
    strategy: string,
    data: File | string,
    params?: Record<string, any>
  ): Promise<BacktestResult | null> {
    try {
      running.value = true
      progress.value = 0
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        if (progress.value !== null && progress.value < 90) {
          progress.value += Math.random() * 10
        }
      }, 500)
      
      const result = await apiService.runBacktest({
        strategy,
        data,
        parameters: params || parameters.value
      })
      
      clearInterval(progressInterval)
      progress.value = 100
      
      results.value.push(result)
      currentResult.value = result
      
      mainStore.addNotification({
        type: 'success',
        title: 'Backtest Complete',
        message: `Backtest completed with ${result.trades.length} trades`,
      })
      
      return result
    } catch (error) {
      console.error('Backtest failed:', error)
      mainStore.addNotification({
        type: 'error',
        title: 'Backtest Failed',
        message: 'Failed to run backtest. Please check your strategy and data.',
      })
      return null
    } finally {
      running.value = false
      progress.value = 0
    }
  }

  async function runParameterSweep(
    strategy: string,
    data: File | string,
    sweepConfig: Record<string, { min: number; max: number; step: number }>
  ) {
    try {
      running.value = true
      parameterSweep.value.enabled = true
      parameterSweep.value.parameters = sweepConfig
      parameterSweep.value.results = []
      
      // Generate parameter combinations
      const combinations = generateParameterCombinations(sweepConfig)
      const total = combinations.length
      
      mainStore.addNotification({
        type: 'info',
        title: 'Parameter Sweep Started',
        message: `Running ${total} backtest combinations`,
      })
      
      for (let i = 0; i < combinations.length; i++) {
        const params = combinations[i]
        progress.value = (i / total) * 100
        
        try {
          const result = await apiService.runBacktest({
            strategy,
            data,
            parameters: params
          })
          
          parameterSweep.value.results.push({ params, result })
          results.value.push(result)
        } catch (error) {
          console.error('Parameter sweep iteration failed:', error)
        }
      }
      
      progress.value = 100
      
      // Set best result as current
      const bestSweepResult = parameterSweep.value.results.reduce((best, current) => 
        current.result.metrics.roi > best.result.metrics.roi ? current : best
      )
      
      if (bestSweepResult) {
        currentResult.value = bestSweepResult.result
      }
      
      mainStore.addNotification({
        type: 'success',
        title: 'Parameter Sweep Complete',
        message: `Completed ${parameterSweep.value.results.length} backtests`,
      })
    } catch (error) {
      console.error('Parameter sweep failed:', error)
      mainStore.addNotification({
        type: 'error',
        title: 'Parameter Sweep Failed',
        message: 'Failed to complete parameter sweep',
      })
    } finally {
      running.value = false
      progress.value = 0
    }
  }

  function generateParameterCombinations(
    sweepConfig: Record<string, { min: number; max: number; step: number }>
  ): Record<string, any>[] {
    const keys = Object.keys(sweepConfig)
    const combinations: Record<string, any>[] = []
    
    function generateCombos(index: number, current: Record<string, any>) {
      if (index === keys.length) {
        combinations.push({ ...current })
        return
      }
      
      const key = keys[index]
      const config = sweepConfig[key]
      
      for (let value = config.min; value <= config.max; value += config.step) {
        current[key] = value
        generateCombos(index + 1, current)
      }
    }
    
    generateCombos(0, {})
    return combinations
  }

  function loadCandles(file: File): Promise<Candle[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          const csv = e.target?.result as string
          const lines = csv.split('\n').filter(line => line.trim())
          lines[0].split(',') // Parse headers
          
          const candleData: Candle[] = []
          
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',')
            if (values.length >= 6) {
              candleData.push({
                timestamp: parseInt(values[0]) || Date.parse(values[0]),
                open: parseFloat(values[1]),
                high: parseFloat(values[2]),
                low: parseFloat(values[3]),
                close: parseFloat(values[4]),
                volume: parseFloat(values[5]) || 0
              })
            }
          }
          
          candles.value = candleData
          resolve(candleData)
        } catch (error) {
          reject(error)
        }
      }
      
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
  }

  function setSelectedFile(file: File | null) {
    selectedFile.value = file
    if (file) {
      loadCandles(file).catch(error => {
        console.error('Failed to load candles:', error)
        mainStore.addNotification({
          type: 'error',
          title: 'File Error',
          message: 'Failed to parse CSV file',
        })
      })
    }
  }

  function setSelectedStrategy(strategy: string) {
    selectedStrategy.value = strategy
  }

  function setParameters(params: Record<string, any>) {
    parameters.value = params
  }

  function validateRequest(request: any): string[] {
    const errors: string[] = []
    
    if (!request.strategy || typeof request.strategy !== 'string') {
      errors.push('Strategy is required')
    }
    
    if (!request.parameters || typeof request.parameters !== 'object') {
      errors.push('Parameters are required')
    }
    
    return errors
  }

  function setFilters(newFilters: any) {
    filters.value = newFilters
  }

  function setCurrentBacktest(backtest: any) {
    currentBacktest.value = backtest
  }

  async function loadBacktests() {
    loading.value = true
    try {
      const response = await apiService.getBacktests()
      backtests.value = response
    } catch (error) {
      console.error('Failed to load backtests:', error)
      mainStore.addNotification({
        type: 'error',
        title: 'Load Failed',
        message: 'Failed to load backtests',
      })
      throw error
    } finally {
      loading.value = false
    }
  }

  async function startBacktest(request: any) {
    try {
      const response = await apiService.startBacktest(request)
      const newBacktest = response
      backtests.value.push(newBacktest)
      setCurrentBacktest(newBacktest)
      isRunning.value = true
      
      mainStore.addNotification({
        type: 'success',
        title: 'Backtest Started',
        message: 'Backtest started successfully',
      })
      
      return newBacktest
    } catch (error) {
      console.error('Failed to start backtest:', error)
      mainStore.addNotification({
        type: 'error',
        title: 'Start Failed',
        message: 'Failed to start backtest',
      })
      throw error
    }
  }

  async function stopBacktest(id: string) {
    try {
      await apiService.stopBacktest(id)
      
      // Update state
      isRunning.value = false
      progress.value = null
      
      mainStore.addNotification({
        type: 'success',
        title: 'Backtest Stopped',
        message: 'Backtest stopped successfully',
      })
    } catch (error) {
      console.error('Failed to stop backtest:', error)
      mainStore.addNotification({
        type: 'error',
        title: 'Stop Failed',
        message: 'Failed to stop backtest',
      })
      throw error
    }
  }

  async function deleteBacktest(id: string) {
    try {
      await apiService.deleteBacktest(id)
      backtests.value = backtests.value.filter(backtest => backtest.id !== id)
      
      if (currentBacktest.value && currentBacktest.value.id === id) {
        currentBacktest.value = null
      }
      
      mainStore.addNotification({
        type: 'success',
        title: 'Backtest Deleted',
        message: 'Backtest deleted successfully',
      })
    } catch (error) {
      console.error('Failed to delete backtest:', error)
      mainStore.addNotification({
        type: 'error',
        title: 'Delete Failed',
        message: 'Failed to delete backtest',
      })
    }
  }

  function clearResults() {
    results.value = []
    currentResult.value = null
    parameterSweep.value.results = []
  }

  function setCurrentResult(result: BacktestResult) {
    currentResult.value = result
  }

  function exportResults(format: 'json' | 'csv' = 'json') {
    if (results.value.length === 0) {
      mainStore.addNotification({
        type: 'warning',
        title: 'No Results',
        message: 'No backtest results to export',
      })
      return
    }

    let content: string
    let filename: string
    let mimeType: string

    if (format === 'json') {
      content = JSON.stringify(results.value, null, 2)
      filename = `backtest-results-${Date.now()}.json`
      mimeType = 'application/json'
    } else {
      // CSV format
      const headers = ['Strategy', 'Total Trades', 'Win Rate', 'Profit', 'ROI', 'Max Drawdown']
      const rows = results.value.map((result, index) => [
        `Strategy ${index + 1}`,
        result.metrics.totalTrades,
        (result.metrics.winRate * 100).toFixed(2) + '%',
        result.metrics.profit.toFixed(2),
        (result.metrics.roi * 100).toFixed(2) + '%',
        (result.metrics.maxDrawdown * 100).toFixed(2) + '%'
      ])
      
      content = [headers, ...rows].map(row => row.join(',')).join('\n')
      filename = `backtest-results-${Date.now()}.csv`
      mimeType = 'text/csv'
    }

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)

    mainStore.addNotification({
      type: 'success',
      title: 'Export Complete',
      message: `Results exported as ${filename}`,
    })
  }

  async function loadCandlesFromDataset(dataset: string) {
    try {
      // Mock implementation - in real app this would load from API
      const response = await fetch(`/api/datasets/${dataset}/candles`)
      if (!response.ok) {
        throw new Error('Failed to load dataset')
      }
      return await response.json()
    } catch (error) {
      console.error('Failed to load candles from dataset:', error)
      // Return mock data for now
      return [
        { timestamp: Date.now() - 86400000, open: 100, high: 105, low: 95, close: 102, volume: 1000 },
        { timestamp: Date.now(), open: 102, high: 108, low: 98, close: 106, volume: 1200 }
      ]
    }
  }

  return {
    // State
    results,
    currentResult,
    running,
    progress,
    candles,
    selectedFile,
    selectedStrategy,
    parameters,
    parameterSweep,
    backtests,
    filters,
    currentBacktest,
    isLoading,
    isRunning,
    
    // Getters
    hasResults,
    currentTrades,
    currentEquity,
    currentMetrics,
    bestResult,
    worstResult,
    averageMetrics,
    runningBacktests,
    filteredBacktests,
    
    // Actions
    runBacktest,
    runParameterSweep,
    loadCandles,
    loadCandlesFromDataset,
    setSelectedFile,
    setSelectedStrategy,
    setParameters,
    validateRequest,
    setFilters,
    setCurrentBacktest,
    loadBacktests,
    startBacktest,
    stopBacktest,
    deleteBacktest,
    clearResults,
    setCurrentResult,
    exportResults,
  }
})