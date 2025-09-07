import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Strategy } from '@/types'
import { apiService } from '@/services/api'
import { useMainStore } from './main'

export const useStrategiesStore = defineStore('strategies', () => {
  const mainStore = useMainStore()
  
  // State
  const strategies = ref<Strategy[]>([])
  const currentStrategy = ref<Strategy | null>(null)
  const loading = ref(false)
  const saving = ref(false)

  // Getters
  const strategiesByName = computed(() => {
    return (strategies.value || []).reduce((acc, strategy) => {
      acc[strategy.name] = strategy
      return acc
    }, {} as Record<string, Strategy>)
  })

  const strategiesCount = computed(() => strategies.value?.length || 0)

  // Actions
  async function fetchStrategies() {
    try {
      loading.value = true
      strategies.value = await apiService.getStrategies()
    } catch (error) {
      console.error('Failed to fetch strategies:', error)
      mainStore.addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load strategies',
      })
    } finally {
      loading.value = false
    }
  }

  async function loadStrategy(id: string) {
    try {
      loading.value = true
      currentStrategy.value = await apiService.getStrategy(id)
    } catch (error) {
      console.error('Failed to load strategy:', error)
      mainStore.addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load strategy',
      })
    } finally {
      loading.value = false
    }
  }

  async function saveStrategy(strategy: Omit<Strategy, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
      saving.value = true
      const savedStrategy = await apiService.saveStrategy(strategy)
      strategies.value.push(savedStrategy)
      currentStrategy.value = savedStrategy
      
      mainStore.addNotification({
        type: 'success',
        title: 'Success',
        message: 'Strategy saved successfully',
      })
      
      return savedStrategy
    } catch (error) {
      console.error('Failed to save strategy:', error)
      mainStore.addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to save strategy',
      })
      throw error
    } finally {
      saving.value = false
    }
  }

  async function updateStrategy(id: string, updates: Partial<Strategy>) {
    try {
      saving.value = true
      const updatedStrategy = await apiService.updateStrategy(id, updates)
      
      const index = strategies.value.findIndex(s => s.id === id)
      if (index > -1) {
        strategies.value[index] = updatedStrategy
      }
      
      if (currentStrategy.value?.id === id) {
        currentStrategy.value = updatedStrategy
      }
      
      mainStore.addNotification({
        type: 'success',
        title: 'Success',
        message: 'Strategy updated successfully',
      })
      
      return updatedStrategy
    } catch (error) {
      console.error('Failed to update strategy:', error)
      mainStore.addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to update strategy',
      })
      throw error
    } finally {
      saving.value = false
    }
  }

  async function deleteStrategy(id: string) {
    try {
      await apiService.deleteStrategy(id)
      
      const index = strategies.value.findIndex(s => s.id === id)
      if (index > -1) {
        strategies.value.splice(index, 1)
      }
      
      if (currentStrategy.value?.id === id) {
        currentStrategy.value = null
      }
      
      mainStore.addNotification({
        type: 'success',
        title: 'Success',
        message: 'Strategy deleted successfully',
      })
    } catch (error) {
      console.error('Failed to delete strategy:', error)
      mainStore.addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete strategy',
      })
      throw error
    }
  }

  function createNewStrategy(): Omit<Strategy, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      name: 'New Strategy',
      code: getDefaultStrategyCode(),
      type: 'custom' as const,
      category: 'custom' as const,
      config: {
        description: 'A new trading strategy',
        parameters: {},
        indicators: [],
      },
    }
  }

  function getDefaultStrategyCode(): string {
    return `// Trading Strategy Template
// Based on Gekko lifecycle: init, update, check, end

const strategy = {
  // Strategy configuration
  name: 'Sample Strategy',
  description: 'A sample trading strategy',
  
  // Strategy parameters
  parameters: {
    // Add your parameters here
    // Example: period: 14
  },
  
  // Required indicators
  indicators: [
    // Add indicators here
    // Example: 'SMA', 'RSI'
  ],
  
  // Initialize strategy
  init() {
    // Initialize your strategy variables here
    this.addIndicator('SMA', 'sma', { period: 20 })
    this.addIndicator('RSI', 'rsi', { period: 14 })
  },
  
  // Update on each candle
  update(candle) {
    // Process new candle data
    // Access indicators: this.indicators.sma.result, this.indicators.rsi.result
  },
  
  // Check for trading signals
  check(candle) {
    const sma = this.indicators.sma.result
    const rsi = this.indicators.rsi.result
    
    // Example trading logic
    if (rsi < 30 && candle.close > sma) {
      this.advice('long')
    } else if (rsi > 70 && candle.close < sma) {
      this.advice('short')
    }
  },
  
  // Strategy cleanup
  end() {
    // Cleanup code here
  }
}

module.exports = strategy
`
  }

  function setCurrentStrategy(strategy: Strategy | null) {
    currentStrategy.value = strategy
  }

  return {
    // State
    strategies,
    currentStrategy,
    loading,
    saving,
    
    // Getters
    strategiesByName,
    strategiesCount,
    
    // Actions
    fetchStrategies,
    loadStrategy,
    saveStrategy,
    updateStrategy,
    deleteStrategy,
    createNewStrategy,
    getDefaultStrategyCode,
    setCurrentStrategy,
  }
})