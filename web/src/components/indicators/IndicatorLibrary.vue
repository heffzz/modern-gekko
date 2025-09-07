<template>
  <div class="indicator-library">
    <!-- Header -->
    <div class="library-header">
      <div class="header-content">
        <h2 class="library-title">
          <ChartBarIcon class="w-6 h-6" />
          Indicator Library
        </h2>
        <p class="library-description">
          Browse and configure technical indicators for your charts
        </p>
      </div>
      
      <!-- Search and Filters -->
      <div class="search-filters">
        <div class="search-box">
          <MagnifyingGlassIcon class="search-icon" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search indicators..."
            class="search-input"
          />
        </div>
        
        <div class="filter-buttons">
          <button
            v-for="category in categories"
            :key="category"
            @click="selectedCategory = selectedCategory === category ? 'all' : category"
            :class="[
              'filter-btn',
              selectedCategory === category ? 'active' : ''
            ]"
          >
            {{ category }}
          </button>
        </div>
      </div>
    </div>

    <!-- Indicators Grid -->
    <div class="indicators-grid">
      <div
        v-for="indicator in filteredIndicators"
        :key="indicator.name"
        class="indicator-card"
        @click="selectIndicator(indicator)"
      >
        <div class="card-header">
          <div class="indicator-info">
            <h3 class="indicator-name">{{ indicator.displayName }}</h3>
            <span class="indicator-category">{{ indicator.category }}</span>
          </div>
          <div class="indicator-actions">
            <button
              @click.stop="previewIndicator(indicator)"
              class="action-btn preview-btn"
              :disabled="isLoading"
            >
              <EyeIcon class="w-4 h-4" />
            </button>
            <button
              @click.stop="addToChart(indicator)"
              class="action-btn add-btn"
              :disabled="isLoading"
            >
              <PlusIcon class="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <p class="indicator-description">{{ indicator.description }}</p>
        
        <div class="indicator-params">
          <span class="params-label">Parameters:</span>
          <div class="params-list">
            <span
              v-for="param in indicator.parameters"
              :key="param.name"
              class="param-tag"
            >
              {{ param.name }}
            </span>
          </div>
        </div>
        
        <div class="indicator-meta">
          <span class="meta-item">
            <ClockIcon class="w-3 h-3" />
            {{ indicator.timeComplexity }}
          </span>
          <span class="meta-item">
            <CpuChipIcon class="w-3 h-3" />
            {{ indicator.memoryUsage }}
          </span>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="filteredIndicators.length === 0" class="empty-state">
      <ChartBarIcon class="empty-icon" />
      <h3 class="empty-title">No indicators found</h3>
      <p class="empty-description">
        Try adjusting your search or filter criteria
      </p>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <p class="loading-text">{{ loadingText }}</p>
    </div>

    <!-- Preview Modal -->
    <IndicatorPreview
      v-if="showPreview && selectedIndicator"
      :indicator="selectedIndicator"
      :preview-data="previewData"
      @close="closePreview"
      @add-to-chart="addToChart"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  ChartBarIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  PlusIcon,
  ClockIcon,
  CpuChipIcon
} from '@heroicons/vue/24/outline'
import IndicatorPreview from './IndicatorPreview.vue'
import { useIndicatorsStore } from '@/stores/indicators'
import { useNotificationStore } from '@/stores/notifications'
import type { Indicator, IndicatorPreviewData } from '@/types/indicators'

// Stores
const indicatorStore = useIndicatorsStore()
const notificationStore = useNotificationStore()

// State
const searchQuery = ref('')
const selectedCategory = ref('all')
const selectedIndicator = ref<Indicator | null>(null)
const showPreview = ref(false)
const previewData = ref<IndicatorPreviewData | null>(null)
const isLoading = ref(false)
const loadingText = ref('')

// Categories
const categories = ref([
  'all',
  'trend',
  'momentum',
  'volatility',
  'volume',
  'oscillator',
  'support_resistance'
])

// Available indicators
const indicators = ref<Indicator[]>([
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
  },
  {
    name: 'macd',
    displayName: 'MACD',
    category: 'momentum',
    description: 'Moving Average Convergence Divergence indicator',
    parameters: [
      { name: 'fastPeriod', type: 'number', default: 12, min: 1, max: 50 },
      { name: 'slowPeriod', type: 'number', default: 26, min: 1, max: 100 },
      { name: 'signalPeriod', type: 'number', default: 9, min: 1, max: 50 }
    ],
    timeComplexity: 'O(1)',
    memoryUsage: 'Medium',
    outputType: 'multi-line',
    scale: 'separate'
  },
  {
    name: 'bb',
    displayName: 'Bollinger Bands',
    category: 'volatility',
    description: 'Volatility bands around a moving average',
    parameters: [
      { name: 'period', type: 'number', default: 20, min: 2, max: 100 },
      { name: 'stdDev', type: 'number', default: 2, min: 0.1, max: 5, step: 0.1 }
    ],
    timeComplexity: 'O(1)',
    memoryUsage: 'Medium',
    outputType: 'bands',
    scale: 'price'
  },
  {
    name: 'stoch',
    displayName: 'Stochastic Oscillator',
    category: 'momentum',
    description: 'Momentum indicator comparing closing price to price range',
    parameters: [
      { name: 'kPeriod', type: 'number', default: 14, min: 1, max: 100 },
      { name: 'dPeriod', type: 'number', default: 3, min: 1, max: 20 }
    ],
    timeComplexity: 'O(1)',
    memoryUsage: 'Medium',
    outputType: 'multi-line',
    scale: 'separate',
    range: { min: 0, max: 100 }
  },
  {
    name: 'atr',
    displayName: 'Average True Range',
    category: 'volatility',
    description: 'Measure of market volatility',
    parameters: [
      { name: 'period', type: 'number', default: 14, min: 1, max: 100 }
    ],
    timeComplexity: 'O(1)',
    memoryUsage: 'Low',
    outputType: 'line',
    scale: 'separate'
  },
  {
    name: 'volume_sma',
    displayName: 'Volume SMA',
    category: 'volume',
    description: 'Simple moving average of volume',
    parameters: [
      { name: 'period', type: 'number', default: 20, min: 1, max: 200 }
    ],
    timeComplexity: 'O(1)',
    memoryUsage: 'Low',
    outputType: 'line',
    scale: 'volume'
  }
])

// Computed
const filteredIndicators = computed(() => {
  let filtered = indicators.value
  
  // Filter by category
  if (selectedCategory.value !== 'all') {
    filtered = filtered.filter(indicator => 
      indicator.category === selectedCategory.value
    )
  }
  
  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(indicator =>
      indicator.displayName.toLowerCase().includes(query) ||
      indicator.description.toLowerCase().includes(query) ||
      indicator.name.toLowerCase().includes(query)
    )
  }
  
  return filtered
})

// Methods
const selectIndicator = (indicator: Indicator) => {
  selectedIndicator.value = indicator
}

const previewIndicator = async (indicator: Indicator) => {
  try {
    isLoading.value = true
    loadingText.value = `Generating preview for ${indicator.displayName}...`
    
    // Call API to get preview data
    const response = await fetch(`/api/indicators/${indicator.name}/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        parameters: indicator.parameters.reduce((acc, param) => {
          acc[param.name] = param.default
          return acc
        }, {} as Record<string, any>)
      })
    })
    
    if (!response.ok) {
      throw new Error(`Failed to generate preview: ${response.statusText}`)
    }
    
    previewData.value = await response.json()
    selectedIndicator.value = indicator
    showPreview.value = true
    
  } catch (error) {
    console.error('Preview error:', error)
    notificationStore.addNotification({
      type: 'error',
      title: 'Preview Failed',
      message: `Failed to generate preview for ${indicator.displayName}`,
      duration: 5000
    })
  } finally {
    isLoading.value = false
  }
}

const addToChart = (indicator: Indicator) => {
  try {
    // Add indicator to chart store
    indicatorStore.addIndicator({
      ...indicator,
      id: `${indicator.name}_${Date.now()}`,
      parameters: indicator.parameters.reduce((acc, param) => {
        acc[param.name] = param.default
        return acc
      }, {} as Record<string, any>),
      visible: true,
      color: indicatorStore.getNextColor()
    } as any)
    
    notificationStore.addNotification({
      type: 'success',
      title: 'Indicator Added',
      message: `${indicator.displayName} has been added to the chart`,
      duration: 3000
    })
    
    // Close preview if open
    if (showPreview.value) {
      closePreview()
    }
    
  } catch (error) {
    console.error('Add indicator error:', error)
    notificationStore.addNotification({
      type: 'error',
      title: 'Failed to Add Indicator',
      message: `Could not add ${indicator.displayName} to chart`,
      duration: 5000
    })
  }
}

const closePreview = () => {
  showPreview.value = false
  selectedIndicator.value = null
  previewData.value = null
}

// Lifecycle
onMounted(() => {
  // Load indicators from store if available
  if (indicatorStore.availableIndicators.length > 0) {
    indicators.value = indicatorStore.availableIndicators
  }
})
</script>

<style scoped>
.indicator-library {
  @apply relative h-full flex flex-col;
}

/* Header */
.library-header {
  @apply flex-shrink-0 p-6 border-b border-gray-200 dark:border-gray-700;
}

.header-content {
  @apply mb-6;
}

.library-title {
  @apply flex items-center gap-3 text-2xl font-bold text-gray-900 dark:text-white mb-2;
}

.library-description {
  @apply text-gray-600 dark:text-gray-400;
}

.search-filters {
  @apply space-y-4;
}

.search-box {
  @apply relative;
}

.search-icon {
  @apply absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400;
}

.search-input {
  @apply w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
         bg-white dark:bg-gray-800 text-gray-900 dark:text-white
         focus:ring-2 focus:ring-blue-500 focus:border-transparent;
}

.filter-buttons {
  @apply flex flex-wrap gap-2;
}

.filter-btn {
  @apply px-3 py-1.5 text-sm font-medium rounded-full border
         border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300
         hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors;
}

.filter-btn.active {
  @apply bg-blue-500 border-blue-500 text-white hover:bg-blue-600;
}

/* Indicators Grid */
.indicators-grid {
  @apply flex-1 p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto;
}

.indicator-card {
  @apply bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700
         p-4 cursor-pointer hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600
         transition-all duration-200;
}

.card-header {
  @apply flex items-start justify-between mb-3;
}

.indicator-info {
  @apply flex-1;
}

.indicator-name {
  @apply text-lg font-semibold text-gray-900 dark:text-white mb-1;
}

.indicator-category {
  @apply inline-block px-2 py-1 text-xs font-medium rounded-full
         bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200;
}

.indicator-actions {
  @apply flex gap-2;
}

.action-btn {
  @apply p-2 rounded-lg border border-gray-300 dark:border-gray-600
         hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
         disabled:opacity-50 disabled:cursor-not-allowed;
}

.preview-btn {
  @apply text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400;
}

.add-btn {
  @apply text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400;
}

.indicator-description {
  @apply text-sm text-gray-600 dark:text-gray-400 mb-3;
}

.indicator-params {
  @apply mb-3;
}

.params-label {
  @apply text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block;
}

.params-list {
  @apply flex flex-wrap gap-1;
}

.param-tag {
  @apply px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300
         rounded;
}

.indicator-meta {
  @apply flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400;
}

.meta-item {
  @apply flex items-center gap-1;
}

/* Empty State */
.empty-state {
  @apply flex-1 flex flex-col items-center justify-center p-12 text-center;
}

.empty-icon {
  @apply w-16 h-16 text-gray-400 mb-4;
}

.empty-title {
  @apply text-xl font-semibold text-gray-900 dark:text-white mb-2;
}

.empty-description {
  @apply text-gray-600 dark:text-gray-400;
}

/* Loading */
.loading-overlay {
  @apply absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm
         flex flex-col items-center justify-center z-50;
}

.loading-spinner {
  @apply w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4;
}

.loading-text {
  @apply text-gray-600 dark:text-gray-400 font-medium;
}

/* Responsive */
@media (max-width: 768px) {
  .indicators-grid {
    @apply grid-cols-1 gap-4 p-4;
  }
  
  .library-header {
    @apply p-4;
  }
  
  .filter-buttons {
    @apply grid grid-cols-3 gap-2;
  }
  
  .filter-btn {
    @apply text-center;
  }
}
</style>