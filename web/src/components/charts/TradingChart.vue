<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue'
import { createChart, type IChartApi, type ISeriesApi, type CandlestickData, type LineData, type Time, ColorType } from 'lightweight-charts'
import type { Candle, Trade, Indicator, IndicatorValue } from '@/types'

interface Props {
  candles: Candle[]
  trades?: Trade[]
  indicators?: Indicator[]
  width?: number
  height?: number
  showVolume?: boolean
  showGrid?: boolean
  showCrosshair?: boolean
  showTimeScale?: boolean
  showPriceScale?: boolean
  theme?: 'light' | 'dark' | 'auto'
  autoResize?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  width: 800,
  height: 400,
  showVolume: true,
  showGrid: true,
  showCrosshair: true,
  showTimeScale: true,
  showPriceScale: true,
  theme: 'auto',
  autoResize: true
})

const emit = defineEmits<{
  candleClick: [candle: Candle, time: Time]
  tradeClick: [trade: Trade]
  priceChange: [price: number]
  timeChange: [time: Time]
  visibleRangeChange: [from: Time, to: Time]
}>()

// Chart container and instance
const chartContainer = ref<HTMLDivElement>()
let chart: IChartApi | null = null
let candlestickSeries: ISeriesApi<'Candlestick'> | null = null
let volumeSeries: ISeriesApi<'Histogram'> | null = null
const indicatorSeries = new Map<string, ISeriesApi<'Line'>>()
const tradeSeries = new Map<string, ISeriesApi<'Line'>>()

// Chart state
const isLoading = ref(false)
const error = ref<string | null>(null)
const currentPrice = ref<number | null>(null)
const priceChange = ref<number>(0)
const priceChangePercent = ref<number>(0)

// Computed properties
const isDarkMode = computed(() => {
  if (props.theme === 'auto') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  return props.theme === 'dark'
})

const chartOptions = computed(() => ({
  layout: {
    background: {
      type: ColorType.Solid,
      color: isDarkMode.value ? '#0f172a' : '#ffffff'
    },
    textColor: isDarkMode.value ? '#e2e8f0' : '#1e293b'
  },
  grid: {
    vertLines: {
      visible: props.showGrid,
      color: isDarkMode.value ? '#334155' : '#e2e8f0'
    },
    horzLines: {
      visible: props.showGrid,
      color: isDarkMode.value ? '#334155' : '#e2e8f0'
    }
  },
  crosshair: {
    mode: props.showCrosshair ? 1 : 0, // Normal crosshair mode
    vertLine: {
      color: isDarkMode.value ? '#64748b' : '#94a3b8',
      width: 1,
      style: 2, // Dashed line
      visible: props.showCrosshair
    },
    horzLine: {
      color: isDarkMode.value ? '#64748b' : '#94a3b8',
      width: 1,
      style: 2, // Dashed line
      visible: props.showCrosshair
    }
  },
  timeScale: {
    visible: props.showTimeScale,
    timeVisible: true,
    secondsVisible: false,
    borderColor: isDarkMode.value ? '#334155' : '#e2e8f0'
  },
  rightPriceScale: {
    visible: props.showPriceScale,
    borderColor: isDarkMode.value ? '#334155' : '#e2e8f0',
    scaleMargins: {
      top: 0.1,
      bottom: props.showVolume ? 0.3 : 0.1
    }
  },
  leftPriceScale: {
    visible: false
  },
  handleScroll: {
    mouseWheel: true,
    pressedMouseMove: true,
    horzTouchDrag: true,
    vertTouchDrag: true
  },
  handleScale: {
    axisPressedMouseMove: true,
    mouseWheel: true,
    pinch: true
  },
  kineticScroll: {
    touch: true,
    mouse: false
  }
}))

const candlestickOptions = computed(() => ({
  upColor: '#10b981', // Green
  downColor: '#ef4444', // Red
  borderVisible: false,
  wickUpColor: '#10b981',
  wickDownColor: '#ef4444'
}))

const volumeOptions = computed(() => ({
  color: isDarkMode.value ? '#475569' : '#94a3b8',
  priceFormat: {
    type: 'volume' as const
  },
  priceScaleId: 'volume',
  scaleMargins: {
    top: 0.7,
    bottom: 0
  }
}))

// Chart data processing
const processCandles = (candles: Candle[]): CandlestickData[] => {
  return candles.map(candle => ({
    time: (candle.timestamp / 1000) as Time,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close
  }))
}

const processVolume = (candles: Candle[]) => {
  return candles.map(candle => ({
    time: (candle.timestamp / 1000) as Time,
    value: candle.volume,
    color: candle.close >= candle.open 
      ? (isDarkMode.value ? '#10b981' : '#059669')
      : (isDarkMode.value ? '#ef4444' : '#dc2626')
  }))
}

const processIndicatorData = (indicator: Indicator, values: IndicatorValue[]): LineData[] => {
  return values
    .filter(v => v.value !== null && v.value !== undefined)
    .map(v => ({
      time: (v.timestamp / 1000) as Time,
      value: v.value as number
    }))
}

const getIndicatorColor = (indicator: Indicator, index: number = 0): string => {
  const colors = [
    '#3b82f6', // Blue
    '#f59e0b', // Amber
    '#8b5cf6', // Violet
    '#06b6d4', // Cyan
    '#f97316', // Orange
    '#84cc16', // Lime
    '#ec4899', // Pink
    '#6366f1'  // Indigo
  ]
  
  if ((indicator as any).color) {
    return (indicator as any).color
  }
  
  return colors[index % colors.length]
}

// Chart initialization
const initChart = async () => {
  if (!chartContainer.value) return
  
  try {
    isLoading.value = true
    error.value = null
    
    // Create chart instance
    chart = createChart(chartContainer.value, {
      ...chartOptions.value,
      width: props.width,
      height: props.height
    } as any)
    
    // Create candlestick series
    candlestickSeries = (chart as any).addCandlestickSeries(candlestickOptions.value)
    
    // Create volume series if enabled
    if (props.showVolume) {
      volumeSeries = (chart as any).addHistogramSeries({
        ...volumeOptions.value,
        priceScaleId: 'volume'
      })
      
      // Create separate price scale for volume
      chart.priceScale('volume').applyOptions({
        scaleMargins: {
          top: 0.7,
          bottom: 0
        }
      })
    }
    
    // Set up event listeners
    setupEventListeners()
    
    // Load initial data
    await updateChartData()
    
  } catch (err) {
    console.error('Failed to initialize chart:', err)
    error.value = 'Failed to initialize chart'
  } finally {
    isLoading.value = false
  }
}

const setupEventListeners = () => {
  if (!chart || !candlestickSeries) return
  
  // Subscribe to crosshair move for price updates
  chart.subscribeCrosshairMove((param) => {
    if (param.time) {
      const candleData = param.seriesData.get(candlestickSeries!) as CandlestickData
      if (candleData) {
        currentPrice.value = candleData.close
        emit('priceChange', candleData.close)
        emit('timeChange', param.time)
      }
    }
  })
  
  // Subscribe to visible range changes
  chart.timeScale().subscribeVisibleTimeRangeChange((range) => {
    if (range) {
      emit('visibleRangeChange', range.from, range.to)
    }
  })
  
  // Subscribe to click events
  chart.subscribeClick((param) => {
    if (param.time && param.seriesData) {
      const candleData = param.seriesData.get(candlestickSeries!) as CandlestickData
      if (candleData) {
        const candle = props.candles.find(c => (c.timestamp / 1000) === param.time)
        if (candle) {
          emit('candleClick', candle, param.time)
        }
      }
    }
  })
}

// Data update methods
const updateChartData = async () => {
  if (!chart || !candlestickSeries) return
  
  try {
    // Update candlestick data
    const candleData = processCandles(props.candles)
    candlestickSeries.setData(candleData)
    
    // Update volume data
    if (volumeSeries && props.showVolume) {
      const volumeData = processVolume(props.candles)
      volumeSeries.setData(volumeData)
    }
    
    // Update indicators
    await updateIndicators()
    
    // Update trades
    await updateTrades()
    
    // Calculate price change
    updatePriceStats()
    
    // Fit content to show all data
    chart.timeScale().fitContent()
    
  } catch (err) {
    console.error('Failed to update chart data:', err)
    error.value = 'Failed to update chart data'
  }
}

const updateIndicators = async () => {
  if (!chart || !props.indicators) return
  
  // Remove existing indicator series
  indicatorSeries.forEach((series) => {
    chart!.removeSeries(series)
  })
  indicatorSeries.clear()
  
  // Add new indicator series
  props.indicators.forEach((indicator, index) => {
    if ((indicator as any).values && (indicator as any).values.length > 0) {
      const lineData = processIndicatorData(indicator, (indicator as any).values)
      
      if (lineData.length > 0) {
        const series = (chart as any)!.addSeries('Line', {
          color: getIndicatorColor(indicator, index),
          lineWidth: 2,
          title: indicator.name,
          priceScaleId: (indicator as any).overlay ? 'right' : `indicator-${(indicator as any).id}`,
          visible: (indicator as any).visible !== false
        })
        
        series.setData(lineData)
        indicatorSeries.set((indicator as any).id, series as any)
        
        // Create separate price scale for non-overlay indicators
        if (!(indicator as any).overlay) {
          chart!.priceScale(`indicator-${(indicator as any).id}`).applyOptions({
            scaleMargins: {
              top: 0.8,
              bottom: 0
            }
          })
        }
      }
    }
  })
}

const updateTrades = async () => {
  if (!chart || !props.trades) return
  
  // Remove existing trade markers
  tradeSeries.forEach((series) => {
    chart!.removeSeries(series)
  })
  tradeSeries.clear()
  
  // Add trade markers
  const markers = props.trades.map(trade => ({
    time: (trade.timestamp / 1000) as Time,
    position: trade.side === 'buy' ? 'belowBar' as const : 'aboveBar' as const,
    color: trade.side === 'buy' ? '#10b981' : '#ef4444',
    shape: trade.side === 'buy' ? 'arrowUp' as const : 'arrowDown' as const,
    text: `${trade.side.toUpperCase()} ${trade.amount} @ ${trade.price}`,
    size: 1
  }))
  
  if (markers.length > 0 && candlestickSeries) {
    (candlestickSeries as any).setMarkers(markers)
  }
}

const updatePriceStats = () => {
  if (props.candles.length < 2) return
  
  const latest = props.candles[props.candles.length - 1]
  const previous = props.candles[props.candles.length - 2]
  
  currentPrice.value = latest.close
  priceChange.value = latest.close - previous.close
  priceChangePercent.value = (priceChange.value / previous.close) * 100
}

// Chart control methods
const fitContent = () => {
  if (chart) {
    chart.timeScale().fitContent()
  }
}

const resetZoom = () => {
  if (chart) {
    chart.timeScale().resetTimeScale()
  }
}

const scrollToRealTime = () => {
  if (chart) {
    chart.timeScale().scrollToRealTime()
  }
}

const takeScreenshot = (): string | null => {
  if (chart) {
    return chart.takeScreenshot().toDataURL()
  }
  return null
}

const toggleIndicator = (indicatorId: string, visible: boolean) => {
  const series = indicatorSeries.get(indicatorId)
  if (series) {
    series.applyOptions({ visible })
  }
}

const updateIndicatorStyle = (indicatorId: string, options: any) => {
  const series = indicatorSeries.get(indicatorId)
  if (series) {
    series.applyOptions(options)
  }
}

// Resize handling
const handleResize = () => {
  if (chart && chartContainer.value && props.autoResize) {
    chart.applyOptions({
      width: chartContainer.value.clientWidth,
      height: props.height
    })
  }
}

// Cleanup
const cleanup = () => {
  if (chart) {
    chart.remove()
    chart = null
    candlestickSeries = null
    volumeSeries = null
    indicatorSeries.clear()
    tradeSeries.clear()
  }
}

// Watchers
watch(() => props.candles, async () => {
  await updateChartData()
}, { deep: true })

watch(() => props.indicators, async () => {
  await updateIndicators()
}, { deep: true })

watch(() => props.trades, async () => {
  await updateTrades()
}, { deep: true })

watch(() => props.theme, async () => {
  if (chart) {
    chart.applyOptions(chartOptions.value as any)
  }
})

watch(() => props.height, () => {
  handleResize()
})

// Lifecycle
onMounted(async () => {
  await nextTick()
  await initChart()
  
  if (props.autoResize) {
    window.addEventListener('resize', handleResize)
  }
})

onUnmounted(() => {
  cleanup()
  
  if (props.autoResize) {
    window.removeEventListener('resize', handleResize)
  }
})

// Expose methods for parent components
defineExpose({
  fitContent,
  resetZoom,
  scrollToRealTime,
  takeScreenshot,
  toggleIndicator,
  updateIndicatorStyle,
  chart: () => chart,
  candlestickSeries: () => candlestickSeries,
  volumeSeries: () => volumeSeries,
  indicatorSeries: () => indicatorSeries
})
</script>

<template>
  <div class="trading-chart">
    <!-- Chart Header -->
    <div v-if="currentPrice !== null" class="chart-header">
      <div class="price-info">
        <span class="current-price">${{ currentPrice.toFixed(2) }}</span>
        <span 
          class="price-change"
          :class="{
            'positive': priceChange > 0,
            'negative': priceChange < 0,
            'neutral': priceChange === 0
          }"
        >
          {{ priceChange > 0 ? '+' : '' }}${{ priceChange.toFixed(2) }}
          ({{ priceChange > 0 ? '+' : '' }}{{ priceChangePercent.toFixed(2) }}%)
        </span>
      </div>
      
      <div class="chart-controls">
        <button @click="fitContent" class="control-button" title="Fit Content">
          📐
        </button>
        <button @click="resetZoom" class="control-button" title="Reset Zoom">
          🔍
        </button>
        <button @click="scrollToRealTime" class="control-button" title="Go to Latest">
          ⏭️
        </button>
        <button @click="takeScreenshot" class="control-button" title="Screenshot">
          📸
        </button>
      </div>
    </div>
    
    <!-- Loading State -->
    <div v-if="isLoading" class="chart-loading">
      <div class="loading-spinner"></div>
      <span class="loading-text">Loading chart data...</span>
    </div>
    
    <!-- Error State -->
    <div v-if="error" class="chart-error">
      <div class="error-icon">⚠️</div>
      <span class="error-text">{{ error }}</span>
      <button @click="initChart" class="retry-button">Retry</button>
    </div>
    
    <!-- Chart Container -->
    <div 
      ref="chartContainer"
      class="chart-container"
      :style="{ height: `${height}px` }"
      :class="{
        'loading': isLoading,
        'error': error
      }"
    ></div>
    
    <!-- Chart Footer -->
    <div class="chart-footer">
      <div class="chart-info">
        <span class="data-points">{{ candles.length }} candles</span>
        <span v-if="trades" class="trades-count">{{ trades.length }} trades</span>
        <span v-if="indicators" class="indicators-count">{{ indicators.length }} indicators</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.trading-chart {
  display: flex;
  flex-direction: column;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  overflow: hidden;
}

/* Chart Header */
.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  background-color: #f8fafc;
}

.price-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.current-price {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
}

.price-change {
  font-size: 1rem;
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
}

.price-change.positive {
  color: #059669;
  background-color: #d1fae5;
}

.price-change.negative {
  color: #dc2626;
  background-color: #fee2e2;
}

.price-change.neutral {
  color: #64748b;
  background-color: #f1f5f9;
}

.chart-controls {
  display: flex;
  gap: 0.5rem;
}

.control-button {
  padding: 0.5rem;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 2rem;
  height: 2rem;
}

.control-button:hover {
  background-color: #f9fafb;
  border-color: #9ca3af;
}

.control-button:active {
  background-color: #f3f4f6;
}

/* Chart Container */
.chart-container {
  position: relative;
  flex: 1;
  min-height: 300px;
}

.chart-container.loading,
.chart-container.error {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Loading State */
.chart-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 2rem;
  min-height: 200px;
}

.loading-spinner {
  width: 2rem;
  height: 2rem;
  border: 2px solid #e2e8f0;
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  font-size: 0.875rem;
  color: #64748b;
}

/* Error State */
.chart-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 2rem;
  min-height: 200px;
}

.error-icon {
  font-size: 2rem;
}

.error-text {
  font-size: 0.875rem;
  color: #dc2626;
  text-align: center;
}

.retry-button {
  padding: 0.5rem 1rem;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.retry-button:hover {
  background-color: #2563eb;
}

/* Chart Footer */
.chart-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1.5rem;
  border-top: 1px solid #e2e8f0;
  background-color: #f8fafc;
}

.chart-info {
  display: flex;
  gap: 1rem;
  font-size: 0.75rem;
  color: #64748b;
}

.data-points,
.trades-count,
.indicators-count {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

/* Dark Mode */
@media (prefers-color-scheme: dark) {
  .trading-chart {
    background-color: #1e293b;
    border-color: #334155;
  }
  
  .chart-header,
  .chart-footer {
    background-color: #0f172a;
    border-color: #334155;
  }
  
  .current-price {
    color: #f1f5f9;
  }
  
  .control-button {
    background-color: #374151;
    border-color: #4b5563;
    color: #e5e7eb;
  }
  
  .control-button:hover {
    background-color: #4b5563;
    border-color: #6b7280;
  }
  
  .loading-text,
  .chart-info {
    color: #94a3b8;
  }
  
  .loading-spinner {
    border-color: #374151;
    border-top-color: #3b82f6;
  }
}

/* Responsive */
@media (max-width: 768px) {
  .chart-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .price-info {
    justify-content: center;
  }
  
  .chart-controls {
    justify-content: center;
  }
  
  .current-price {
    font-size: 1.25rem;
  }
  
  .price-change {
    font-size: 0.875rem;
  }
  
  .chart-footer {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .chart-info {
    justify-content: center;
  }
}
</style>