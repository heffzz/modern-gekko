<template>
  <div class="indicator-preview-modal">
    <div class="modal-backdrop" @click="$emit('close')"></div>
    
    <div class="modal-content">
      <!-- Header -->
      <div class="modal-header">
        <div class="header-info">
          <h2 class="modal-title">{{ indicator.displayName }}</h2>
          <span class="indicator-category">{{ indicator.category }}</span>
        </div>
        <button @click="$emit('close')" class="close-btn">
          <XMarkIcon class="w-6 h-6" />
        </button>
      </div>

      <!-- Content -->
      <div class="modal-body">
        <!-- Description -->
        <div class="description-section">
          <h3 class="section-title">Description</h3>
          <p class="description-text">{{ indicator.description }}</p>
        </div>

        <!-- Parameters -->
        <div class="parameters-section">
          <h3 class="section-title">Parameters</h3>
          <div class="parameters-grid">
            <div
              v-for="param in indicator.parameters"
              :key="param.name"
              class="parameter-item"
            >
              <label class="parameter-label">{{ param.name }}</label>
              <div class="parameter-input">
                <input
                  v-if="param.type === 'number'"
                  v-model.number="parameterValues[param.name]"
                  type="number"
                  :min="param.min"
                  :max="param.max"
                  :step="param.step || 1"
                  class="number-input"
                  @input="updatePreview"
                />
                <select
                  v-else-if="param.type === 'select'"
                  v-model="parameterValues[param.name]"
                  class="select-input"
                  @change="updatePreview"
                >
                  <option
                    v-for="option in param.options"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </option>
                </select>
                <input
                  v-else
                  v-model="parameterValues[param.name]"
                  type="text"
                  class="text-input"
                  @input="updatePreview"
                />
              </div>
              <span v-if="param.description" class="parameter-description">
                {{ param.description }}
              </span>
            </div>
          </div>
        </div>

        <!-- Preview Chart -->
        <div class="preview-section">
          <h3 class="section-title">Preview</h3>
          <div class="preview-container">
            <div v-if="isLoadingPreview" class="preview-loading">
              <div class="loading-spinner"></div>
              <p>Generating preview...</p>
            </div>
            
            <div v-else-if="previewError" class="preview-error">
              <ExclamationTriangleIcon class="w-8 h-8 text-red-500" />
              <p class="error-message">{{ previewError }}</p>
              <button @click="updatePreview" class="retry-btn">
                <ArrowPathIcon class="w-4 h-4" />
                Retry
              </button>
            </div>
            
            <div v-else-if="previewData" class="preview-chart">
              <!-- Mini chart component -->
              <canvas
                ref="previewCanvas"
                class="chart-canvas"
                :width="chartWidth"
                :height="chartHeight"
              ></canvas>
              
              <!-- Chart info -->
              <div class="chart-info">
                <div class="info-item">
                  <span class="info-label">Data Points:</span>
                  <span class="info-value">{{ previewData.dataPoints }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Time Range:</span>
                  <span class="info-value">{{ previewData.timeRange }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Last Value:</span>
                  <span class="info-value">{{ formatValue(previewData.lastValue) }}</span>
                </div>
              </div>
            </div>
            
            <div v-else class="preview-empty">
              <ChartBarIcon class="w-12 h-12 text-gray-400" />
              <p>No preview data available</p>
            </div>
          </div>
        </div>

        <!-- Statistics -->
        <div v-if="previewData?.statistics" class="statistics-section">
          <h3 class="section-title">Statistics</h3>
          <div class="statistics-grid">
            <div
              v-for="(value, key) in previewData.statistics"
              :key="key"
              class="stat-item"
            >
              <span class="stat-label">{{ formatStatLabel(key) }}</span>
              <span class="stat-value">{{ formatValue(value) }}</span>
            </div>
          </div>
        </div>

        <!-- Technical Info -->
        <div class="technical-section">
          <h3 class="section-title">Technical Information</h3>
          <div class="technical-grid">
            <div class="tech-item">
              <span class="tech-label">Time Complexity:</span>
              <span class="tech-value">{{ indicator.timeComplexity }}</span>
            </div>
            <div class="tech-item">
              <span class="tech-label">Memory Usage:</span>
              <span class="tech-value">{{ indicator.memoryUsage }}</span>
            </div>
            <div class="tech-item">
              <span class="tech-label">Output Type:</span>
              <span class="tech-value">{{ indicator.outputType }}</span>
            </div>
            <div class="tech-item">
              <span class="tech-label">Scale:</span>
              <span class="tech-value">{{ indicator.scale }}</span>
            </div>
            <div v-if="indicator.range" class="tech-item">
              <span class="tech-label">Range:</span>
              <span class="tech-value">{{ indicator.range.min }} - {{ indicator.range.max }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <button @click="$emit('close')" class="cancel-btn">
          Cancel
        </button>
        <button @click="addToChart" class="add-btn">
          <PlusIcon class="w-4 h-4" />
          Add to Chart
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick, watch } from 'vue'
import {
  XMarkIcon,
  PlusIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/vue/24/outline'
import type { Indicator, IndicatorPreviewData } from '@/types/indicators'

// Props
interface Props {
  indicator: Indicator
  previewData?: IndicatorPreviewData | null
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  close: []
  'add-to-chart': [indicator: Indicator, parameters: Record<string, any>]
}>()

// State
const parameterValues = reactive<Record<string, any>>({})
const isLoadingPreview = ref(false)
const previewError = ref('')
const previewData = ref<IndicatorPreviewData | null>(props.previewData || null)
const previewCanvas = ref<HTMLCanvasElement | null>(null)
const chartWidth = ref(400)
const chartHeight = ref(200)

// Initialize parameter values
const initializeParameters = () => {
  props.indicator.parameters.forEach(param => {
    parameterValues[param.name] = param.default
  })
}

// Update preview
const updatePreview = async () => {
  if (isLoadingPreview.value) return
  
  try {
    isLoadingPreview.value = true
    previewError.value = ''
    
    const response = await fetch(`/api/indicators/${props.indicator.name}/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        parameters: { ...parameterValues }
      })
    })
    
    if (!response.ok) {
      throw new Error(`Failed to generate preview: ${response.statusText}`)
    }
    
    previewData.value = await response.json()
    
    // Draw chart after data is loaded
    await nextTick()
    drawPreviewChart()
    
  } catch (error) {
    console.error('Preview update error:', error)
    previewError.value = error instanceof Error ? error.message : 'Unknown error'
  } finally {
    isLoadingPreview.value = false
  }
}

// Draw preview chart
const drawPreviewChart = () => {
  if (!previewCanvas.value || !previewData.value?.values) return
  
  const canvas = previewCanvas.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  // Clear canvas
  ctx.clearRect(0, 0, chartWidth.value, chartHeight.value)
  
  const values = previewData.value.values
  if (values.length === 0) return
  
  // Calculate bounds
  const minValue = Math.min(...values.filter(v => v !== null))
  const maxValue = Math.max(...values.filter(v => v !== null))
  const valueRange = maxValue - minValue || 1
  
  const padding = 20
  const chartAreaWidth = chartWidth.value - 2 * padding
  const chartAreaHeight = chartHeight.value - 2 * padding
  
  // Draw grid
  ctx.strokeStyle = '#e5e7eb'
  ctx.lineWidth = 1
  
  // Horizontal grid lines
  for (let i = 0; i <= 4; i++) {
    const y = padding + (i * chartAreaHeight) / 4
    ctx.beginPath()
    ctx.moveTo(padding, y)
    ctx.lineTo(chartWidth.value - padding, y)
    ctx.stroke()
  }
  
  // Vertical grid lines
  for (let i = 0; i <= 4; i++) {
    const x = padding + (i * chartAreaWidth) / 4
    ctx.beginPath()
    ctx.moveTo(x, padding)
    ctx.lineTo(x, chartHeight.value - padding)
    ctx.stroke()
  }
  
  // Draw indicator line
  ctx.strokeStyle = '#3b82f6'
  ctx.lineWidth = 2
  ctx.beginPath()
  
  let firstPoint = true
  values.forEach((value, index) => {
    if (value === null) return
    
    const x = padding + (index * chartAreaWidth) / (values.length - 1)
    const y = padding + chartAreaHeight - ((value - minValue) / valueRange) * chartAreaHeight
    
    if (firstPoint) {
      ctx.moveTo(x, y)
      firstPoint = false
    } else {
      ctx.lineTo(x, y)
    }
  })
  
  ctx.stroke()
  
  // Draw points
  ctx.fillStyle = '#3b82f6'
  values.forEach((value, index) => {
    if (value === null) return
    
    const x = padding + (index * chartAreaWidth) / (values.length - 1)
    const y = padding + chartAreaHeight - ((value - minValue) / valueRange) * chartAreaHeight
    
    ctx.beginPath()
    ctx.arc(x, y, 2, 0, 2 * Math.PI)
    ctx.fill()
  })
}

// Format value for display
const formatValue = (value: number | null): string => {
  if (value === null) return 'N/A'
  if (Math.abs(value) >= 1000) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
  }
  return value.toFixed(4)
}

// Format statistic label
const formatStatLabel = (key: string): string => {
  return key.replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim()
}

// Add to chart
const addToChart = () => {
  emit('add-to-chart', props.indicator, { ...parameterValues })
}

// Watch for parameter changes
watch(
  () => ({ ...parameterValues }),
  () => {
    // Debounce preview updates
    clearTimeout(updatePreview.timeout)
    updatePreview.timeout = setTimeout(updatePreview, 500)
  },
  { deep: true }
)

// Lifecycle
onMounted(() => {
  initializeParameters()
  
  if (props.previewData) {
    previewData.value = props.previewData
    nextTick(() => drawPreviewChart())
  } else {
    updatePreview()
  }
})
</script>

<style scoped>
.indicator-preview-modal {
  @apply fixed inset-0 z-50 flex items-center justify-center p-4;
}

.modal-backdrop {
  @apply absolute inset-0 bg-black/50 backdrop-blur-sm;
}

.modal-content {
  @apply relative bg-white dark:bg-gray-800 rounded-lg shadow-xl
         max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col;
}

/* Header */
.modal-header {
  @apply flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700;
}

.header-info {
  @apply flex items-center gap-3;
}

.modal-title {
  @apply text-xl font-bold text-gray-900 dark:text-white;
}

.indicator-category {
  @apply px-2 py-1 text-xs font-medium rounded-full
         bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200;
}

.close-btn {
  @apply p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
         hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors;
}

/* Body */
.modal-body {
  @apply flex-1 p-6 overflow-y-auto space-y-6;
}

.section-title {
  @apply text-lg font-semibold text-gray-900 dark:text-white mb-3;
}

/* Description */
.description-text {
  @apply text-gray-600 dark:text-gray-400 leading-relaxed;
}

/* Parameters */
.parameters-grid {
  @apply grid grid-cols-1 md:grid-cols-2 gap-4;
}

.parameter-item {
  @apply space-y-2;
}

.parameter-label {
  @apply block text-sm font-medium text-gray-700 dark:text-gray-300;
}

.parameter-input {
  @apply relative;
}

.number-input,
.text-input,
.select-input {
  @apply w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
         focus:ring-2 focus:ring-blue-500 focus:border-transparent;
}

.parameter-description {
  @apply text-xs text-gray-500 dark:text-gray-400;
}

/* Preview */
.preview-container {
  @apply bg-gray-50 dark:bg-gray-900 rounded-lg p-4;
}

.preview-loading,
.preview-error,
.preview-empty {
  @apply flex flex-col items-center justify-center py-12 text-center;
}

.loading-spinner {
  @apply w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4;
}

.error-message {
  @apply text-red-600 dark:text-red-400 mb-4;
}

.retry-btn {
  @apply flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg
         hover:bg-blue-600 transition-colors;
}

.preview-chart {
  @apply space-y-4;
}

.chart-canvas {
  @apply w-full border border-gray-200 dark:border-gray-700 rounded-lg;
}

.chart-info {
  @apply grid grid-cols-3 gap-4;
}

.info-item {
  @apply text-center;
}

.info-label {
  @apply block text-xs text-gray-500 dark:text-gray-400 mb-1;
}

.info-value {
  @apply block text-sm font-medium text-gray-900 dark:text-white;
}

/* Statistics */
.statistics-grid {
  @apply grid grid-cols-2 md:grid-cols-4 gap-4;
}

.stat-item {
  @apply bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-center;
}

.stat-label {
  @apply block text-xs text-gray-500 dark:text-gray-400 mb-1;
}

.stat-value {
  @apply block text-sm font-medium text-gray-900 dark:text-white;
}

/* Technical */
.technical-grid {
  @apply grid grid-cols-1 md:grid-cols-2 gap-3;
}

.tech-item {
  @apply flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700 last:border-b-0;
}

.tech-label {
  @apply text-sm text-gray-600 dark:text-gray-400;
}

.tech-value {
  @apply text-sm font-medium text-gray-900 dark:text-white;
}

/* Footer */
.modal-footer {
  @apply flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700;
}

.cancel-btn {
  @apply px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600
         rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors;
}

.add-btn {
  @apply flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg
         hover:bg-blue-600 transition-colors;
}

/* Responsive */
@media (max-width: 768px) {
  .modal-content {
    @apply max-w-full m-2;
  }
  
  .parameters-grid {
    @apply grid-cols-1;
  }
  
  .chart-info {
    @apply grid-cols-1 gap-2;
  }
  
  .statistics-grid {
    @apply grid-cols-2;
  }
  
  .technical-grid {
    @apply grid-cols-1;
  }
}
</style>