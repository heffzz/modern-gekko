<template>
  <div class="backtest-form">
    <!-- Header -->
    <div class="form-header">
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
        Configure Backtest
      </h2>
      <p class="text-gray-600 dark:text-gray-400 mt-1">
        Set up your backtest parameters and run historical analysis
      </p>
    </div>

    <!-- Form -->
    <form @submit.prevent="runBacktest" class="form-content">
      <!-- Strategy Selection -->
      <div class="form-section">
        <h3 class="section-title">
          <ChartBarIcon class="w-5 h-5" />
          Strategy
        </h3>
        
        <div class="strategy-selector">
          <select 
            v-model="form.strategyId" 
            required
            class="form-select"
            :disabled="isLoading"
            data-testid="strategy-select"
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
          
          <button 
            type="button"
            @click="openStrategyEditor"
            class="btn-secondary"
            :disabled="isLoading"
          >
            <PlusIcon class="w-4 h-4" />
            New Strategy
          </button>
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
              <span>Author: {{ selectedStrategy.author }}</span>
              <span>Version: {{ selectedStrategy.version }}</span>
              <span v-if="selectedStrategy.tags?.length">
                Tags: {{ selectedStrategy.tags.join(', ') }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Data Source -->
      <div class="form-section">
        <h3 class="section-title">
          <DocumentIcon class="w-5 h-5" />
          Data Source
        </h3>
        
        <div class="data-source-tabs">
          <button 
            type="button"
            v-for="source in dataSources"
            :key="source.id"
            @click="form.dataSource.type = source.id"
            :class="[
              'tab-button',
              form.dataSource.type === source.id ? 'tab-active' : 'tab-inactive'
            ]"
            :disabled="isLoading"
          >
            <component :is="source.icon" class="w-4 h-4" />
            {{ source.label }}
          </button>
        </div>
        
        <!-- CSV Upload -->
        <div v-if="form.dataSource.type === 'csv'" class="data-config">
          <div class="file-upload">
            <input 
              ref="fileInput"
              type="file"
              accept=".csv"
              @change="handleFileUpload"
              class="hidden"
              :disabled="isLoading"
              data-testid="csv-file"
            />
            
            <div 
              @click="fileInput?.click()"
              @dragover.prevent
              @drop.prevent="handleFileDrop"
              :class="[
                'upload-area',
                isDragOver ? 'drag-over' : '',
                form.csvFile ? 'has-file' : ''
              ]"
            >
              <div v-if="!form.csvFile" class="upload-placeholder">
                <CloudArrowUpIcon class="w-8 h-8 text-gray-400" />
                <p class="text-sm font-medium text-gray-900 dark:text-white">
                  Click to upload or drag and drop
                </p>
                <p class="text-xs text-gray-500">
                  CSV files with OHLCV data
                </p>
              </div>
              
              <div v-else class="file-info">
                <DocumentIcon class="w-6 h-6 text-blue-500" />
                <div class="file-details">
                  <p class="font-medium text-gray-900 dark:text-white">
                    {{ form.csvFile.name }}
                  </p>
                  <p class="text-sm text-gray-500">
                    {{ formatFileSize(form.csvFile.size) }}
                  </p>
                </div>
                <button 
                  type="button"
                  @click.stop="removeFile"
                  class="btn-icon-sm text-red-500 hover:text-red-700"
                >
                  <XMarkIcon class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          
          <!-- CSV Preview -->
          <div v-if="csvPreview" class="csv-preview">
            <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-2">
              Data Preview ({{ csvPreview.totalRows }} rows)
            </h4>
            <div class="preview-table">
              <table class="w-full text-xs">
                <thead>
                  <tr class="bg-gray-50 dark:bg-gray-800">
                    <th v-for="header in csvPreview.headers" :key="header" class="px-2 py-1 text-left">
                      {{ header }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, index) in csvPreview.rows" :key="index" class="border-t border-gray-200 dark:border-gray-700">
                    <td v-for="(cell, cellIndex) in row" :key="cellIndex" class="px-2 py-1">
                      {{ cell }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        <!-- Exchange Data -->
        <div v-else-if="form.dataSource.type === 'exchange'" class="data-config">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="form-group">
              <label class="form-label">Exchange</label>
              <select v-model="form.exchange" class="form-select" :disabled="isLoading">
                <option value="">Select exchange...</option>
                <option value="binance">Binance</option>
                <option value="coinbase">Coinbase Pro</option>
                <option value="kraken">Kraken</option>
                <option value="mock">Mock Exchange</option>
              </select>
            </div>
            
            <div class="form-group">
              <label class="form-label">Trading Pair</label>
              <input 
                v-model="form.symbol" 
                type="text" 
                placeholder="BTC/USDT"
                class="form-input"
                :disabled="isLoading"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Time Range -->
      <div class="form-section">
        <h3 class="section-title">
          <CalendarIcon class="w-5 h-5" />
          Time Range
        </h3>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="form-group">
            <label class="form-label">Start Date</label>
            <input 
              v-model="form.startDate" 
              type="date" 
              class="form-input"
              :disabled="isLoading"
              required
              data-testid="start-date"
            />
          </div>
          
          <div class="form-group">
            <label class="form-label">End Date</label>
            <input 
              v-model="form.endDate" 
              type="date" 
              class="form-input"
              :disabled="isLoading"
              required
              data-testid="end-date"
            />
          </div>
          
          <div class="form-group">
            <label class="form-label">Timeframe</label>
            <select v-model="form.timeframe" class="form-select" :disabled="isLoading">
              <option value="1m">1 minute</option>
              <option value="5m">5 minutes</option>
              <option value="15m">15 minutes</option>
              <option value="1h">1 hour</option>
              <option value="4h">4 hours</option>
              <option value="1d">1 day</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Strategy Parameters -->
      <div v-if="selectedStrategy?.parameters?.length" class="form-section">
        <h3 class="section-title">
          <CogIcon class="w-5 h-5" />
          Strategy Parameters
        </h3>
        
        <div class="parameters-grid">
          <div 
            v-for="param in selectedStrategy.parameters" 
            :key="param.name"
            class="form-group"
          >
            <label class="form-label">
              {{ param.name }}
              <span v-if="param.description" class="text-xs text-gray-500">
                ({{ param.description }})
              </span>
            </label>
            
            <input 
              v-if="param.type === 'number'"
              v-model.number="form.parameters[param.name]"
              type="number"
              :min="param.min"
              :max="param.max"
              :step="param.step || 'any'"
              :placeholder="param.default?.toString()"
              class="form-input"
              :disabled="isLoading"
            />
            
            <input 
              v-else-if="param.type === 'string'"
              v-model="form.parameters[param.name]"
              type="text"
              :placeholder="param.default?.toString()"
              class="form-input"
              :disabled="isLoading"
            />
            
            <select 
              v-else-if="param.type === 'select'"
              v-model="form.parameters[param.name]"
              class="form-select"
              :disabled="isLoading"
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
                v-model="form.parameters[param.name]"
                type="checkbox"
                class="form-checkbox"
                :disabled="isLoading"
              />
              <span class="checkbox-text">{{ param.description || param.name }}</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Portfolio Settings -->
      <div class="form-section">
        <h3 class="section-title">
          <BanknotesIcon class="w-5 h-5" />
          Portfolio Settings
        </h3>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="form-group">
            <label class="form-label">Initial Capital</label>
            <input 
              v-model.number="form.portfolio.initialCapital" 
              type="number" 
              min="0"
              step="any"
              placeholder="10000"
              class="form-input"
              :disabled="isLoading"
              required
              data-testid="initial-capital"
            />
          </div>
          
          <div class="form-group">
            <label class="form-label">Trading Fee (%)</label>
            <input 
              v-model.number="form.portfolio.tradingFee" 
              type="number" 
              min="0"
              max="10"
              step="0.01"
              placeholder="0.1"
              class="form-input"
              :disabled="isLoading"
              data-testid="trading-fee"
            />
          </div>
          
          <div class="form-group">
            <label class="form-label">Slippage (%)</label>
            <input 
              v-model.number="form.portfolio.slippage" 
              type="number" 
              min="0"
              max="5"
              step="0.01"
              placeholder="0.05"
              class="form-input"
              :disabled="isLoading"
            />
          </div>
        </div>
      </div>

      <!-- Advanced Options -->
      <div class="form-section">
        <button 
          type="button"
          @click="showAdvanced = !showAdvanced"
          class="advanced-toggle"
          data-testid="advanced-toggle"
        >
          <ChevronDownIcon 
            :class="['w-4 h-4 transition-transform', showAdvanced ? 'rotate-180' : '']"
          />
          Advanced Options
        </button>
        
        <div v-if="showAdvanced" class="advanced-options">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="form-group">
              <label class="checkbox-label">
                <input 
                  v-model="form.warmupPeriod"
                  type="checkbox"
                  class="form-checkbox"
                  :disabled="isLoading"
                />
                <span class="checkbox-text">Enable warmup period</span>
              </label>
            </div>
            
            <div class="form-group">
              <label class="checkbox-label">
                <input 
                  v-model="form.paperTrading"
                  type="checkbox"
                  class="form-checkbox"
                  :disabled="isLoading"
                />
                <span class="checkbox-text">Paper trading mode</span>
              </label>
            </div>
            
            <div class="form-group">
              <label class="form-label">Random Seed</label>
              <input 
                v-model.number="form.randomSeed" 
                type="number" 
                placeholder="Auto"
                class="form-input"
                :disabled="isLoading"
              />
            </div>
            
            <div class="form-group">
              <label class="form-label">Max Trades</label>
              <input 
                v-model.number="form.maxTrades" 
                type="number" 
                min="1"
                placeholder="Unlimited"
                class="form-input"
                :disabled="isLoading"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="form-actions">
        <button 
          type="button"
          @click="saveAsTemplate"
          class="btn-secondary"
          :disabled="isLoading || !isFormValid"
        >
          <PlusIcon class="w-4 h-4" />
          Save as Template
        </button>
        
        <div class="flex gap-3">
          <button 
            type="button"
            @click="resetForm"
            class="btn-secondary"
            :disabled="isLoading"
          >
            Reset
          </button>
          
          <button 
            type="submit"
            class="btn-primary"
            :disabled="isLoading || !isFormValid"
            data-testid="run-backtest-btn"
          >
            <PlayIcon v-if="!isLoading" class="w-4 h-4" />
            <div v-else class="loading-spinner" />
            {{ isLoading ? 'Running...' : 'Run Backtest' }}
          </button>
        </div>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  ChartBarIcon,
  DocumentIcon,
  CalendarIcon,
  CogIcon,
  BanknotesIcon,
  CloudArrowUpIcon,
  PlusIcon,
  XMarkIcon,
  ChevronDownIcon,
  PlayIcon
} from '@heroicons/vue/24/outline'
import { useStrategyStore } from '@/stores/strategy'
import { useBacktestStore } from '@/stores/backtest'
import { useNotificationStore } from '@/stores/notifications'


// Props
interface Props {
  template?: any
}

const props = withDefaults(defineProps<Props>(), {
  template: null
})

// Emits
const emit = defineEmits<{
  'backtest-started': [request: any]
  'backtest-completed': [result: any]
}>()

// Stores
const strategyStore = useStrategyStore()
const backtestStore = useBacktestStore()
const notificationStore = useNotificationStore()
const router = useRouter()

// State
const fileInput = ref<HTMLInputElement>()
const isDragOver = ref(false)
const showAdvanced = ref(false)
const isLoading = ref(false)
const csvPreview = ref<any>(null)
const error = ref<string | null>(null)

// Form data
const form = ref({
  strategyId: '',
  dataSource: {
    type: 'csv',
    startDate: '',
    endDate: ''
  },
  csvFile: null as File | null,
  exchange: '',
  symbol: '',
  startDate: '',
  endDate: '',
  timeframe: '1h',
  parameters: {} as Record<string, any>,
  portfolio: {
    initialCapital: 10000,
    tradingFee: 0.001,
    slippage: 0.05
  },
  warmupPeriod: false,
  paperTrading: true,
  randomSeed: null,
  maxTrades: null
})

// Data sources
const dataSources = [
  {
    id: 'csv',
    label: 'CSV File',
    icon: DocumentIcon
  },
  {
    id: 'exchange',
    label: 'Exchange Data',
    icon: ChartBarIcon
  }
]

// Computed
const strategiesByCategory = computed(() => {
  return strategyStore.strategiesByCategory
})

const selectedStrategy = computed(() => {
  return strategyStore.strategies.find(s => s.id === form.value.strategyId)
})

const isFormValid = computed(() => {
  return Boolean(
    form.value.strategyId &&
    form.value.startDate &&
    form.value.endDate &&
    form.value.portfolio.initialCapital > 0 &&
    (
      (form.value.dataSource.type === 'csv' && form.value.csvFile) ||
      (form.value.dataSource.type === 'exchange' && form.value.exchange && form.value.symbol)
    )
  )
})

const estimatedDuration = computed(() => {
  const startDate = new Date(form.value.dataSource.startDate || form.value.startDate)
  const endDate = new Date(form.value.dataSource.endDate || form.value.endDate)
  
  if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return 'Invalid date range'
  }
  
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return `${diffDays} days`
})

// Methods
const handleFileUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    await processFile(file)
  }
}

const handleFileDrop = async (event: DragEvent) => {
  isDragOver.value = false
  const file = event.dataTransfer?.files[0]
  if (file && file.type === 'text/csv') {
    await processFile(file)
  }
}

const processFile = async (file: File) => {
  try {
    form.value.csvFile = file
    
    // Generate preview
    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim())
    
    if (lines.length > 0) {
      const headers = lines[0].split(',')
      const rows = lines.slice(1, 6).map(line => line.split(','))
      
      csvPreview.value = {
        headers,
        rows,
        totalRows: lines.length - 1
      }
    }
    
  } catch (error) {
    console.error('File processing error:', error)
    notificationStore.error('File Error', 'Failed to process CSV file')
  }
}

const removeFile = () => {
  form.value.csvFile = null
  csvPreview.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const validateFile = (file: File): boolean => {
  if (!file) {
    return false
  }
  
  // Check file type - must be CSV
  const isValidType = file.type.includes('csv') || file.name.endsWith('.csv')
  if (!isValidType) {
    return false
  }
  
  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) {
    return false
  }
  
  return true
}

const updateParameter = (name: string, value: any) => {
  form.value.parameters[name] = value
}

const openStrategyEditor = () => {
  router.push('/strategies/editor')
}

const runBacktest = async () => {
  try {
    isLoading.value = true
    error.value = null
    
    // Validate request
    const errors = backtestStore.validateRequest(form.value)
    if (errors.length > 0) {
      notificationStore.error('Validation Error', errors.join(', '))
      return
    }
    
    // Prepare request
    const request = {
      ...form.value,
      parameters: {
        ...form.value.parameters
      }
    }
    
    // Fill default parameters
    if (selectedStrategy.value?.parameters) {
      selectedStrategy.value.parameters.forEach(param => {
        if (!(param.name in request.parameters)) {
          request.parameters[param.name] = param.default
        }
      })
    }
    
    // Start backtest
    const result = await backtestStore.startBacktest(request)
    
    emit('backtest-started', result)
    
    notificationStore.success('Backtest Started', 'Backtest has been started successfully')
    
    // Navigate to results
    router.push(`/backtest/results/${result.id}`)
    
  } catch (err) {
    console.error('Backtest error:', err)
    error.value = err instanceof Error ? err.message : 'Unknown error occurred'
    notificationStore.error('Backtest Failed', error.value)
  } finally {
    isLoading.value = false
  }
}

const saveAsTemplate = () => {
  // TODO: Implement template saving
  notificationStore.info('Feature Coming Soon', 'Template saving will be available in a future update')
}

const resetForm = () => {
  form.value = {
    strategyId: '',
    dataSource: {
      type: 'csv',
      startDate: '',
      endDate: ''
    },
    csvFile: null,
    exchange: '',
    symbol: '',
    startDate: '',
    endDate: '',
    timeframe: '1h',
    parameters: {},
    portfolio: {
      initialCapital: 10000,
      tradingFee: 0.001,
      slippage: 0.05
    },
    warmupPeriod: false,
    paperTrading: true,
    randomSeed: null,
    maxTrades: null
  }
  
  csvPreview.value = null
  showAdvanced.value = false
  
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

// Method for tests
const validateParameters = () => {
  const errors: string[] = []
  
  if (!selectedStrategy.value?.parameters) return errors
  
  for (const param of selectedStrategy.value.parameters) {
    const value = form.value.parameters[param.name]
    
    // Check required parameters
    if (param.required && (value === undefined || value === null || value === '')) {
      errors.push(`${param.name} is required`)
      continue
    }
    
    // Check range validation for numbers
    if (param.type === 'number' && value !== undefined && value !== null && value !== '') {
      if (param.min !== undefined && value < param.min) {
        errors.push(`${param.name} must be at least ${param.min}`)
      }
      if (param.max !== undefined && value > param.max) {
        errors.push(`${param.name} must be at most ${param.max}`)
      }
    }
  }
  
  return errors
}

// Method for date validation
const validateDateRange = () => {
  const errors = []
  
  const startDate = new Date(form.value.dataSource.startDate || form.value.startDate)
  const endDate = new Date(form.value.dataSource.endDate || form.value.endDate)
  
  if (startDate && endDate && startDate >= endDate) {
    errors.push('End date must be after start date')
  }
  
  return errors
}

// Watchers
watch(() => form.value.strategyId, (newStrategyId) => {
  // Reset parameters when strategy changes
  form.value.parameters = {}
  
  // Set default parameters
  const strategy = strategyStore.strategies.find(s => s.id === newStrategyId)
  if (strategy?.parameters && Array.isArray(strategy.parameters)) {
    strategy.parameters.forEach(param => {
      form.value.parameters[param.name] = param.default
    })
  }
})

watch(() => props.template, (template) => {
  if (template) {
    Object.assign(form.value, template)
  }
}, { immediate: true })

// Lifecycle
onMounted(async () => {
  await strategyStore.initialize()
  
  // Set default dates (last 30 days)
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 30)
  
  form.value.endDate = endDate.toISOString().split('T')[0]
  form.value.startDate = startDate.toISOString().split('T')[0]
})

// Expose for testing
defineExpose({
  form,
  validateParameters,
  validateDateRange,
  validateFile,
  resetForm,
  runBacktest,
  handleFileUpload,
  selectedStrategy,
  isFormValid,
  estimatedDuration,
  error,
  updateParameter,
  formatFileSize,
  handleFileDrop,
  processFile,
  removeFile
})
</script>

<style scoped>
.backtest-form {
  @apply max-w-4xl mx-auto p-6 space-y-8;
}

.form-header {
  @apply text-center;
}

.form-content {
  @apply space-y-8;
}

.form-section {
  @apply bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700;
}

.section-title {
  @apply flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white mb-4;
}

.strategy-selector {
  @apply flex gap-3;
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

.data-source-tabs {
  @apply flex gap-1 mb-4 bg-gray-100 dark:bg-gray-700 rounded-lg p-1;
}

.tab-button {
  @apply flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors;
}

.tab-active {
  @apply bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm;
}

.tab-inactive {
  @apply text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white;
}

.data-config {
  @apply space-y-4;
}

.file-upload {
  @apply space-y-4;
}

.upload-area {
  @apply border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer transition-colors;
}

.upload-area:hover {
  @apply border-gray-400 dark:border-gray-500;
}

.upload-area.drag-over {
  @apply border-blue-500 bg-blue-50 dark:bg-blue-900/20;
}

.upload-area.has-file {
  @apply border-green-500 bg-green-50 dark:bg-green-900/20;
}

.upload-placeholder {
  @apply space-y-2;
}

.file-info {
  @apply flex items-center gap-3;
}

.file-details {
  @apply flex-1 text-left;
}

.csv-preview {
  @apply bg-gray-50 dark:bg-gray-700 rounded-lg p-4;
}

.preview-table {
  @apply overflow-x-auto;
}

.parameters-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4;
}

.advanced-toggle {
  @apply flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors;
}

.advanced-options {
  @apply mt-4 pt-4 border-t border-gray-200 dark:border-gray-700;
}

.form-actions {
  @apply flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700;
}

.form-group {
  @apply space-y-2;
}

.form-label {
  @apply block text-sm font-medium text-gray-700 dark:text-gray-300;
}

.form-input {
  @apply w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white;
}

.form-select {
  @apply w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white;
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

.btn-icon-sm {
  @apply p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors;
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
  .backtest-form {
    @apply p-4;
  }
  
  .form-section {
    @apply p-4;
  }
  
  .strategy-selector {
    @apply flex-col;
  }
  
  .form-actions {
    @apply flex-col gap-4 items-stretch;
  }
  
  .form-actions > div {
    @apply flex gap-3;
  }
}
</style>