<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useBacktestStore } from '@/stores/backtest'
import { useStrategiesStore } from '@/stores/strategies'
import { useIndicatorsStore } from '@/stores/indicators'
import type { BacktestResult } from '@/types'

const backtestStore = useBacktestStore()
const strategiesStore = useStrategiesStore()
const indicatorsStore = useIndicatorsStore()

// Form state
const selectedStrategy = ref('')
const selectedDataset = ref('')
const customDataFile = ref<File | null>(null)
const backtestParams = ref({
  startDate: '',
  endDate: '',
  initialCapital: 10000,
  feePercentage: 0.1,
  slippage: 0.05
})

// Parameter sweep
const parameterSweepEnabled = ref(false)
const sweepParameters = ref<Array<{
  name: string
  min: number
  max: number
  step: number
}>>([{
  name: 'period',
  min: 10,
  max: 50,
  step: 5
}])

// UI state
const isRunning = ref(false)
const showResults = ref(false)
const selectedResult = ref<BacktestResult | null>(null)
const resultsTab = ref<'summary' | 'trades' | 'chart' | 'parameters'>('summary')

// Available datasets (mock data)
const availableDatasets = [
  { id: 'btc-usd-1h', name: 'BTC/USD 1H (Last 30 days)', size: '720 candles' },
  { id: 'eth-usd-1h', name: 'ETH/USD 1H (Last 30 days)', size: '720 candles' },
  { id: 'btc-usd-4h', name: 'BTC/USD 4H (Last 90 days)', size: '540 candles' },
  { id: 'sample-data', name: 'Sample Dataset', size: '1000 candles' }
]

// Computed properties
const canRunBacktest = computed(() => {
  return selectedStrategy.value && (selectedDataset.value || customDataFile.value) && !isRunning.value
})

const currentResults = computed(() => {
  return selectedResult.value ? [selectedResult.value] : backtestStore.results
})

const _bestResult = computed(() => {
  if (currentResults.value.length === 0) return null
  return currentResults.value.reduce((best, current) => 
    current.metrics.totalReturn > best.metrics.totalReturn ? current : best
  )
})

const averageMetrics = computed(() => {
  if (currentResults.value.length === 0) return null
  
  const results = currentResults.value
  const count = results.length
  
  return {
    totalReturn: results.reduce((sum, r) => sum + r.metrics.totalReturn, 0) / count,
    maxDrawdown: results.reduce((sum, r) => sum + r.metrics.maxDrawdown, 0) / count,
    winRate: results.reduce((sum, r) => sum + r.metrics.winRate, 0) / count,
    totalTrades: results.reduce((sum, r) => sum + r.trades.length, 0),
    profitFactor: results.reduce((sum, r) => sum + (r.metrics.profitFactor || 0), 0) / count
  }
})

// Methods
const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    customDataFile.value = target.files[0]
    selectedDataset.value = '' // Clear dataset selection
  }
}

const addSweepParameter = () => {
  sweepParameters.value.push({
    name: '',
    min: 0,
    max: 100,
    step: 1
  })
}

const removeSweepParameter = (index: number) => {
  sweepParameters.value.splice(index, 1)
}

const runBacktest = async () => {
  if (!canRunBacktest.value) return
  
  try {
    isRunning.value = true
    
    // Prepare data source
    let dataSource: File | string
    
    if (customDataFile.value) {
      dataSource = customDataFile.value
    } else {
      // Use selected dataset name as string
      dataSource = selectedDataset.value
    }
    
    // Get strategy
    const strategy = strategiesStore.strategies.find(s => s.id === selectedStrategy.value)
    if (!strategy) {
      throw new Error('Strategy not found')
    }
    
    if (parameterSweepEnabled.value && sweepParameters.value.length > 0) {
      // Run parameter sweep
      const sweepConfig = sweepParameters.value.reduce((acc, param) => {
        acc[param.name] = { min: param.min, max: param.max, step: param.step }
        return acc
      }, {} as Record<string, { min: number; max: number; step: number }>)
      
      const _results = await backtestStore.runParameterSweep(
        strategy.code,
        dataSource,
        sweepConfig
      )
      
      selectedResult.value = null // Show all results
    } else {
      // Run single backtest
      const result = await backtestStore.runBacktest(
        strategy.code,
        dataSource,
        backtestParams.value
      )
      
      selectedResult.value = result
    }
    
    showResults.value = true
    resultsTab.value = 'summary'
    
  } catch (error) {
    console.error('Backtest failed:', error)
    // Show error notification
    if (typeof window !== 'undefined' && window.$notify) {
      window.$notify.error('Backtest Failed', error instanceof Error ? error.message : 'Unknown error')
    }
  } finally {
    isRunning.value = false
  }
}

const exportResults = () => {
  backtestStore.exportResults()
}

const clearResults = () => {
  backtestStore.clearResults()
  selectedResult.value = null
  showResults.value = false
}

const selectResult = (result: BacktestResult) => {
  selectedResult.value = result
  resultsTab.value = 'summary'
}

const formatNumber = (value: number, decimals: number = 2) => {
  return value.toFixed(decimals)
}

const formatPercentage = (value: number, decimals: number = 2) => {
  return `${value.toFixed(decimals)}%`
}

const formatCurrency = (value: number) => {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const getReturnColor = (value: number) => {
  if (value > 0) return 'text-green-600'
  if (value < 0) return 'text-red-600'
  return 'text-gray-600'
}

onMounted(async () => {
  await Promise.all([
    strategiesStore.fetchStrategies(),
    indicatorsStore.fetchIndicators()
  ])
  
  // Set default dates
  const endDate = new Date()
  const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
  
  backtestParams.value.startDate = startDate.toISOString().split('T')[0]
  backtestParams.value.endDate = endDate.toISOString().split('T')[0]
})
</script>

<template>
  <div class="backtest-view">
    <!-- Header -->
    <div class="backtest-header">
      <h1 class="page-title">Strategy Backtester</h1>
      <p class="page-subtitle">
        Test your trading strategies against historical data
      </p>
    </div>

    <div class="backtest-layout">
      <!-- Configuration Panel -->
      <div class="config-panel" :class="{ 'collapsed': showResults }">
        <div class="panel-header">
          <h2 class="panel-title">Configuration</h2>
          <button 
            v-if="showResults"
            @click="showResults = false"
            class="expand-button"
          >
            ⚙️ Configure
          </button>
        </div>

        <div v-show="!showResults" class="config-content">
          <!-- Strategy Selection -->
          <div class="config-section">
            <label class="config-label">Strategy</label>
            <select v-model="selectedStrategy" class="config-select">
              <option value="">Select a strategy...</option>
              <option 
                v-for="strategy in strategiesStore.strategies"
                :key="strategy.id"
                :value="strategy.id"
              >
                {{ strategy.name }}
              </option>
            </select>
          </div>

          <!-- Data Selection -->
          <div class="config-section">
            <label class="config-label">Data Source</label>
            
            <!-- Dataset Selection -->
            <div class="data-option">
              <label class="radio-label">
                <input 
                  type="radio" 
                  :value="true" 
                  :checked="!customDataFile"
                  @change="customDataFile = null"
                >
                <span>Use predefined dataset</span>
              </label>
              <select 
                v-model="selectedDataset" 
                class="config-select"
                :disabled="customDataFile !== null"
              >
                <option value="">Select dataset...</option>
                <option 
                  v-for="dataset in availableDatasets"
                  :key="dataset.id"
                  :value="dataset.id"
                >
                  {{ dataset.name }} ({{ dataset.size }})
                </option>
              </select>
            </div>

            <!-- File Upload -->
            <div class="data-option">
              <label class="radio-label">
                <input 
                  type="radio" 
                  :value="true" 
                  :checked="customDataFile !== null"
                  @change="selectedDataset = ''"
                >
                <span>Upload CSV file</span>
              </label>
              <input 
                type="file" 
                accept=".csv"
                @change="handleFileUpload"
                class="file-input"
                :disabled="selectedDataset !== ''"
              >
            </div>
          </div>

          <!-- Backtest Parameters -->
          <div class="config-section">
            <label class="config-label">Parameters</label>
            
            <div class="param-grid">
              <div class="param-item">
                <label class="param-label">Start Date</label>
                <input 
                  v-model="backtestParams.startDate" 
                  type="date" 
                  class="param-input"
                >
              </div>
              
              <div class="param-item">
                <label class="param-label">End Date</label>
                <input 
                  v-model="backtestParams.endDate" 
                  type="date" 
                  class="param-input"
                >
              </div>
              
              <div class="param-item">
                <label class="param-label">Initial Capital</label>
                <input 
                  v-model.number="backtestParams.initialCapital" 
                  type="number" 
                  min="100"
                  step="100"
                  class="param-input"
                >
              </div>
              
              <div class="param-item">
                <label class="param-label">Fee (%)</label>
                <input 
                  v-model.number="backtestParams.feePercentage" 
                  type="number" 
                  min="0"
                  max="5"
                  step="0.01"
                  class="param-input"
                >
              </div>
            </div>
          </div>

          <!-- Parameter Sweep -->
          <div class="config-section">
            <label class="config-label">
              <input 
                v-model="parameterSweepEnabled" 
                type="checkbox" 
                class="config-checkbox"
              >
              Parameter Sweep (Grid Search)
            </label>
            
            <div v-if="parameterSweepEnabled" class="sweep-config">
              <div 
                v-for="(param, index) in sweepParameters"
                :key="index"
                class="sweep-param"
              >
                <input 
                  v-model="param.name" 
                  placeholder="Parameter name"
                  class="sweep-input"
                >
                <input 
                  v-model.number="param.min" 
                  type="number" 
                  placeholder="Min"
                  class="sweep-input"
                >
                <input 
                  v-model.number="param.max" 
                  type="number" 
                  placeholder="Max"
                  class="sweep-input"
                >
                <input 
                  v-model.number="param.step" 
                  type="number" 
                  placeholder="Step"
                  class="sweep-input"
                >
                <button 
                  @click="removeSweepParameter(index)"
                  class="remove-param-button"
                >
                  ×
                </button>
              </div>
              
              <button @click="addSweepParameter" class="add-param-button">
                + Add Parameter
              </button>
            </div>
          </div>

          <!-- Run Button -->
          <div class="config-section">
            <button 
              @click="runBacktest"
              :disabled="!canRunBacktest"
              class="run-button"
              :class="{ 'running': isRunning }"
            >
              <span v-if="isRunning" class="button-spinner">⏳</span>
              <span v-else class="button-icon">🚀</span>
              {{ isRunning ? 'Running...' : 'Run Backtest' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Results Panel -->
      <div v-if="showResults" class="results-panel">
        <div class="results-header">
          <h2 class="panel-title">Results</h2>
          <div class="results-actions">
            <button @click="exportResults" class="action-button">
              📊 Export
            </button>
            <button @click="clearResults" class="action-button danger">
              🗑️ Clear
            </button>
          </div>
        </div>

        <!-- Results Summary -->
        <div v-if="averageMetrics" class="results-summary">
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-label">Total Return</div>
              <div class="summary-value" :class="getReturnColor(averageMetrics.totalReturn)">
                {{ formatPercentage(averageMetrics.totalReturn) }}
              </div>
            </div>
            
            <div class="summary-item">
              <div class="summary-label">Max Drawdown</div>
              <div class="summary-value text-red-600">
                {{ formatPercentage(averageMetrics.maxDrawdown) }}
              </div>
            </div>
            
            <div class="summary-item">
              <div class="summary-label">Win Rate</div>
              <div class="summary-value">
                {{ formatPercentage(averageMetrics.winRate) }}
              </div>
            </div>
            
            <div class="summary-item">
              <div class="summary-label">Total Trades</div>
              <div class="summary-value">
                {{ averageMetrics.totalTrades }}
              </div>
            </div>
          </div>
        </div>

        <!-- Results Tabs -->
        <div class="results-tabs">
          <button 
            @click="resultsTab = 'summary'"
            class="tab-button"
            :class="{ 'active': resultsTab === 'summary' }"
          >
            Summary
          </button>
          <button 
            @click="resultsTab = 'trades'"
            class="tab-button"
            :class="{ 'active': resultsTab === 'trades' }"
          >
            Trades
          </button>
          <button 
            @click="resultsTab = 'chart'"
            class="tab-button"
            :class="{ 'active': resultsTab === 'chart' }"
          >
            Chart
          </button>
          <button 
            v-if="parameterSweepEnabled"
            @click="resultsTab = 'parameters'"
            class="tab-button"
            :class="{ 'active': resultsTab === 'parameters' }"
          >
            Parameters
          </button>
        </div>

        <!-- Tab Content -->
        <div class="tab-content">
          <!-- Summary Tab -->
          <div v-if="resultsTab === 'summary'" class="summary-tab">
            <div v-if="currentResults.length > 1" class="results-list">
              <h3 class="list-title">All Results ({{ currentResults.length }})</h3>
              <div class="results-grid">
                <div 
                  v-for="result in currentResults"
                  :key="result.id"
                  @click="selectResult(result)"
                  class="result-card"
                  :class="{ 'selected': selectedResult?.id === result.id }"
                >
                  <div class="result-header">
                    <span class="result-strategy">{{ result.strategy }}</span>
                    <span class="result-return" :class="getReturnColor(result.metrics.totalReturn)">
                      {{ formatPercentage(result.metrics.totalReturn) }}
                    </span>
                  </div>
                  <div class="result-metrics">
                    <span>Trades: {{ result.trades.length }}</span>
                    <span>Win Rate: {{ formatPercentage(result.metrics.winRate) }}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div v-if="selectedResult || currentResults.length === 1" class="detailed-metrics">
              <h3 class="metrics-title">
                {{ selectedResult?.strategy || currentResults[0]?.strategy }} - Detailed Metrics
              </h3>
              
              <div class="metrics-grid">
                <!-- Performance Metrics -->
                <div class="metric-group">
                  <h4 class="group-title">Performance</h4>
                  <div class="metric-item">
                    <span class="metric-label">Total Return</span>
                    <span class="metric-value" :class="getReturnColor((selectedResult || currentResults[0]).metrics.totalReturn)">
                      {{ formatPercentage((selectedResult || currentResults[0]).metrics.totalReturn) }}
                    </span>
                  </div>
                  <div class="metric-item">
                    <span class="metric-label">Final Capital</span>
                    <span class="metric-value">
                      {{ formatCurrency((selectedResult || currentResults[0]).metrics.finalCapital) }}
                    </span>
                  </div>
                  <div class="metric-item">
                    <span class="metric-label">Max Drawdown</span>
                    <span class="metric-value text-red-600">
                      {{ formatPercentage((selectedResult || currentResults[0]).metrics.maxDrawdown) }}
                    </span>
                  </div>
                </div>
                
                <!-- Trading Metrics -->
                <div class="metric-group">
                  <h4 class="group-title">Trading</h4>
                  <div class="metric-item">
                    <span class="metric-label">Total Trades</span>
                    <span class="metric-value">
                      {{ (selectedResult || currentResults[0]).trades.length }}
                    </span>
                  </div>
                  <div class="metric-item">
                    <span class="metric-label">Win Rate</span>
                    <span class="metric-value">
                      {{ formatPercentage((selectedResult || currentResults[0]).metrics.winRate) }}
                    </span>
                  </div>
                  <div class="metric-item">
                    <span class="metric-label">Profit Factor</span>
                    <span class="metric-value">
                      {{ formatNumber((selectedResult || currentResults[0]).metrics.profitFactor || 0) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Trades Tab -->
          <div v-if="resultsTab === 'trades'" class="trades-tab">
            <div class="trades-table-container">
              <table class="trades-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Price</th>
                    <th>Amount</th>
                    <th>P&L</th>
                    <th>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  <tr 
                    v-for="trade in (selectedResult || currentResults[0])?.trades || []"
                    :key="trade.id"
                    class="trade-row"
                  >
                    <td class="trade-date">{{ new Date(trade.timestamp).toLocaleString() }}</td>
                    <td class="trade-type" :class="trade.type === 'buy' ? 'text-green-600' : 'text-red-600'">
                      {{ trade.type.toUpperCase() }}
                    </td>
                    <td class="trade-price">{{ formatCurrency(trade.price) }}</td>
                    <td class="trade-amount">{{ formatNumber(trade.amount, 4) }}</td>
                    <td class="trade-pnl" :class="getReturnColor(trade.pnl || 0)">
                      {{ trade.pnl ? formatCurrency(trade.pnl) : '-' }}
                    </td>
                    <td class="trade-balance">{{ formatCurrency(trade.balance || 0) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Chart Tab -->
          <div v-if="resultsTab === 'chart'" class="chart-tab">
            <div class="chart-placeholder">
              <div class="placeholder-icon">📈</div>
              <h3 class="placeholder-title">Chart Visualization</h3>
              <p class="placeholder-text">
                Interactive chart with equity curve and trade markers will be implemented here.
                This will show candlestick data with buy/sell signals and portfolio value over time.
              </p>
            </div>
          </div>

          <!-- Parameters Tab -->
          <div v-if="resultsTab === 'parameters' && parameterSweepEnabled" class="parameters-tab">
            <div class="parameters-placeholder">
              <div class="placeholder-icon">🔍</div>
              <h3 class="placeholder-title">Parameter Analysis</h3>
              <p class="placeholder-text">
                Heatmap and parameter optimization results will be displayed here.
                This will show how different parameter combinations affect performance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.backtest-view {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
  background: #f8fafc;
  min-height: 100vh;
}

/* Header */
.backtest-header {
  margin-bottom: 3rem;
  padding: 2rem;
  background: white;
  border-radius: 1rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.page-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 1rem 0;
}

.page-subtitle {
  font-size: 1.125rem;
  color: #64748b;
  margin: 0;
}

/* Layout */
.backtest-layout {
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: 2rem;
  min-height: 600px;
}

.config-panel.collapsed {
  grid-template-columns: auto 1fr;
}

/* Configuration Panel */
.config-panel {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 1rem;
  overflow: hidden;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.panel-header {
  padding: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.expand-button {
  padding: 0.5rem 1rem;
  background-color: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.expand-button:hover {
  background-color: #e2e8f0;
}

.config-content {
  padding: 2rem;
}

.config-section {
  margin-bottom: 2rem;
}

.config-label {
  display: block;
  font-size: 1rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.75rem;
}

.config-select,
.param-input,
.config-input, .config-select {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 1rem;
  transition: border-color 0.2s ease;
}

.config-select:focus,
.param-input:focus,
.sweep-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.config-select:disabled,
.param-input:disabled,
.sweep-input:disabled {
  background-color: #f9fafb;
  color: #6b7280;
}

.data-option {
  margin-bottom: 1rem;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
  cursor: pointer;
}

.file-input {
  width: 100%;
  padding: 0.5rem;
  border: 2px dashed #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  cursor: pointer;
}

.file-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.param-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.param-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.param-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #6b7280;
}

.config-checkbox {
  margin-right: 0.5rem;
}

.sweep-config {
  margin-top: 1rem;
}

.sweep-param {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr auto;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  align-items: center;
}

.remove-param-button {
  width: 2rem;
  height: 2rem;
  background-color: #fee2e2;
  color: #dc2626;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  font-weight: bold;
}

.add-param-button {
  padding: 0.5rem 1rem;
  background-color: #dbeafe;
  color: #1e40af;
  border: 1px solid #93c5fd;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-param-button:hover {
  background-color: #bfdbfe;
}

.run-button {
  width: 100%;
  padding: 1rem 2rem;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  border: none;
  border-radius: 0.75rem;
  font-size: 1.125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.run-button:hover:not(:disabled) {
  background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
  transform: translateY(-1px);
}

.run-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.run-button.running {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}

.button-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Results Panel */
.results-panel {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 1rem;
  overflow: hidden;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}

.results-header {
  padding: 2rem;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f8fafc;
}

.results-actions {
  display: flex;
  gap: 0.5rem;
}

.action-button {
  padding: 0.5rem 1rem;
  background-color: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-button:hover {
  background-color: #e2e8f0;
}

.action-button.danger {
  background-color: #fee2e2;
  border-color: #fecaca;
  color: #dc2626;
}

.action-button.danger:hover {
  background-color: #fecaca;
}

.results-summary {
  padding: 2rem;
  border-bottom: 1px solid #e2e8f0;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.summary-item {
  text-align: center;
  padding: 1.5rem;
  background: #f8fafc;
  border-radius: 0.75rem;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
}

.summary-label {
  font-size: 1rem;
  color: #6b7280;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.summary-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
}

.results-tabs {
  display: flex;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
}

.tab-button {
  flex: 1;
  padding: 1.25rem;
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  font-size: 1rem;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-button:hover {
  color: #1e293b;
  background-color: #f8fafc;
}

.tab-button.active {
  color: #3b82f6;
  border-bottom-color: #3b82f6;
}

.tab-content {
  padding: 1.5rem;
}

/* Summary Tab */
.results-list {
  margin-bottom: 2rem;
}

.list-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 1rem 0;
}

.results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
}

.result-card {
  padding: 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.result-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.result-card.selected {
  border-color: #3b82f6;
  background-color: #eff6ff;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.result-strategy {
  font-weight: 600;
  color: #1e293b;
}

.result-return {
  font-weight: 700;
}

.result-metrics {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #64748b;
}

.detailed-metrics {
  margin-top: 2rem;
}

.metrics-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 1rem 0;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.metric-group {
  padding: 1rem;
  background: #f8fafc;
  border-radius: 0.5rem;
}

.group-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 0.75rem 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.metric-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #e2e8f0;
}

.metric-item:last-child {
  border-bottom: none;
}

.metric-label {
  font-size: 0.875rem;
  color: #64748b;
}

.metric-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1e293b;
}

/* Trades Tab */
.trades-table-container {
  overflow-x: auto;
}

.trades-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.trades-table th {
  padding: 0.75rem;
  text-align: left;
  font-weight: 600;
  color: #374151;
  background-color: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.trades-table td {
  padding: 0.75rem;
  border-bottom: 1px solid #f3f4f6;
}

.trade-row:hover {
  background-color: #f9fafb;
}

.trade-date {
  font-family: monospace;
  font-size: 0.8125rem;
}

.trade-type {
  font-weight: 600;
  text-transform: uppercase;
}

.trade-price,
.trade-amount,
.trade-pnl,
.trade-balance {
  font-family: monospace;
  text-align: right;
}

/* Chart Tab */
.chart-tab,
.parameters-tab {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

.chart-placeholder,
.parameters-placeholder {
  text-align: center;
  color: #64748b;
}

.placeholder-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.placeholder-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
}

.placeholder-text {
  font-size: 1rem;
  max-width: 400px;
  margin: 0 auto;
  line-height: 1.6;
}

/* Responsive */
@media (max-width: 1024px) {
  .backtest-layout {
    grid-template-columns: 1fr;
  }
  
  .config-panel.collapsed {
    grid-template-columns: 1fr;
  }
  
  .param-grid {
    grid-template-columns: 1fr;
  }
  
  .summary-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .metrics-grid {
    grid-template-columns: 1fr;
  }
  
  .sweep-param {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
  
  .results-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .backtest-view {
    padding: 1rem;
  }
  
  .backtest-header {
    padding: 1.5rem;
    margin-bottom: 2rem;
  }
  
  .page-title {
    font-size: 2rem;
  }
  
  .page-subtitle {
    font-size: 1rem;
  }
  
  .config-content {
    padding: 1.5rem;
  }
  
  .panel-title {
    font-size: 1.25rem;
  }
  
  .param-grid {
    grid-template-columns: 1fr;
  }
  
  .sweep-param {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
  
  .results-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
    padding: 1.5rem;
  }
  
  .results-actions {
    justify-content: center;
  }
  
  .results-summary {
    padding: 1.5rem;
  }
  
  .summary-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .summary-item {
    padding: 1rem;
  }
  
  .results-tabs {
    overflow-x: auto;
    flex-wrap: nowrap;
  }
  
  .tab-button {
    white-space: nowrap;
    padding: 1rem;
    font-size: 0.875rem;
    min-width: 100px;
  }
  
  .tab-content {
    padding: 1rem;
  }
  
  .trades-table-container {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  
  .trades-table {
    min-width: 600px;
  }
  
  .trades-table th,
  .trades-table td {
    padding: 0.5rem;
    font-size: 0.8125rem;
  }
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .page-title {
    color: #f8fafc;
  }
  
  .page-subtitle {
    color: #94a3b8;
  }
  
  .config-panel,
  .results-panel {
    background: #1e293b;
    border-color: #334155;
  }
  
  .panel-title {
    color: #f8fafc;
  }
  
  .config-label {
    color: #e2e8f0;
  }
  
  .config-select,
  .param-input,
  .sweep-input {
    background: #0f172a;
    border-color: #475569;
    color: #f8fafc;
  }
  
  .summary-item {
    background: #0f172a;
  }
  
  .summary-value {
    color: #f8fafc;
  }
  
  .tab-button {
    color: #94a3b8;
  }
  
  .tab-button:hover {
    color: #f8fafc;
    background-color: #0f172a;
  }
  
  .result-card {
    background: #0f172a;
    border-color: #475569;
  }
  
  .result-strategy {
    color: #f8fafc;
  }
  
  .metric-group {
    background: #0f172a;
  }
  
  .group-title {
    color: #e2e8f0;
  }
  
  .metric-value {
    color: #f8fafc;
  }
  
  .trades-table th {
    background-color: #0f172a;
    color: #e2e8f0;
  }
  
  .trade-row:hover {
    background-color: #0f172a;
  }
}
</style>