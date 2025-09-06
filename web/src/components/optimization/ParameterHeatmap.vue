<template>
  <div class="parameter-heatmap">
    <!-- Header -->
    <div class="heatmap-header">
      <div class="header-content">
        <div class="title-section">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            Parameter Optimization Heatmap
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {{ formatMetric(0, metric) }} by parameter combinations
          </p>
        </div>
        
        <div class="header-controls">
          <div class="control-group">
            <label class="control-label">X-Axis Parameter</label>
            <select 
              v-model="xParameter" 
              class="control-select"
            >
              <option 
                v-for="param in parameters" 
                :key="param"
                :value="param"
              >
                {{ param }}
              </option>
            </select>
          </div>
          
          <div class="control-group">
            <label class="control-label">Y-Axis Parameter</label>
            <select 
              v-model="yParameter" 
              class="control-select"
            >
              <option 
                v-for="param in parameters" 
                :key="param"
                :value="param"
              >
                {{ param }}
              </option>
            </select>
          </div>
          
          <div class="control-group">
            <label class="control-label">Color Scale</label>
            <select 
              v-model="colorScale" 
              class="control-select"
            >
              <option value="linear">Linear</option>
              <option value="log">Logarithmic</option>
              <option value="percentile">Percentile</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Heatmap Container -->
    <div class="heatmap-container">
      <div v-if="!canRenderHeatmap" class="heatmap-placeholder">
        <div class="placeholder-content">
          <ChartBarIcon class="w-12 h-12 text-gray-400" />
          <h4 class="text-lg font-medium text-gray-900 dark:text-white mt-4">
            Select Parameters
          </h4>
          <p class="text-gray-600 dark:text-gray-400 mt-2">
            Choose X and Y axis parameters to view the optimization heatmap
          </p>
        </div>
      </div>
      
      <div v-else class="heatmap-content">
        <!-- Y-Axis Label -->
        <div class="y-axis-label">
          <span class="axis-label-text">{{ yParameter }}</span>
        </div>
        
        <!-- Main Heatmap -->
        <div class="heatmap-main">
          <!-- Y-Axis Values -->
          <div class="y-axis">
            <div 
              v-for="(yValue, yIndex) in yValues" 
              :key="yIndex"
              class="y-tick"
              :style="{ height: `${cellHeight}px` }"
            >
              <span class="tick-label">{{ formatValue(yValue) }}</span>
            </div>
          </div>
          
          <!-- Heatmap Grid -->
          <div class="heatmap-grid">
            <div 
              v-for="(yValue, yIndex) in yValues" 
              :key="yIndex"
              class="heatmap-row"
            >
              <div 
                v-for="(xValue, xIndex) in xValues" 
                :key="xIndex"
                class="heatmap-cell"
                :style="{
                  backgroundColor: getCellColor(xValue, yValue),
                  width: `${cellWidth}px`,
                  height: `${cellHeight}px`
                }"
                @click="onCellClick(xValue, yValue)"
                @mouseenter="onCellHover(xValue, yValue, $event)"
                @mouseleave="hideTooltip"
              >
                <span v-if="showValues" class="cell-value">
                  {{ formatCellValue(getCellValue(xValue, yValue)) }}
                </span>
              </div>
            </div>
          </div>
          
          <!-- Color Scale Legend -->
          <div class="color-legend">
            <div class="legend-title">{{ formatMetric(0, metric) }}</div>
            <div class="legend-scale">
              <div 
                v-for="(color, index) in colorLegend" 
                :key="index"
                class="legend-step"
                :style="{ backgroundColor: color.color }"
                :title="formatMetric(color.value, metric)"
              />
            </div>
            <div class="legend-labels">
              <span class="legend-min">{{ formatMetric(minValue, metric) }}</span>
              <span class="legend-max">{{ formatMetric(maxValue, metric) }}</span>
            </div>
          </div>
        </div>
        
        <!-- X-Axis -->
        <div class="x-axis">
          <div 
            v-for="(xValue, xIndex) in xValues" 
            :key="xIndex"
            class="x-tick"
            :style="{ width: `${cellWidth}px` }"
          >
            <span class="tick-label">{{ formatValue(xValue) }}</span>
          </div>
        </div>
        
        <!-- X-Axis Label -->
        <div class="x-axis-label">
          <span class="axis-label-text">{{ xParameter }}</span>
        </div>
      </div>
    </div>

    <!-- Controls -->
    <div class="heatmap-controls">
      <div class="controls-section">
        <label class="checkbox-label">
          <input 
            v-model="showValues"
            type="checkbox"
            class="form-checkbox"
          />
          <span class="checkbox-text">Show values in cells</span>
        </label>
        
        <label class="checkbox-label">
          <input 
            v-model="showGrid"
            type="checkbox"
            class="form-checkbox"
          />
          <span class="checkbox-text">Show grid lines</span>
        </label>
        
        <label class="checkbox-label">
          <input 
            v-model="smoothColors"
            type="checkbox"
            class="form-checkbox"
          />
          <span class="checkbox-text">Smooth color transitions</span>
        </label>
      </div>
      
      <div class="controls-section">
        <div class="control-group">
          <label class="control-label">Cell Size</label>
          <input 
            v-model.number="cellSize" 
            type="range" 
            min="20" 
            max="60" 
            step="5"
            class="range-slider"
          />
          <span class="range-value">{{ cellSize }}px</span>
        </div>
      </div>
      
      <div class="controls-section">
        <button 
          @click="exportHeatmap"
          class="btn-secondary"
        >
          <ArrowDownTrayIcon class="w-4 h-4" />
          Export PNG
        </button>
        
        <button 
          @click="resetView"
          class="btn-secondary"
        >
          <ArrowPathIcon class="w-4 h-4" />
          Reset View
        </button>
      </div>
    </div>

    <!-- Tooltip -->
    <div 
      v-if="tooltip.visible"
      ref="tooltipEl"
      class="heatmap-tooltip"
      :style="{
        left: `${tooltip.x}px`,
        top: `${tooltip.y}px`
      }"
    >
      <div class="tooltip-content">
        <div class="tooltip-header">
          <span class="tooltip-title">Parameter Combination</span>
        </div>
        
        <div class="tooltip-body">
          <div class="tooltip-param">
            <span class="param-name">{{ xParameter }}:</span>
            <span class="param-value">{{ formatValue(tooltip.xValue) }}</span>
          </div>
          
          <div class="tooltip-param">
            <span class="param-name">{{ yParameter }}:</span>
            <span class="param-value">{{ formatValue(tooltip.yValue) }}</span>
          </div>
          
          <div class="tooltip-divider" />
          
          <div class="tooltip-metric">
            <span class="metric-name">{{ formatMetric(0, metric) }}:</span>
            <span class="metric-value" :class="getMetricClass(tooltip.value)">
              {{ formatMetric(tooltip.value, metric) }}
            </span>
          </div>
          
          <div v-if="tooltip.rank" class="tooltip-rank">
            <span class="rank-text">Rank: #{{ tooltip.rank }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import {
  ChartBarIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon
} from '@heroicons/vue/24/outline'

// Props
interface Props {
  results: {
    results: Array<{
      parameters: Record<string, any>
      performance: Record<string, number>
    }>
  }
  metric: string
  parameters: string[]
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  pointSelected: [point: {
    xValue: any
    yValue: any
    value: number
    parameters: Record<string, any>
    performance: Record<string, number>
  }]
}>()

// State
const xParameter = ref(props.parameters[0] || '')
const yParameter = ref(props.parameters[1] || '')
const colorScale = ref('linear')
const showValues = ref(false)
const showGrid = ref(true)
const smoothColors = ref(true)
const cellSize = ref(40)

// Tooltip
const tooltip = ref({
  visible: false,
  x: 0,
  y: 0,
  xValue: null as any,
  yValue: null as any,
  value: 0,
  rank: null as number | null
})

const tooltipEl = ref<HTMLElement>()

// Computed
const canRenderHeatmap = computed(() => {
  return xParameter.value && yParameter.value && 
         xParameter.value !== yParameter.value &&
         props.results?.results?.length > 0
})

const cellWidth = computed(() => cellSize.value)
const cellHeight = computed(() => cellSize.value)

const xValues = computed(() => {
  if (!canRenderHeatmap.value) return []
  
  const values = new Set()
  props.results.results.forEach(result => {
    values.add(result.parameters[xParameter.value])
  })
  
  return Array.from(values).sort((a, b) => {
    if (typeof a === 'number' && typeof b === 'number') {
      return a - b
    }
    return String(a).localeCompare(String(b))
  })
})

const yValues = computed(() => {
  if (!canRenderHeatmap.value) return []
  
  const values = new Set()
  props.results.results.forEach(result => {
    values.add(result.parameters[yParameter.value])
  })
  
  return Array.from(values).sort((a, b) => {
    if (typeof a === 'number' && typeof b === 'number') {
      return b - a // Reverse order for Y-axis (top to bottom)
    }
    return String(b).localeCompare(String(a))
  })
})

const heatmapData = computed(() => {
  if (!canRenderHeatmap.value) return new Map()
  
  const data = new Map()
  
  props.results.results.forEach(result => {
    const xVal = result.parameters[xParameter.value]
    const yVal = result.parameters[yParameter.value]
    const key = `${xVal}_${yVal}`
    
    data.set(key, {
      value: result.performance[props.metric] || 0,
      result
    })
  })
  
  return data
})

const minValue = computed(() => {
  if (!canRenderHeatmap.value) return 0
  
  let min = Infinity
  heatmapData.value.forEach(({ value }) => {
    if (value < min) min = value
  })
  
  return min === Infinity ? 0 : min
})

const maxValue = computed(() => {
  if (!canRenderHeatmap.value) return 0
  
  let max = -Infinity
  heatmapData.value.forEach(({ value }) => {
    if (value > max) max = value
  })
  
  return max === -Infinity ? 0 : max
})

const colorLegend = computed(() => {
  const steps = 10
  const legend = []
  
  for (let i = 0; i <= steps; i++) {
    const ratio = i / steps
    const value = minValue.value + (maxValue.value - minValue.value) * ratio
    const color = getColorForValue(value)
    
    legend.push({ value, color })
  }
  
  return legend
})

// Methods
const getCellValue = (xValue: any, yValue: any): number => {
  const key = `${xValue}_${yValue}`
  return heatmapData.value.get(key)?.value || 0
}

const getCellColor = (xValue: any, yValue: any): string => {
  const value = getCellValue(xValue, yValue)
  return getColorForValue(value)
}

const getColorForValue = (value: number): string => {
  if (minValue.value === maxValue.value) {
    return '#e5e7eb' // Gray for no variation
  }
  
  let normalizedValue: number
  
  if (colorScale.value === 'log') {
    const logMin = Math.log(Math.max(minValue.value, 0.001))
    const logMax = Math.log(Math.max(maxValue.value, 0.001))
    const logValue = Math.log(Math.max(value, 0.001))
    normalizedValue = (logValue - logMin) / (logMax - logMin)
  } else if (colorScale.value === 'percentile') {
    const values = Array.from(heatmapData.value.values()).map(d => d.value).sort((a, b) => a - b)
    const rank = values.findIndex(v => v >= value)
    normalizedValue = rank / (values.length - 1)
  } else {
    normalizedValue = (value - minValue.value) / (maxValue.value - minValue.value)
  }
  
  normalizedValue = Math.max(0, Math.min(1, normalizedValue))
  
  // Color interpolation: red (bad) -> yellow (medium) -> green (good)
  if (props.metric === 'maxDrawdown') {
    // For drawdown, lower is better (invert colors)
    normalizedValue = 1 - normalizedValue
  }
  
  if (normalizedValue < 0.5) {
    // Red to Yellow
    const ratio = normalizedValue * 2
    const r = 255
    const g = Math.round(255 * ratio)
    const b = 0
    return `rgb(${r}, ${g}, ${b})`
  } else {
    // Yellow to Green
    const ratio = (normalizedValue - 0.5) * 2
    const r = Math.round(255 * (1 - ratio))
    const g = 255
    const b = 0
    return `rgb(${r}, ${g}, ${b})`
  }
}

const onCellClick = (xValue: any, yValue: any) => {
  const key = `${xValue}_${yValue}`
  const data = heatmapData.value.get(key)
  
  if (data) {
    emit('pointSelected', {
      xValue,
      yValue,
      value: data.value,
      parameters: data.result.parameters,
      performance: data.result.performance
    })
  }
}

const onCellHover = (xValue: any, yValue: any, event: MouseEvent) => {
  const value = getCellValue(xValue, yValue)
  
  // Calculate rank
  const allValues = Array.from(heatmapData.value.values())
    .map(d => d.value)
    .sort((a, b) => props.metric === 'maxDrawdown' ? a - b : b - a)
  
  const rank = allValues.findIndex(v => v === value) + 1
  
  tooltip.value = {
    visible: true,
    x: event.clientX + 10,
    y: event.clientY - 10,
    xValue,
    yValue,
    value,
    rank: rank > 0 ? rank : null
  }
  
  nextTick(() => {
    if (tooltipEl.value) {
      const rect = tooltipEl.value.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      
      // Adjust position if tooltip goes off screen
      if (rect.right > viewportWidth) {
        tooltip.value.x = event.clientX - rect.width - 10
      }
      
      if (rect.bottom > viewportHeight) {
        tooltip.value.y = event.clientY - rect.height - 10
      }
    }
  })
}

const hideTooltip = () => {
  tooltip.value.visible = false
}

const exportHeatmap = () => {
  // TODO: Implement PNG export
  console.log('Export heatmap as PNG')
}

const resetView = () => {
  xParameter.value = props.parameters[0] || ''
  yParameter.value = props.parameters[1] || ''
  colorScale.value = 'linear'
  showValues.value = false
  showGrid.value = true
  smoothColors.value = true
  cellSize.value = 40
}

// Formatters
const formatValue = (value: any): string => {
  if (typeof value === 'number') {
    return value.toFixed(2)
  }
  return String(value)
}

const formatCellValue = (value: number): string => {
  if (Math.abs(value) < 0.01) {
    return value.toExponential(1)
  }
  return value.toFixed(2)
}

const formatMetric = (value: number, metric: string): string => {
  if (metric.includes('Return') || metric.includes('Drawdown')) {
    return `${value.toFixed(2)}%`
  } else if (metric === 'winRate') {
    return `${(value * 100).toFixed(1)}%`
  } else {
    return value.toFixed(2)
  }
}

const getMetricClass = (value: number): string => {
  if (props.metric === 'maxDrawdown') {
    return value < -10 ? 'text-red-600' : value < -5 ? 'text-yellow-600' : 'text-green-600'
  } else {
    return value > 0 ? 'text-green-600' : value < 0 ? 'text-red-600' : 'text-gray-600'
  }
}

// Watchers
watch(() => props.parameters, (newParams) => {
  if (newParams.length >= 2) {
    xParameter.value = newParams[0]
    yParameter.value = newParams[1]
  }
}, { immediate: true })
</script>

<style scoped>
.parameter-heatmap {
  @apply space-y-6;
}

.heatmap-header {
  @apply bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6;
}

.header-content {
  @apply space-y-4;
}

.title-section {
  @apply text-center;
}

.header-controls {
  @apply flex flex-wrap items-end gap-4 justify-center;
}

.control-group {
  @apply space-y-1;
}

.control-label {
  @apply block text-xs font-medium text-gray-600 dark:text-gray-400;
}

.control-select {
  @apply px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm;
}

.heatmap-container {
  @apply bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6;
}

.heatmap-placeholder {
  @apply flex items-center justify-center py-20;
}

.placeholder-content {
  @apply text-center;
}

.heatmap-content {
  @apply flex flex-col items-center space-y-4 overflow-auto;
}

.y-axis-label {
  @apply flex items-center justify-center;
}

.axis-label-text {
  @apply text-sm font-medium text-gray-700 dark:text-gray-300 transform -rotate-90;
}

.heatmap-main {
  @apply flex items-start gap-2;
}

.y-axis {
  @apply flex flex-col-reverse gap-0;
}

.y-tick {
  @apply flex items-center justify-end pr-2;
}

.tick-label {
  @apply text-xs text-gray-600 dark:text-gray-400;
}

.heatmap-grid {
  @apply flex flex-col-reverse gap-0;
  border: 1px solid #e5e7eb;
}

.heatmap-row {
  @apply flex gap-0;
}

.heatmap-cell {
  @apply border border-gray-200 dark:border-gray-600 cursor-pointer transition-all duration-200 hover:scale-105 hover:z-10 relative flex items-center justify-center;
}

.cell-value {
  @apply text-xs font-medium text-gray-900 dark:text-white pointer-events-none;
  text-shadow: 0 0 3px rgba(255, 255, 255, 0.8);
}

.color-legend {
  @apply ml-4 space-y-2;
}

.legend-title {
  @apply text-xs font-medium text-gray-700 dark:text-gray-300 text-center;
}

.legend-scale {
  @apply flex flex-col gap-0 w-6 h-40 border border-gray-300 dark:border-gray-600;
}

.legend-step {
  @apply flex-1;
}

.legend-labels {
  @apply flex flex-col justify-between text-xs text-gray-600 dark:text-gray-400 h-40;
}

.legend-min,
.legend-max {
  @apply block;
}

.x-axis {
  @apply flex gap-0 ml-8;
}

.x-tick {
  @apply flex items-center justify-center pt-2;
}

.x-axis-label {
  @apply flex items-center justify-center mt-4;
}

.heatmap-controls {
  @apply bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6;
}

.controls-section {
  @apply flex flex-wrap items-center gap-4 mb-4 last:mb-0;
}

.checkbox-label {
  @apply flex items-center gap-2 cursor-pointer;
}

.checkbox-text {
  @apply text-sm text-gray-700 dark:text-gray-300;
}

.form-checkbox {
  @apply w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500;
}

.range-slider {
  @apply w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer;
}

.range-value {
  @apply text-sm text-gray-600 dark:text-gray-400 ml-2;
}

.btn-secondary {
  @apply flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors text-sm;
}

.heatmap-tooltip {
  @apply fixed z-50 pointer-events-none;
}

.tooltip-content {
  @apply bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 max-w-xs;
}

.tooltip-header {
  @apply border-b border-gray-200 dark:border-gray-700 pb-2 mb-2;
}

.tooltip-title {
  @apply text-sm font-semibold text-gray-900 dark:text-white;
}

.tooltip-body {
  @apply space-y-2;
}

.tooltip-param {
  @apply flex justify-between items-center;
}

.param-name {
  @apply text-xs text-gray-600 dark:text-gray-400;
}

.param-value {
  @apply text-xs font-medium text-gray-900 dark:text-white;
}

.tooltip-divider {
  @apply border-t border-gray-200 dark:border-gray-700 my-2;
}

.tooltip-metric {
  @apply flex justify-between items-center;
}

.metric-name {
  @apply text-xs text-gray-600 dark:text-gray-400;
}

.metric-value {
  @apply text-xs font-bold;
}

.tooltip-rank {
  @apply text-center;
}

.rank-text {
  @apply text-xs text-blue-600 dark:text-blue-400 font-medium;
}

/* Responsive */
@media (max-width: 768px) {
  .header-controls {
    @apply flex-col items-stretch;
  }
  
  .control-group {
    @apply w-full;
  }
  
  .controls-section {
    @apply flex-col items-stretch;
  }
  
  .heatmap-main {
    @apply overflow-x-auto;
  }
}

/* Grid lines */
.heatmap-grid {
  border-color: v-bind('showGrid ? "#e5e7eb" : "transparent"');
}

.heatmap-cell {
  border-color: v-bind('showGrid ? "#e5e7eb" : "transparent"');
}

/* Smooth colors */
.heatmap-cell {
  transition: v-bind('smoothColors ? "all 0.2s ease" : "none"');
}
</style>