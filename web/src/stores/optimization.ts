import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  OptimizationRequest,
  OptimizationResult,
  OptimizationProgress,
  OptimizationTemplate,
  OptimizationComparison,
  OptimizationAlert,
  ParameterSweepConfig,
  HeatmapData,
  ExportFormat,
  ImportFormat
} from '@/types/optimization'
import {
  OptimizationMetric,
  OptimizationStatus,
  ColorScale
} from '@/types/optimization'
import {
  calculateOptimizationScore,
  DEFAULT_OPTIMIZATION_CONFIG,
  DEFAULT_PORTFOLIO_CONFIG
} from '@/types/optimization'
import api from '@/services/api'

export const useOptimizationStore = defineStore('optimization', () => {
  // State
  const optimizations = ref<OptimizationResult[]>([])
  const templates = ref<OptimizationTemplate[]>([])
  const comparisons = ref<OptimizationComparison[]>([])
  const alerts = ref<OptimizationAlert[]>([])
  const currentOptimization = ref<OptimizationResult | null>(null)
  const progress = ref<OptimizationProgress | null>(null)
  const heatmapData = ref<HeatmapData | null>(null)
  
  // Loading states
  const isLoading = ref(false)
  const isRunning = ref(false)
  const isPaused = ref(false)
  
  // Filters and settings
  const filters = ref({
    status: [] as OptimizationStatus[],
    strategy: [] as string[],
    metric: [] as OptimizationMetric[],
    dateRange: {
      start: '',
      end: ''
    },
    search: ''
  })
  
  const settings = ref({
    autoRefresh: true,
    refreshInterval: 5000,
    maxResults: 100,
    defaultMetric: OptimizationMetric.TOTAL_RETURN,
    defaultColorScale: ColorScale.LINEAR
  })
  
  // Cache
  const cache = ref(new Map<string, any>())
  const lastFetch = ref<Record<string, number>>({})
  
  // Computed
  const filteredOptimizations = computed(() => {
    return optimizations.value.filter(opt => {
      // Status filter
      if (filters.value.status.length > 0 && !filters.value.status.includes(opt.status)) {
        return false
      }
      
      // Strategy filter
      if (filters.value.strategy.length > 0 && !filters.value.strategy.includes(opt.strategyId)) {
        return false
      }
      
      // Metric filter (check if optimization used any of the selected metrics)
      if (filters.value.metric.length > 0) {
        const hasMetric = filters.value.metric.some(metric => 
          opt.bestPerformance[metric] !== undefined
        )
        if (!hasMetric) return false
      }
      
      // Date range filter
      if (filters.value.dateRange.start) {
        const startDate = new Date(filters.value.dateRange.start)
        const optDate = new Date(opt.startTime)
        if (optDate < startDate) return false
      }
      
      if (filters.value.dateRange.end) {
        const endDate = new Date(filters.value.dateRange.end)
        const optDate = new Date(opt.startTime)
        if (optDate > endDate) return false
      }
      
      // Search filter
      if (filters.value.search) {
        const search = filters.value.search.toLowerCase()
        const searchableText = [
          opt.id,
          opt.strategyId,
          JSON.stringify(opt.bestParameters)
        ].join(' ').toLowerCase()
        
        if (!searchableText.includes(search)) return false
      }
      
      return true
    })
  })
  
  const runningOptimizations = computed(() => {
    return optimizations.value.filter(opt => 
      opt.status === OptimizationStatus.RUNNING || 
      opt.status === OptimizationStatus.PAUSED
    )
  })
  
  const completedOptimizations = computed(() => {
    return optimizations.value.filter(opt => opt.status === OptimizationStatus.COMPLETED)
  })
  
  const optimizationsByStrategy = computed(() => {
    const grouped: Record<string, OptimizationResult[]> = {}
    
    optimizations.value.forEach(opt => {
      if (!grouped[opt.strategyId]) {
        grouped[opt.strategyId] = []
      }
      grouped[opt.strategyId].push(opt)
    })
    
    return grouped
  })
  
  const bestOptimizations = computed(() => {
    return completedOptimizations.value
      .sort((a, b) => {
        const aScore = calculateOptimizationScore(a.bestPerformance)
        const bScore = calculateOptimizationScore(b.bestPerformance)
        return bScore - aScore
      })
      .slice(0, 10)
  })
  
  const activeAlerts = computed(() => {
    return alerts.value.filter(alert => alert.isActive)
  })
  
  // Actions
  const initialize = async () => {
    if (isLoading.value) return
    
    try {
      isLoading.value = true
      await Promise.all([
        loadOptimizations(),
        loadTemplates(),
        loadComparisons(),
        loadAlerts()
      ])
    } catch (error) {
      console.error('Failed to initialize optimization store:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }
  
  const loadOptimizations = async (force = false) => {
    const cacheKey = 'optimizations'
    const now = Date.now()
    
    if (!force && cache.value.has(cacheKey) && 
        (now - (lastFetch.value[cacheKey] || 0)) < 30000) {
      optimizations.value = cache.value.get(cacheKey)
      return
    }
    
    try {
      const response = await api.get('/api/optimizations')
      optimizations.value = response.data
      cache.value.set(cacheKey, response.data)
      lastFetch.value[cacheKey] = now
    } catch (error) {
      console.error('Failed to load optimizations:', error)
      throw error
    }
  }
  
  const loadTemplates = async () => {
    try {
      const response = await api.get('/api/optimization/templates')
      templates.value = response.data
    } catch (error) {
      console.error('Failed to load templates:', error)
      throw error
    }
  }
  
  const loadComparisons = async () => {
    try {
      const response = await api.get('/api/optimization/comparisons')
      comparisons.value = response.data
    } catch (error) {
      console.error('Failed to load comparisons:', error)
      throw error
    }
  }
  
  const loadAlerts = async () => {
    try {
      const response = await api.get('/api/optimization/alerts')
      alerts.value = response.data
    } catch (error) {
      console.error('Failed to load alerts:', error)
      throw error
    }
  }
  
  const startOptimization = async (request: OptimizationRequest): Promise<OptimizationResult> => {
    try {
      isRunning.value = true
      
      const response = await api.post('/api/optimization/start', request)
      const optimization = response.data
      
      optimizations.value.unshift(optimization)
      currentOptimization.value = optimization
      
      // Start progress monitoring
      startProgressMonitoring(optimization.id)
      
      return optimization
    } catch (error) {
      console.error('Failed to start optimization:', error)
      isRunning.value = false
      throw error
    }
  }
  
  const pauseOptimization = async (id: string) => {
    try {
      await api.post(`/api/optimization/${id}/pause`)
      
      const optimization = optimizations.value.find(opt => opt.id === id)
      if (optimization) {
        optimization.status = OptimizationStatus.PAUSED
      }
      
      isPaused.value = true
    } catch (error) {
      console.error('Failed to pause optimization:', error)
      throw error
    }
  }
  
  const resumeOptimization = async (id: string) => {
    try {
      await api.post(`/api/optimization/${id}/resume`)
      
      const optimization = optimizations.value.find(opt => opt.id === id)
      if (optimization) {
        optimization.status = OptimizationStatus.RUNNING
      }
      
      isPaused.value = false
    } catch (error) {
      console.error('Failed to resume optimization:', error)
      throw error
    }
  }
  
  const stopOptimization = async (id: string) => {
    try {
      await api.post(`/api/optimization/${id}/stop`)
      
      const optimization = optimizations.value.find(opt => opt.id === id)
      if (optimization) {
        optimization.status = OptimizationStatus.CANCELLED
      }
      
      isRunning.value = false
      isPaused.value = false
      progress.value = null
      
      stopProgressMonitoring()
    } catch (error) {
      console.error('Failed to stop optimization:', error)
      throw error
    }
  }
  
  const deleteOptimization = async (id: string) => {
    try {
      await api.delete(`/api/optimization/${id}`)
      
      const index = optimizations.value.findIndex(opt => opt.id === id)
      if (index !== -1) {
        optimizations.value.splice(index, 1)
      }
      
      if (currentOptimization.value?.id === id) {
        currentOptimization.value = null
      }
    } catch (error) {
      console.error('Failed to delete optimization:', error)
      throw error
    }
  }
  
  const duplicateOptimization = async (id: string): Promise<OptimizationResult> => {
    try {
      const response = await api.post(`/api/optimization/${id}/duplicate`)
      const optimization = response.data
      
      optimizations.value.unshift(optimization)
      
      return optimization
    } catch (error) {
      console.error('Failed to duplicate optimization:', error)
      throw error
    }
  }
  
  const getOptimization = async (id: string): Promise<OptimizationResult> => {
    const cached = optimizations.value.find(opt => opt.id === id)
    if (cached) return cached
    
    try {
      const response = await api.get(`/api/optimization/${id}`)
      const optimization = response.data
      
      const index = optimizations.value.findIndex(opt => opt.id === id)
      if (index !== -1) {
        optimizations.value[index] = optimization
      } else {
        optimizations.value.push(optimization)
      }
      
      return optimization
    } catch (error) {
      console.error('Failed to get optimization:', error)
      throw error
    }
  }
  
  const generateHeatmap = async (
    optimizationId: string,
    xParameter: string,
    yParameter: string,
    metric: OptimizationMetric,
    colorScale: ColorScale = ColorScale.LINEAR
  ) => {
    try {
      const optimization = await getOptimization(optimizationId)
      
      const xValues = [...new Set(optimization.results.map(r => r.parameters[xParameter]))]
        .sort((a, b) => typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b)))
      
      const yValues = [...new Set(optimization.results.map(r => r.parameters[yParameter]))]
        .sort((a, b) => typeof a === 'number' && typeof b === 'number' ? b - a : String(b).localeCompare(String(a)))
      
      const data = new Map()
      let minValue = Infinity
      let maxValue = -Infinity
      
      optimization.results.forEach(result => {
        const xVal = result.parameters[xParameter]
        const yVal = result.parameters[yParameter]
        const value = result.performance[metric] || 0
        
        const key = `${xVal}_${yVal}`
        data.set(key, {
          xValue: xVal,
          yValue: yVal,
          value,
          result,
          rank: 0,
          color: ''
        })
        
        if (value < minValue) minValue = value
        if (value > maxValue) maxValue = value
      })
      
      heatmapData.value = {
        xParameter,
        yParameter,
        xValues,
        yValues,
        data,
        minValue: minValue === Infinity ? 0 : minValue,
        maxValue: maxValue === -Infinity ? 0 : maxValue,
        colorScale
      }
      
      return heatmapData.value
    } catch (error) {
      console.error('Failed to generate heatmap:', error)
      throw error
    }
  }
  
  const saveTemplate = async (template: Omit<OptimizationTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<OptimizationTemplate> => {
    try {
      const response = await api.post('/api/optimization/templates', template)
      const savedTemplate = response.data
      
      templates.value.push(savedTemplate)
      
      return savedTemplate
    } catch (error) {
      console.error('Failed to save template:', error)
      throw error
    }
  }
  
  const updateTemplate = async (id: string, updates: Partial<OptimizationTemplate>) => {
    try {
      const response = await api.put(`/api/optimization/templates/${id}`, updates)
      const updatedTemplate = response.data
      
      const index = templates.value.findIndex(t => t.id === id)
      if (index !== -1) {
        templates.value[index] = updatedTemplate
      }
      
      return updatedTemplate
    } catch (error) {
      console.error('Failed to update template:', error)
      throw error
    }
  }
  
  const deleteTemplate = async (id: string) => {
    try {
      await api.delete(`/api/optimization/templates/${id}`)
      
      const index = templates.value.findIndex(t => t.id === id)
      if (index !== -1) {
        templates.value.splice(index, 1)
      }
    } catch (error) {
      console.error('Failed to delete template:', error)
      throw error
    }
  }
  
  const createComparison = async (
    name: string,
    optimizationIds: string[],
    metrics: OptimizationMetric[]
  ): Promise<OptimizationComparison> => {
    try {
      const response = await api.post('/api/optimization/comparisons', {
        name,
        optimizations: optimizationIds,
        metrics
      })
      
      const comparison = response.data
      comparisons.value.push(comparison)
      
      return comparison
    } catch (error) {
      console.error('Failed to create comparison:', error)
      throw error
    }
  }
  
  const exportOptimization = async (
    id: string,
    format: ExportFormat,
    options: {
      includeRawData?: boolean
      includeCharts?: boolean
      includeStatistics?: boolean
    } = {}
  ): Promise<Blob> => {
    try {
      const response = await api.post(`/api/optimization/${id}/export`, {
        format,
        ...options
      }, {
        responseType: 'blob'
      })
      
      return response.data
    } catch (error) {
      console.error('Failed to export optimization:', error)
      throw error
    }
  }
  
  const importOptimization = async (
    file: File,
    format: ImportFormat
  ): Promise<OptimizationResult> => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('format', format)
      
      const response = await api.post('/api/optimization/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      
      const optimization = response.data
      optimizations.value.unshift(optimization)
      
      return optimization
    } catch (error) {
      console.error('Failed to import optimization:', error)
      throw error
    }
  }
  
  const createAlert = async (alert: Omit<OptimizationAlert, 'id'>): Promise<OptimizationAlert> => {
    try {
      const response = await api.post('/api/optimization/alerts', alert)
      const savedAlert = response.data
      
      alerts.value.push(savedAlert)
      
      return savedAlert
    } catch (error) {
      console.error('Failed to create alert:', error)
      throw error
    }
  }
  
  const updateAlert = async (id: string, updates: Partial<OptimizationAlert>) => {
    try {
      const response = await api.put(`/api/optimization/alerts/${id}`, updates)
      const updatedAlert = response.data
      
      const index = alerts.value.findIndex(a => a.id === id)
      if (index !== -1) {
        alerts.value[index] = updatedAlert
      }
      
      return updatedAlert
    } catch (error) {
      console.error('Failed to update alert:', error)
      throw error
    }
  }
  
  const deleteAlert = async (id: string) => {
    try {
      await api.delete(`/api/optimization/alerts/${id}`)
      
      const index = alerts.value.findIndex(a => a.id === id)
      if (index !== -1) {
        alerts.value.splice(index, 1)
      }
    } catch (error) {
      console.error('Failed to delete alert:', error)
      throw error
    }
  }
  
  // Progress monitoring
  let progressInterval: NodeJS.Timeout | null = null
  
  const startProgressMonitoring = (optimizationId: string) => {
    if (progressInterval) {
      clearInterval(progressInterval)
    }
    
    progressInterval = setInterval(async () => {
      try {
        const response = await api.get(`/api/optimization/${optimizationId}/progress`)
        progress.value = response.data
        
        // Update optimization status
        const optimization = optimizations.value.find(opt => opt.id === optimizationId)
        if (optimization && progress.value) {
          optimization.status = progress.value.status
          optimization.completedCombinations = progress.value.completed
          
          if (progress.value.currentBest) {
            optimization.bestParameters = progress.value.currentBest.parameters
            optimization.bestPerformance = progress.value.currentBest.performance
          }
        }
        
        // Stop monitoring if completed
        if (progress.value && (progress.value.status === OptimizationStatus.COMPLETED ||
            progress.value.status === OptimizationStatus.FAILED ||
            progress.value.status === OptimizationStatus.CANCELLED)) {
          stopProgressMonitoring()
          isRunning.value = false
          isPaused.value = false
          
          // Reload full optimization data
          await getOptimization(optimizationId)
        }
      } catch (error) {
        console.error('Failed to get progress:', error)
      }
    }, settings.value.refreshInterval)
  }
  
  const stopProgressMonitoring = () => {
    if (progressInterval) {
      clearInterval(progressInterval)
      progressInterval = null
    }
  }
  
  // Utility functions
  const setFilters = (newFilters: Partial<typeof filters.value>) => {
    filters.value = { ...filters.value, ...newFilters }
  }
  
  const clearFilters = () => {
    filters.value = {
      status: [],
      strategy: [],
      metric: [],
      dateRange: { start: '', end: '' },
      search: ''
    }
  }
  
  const updateSettings = (newSettings: Partial<typeof settings.value>) => {
    settings.value = { ...settings.value, ...newSettings }
  }
  
  const clearCache = () => {
    cache.value.clear()
    lastFetch.value = {}
  }
  
  return {
    // State
    optimizations,
    templates,
    comparisons,
    alerts,
    currentOptimization,
    progress,
    heatmapData,
    isLoading,
    isRunning,
    isPaused,
    filters,
    settings,
    
    // Computed
    filteredOptimizations,
    runningOptimizations,
    completedOptimizations,
    optimizationsByStrategy,
    bestOptimizations,
    activeAlerts,
    
    // Actions
    initialize,
    loadOptimizations,
    loadTemplates,
    loadComparisons,
    loadAlerts,
    startOptimization,
    pauseOptimization,
    resumeOptimization,
    stopOptimization,
    deleteOptimization,
    duplicateOptimization,
    getOptimization,
    generateHeatmap,
    saveTemplate,
    updateTemplate,
    deleteTemplate,
    createComparison,
    exportOptimization,
    importOptimization,
    createAlert,
    updateAlert,
    deleteAlert,
    setFilters,
    clearFilters,
    updateSettings,
    clearCache
  }
})

// Helper functions
export function createDefaultSweepConfig(): ParameterSweepConfig {
  return {
    strategyId: '',
    optimizationMetric: OptimizationMetric.TOTAL_RETURN,
    parameters: {},
    csvFile: null,
    startDate: '',
    endDate: '',
    initialCapital: DEFAULT_PORTFOLIO_CONFIG.initialCapital,
    tradingFee: DEFAULT_PORTFOLIO_CONFIG.tradingFee,
    maxCombinations: DEFAULT_OPTIMIZATION_CONFIG.maxCombinations,
    parallelJobs: DEFAULT_OPTIMIZATION_CONFIG.parallelJobs,
    randomSeed: null,
    enableEarlyStopping: DEFAULT_OPTIMIZATION_CONFIG.enableEarlyStopping,
    saveAllResults: DEFAULT_OPTIMIZATION_CONFIG.saveAllResults
  }
}

export function validateOptimizationRequest(request: OptimizationRequest): string[] {
  const errors: string[] = []
  
  if (!request.strategyId) {
    errors.push('Strategy is required')
  }
  
  if (!request.dataSource.startDate) {
    errors.push('Start date is required')
  }
  
  if (!request.dataSource.endDate) {
    errors.push('End date is required')
  }
  
  if (new Date(request.dataSource.startDate) >= new Date(request.dataSource.endDate)) {
    errors.push('End date must be after start date')
  }
  
  if (request.portfolio.initialCapital <= 0) {
    errors.push('Initial capital must be positive')
  }
  
  if (request.portfolio.tradingFee < 0 || request.portfolio.tradingFee > 10) {
    errors.push('Trading fee must be between 0% and 10%')
  }
  
  if (Object.keys(request.parameters).length === 0) {
    errors.push('At least one parameter must be optimized')
  }
  
  if (request.optimization.maxCombinations <= 0) {
    errors.push('Max combinations must be positive')
  }
  
  if (request.optimization.parallelJobs <= 0 || request.optimization.parallelJobs > 16) {
    errors.push('Parallel jobs must be between 1 and 16')
  }
  
  return errors
}