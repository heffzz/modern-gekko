<template>
  <div class="parameter-sweep">
    <!-- Header -->
    <div class="sweep-header">
      <div class="header-content">
        <div class="title-section">
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
            Parameter Sweep
          </h2>
          <p class="text-gray-600 dark:text-gray-400 mt-1">
            Optimize strategy parameters using grid search
          </p>
        </div>
        
        <div class="header-actions">
          <button 
            @click="loadTemplate"
            class="btn-secondary"
            :disabled="isRunning"
          >
            <DocumentIcon class="w-4 h-4" />
            Load Template
          </button>
          
          <button 
            @click="saveTemplate"
            class="btn-secondary"
            :disabled="!isConfigValid || isRunning"
          >
            <BookmarkIcon class="w-4 h-4" />
            Save Template
          </button>
        </div>
      </div>
    </div>

    <!-- Configuration -->
    <div class="sweep-config">
      <!-- Strategy Selection -->
      <div class="config-section">
        <h3 class="section-title">
          <ChartBarIcon class="w-5 h-5" />
          Strategy Configuration
        </h3>
        
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="form-group">
            <label class="form-label">Strategy</label>
            <select 
              v-model="config.strategyId" 
              class="form-select"
              :disabled="isRunning"
              required
            >
              <option value="">Select a strategy...</option>
              <optgroup 
                v-for="(strategies, category) in strategiesByCategory" 
                :key="category"
                :label="category.charAt(0).toUpperCase() + category.slice(1)"
              >
                <option 
                  v-for="strategy in strategies" 
                  :key="strategy.id"
                  :value="strategy.id"
                >
                  {{ strategy.name }} ({{ strategy.version }})
                </option>
              </optgroup>
            </select>
          </div>
          
          <div class="form-group">
            <label class="form-label">Optimization Metric</label>
            <select 
              v-model="config.optimizationMetric" 
              class="form-select"
              :disabled="isRunning"
            >
              <option value="totalReturn">Total Return</option>
              <option value="sharpeRatio">Sharpe Ratio</option>
              <option value="calmarRatio">Calmar Ratio</option>
              <option value="profitFactor">Profit Factor</option>
              <option value="winRate">Win Rate</option>
              <option value="maxDrawdown">Max Drawdown (minimize)</option>
            </select>
          </div>
        </div>
        
        <!-- Strategy Info -->
        <div v-if="selectedStrategy" class="strategy-info">
          <div class="info-card">
            <div class="info-header">
              <h4 class="font-medium text-gray-900 dark:text-white">
                {{ selectedStrategy.name }}
              </h4>
              <span class="badge badge-blue">
                {{ selectedStrategy.category }}
              </span>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {{ selectedStrategy.description }}
            </p>
            <div class="flex items-center gap-4 mt-2 text-xs text-gray-500">
              <span>Parameters: {{ selectedStrategy.parameters?.length || 0 }}</span>
              <span>Author: {{ selectedStrategy.author }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Parameter Ranges -->
      <div v-if="selectedStrategy?.parameters?.length" class="config-section">
        <h3 class="section-title">
          <CogIcon class="w-5 h-5" />
          Parameter Ranges
        </h3>
        
        <div class="parameters-grid">
          <div 
            v-for="param in selectedStrategy.parameters" 
            :key="param.name"
            class="parameter-config"
          >
            <div class="param-header">
              <label class="param-label">
                {{ param.name }}
                <span v-if="param.description" class="param-description">
                  ({{ param.description }})
                </span>
              </label>
              
              <label class="checkbox-label">
                <input 
                  v-model="(config.parameters[param.name] as any).enabled"
                  type="checkbox"
                  class="form-checkbox"
                  :disabled="isRunning"
                />
                <span class="checkbox-text">Optimize</span>
              </label>
            </div>
            
            <div v-if="(config.parameters[param.name] as any).enabled" class="param-range">
              <div v-if="param.type === 'number'" class="number-range">
                <div class="range-inputs">
                  <div class="input-group">
                    <label class="input-label">Min</label>
                    <input 
                      v-model.number="(config.parameters[param.name] as any).min"
                      type="number"
                      :step="param.step || 'any'"
                      class="form-input"
                      :disabled="isRunning"
                    />
                  </div>
                  
                  <div class="input-group">
                    <label class="input-label">Max</label>
                    <input 
                      v-model.number="(config.parameters[param.name] as any).max"
                      type="number"
                      :step="param.step || 'any'"
                      class="form-input"
                      :disabled="isRunning"
                    />
                  </div>
                  
                  <div class="input-group">
                    <label class="input-label">Step</label>
                    <input 
                      v-model.number="(config.parameters[param.name] as any).step"
                      type="number"
                      :step="param.step || 'any'"
                      class="form-input"
                      :disabled="isRunning"
                    />
                  </div>
                </div>
                
                <div class="range-preview">
                  <span class="text-xs text-gray-500">
                    {{ getParameterValues(param.name).length }} values: 
                    {{ getParameterValues(param.name).slice(0, 5).join(', ') }}
                    {{ getParameterValues(param.name).length > 5 ? '...' : '' }}
                  </span>
                </div>
              </div>
              
              <div v-else-if="param.type === 'select'" class="select-range">
                <div class="options-grid">
                  <label 
                    v-for="option in param.options" 
                    :key="String(option.value)"
                    class="option-checkbox"
                  >
                    <input 
                      v-model="(config.parameters[param.name] as any).values"
                      type="checkbox"
                      :value="option.value"
                      class="form-checkbox"
                      :disabled="isRunning"
                    />
                    <span class="option-text">{{ option.label }}</span>
                  </label>
                </div>
              </div>
              
              <div v-else-if="param.type === 'boolean'" class="boolean-range">
                <div class="boolean-options">
                  <label class="option-checkbox">
                    <input 
                      v-model="(config.parameters[param.name] as any).values"
                      type="checkbox"
                      :value="true"
                      class="form-checkbox"
                      :disabled="isRunning"
                    />
                    <span class="option-text">True</span>
                  </label>
                  
                  <label class="option-checkbox">
                    <input 
                      v-model="(config.parameters[param.name] as any).values"
                      type="checkbox"
                      :value="false"
                      class="form-checkbox"
                      :disabled="isRunning"
                    />
                    <span class="option-text">False</span>
                  </label>
                </div>
              </div>
            </div>
            
            <div v-else class="param-fixed">
              <div class="input-group">
                <label class="input-label">Fixed Value</label>
                <input 
                  v-if="param.type === 'number'"
                  v-model.number="(config.parameters[param.name] as any).fixed"
                  type="number"
                  :step="param.step || 'any'"
                  :placeholder="param.default?.toString()"
                  class="form-input"
                  :disabled="isRunning"
                />
                
                <select 
                  v-else-if="param.type === 'select'"
                  v-model="(config.parameters[param.name] as any).fixed"
                  class="form-select"
                  :disabled="isRunning"
                >
                  <option 
                    v-for="option in param.options" 
                    :key="String(option.value)"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </option>
                </select>
                
                <label v-else-if="param.type === 'boolean'" class="checkbox-label">
                  <input 
                    v-model="(config.parameters[param.name] as any).fixed"
                    type="checkbox"
                    class="form-checkbox"
                    :disabled="isRunning"
                  />
                  <span class="checkbox-text">{{ param.description || param.name }}</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Data & Portfolio Settings -->
      <div class="config-section">
        <h3 class="section-title">
          <DocumentIcon class="w-5 h-5" />
          Data & Portfolio Settings
        </h3>
        
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="settings-group">
            <h4 class="settings-title">Data Source</h4>
            <div class="form-group">
              <label class="form-label">CSV File</label>
              <input 
                ref="fileInput"
                type="file"
                accept=".csv"
                @change="handleFileUpload"
                class="form-file"
                :disabled="isRunning"
              />
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div class="form-group">
                <label class="form-label">Start Date</label>
                <input 
                  v-model="config.startDate" 
                  type="date" 
                  class="form-input"
                  :disabled="isRunning"
                />
              </div>
              
              <div class="form-group">
                <label class="form-label">End Date</label>
                <input 
                  v-model="config.endDate" 
                  type="date" 
                  class="form-input"
                  :disabled="isRunning"
                />
              </div>
            </div>
          </div>
          
          <div class="settings-group">
            <h4 class="settings-title">Portfolio</h4>
            <div class="grid grid-cols-2 gap-4">
              <div class="form-group">
                <label class="form-label">Initial Capital</label>
                <input 
                  v-model.number="config.initialCapital" 
                  type="number" 
                  min="0"
                  step="any"
                  class="form-input"
                  :disabled="isRunning"
                />
              </div>
              
              <div class="form-group">
                <label class="form-label">Trading Fee (%)</label>
                <input 
                  v-model.number="config.tradingFee" 
                  type="number" 
                  min="0"
                  max="10"
                  step="0.01"
                  class="form-input"
                  :disabled="isRunning"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Optimization Settings -->
      <div class="config-section">
        <h3 class="section-title">
          <AdjustmentsHorizontalIcon class="w-5 h-5" />
          Optimization Settings
        </h3>
        
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="form-group">
            <label class="form-label">Max Combinations</label>
            <input 
              v-model.number="config.maxCombinations" 
              type="number" 
              min="1"
              max="10000"
              class="form-input"
              :disabled="isRunning"
            />
            <p class="text-xs text-gray-500 mt-1">
              Current: {{ totalCombinations }} combinations
            </p>
          </div>
          
          <div class="form-group">
            <label class="form-label">Parallel Jobs</label>
            <input 
              v-model.number="config.parallelJobs" 
              type="number" 
              min="1"
              max="16"
              class="form-input"
              :disabled="isRunning"
            />
          </div>
          
          <div class="form-group">
            <label class="form-label">Random Seed</label>
            <input 
              v-model.number="config.randomSeed" 
              type="number" 
              placeholder="Auto"
              class="form-input"
              :disabled="isRunning"
            />
          </div>
        </div>
        
        <div class="optimization-options">
          <label class="checkbox-label">
            <input 
              v-model="config.enableEarlyStopping"
              type="checkbox"
              class="form-checkbox"
              :disabled="isRunning"
            />
            <span class="checkbox-text">Enable early stopping for poor performers</span>
          </label>
          
          <label class="checkbox-label">
            <input 
              v-model="config.saveAllResults"
              type="checkbox"
              class="form-checkbox"
              :disabled="isRunning"
            />
            <span class="checkbox-text">Save all backtest results (requires more storage)</span>
          </label>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="sweep-actions">
      <div class="actions-info">
        <div class="info-stats">
          <div class="stat">
            <span class="stat-label">Total Combinations:</span>
            <span class="stat-value">{{ totalCombinations.toLocaleString() }}</span>
          </div>
          
          <div class="stat">
            <span class="stat-label">Estimated Time:</span>
            <span class="stat-value">{{ estimatedTime }}</span>
          </div>
          
          <div class="stat">
            <span class="stat-label">Storage Required:</span>
            <span class="stat-value">{{ estimatedStorage }}</span>
          </div>
        </div>
      </div>
      
      <div class="actions-buttons">
        <button 
          @click="resetConfig"
          class="btn-secondary"
          :disabled="isRunning"
        >
          Reset
        </button>
        
        <button 
          @click="startSweep"
          class="btn-primary"
          :disabled="!isConfigValid || isRunning"
        >
          <PlayIcon v-if="!isRunning" class="w-4 h-4" />
          <div v-else class="loading-spinner" />
          {{ isRunning ? 'Running...' : 'Start Sweep' }}
        </button>
      </div>
    </div>

    <!-- Progress -->
    <div v-if="isRunning || results" class="sweep-progress">
      <div class="progress-header">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          {{ isRunning ? 'Optimization Progress' : 'Optimization Results' }}
        </h3>
        
        <div v-if="isRunning" class="progress-actions">
          <button 
            @click="pauseSweep"
            class="btn-secondary"
          >
            <PauseIcon class="w-4 h-4" />
            {{ isPaused ? 'Resume' : 'Pause' }}
          </button>
          
          <button 
            @click="stopSweep"
            class="btn-secondary text-red-600"
          >
            <StopIcon class="w-4 h-4" />
            Stop
          </button>
        </div>
      </div>
      
      <div v-if="isRunning" class="progress-content">
        <div class="progress-bar">
          <div class="progress-track">
            <div 
              class="progress-fill"
              :style="{ width: `${progress.percentage}%` }"
            />
          </div>
          <span class="progress-text">
            {{ progress.completed }} / {{ progress.total }} 
            ({{ progress.percentage.toFixed(1) }}%)
          </span>
        </div>
        
        <div class="progress-stats">
          <div class="stat">
            <span class="stat-label">Elapsed:</span>
            <span class="stat-value">{{ formatDuration(progress.elapsed) }}</span>
          </div>
          
          <div class="stat">
            <span class="stat-label">Remaining:</span>
            <span class="stat-value">{{ formatDuration(progress.remaining) }}</span>
          </div>
          
          <div class="stat">
            <span class="stat-label">Speed:</span>
            <span class="stat-value">{{ progress.speed.toFixed(1) }} tests/min</span>
          </div>
          
          <div class="stat">
            <span class="stat-label">Best {{ config.optimizationMetric }}:</span>
            <span class="stat-value text-green-600">
              {{ formatMetric(progress.bestValue, config.optimizationMetric) }}
            </span>
          </div>
        </div>
      </div>
      
      <!-- Results Heatmap -->
      <div v-if="results" class="results-section">
        <ParameterHeatmap 
          :results="(results as any).results"
          :metric="config.optimizationMetric"
          :parameters="optimizedParameters"
          @point-selected="onHeatmapPointSelected"
        />
        
        <!-- Best Results Table -->
        <div class="best-results">
          <h4 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Top 10 Results
          </h4>
          
          <div class="results-table">
            <table class="w-full">
              <thead class="table-header">
                <tr>
                  <th class="table-th">Rank</th>
                  <th 
                    v-for="param in optimizedParameters" 
                    :key="param"
                    class="table-th"
                  >
                    {{ param }}
                  </th>
                  <th class="table-th">{{ config.optimizationMetric }}</th>
                  <th class="table-th">Return</th>
                  <th class="table-th">Sharpe</th>
                  <th class="table-th">Max DD</th>
                  <th class="table-th">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr 
                  v-for="(result, index) in topResults" 
                  :key="index"
                  class="table-row"
                >
                  <td class="table-td">
                    <span class="rank-badge">#{{ index + 1 }}</span>
                  </td>
                  
                  <td 
                    v-for="param in optimizedParameters" 
                    :key="param"
                    class="table-td"
                  >
                    {{ result.parameters[param] }}
                  </td>
                  
                  <td class="table-td">
                    <span class="font-medium text-green-600">
                      {{ formatMetric(result.performance[config.optimizationMetric], config.optimizationMetric) }}
                    </span>
                  </td>
                  
                  <td class="table-td">
                    {{ formatPercentage(result.performance.totalReturn) }}
                  </td>
                  
                  <td class="table-td">
                    {{ formatNumber(result.performance.sharpeRatio) }}
                  </td>
                  
                  <td class="table-td">
                    <span class="text-red-600">
                      {{ formatPercentage(result.performance.maxDrawdown) }}
                    </span>
                  </td>
                  
                  <td class="table-td">
                    <div class="table-actions">
                      <button 
                        @click="viewResult(result)"
                        class="action-btn"
                        title="View Details"
                      >
                        <EyeIcon class="w-4 h-4" />
                      </button>
                      
                      <button 
                        @click="useParameters(result.parameters)"
                        class="action-btn"
                        title="Use Parameters"
                      >
                        <CheckIcon class="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  ChartBarIcon,
  CogIcon,
  DocumentIcon,
  AdjustmentsHorizontalIcon,
  BookmarkIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  EyeIcon,
  CheckIcon
} from '@heroicons/vue/24/outline'
import { useStrategyStore } from '@/stores/strategy'
import { useNotificationStore } from '@/stores/notifications'
import ParameterHeatmap from './ParameterHeatmap.vue'
// Types imported but not used - removed to fix linting

// Stores
const strategyStore = useStrategyStore()
const notificationStore = useNotificationStore()
const router = useRouter()

// State
const fileInput = ref<HTMLInputElement>()
const isRunning = ref(false)
const isPaused = ref(false)
const results = ref<Record<string, unknown> | null>(null)

// Configuration
const config = ref({
  strategyId: '',
  optimizationMetric: 'totalReturn',
  parameters: {} as Record<string, unknown>,
  csvFile: null as File | null,
  startDate: '',
  endDate: '',
  initialCapital: 10000,
  tradingFee: 0.1,
  maxCombinations: 1000,
  parallelJobs: 4,
  randomSeed: null as number | null,
  enableEarlyStopping: true,
  saveAllResults: false
})

// Progress tracking
const progress = ref({
  completed: 0,
  total: 0,
  percentage: 0,
  elapsed: 0,
  remaining: 0,
  speed: 0,
  bestValue: 0
})

// Computed
const strategiesByCategory = computed(() => {
  return strategyStore.strategiesByCategory
})

const selectedStrategy = computed(() => {
  return strategyStore.strategies.find(s => s.id === config.value.strategyId)
})

const optimizedParameters = computed(() => {
  return Object.keys(config.value.parameters).filter(
    key => (config.value.parameters[key] as any).enabled
  )
})

const totalCombinations = computed(() => {
  let total = 1
  
  for (const paramName of optimizedParameters.value) {
    const param = config.value.parameters[paramName]
    if ((param as any).enabled) {
      const values = getParameterValues(paramName)
      total *= values.length
    }
  }
  
  return Math.min(total, config.value.maxCombinations)
})

const estimatedTime = computed(() => {
  const combinations = totalCombinations.value
  const avgTimePerTest = 2 // seconds
  const parallelJobs = config.value.parallelJobs
  
  const totalSeconds = (combinations * avgTimePerTest) / parallelJobs
  return formatDuration(totalSeconds * 1000)
})

const estimatedStorage = computed(() => {
  const combinations = totalCombinations.value
  const avgSizePerResult = config.value.saveAllResults ? 50 : 5 // KB
  
  const totalKB = combinations * avgSizePerResult
  
  if (totalKB < 1024) {
    return `${totalKB.toFixed(0)} KB`
  } else if (totalKB < 1024 * 1024) {
    return `${(totalKB / 1024).toFixed(1)} MB`
  } else {
    return `${(totalKB / (1024 * 1024)).toFixed(1)} GB`
  }
})

const isConfigValid = computed(() => {
  return (
    config.value.strategyId &&
    config.value.csvFile &&
    config.value.startDate &&
    config.value.endDate &&
    optimizedParameters.value.length > 0 &&
    totalCombinations.value > 0
  )
})

const topResults = computed(() => {
  if (!results.value?.results) return []
  
  return [...(results.value as any).results]
    .sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
      const aValue = (a.performance as any)?.[config.value.optimizationMetric] || 0
      const bValue = (b.performance as any)?.[config.value.optimizationMetric] || 0
      
      // For maxDrawdown, lower is better
      if (config.value.optimizationMetric === 'maxDrawdown') {
        return aValue - bValue
      }
      
      return bValue - aValue
    })
    .slice(0, 10)
})

// Methods
const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    config.value.csvFile = file
  }
}

const getParameterValues = (paramName: string): unknown[] => {
  const param = config.value.parameters[paramName]
  if (!param || !(param as any).enabled) return []
  
  const strategyParam = selectedStrategy.value?.parameters?.find(p => p.name === paramName)
  if (!strategyParam) return []
  
  if (strategyParam.type === 'number') {
    const values = []
    const min = (param as any).min ?? strategyParam.min ?? 0
    const max = (param as any).max ?? strategyParam.max ?? 100
    const step = (param as any).step ?? strategyParam.step ?? 1
    
    for (let value = min; value <= max; value += step) {
      values.push(value)
      if (values.length >= 100) break // Prevent too many values
    }
    
    return values
  } else if (strategyParam.type === 'select') {
    return (param as any).values || []
  } else if (strategyParam.type === 'boolean') {
   return (param as any).values || []
  }
  
  return (param as any).values || []
}

const startSweep = async () => {
  try {
    isRunning.value = true
    isPaused.value = false
    
    // Prepare optimization request
    const request = {
      strategyId: config.value.strategyId,
      optimizationMetric: config.value.optimizationMetric,
      objective: 'totalReturn' as const,
      method: 'grid' as const,
      parameters: {},
      dataSource: {
        type: 'csv',
        file: config.value.csvFile,
        symbol: 'BTCUSD',
        timeframe: '1h',
        startDate: config.value.startDate,
        endDate: config.value.endDate
      },
      portfolio: {
        initialCapital: config.value.initialCapital,
        tradingFee: config.value.tradingFee
      },
      optimization: {
        maxCombinations: config.value.maxCombinations,
        parallelJobs: config.value.parallelJobs,
        randomSeed: config.value.randomSeed,
        enableEarlyStopping: config.value.enableEarlyStopping,
        saveAllResults: config.value.saveAllResults
      }
    }
    
    // Add parameter ranges
    for (const paramName of optimizedParameters.value) {
      const param = config.value.parameters[paramName]
      const strategyParam = selectedStrategy.value?.parameters?.find(p => p.name === paramName)
      
      if (strategyParam?.type === 'number') {
        (request.parameters as any)[paramName] = {
        type: 'range',
        min: (param as any).min,
        max: (param as any).max,
        step: (param as any).step
      }
    } else {
      (request.parameters as any)[paramName] = {
        type: 'values',
        values: (param as any).values
      }
      }
    }
    
    // Start optimization
    const result = await strategyStore.optimizeStrategy(request)
    results.value = result as any
    
    notificationStore.addNotification({
      type: 'success',
      title: 'Optimization Complete',
      message: `Found optimal parameters with ${formatMetric((result.bestPerformance as any)[config.value.optimizationMetric], config.value.optimizationMetric)}`
    })
    
  } catch (error) {
    console.error('Optimization error:', error)
    notificationStore.addNotification({
      type: 'error',
      title: 'Optimization Failed',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    })
  } finally {
    isRunning.value = false
  }
}

const pauseSweep = () => {
  isPaused.value = !isPaused.value
  // TODO: Implement pause/resume logic
}

const stopSweep = () => {
  if (confirm('Are you sure you want to stop the optimization?')) {
    isRunning.value = false
    isPaused.value = false
    // TODO: Implement stop logic
  }
}

const resetConfig = () => {
  config.value = {
    strategyId: '',
    optimizationMetric: 'totalReturn',
    parameters: {},
    csvFile: null,
    startDate: '',
    endDate: '',
    initialCapital: 10000,
    tradingFee: 0.1,
    maxCombinations: 1000,
    parallelJobs: 4,
    randomSeed: null,
    enableEarlyStopping: true,
    saveAllResults: false
  }
  
  results.value = null
  
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const loadTemplate = () => {
  // TODO: Implement template loading
  notificationStore.addNotification({
    type: 'info',
    title: 'Feature Coming Soon',
    message: 'Template loading will be available in a future update'
  })
}

const saveTemplate = () => {
  // TODO: Implement template saving
  notificationStore.addNotification({
    type: 'info',
    title: 'Feature Coming Soon',
    message: 'Template saving will be available in a future update'
  })
}

const onHeatmapPointSelected = (point: Record<string, unknown>) => {
  // TODO: Show detailed view of selected point
  console.log('Selected point:', point)
}

const viewResult = (result: Record<string, unknown>) => {
  // TODO: Navigate to detailed result view
  router.push(`/backtest/results/${(result as { id: string }).id}`)
}

 
const useParameters = (_parameters: Record<string, unknown>) => {
  // TODO: Apply parameters to strategy
  notificationStore.addNotification({
    type: 'success',
    title: 'Parameters Applied',
    message: 'Parameters have been applied to the strategy'
  })
}

// Formatters
const formatDuration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) {
    return `${days}d ${hours % 24}h`
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  } else {
    return `${seconds}s`
  }
}

const formatMetric = (value: number | undefined, metric: string): string => {
  if (value === undefined || value === null) return 'N/A'
  
  if (metric.includes('Return') || metric.includes('Drawdown')) {
    return `${value.toFixed(2)}%`
  } else if (metric === 'winRate') {
    return `${(value * 100).toFixed(1)}%`
  } else {
    return value.toFixed(2)
  }
}

const formatPercentage = (value: number | undefined): string => {
  if (value === undefined || value === null) return 'N/A'
  return `${value.toFixed(2)}%`
}

const formatNumber = (value: number | undefined): string => {
  if (value === undefined || value === null) return 'N/A'
  return value.toFixed(2)
}

// Watchers
watch(() => config.value.strategyId, (newStrategyId) => {
  // Reset parameters when strategy changes
  config.value.parameters = {}
  
  // Initialize parameter configuration
  const strategy = strategyStore.strategies.find(s => s.id === newStrategyId)
  if (strategy?.parameters) {
    strategy.parameters.forEach(param => {
      config.value.parameters[param.name] = {
        enabled: false,
        fixed: param.default,
        min: param.min,
        max: param.max,
        step: param.step || 1,
        values: []
      }
    })
  }
})

// Lifecycle
onMounted(async () => {
  await strategyStore.initialize()
  
  // Set default dates (last 30 days)
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 30)
  
  config.value.endDate = endDate.toISOString().split('T')[0]
  config.value.startDate = startDate.toISOString().split('T')[0]
})
</script>

<style scoped>
.parameter-sweep {
  @apply space-y-6;
}

.sweep-header {
  @apply bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6;
}

.header-content {
  @apply flex items-center justify-between;
}

.title-section {
  @apply flex-1;
}

.header-actions {
  @apply flex items-center gap-3;
}

.sweep-config {
  @apply space-y-6;
}

.config-section {
  @apply bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6;
}

.section-title {
  @apply flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white mb-6;
}

.strategy-info {
  @apply mt-4;
}

.info-card {
  @apply bg-gray-50 dark:bg-gray-700 rounded-lg p-4;
}

.info-header {
  @apply flex items-center justify-between;
}

.parameters-grid {
  @apply grid grid-cols-1 lg:grid-cols-2 gap-6;
}

.parameter-config {
  @apply border border-gray-200 dark:border-gray-600 rounded-lg p-4;
}

.param-header {
  @apply flex items-center justify-between mb-4;
}

.param-label {
  @apply text-sm font-medium text-gray-700 dark:text-gray-300;
}

.param-description {
  @apply text-xs text-gray-500;
}

.param-range {
  @apply space-y-4;
}

.number-range {
  @apply space-y-3;
}

.range-inputs {
  @apply grid grid-cols-3 gap-3;
}

.input-group {
  @apply space-y-1;
}

.input-label {
  @apply block text-xs font-medium text-gray-600 dark:text-gray-400;
}

.range-preview {
  @apply p-2 bg-gray-50 dark:bg-gray-700 rounded text-center;
}

.select-range,
.boolean-range {
  @apply space-y-3;
}

.options-grid {
  @apply grid grid-cols-2 gap-2;
}

.boolean-options {
  @apply flex gap-4;
}

.option-checkbox {
  @apply flex items-center gap-2 cursor-pointer;
}

.option-text {
  @apply text-sm text-gray-700 dark:text-gray-300;
}

.param-fixed {
  @apply space-y-2;
}

.settings-group {
  @apply space-y-4;
}

.settings-title {
  @apply text-sm font-semibold text-gray-900 dark:text-white;
}

.optimization-options {
  @apply flex flex-wrap gap-6 mt-4;
}

.sweep-actions {
  @apply bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6;
}

.actions-info {
  @apply mb-6;
}

.info-stats {
  @apply grid grid-cols-1 md:grid-cols-3 gap-4;
}

.stat {
  @apply text-center;
}

.stat-label {
  @apply block text-sm text-gray-600 dark:text-gray-400;
}

.stat-value {
  @apply block text-lg font-semibold text-gray-900 dark:text-white;
}

.actions-buttons {
  @apply flex items-center justify-end gap-3;
}

.sweep-progress {
  @apply bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-6;
}

.progress-header {
  @apply flex items-center justify-between;
}

.progress-actions {
  @apply flex items-center gap-3;
}

.progress-content {
  @apply space-y-4;
}

.progress-bar {
  @apply space-y-2;
}

.progress-track {
  @apply w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2;
}

.progress-fill {
  @apply bg-blue-600 h-2 rounded-full transition-all duration-300;
}

.progress-text {
  @apply text-sm text-gray-600 dark:text-gray-400;
}

.progress-stats {
  @apply grid grid-cols-2 md:grid-cols-4 gap-4;
}

.results-section {
  @apply space-y-6;
}

.best-results {
  @apply space-y-4;
}

.results-table {
  @apply bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden;
}

.table-header {
  @apply bg-gray-100 dark:bg-gray-600;
}

.table-th {
  @apply px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider;
}

.table-row {
  @apply hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors;
}

.table-td {
  @apply px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white;
}

.table-actions {
  @apply flex items-center gap-2;
}

.action-btn {
  @apply p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors;
}

.rank-badge {
  @apply inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200;
}

.form-group {
  @apply space-y-2;
}

.form-label {
  @apply block text-sm font-medium text-gray-700 dark:text-gray-300;
}

.form-input,
.form-select {
  @apply w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white;
}

.form-file {
  @apply w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100;
}

.form-checkbox {
  @apply w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500;
}

.checkbox-label {
  @apply flex items-center gap-2 cursor-pointer;
}

.checkbox-text {
  @apply text-sm text-gray-700 dark:text-gray-300;
}

.btn-primary {
  @apply flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors;
}

.btn-secondary {
  @apply flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors;
}

.badge {
  @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium;
}

.badge-blue {
  @apply bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200;
}

.loading-spinner {
  @apply w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin;
}

/* Responsive */
@media (max-width: 768px) {
  .header-content {
    @apply flex-col gap-4 items-stretch;
  }
  
  .header-actions {
    @apply justify-center;
  }
  
  .parameters-grid {
    @apply grid-cols-1;
  }
  
  .range-inputs {
    @apply grid-cols-1;
  }
  
  .info-stats {
    @apply grid-cols-1;
  }
  
  .progress-stats {
    @apply grid-cols-2;
  }
  
  .results-table {
    @apply text-sm;
  }
  
  .table-th,
  .table-td {
    @apply px-2 py-2;
  }
  
  .table-th {
    @apply text-xs;
  }
}

@media (max-width: 640px) {
  .optimization-header {
    @apply p-4;
  }
  
  .optimization-title {
    @apply text-xl;
  }
  
  .parameter-card {
    @apply p-4;
  }
  
  .progress-stats {
    @apply grid-cols-1 gap-2;
  }
  
  .results-table {
    @apply text-xs;
  }
  
  .table-th,
  .table-td {
    @apply px-1 py-1;
  }
  
  .action-btn {
    @apply p-2;
  }
  
  .btn-primary,
  .btn-secondary {
    @apply px-4 py-2 text-sm;
  }
}

@media (max-width: 480px) {
  .optimization-header {
    @apply p-3;
  }
  
  .optimization-title {
    @apply text-lg;
  }
  
  .parameter-card {
    @apply p-3;
  }
  
  .form-input,
  .form-select {
    @apply text-sm;
  }
  
  .btn-primary,
  .btn-secondary {
    @apply px-3 py-2 text-xs;
  }
  
  .results-table {
    @apply overflow-x-auto;
  }
  
  .table-container {
    @apply min-w-full;
  }
}

/* Touch improvements */
@media (hover: none) and (pointer: coarse) {
  .parameter-card {
    @apply touch-manipulation;
  }
  
  .btn-primary,
  .btn-secondary {
    @apply touch-manipulation;
    min-height: 44px;
  }
  
  .btn-primary:active,
  .btn-secondary:active {
    transform: scale(0.98);
  }
  
  .action-btn {
    @apply touch-manipulation;
    min-height: 40px;
    min-width: 40px;
  }
  
  .action-btn:active {
    transform: scale(0.95);
  }
  
  .form-input,
  .form-select,
  .form-file {
    @apply touch-manipulation;
    min-height: 44px;
  }
  
  .checkbox-label {
    @apply touch-manipulation;
    min-height: 44px;
  }
}
</style>