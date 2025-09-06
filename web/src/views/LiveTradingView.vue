<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useMainStore } from '@/stores/main'
import { useStrategiesStore } from '@/stores/strategies'
import type { StrategyConfig, LiveTradingSession, Trade, Position } from '@/types'

const mainStore = useMainStore()
const strategiesStore = useStrategiesStore()

// UI state
const isLiveMode = ref(false)
const showConfirmModal = ref(false)
const confirmAction = ref<'start' | 'stop' | null>(null)
const selectedStrategy = ref<StrategyConfig | null>(null)
const selectedExchange = ref('binance')
const selectedPair = ref('BTC/USDT')
const initialBalance = ref(1000)
const maxDrawdown = ref(10)
const stopLoss = ref(5)
const takeProfit = ref(15)

// Live trading data
const currentSession = ref<LiveTradingSession | null>(null)
const activeTrades = ref<Trade[]>([])
const positions = ref<Position[]>([])
const portfolio = ref({
  balance: 1000,
  equity: 1000,
  unrealizedPnL: 0,
  realizedPnL: 0,
  totalReturn: 0,
  drawdown: 0
})

// Performance metrics
const sessionStats = ref({
  totalTrades: 0,
  winningTrades: 0,
  losingTrades: 0,
  winRate: 0,
  avgWin: 0,
  avgLoss: 0,
  profitFactor: 0,
  sharpeRatio: 0,
  maxDrawdown: 0,
  duration: 0
})

// Available exchanges and pairs
const exchanges = [
  { id: 'binance', name: 'Binance', status: 'connected' },
  { id: 'coinbase', name: 'Coinbase Pro', status: 'disconnected' },
  { id: 'kraken', name: 'Kraken', status: 'connected' },
  { id: 'mock', name: 'Mock Exchange (Testing)', status: 'connected' }
]

const tradingPairs = [
  'BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'ADA/USDT', 'DOT/USDT',
  'LINK/USDT', 'LTC/USDT', 'BCH/USDT', 'XRP/USDT', 'SOL/USDT'
]

// Computed properties
const canStartTrading = computed(() => {
  return selectedStrategy.value && 
         selectedExchange.value && 
         selectedPair.value && 
         initialBalance.value > 0 &&
         !isLiveMode.value
})

const isConnectedToExchange = computed(() => {
  const exchange = exchanges.find(ex => ex.id === selectedExchange.value)
  return exchange?.status === 'connected'
})

const currentEquity = computed(() => {
  return portfolio.value.balance + portfolio.value.unrealizedPnL
})

const totalReturnPercent = computed(() => {
  if (initialBalance.value === 0) return 0
  return ((currentEquity.value - initialBalance.value) / initialBalance.value) * 100
})

const riskMetrics = computed(() => {
  const equity = currentEquity.value
  const maxDD = (portfolio.value.drawdown / initialBalance.value) * 100
  const riskLevel = maxDD > 15 ? 'high' : maxDD > 8 ? 'medium' : 'low'
  
  return {
    currentDrawdown: maxDD,
    riskLevel,
    marginUsed: positions.value.reduce((sum, pos) => sum + (pos.size * pos.price * 0.1), 0),
    freeMargin: equity * 0.9
  }
})

// Methods
const startLiveTrading = () => {
  confirmAction.value = 'start'
  showConfirmModal.value = true
}

const stopLiveTrading = () => {
  confirmAction.value = 'stop'
  showConfirmModal.value = true
}

const confirmLiveAction = async () => {
  if (confirmAction.value === 'start') {
    await startTradingSession()
  } else if (confirmAction.value === 'stop') {
    await stopTradingSession()
  }
  
  showConfirmModal.value = false
  confirmAction.value = null
}

const cancelConfirmation = () => {
  showConfirmModal.value = false
  confirmAction.value = null
}

const startTradingSession = async () => {
  if (!selectedStrategy.value) return
  
  try {
    isLiveMode.value = true
    
    currentSession.value = {
      id: Date.now().toString(),
      strategyId: selectedStrategy.value.id,
      exchange: selectedExchange.value,
      pair: selectedPair.value,
      startTime: new Date().toISOString(),
      endTime: null,
      status: 'running',
      initialBalance: initialBalance.value,
      currentBalance: initialBalance.value,
      settings: {
        maxDrawdown: maxDrawdown.value,
        stopLoss: stopLoss.value,
        takeProfit: takeProfit.value
      }
    }
    
    // Reset portfolio
    portfolio.value = {
      balance: initialBalance.value,
      equity: initialBalance.value,
      unrealizedPnL: 0,
      realizedPnL: 0,
      totalReturn: 0,
      drawdown: 0
    }
    
    // Connect to live data feed
    mainStore.connectWebSocket()
    
    if (typeof window !== 'undefined' && (window as any).$notify) {
      (window as any).$notify.success('Live Trading Started', `Trading ${selectedPair.value} with ${selectedStrategy.value.name}`)
    }
    
    // Start monitoring
    startSessionMonitoring()
    
  } catch (error) {
    console.error('Failed to start live trading:', error)
    isLiveMode.value = false
    
    if (typeof window !== 'undefined' && (window as any).$notify) {
      (window as any).$notify.error('Failed to Start', 'Could not start live trading session')
    }
  }
}

const stopTradingSession = async () => {
  try {
    isLiveMode.value = false
    
    if (currentSession.value) {
      currentSession.value.endTime = new Date().toISOString()
      currentSession.value.status = 'stopped'
    }
    
    // Close all positions
    await closeAllPositions()
    
    if (typeof window !== 'undefined' && (window as any).$notify) {
      (window as any).$notify.success('Live Trading Stopped', 'All positions have been closed')
    }
    
  } catch (error) {
    console.error('Failed to stop live trading:', error)
    
    if (typeof window !== 'undefined' && (window as any).$notify) {
      (window as any).$notify.error('Failed to Stop', 'Could not stop live trading session')
    }
  }
}

const closeAllPositions = async () => {
  // Mock implementation - in real app, this would close all open positions
  positions.value = []
  portfolio.value.unrealizedPnL = 0
}

const startSessionMonitoring = () => {
  // Mock implementation - in real app, this would start real-time monitoring
  const interval = setInterval(() => {
    if (!isLiveMode.value) {
      clearInterval(interval)
      return
    }
    
    // Simulate price updates and strategy signals
    updatePortfolioMetrics()
    
  }, 1000)
}

const updatePortfolioMetrics = () => {
  // Mock implementation - simulate portfolio updates
  const randomChange = (Math.random() - 0.5) * 10
  portfolio.value.unrealizedPnL += randomChange
  portfolio.value.equity = portfolio.value.balance + portfolio.value.unrealizedPnL
  
  const totalReturn = ((portfolio.value.equity - initialBalance.value) / initialBalance.value) * 100
  portfolio.value.totalReturn = totalReturn
  
  // Update drawdown
  const currentDD = Math.max(0, (initialBalance.value - portfolio.value.equity) / initialBalance.value * 100)
  portfolio.value.drawdown = Math.max(portfolio.value.drawdown, currentDD)
}

const emergencyStop = async () => {
  try {
    await stopTradingSession()
    
    if (typeof window !== 'undefined' && (window as any).$notify) {
      (window as any).$notify.warning('Emergency Stop', 'Trading session stopped immediately')
    }
  } catch (error) {
    console.error('Emergency stop failed:', error)
  }
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(value)
}

const formatPercent = (value: number) => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'running': return 'text-green-600'
    case 'stopped': return 'text-red-600'
    case 'paused': return 'text-yellow-600'
    default: return 'text-gray-600'
  }
}

const getRiskColor = (level: string) => {
  switch (level) {
    case 'low': return 'text-green-600'
    case 'medium': return 'text-yellow-600'
    case 'high': return 'text-red-600'
    default: return 'text-gray-600'
  }
}

const getExchangeStatusColor = (status: string) => {
  switch (status) {
    case 'connected': return 'text-green-600'
    case 'disconnected': return 'text-red-600'
    case 'connecting': return 'text-yellow-600'
    default: return 'text-gray-600'
  }
}

onMounted(() => {
  strategiesStore.fetchStrategies()
  
  // Set default strategy if available
  if (strategiesStore.strategies.length > 0) {
    selectedStrategy.value = strategiesStore.strategies[0]
  }
})

onUnmounted(() => {
  if (isLiveMode.value) {
    stopTradingSession()
  }
})
</script>

<template>
  <div class="live-trading-view">
    <!-- Header -->
    <div class="live-trading-header">
      <div class="header-content">
        <h1 class="page-title">Live Trading</h1>
        <p class="page-subtitle">
          Execute your strategies in real-time with live market data
        </p>
      </div>
      
      <div class="header-status">
        <div class="status-indicator" :class="{ 'active': isLiveMode }">
          <div class="status-dot"></div>
          <span class="status-text">
            {{ isLiveMode ? 'LIVE TRADING' : 'OFFLINE' }}
          </span>
        </div>
        
        <button 
          v-if="isLiveMode"
          @click="emergencyStop"
          class="emergency-stop"
        >
          🛑 EMERGENCY STOP
        </button>
      </div>
    </div>

    <!-- Warning Banner -->
    <div v-if="!isLiveMode" class="warning-banner">
      <div class="warning-icon">⚠️</div>
      <div class="warning-content">
        <h3 class="warning-title">Live Trading Warning</h3>
        <p class="warning-text">
          Live trading involves real money and real risk. Make sure you understand the strategy and have tested it thoroughly in backtesting mode.
          Only trade with money you can afford to lose.
        </p>
      </div>
    </div>

    <div class="live-trading-layout">
      <!-- Configuration Panel -->
      <div class="config-panel" :class="{ 'disabled': isLiveMode }">
        <div class="panel-header">
          <h2 class="panel-title">Trading Configuration</h2>
          <div v-if="isLiveMode" class="panel-status">
            <span class="status-badge running">Session Active</span>
          </div>
        </div>
        
        <div class="config-sections">
          <!-- Strategy Selection -->
          <div class="config-section">
            <h3 class="section-title">Strategy</h3>
            <div class="form-group">
              <label class="form-label">Select Strategy</label>
              <select 
                v-model="selectedStrategy"
                :disabled="isLiveMode"
                class="form-select"
              >
                <option :value="null">Choose a strategy...</option>
                <option 
                  v-for="strategy in strategiesStore.strategies"
                  :key="strategy.id"
                  :value="strategy"
                >
                  {{ strategy.name }}
                </option>
              </select>
            </div>
            
            <div v-if="selectedStrategy" class="strategy-info">
              <div class="strategy-meta">
                <span class="meta-item">
                  <span class="meta-label">Category:</span>
                  <span class="meta-value">{{ selectedStrategy.category }}</span>
                </span>
                <span class="meta-item">
                  <span class="meta-label">Complexity:</span>
                  <span class="meta-value">{{ selectedStrategy.complexity }}</span>
                </span>
              </div>
              <p class="strategy-description">{{ selectedStrategy.description }}</p>
            </div>
          </div>

          <!-- Exchange & Pair -->
          <div class="config-section">
            <h3 class="section-title">Market</h3>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Exchange</label>
                <select 
                  v-model="selectedExchange"
                  :disabled="isLiveMode"
                  class="form-select"
                >
                  <option 
                    v-for="exchange in exchanges"
                    :key="exchange.id"
                    :value="exchange.id"
                    :disabled="exchange.status !== 'connected'"
                  >
                    {{ exchange.name }}
                    <span v-if="exchange.status !== 'connected'"> ({{ exchange.status }})</span>
                  </option>
                </select>
              </div>
              
              <div class="form-group">
                <label class="form-label">Trading Pair</label>
                <select 
                  v-model="selectedPair"
                  :disabled="isLiveMode"
                  class="form-select"
                >
                  <option 
                    v-for="pair in tradingPairs"
                    :key="pair"
                    :value="pair"
                  >
                    {{ pair }}
                  </option>
                </select>
              </div>
            </div>
            
            <div class="exchange-status">
              <span class="status-label">Connection Status:</span>
              <span 
                class="status-value"
                :class="getExchangeStatusColor(exchanges.find(ex => ex.id === selectedExchange)?.status || 'disconnected')"
              >
                {{ exchanges.find(ex => ex.id === selectedExchange)?.status || 'disconnected' }}
              </span>
            </div>
          </div>

          <!-- Risk Management -->
          <div class="config-section">
            <h3 class="section-title">Risk Management</h3>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Initial Balance ($)</label>
                <input 
                  v-model.number="initialBalance"
                  :disabled="isLiveMode"
                  type="number"
                  min="100"
                  step="100"
                  class="form-input"
                >
              </div>
              
              <div class="form-group">
                <label class="form-label">Max Drawdown (%)</label>
                <input 
                  v-model.number="maxDrawdown"
                  :disabled="isLiveMode"
                  type="number"
                  min="1"
                  max="50"
                  step="1"
                  class="form-input"
                >
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Stop Loss (%)</label>
                <input 
                  v-model.number="stopLoss"
                  :disabled="isLiveMode"
                  type="number"
                  min="0.1"
                  max="20"
                  step="0.1"
                  class="form-input"
                >
              </div>
              
              <div class="form-group">
                <label class="form-label">Take Profit (%)</label>
                <input 
                  v-model.number="takeProfit"
                  :disabled="isLiveMode"
                  type="number"
                  min="0.1"
                  max="50"
                  step="0.1"
                  class="form-input"
                >
              </div>
            </div>
          </div>

          <!-- Trading Controls -->
          <div class="config-section">
            <h3 class="section-title">Controls</h3>
            <div class="trading-controls">
              <button 
                v-if="!isLiveMode"
                @click="startLiveTrading"
                :disabled="!canStartTrading || !isConnectedToExchange"
                class="control-button start"
              >
                🚀 Start Live Trading
              </button>
              
              <button 
                v-else
                @click="stopLiveTrading"
                class="control-button stop"
              >
                ⏹️ Stop Trading
              </button>
              
              <div v-if="!canStartTrading" class="validation-errors">
                <p v-if="!selectedStrategy" class="error-item">• Select a strategy</p>
                <p v-if="!selectedExchange" class="error-item">• Select an exchange</p>
                <p v-if="!selectedPair" class="error-item">• Select a trading pair</p>
                <p v-if="initialBalance <= 0" class="error-item">• Set initial balance</p>
                <p v-if="!isConnectedToExchange" class="error-item">• Exchange not connected</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Live Dashboard -->
      <div class="dashboard-panel">
        <!-- Portfolio Overview -->
        <div class="dashboard-section">
          <div class="section-header">
            <h3 class="section-title">Portfolio Overview</h3>
            <div v-if="currentSession" class="session-info">
              <span class="session-duration">
                {{ Math.floor((Date.now() - new Date(currentSession.startTime).getTime()) / 60000) }}m
              </span>
            </div>
          </div>
          
          <div class="portfolio-grid">
            <div class="portfolio-card">
              <div class="card-header">
                <span class="card-title">Balance</span>
                <span class="card-icon">💰</span>
              </div>
              <div class="card-value">{{ formatCurrency(portfolio.balance) }}</div>
              <div class="card-change">Initial: {{ formatCurrency(initialBalance) }}</div>
            </div>
            
            <div class="portfolio-card">
              <div class="card-header">
                <span class="card-title">Equity</span>
                <span class="card-icon">📊</span>
              </div>
              <div class="card-value">{{ formatCurrency(currentEquity) }}</div>
              <div class="card-change" :class="{ 'positive': portfolio.unrealizedPnL >= 0, 'negative': portfolio.unrealizedPnL < 0 }">
                {{ formatCurrency(portfolio.unrealizedPnL) }}
              </div>
            </div>
            
            <div class="portfolio-card">
              <div class="card-header">
                <span class="card-title">Total Return</span>
                <span class="card-icon">📈</span>
              </div>
              <div class="card-value" :class="{ 'positive': totalReturnPercent >= 0, 'negative': totalReturnPercent < 0 }">
                {{ formatPercent(totalReturnPercent) }}
              </div>
              <div class="card-change">{{ formatCurrency(portfolio.realizedPnL) }} realized</div>
            </div>
            
            <div class="portfolio-card">
              <div class="card-header">
                <span class="card-title">Drawdown</span>
                <span class="card-icon">⚠️</span>
              </div>
              <div class="card-value" :class="getRiskColor(riskMetrics.riskLevel)">
                {{ formatPercent(riskMetrics.currentDrawdown) }}
              </div>
              <div class="card-change">Max: {{ formatPercent(portfolio.drawdown) }}</div>
            </div>
          </div>
        </div>

        <!-- Active Positions -->
        <div class="dashboard-section">
          <div class="section-header">
            <h3 class="section-title">Active Positions</h3>
            <span class="position-count">{{ positions.length }} open</span>
          </div>
          
          <div class="positions-container">
            <div v-if="positions.length === 0" class="empty-positions">
              <div class="empty-icon">📊</div>
              <p class="empty-text">No active positions</p>
            </div>
            
            <div 
              v-for="position in positions"
              :key="position.id"
              class="position-item"
            >
              <div class="position-info">
                <div class="position-symbol">{{ position.symbol }}</div>
                <div class="position-side" :class="position.side">{{ position.side.toUpperCase() }}</div>
              </div>
              
              <div class="position-details">
                <div class="detail-item">
                  <span class="detail-label">Size:</span>
                  <span class="detail-value">{{ position.size }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Entry:</span>
                  <span class="detail-value">{{ formatCurrency(position.entryPrice) }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Current:</span>
                  <span class="detail-value">{{ formatCurrency(position.currentPrice) }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">P&L:</span>
                  <span class="detail-value" :class="{ 'positive': position.unrealizedPnL >= 0, 'negative': position.unrealizedPnL < 0 }">
                    {{ formatCurrency(position.unrealizedPnL) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Trades -->
        <div class="dashboard-section">
          <div class="section-header">
            <h3 class="section-title">Recent Trades</h3>
            <span class="trade-count">{{ activeTrades.length }} today</span>
          </div>
          
          <div class="trades-container">
            <div v-if="activeTrades.length === 0" class="empty-trades">
              <div class="empty-icon">📋</div>
              <p class="empty-text">No trades executed yet</p>
            </div>
            
            <div 
              v-for="trade in activeTrades.slice(0, 10)"
              :key="trade.id"
              class="trade-item"
            >
              <div class="trade-info">
                <div class="trade-symbol">{{ trade.symbol }}</div>
                <div class="trade-side" :class="trade.side">{{ trade.side.toUpperCase() }}</div>
                <div class="trade-time">{{ new Date(trade.timestamp).toLocaleTimeString() }}</div>
              </div>
              
              <div class="trade-details">
                <div class="trade-price">{{ formatCurrency(trade.price) }}</div>
                <div class="trade-quantity">{{ trade.quantity }}</div>
                <div class="trade-pnl" :class="{ 'positive': trade.pnl && trade.pnl >= 0, 'negative': trade.pnl && trade.pnl < 0 }">
                  {{ trade.pnl ? formatCurrency(trade.pnl) : '-' }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Confirmation Modal -->
    <div v-if="showConfirmModal" class="modal-overlay" @click="cancelConfirmation">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">
            {{ confirmAction === 'start' ? 'Start Live Trading' : 'Stop Live Trading' }}
          </h3>
          <button @click="cancelConfirmation" class="modal-close">×</button>
        </div>
        
        <div class="modal-body">
          <div v-if="confirmAction === 'start'" class="confirmation-content">
            <div class="warning-section">
              <div class="warning-icon">⚠️</div>
              <div class="warning-text">
                <p><strong>You are about to start live trading with real money.</strong></p>
                <p>This will execute trades automatically based on your selected strategy. Make sure you understand the risks involved.</p>
              </div>
            </div>
            
            <div class="confirmation-details">
              <div class="detail-row">
                <span class="detail-label">Strategy:</span>
                <span class="detail-value">{{ selectedStrategy?.name }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Exchange:</span>
                <span class="detail-value">{{ exchanges.find(ex => ex.id === selectedExchange)?.name }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Trading Pair:</span>
                <span class="detail-value">{{ selectedPair }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Initial Balance:</span>
                <span class="detail-value">{{ formatCurrency(initialBalance) }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Max Drawdown:</span>
                <span class="detail-value">{{ maxDrawdown }}%</span>
              </div>
            </div>
          </div>
          
          <div v-else class="confirmation-content">
            <p>Are you sure you want to stop the live trading session?</p>
            <p>All open positions will be closed at market price.</p>
          </div>
        </div>
        
        <div class="modal-footer">
          <button @click="cancelConfirmation" class="modal-button secondary">
            Cancel
          </button>
          <button 
            @click="confirmLiveAction" 
            class="modal-button"
            :class="confirmAction === 'start' ? 'primary' : 'danger'"
          >
            {{ confirmAction === 'start' ? 'Start Trading' : 'Stop Trading' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.live-trading-view {
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
  min-height: calc(100vh - 4rem);
}

/* Header */
.live-trading-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  gap: 2rem;
}

.header-content {
  flex: 1;
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 0.5rem 0;
}

.page-subtitle {
  font-size: 1rem;
  color: #64748b;
  margin: 0;
}

.header-status {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background-color: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-radius: 0.5rem;
  transition: all 0.2s ease;
}

.status-indicator.active {
  background-color: #dcfce7;
  border-color: #16a34a;
  color: #15803d;
}

.status-dot {
  width: 0.5rem;
  height: 0.5rem;
  background-color: #64748b;
  border-radius: 50%;
  animation: none;
}

.status-indicator.active .status-dot {
  background-color: #16a34a;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.status-text {
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.emergency-stop {
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  animation: emergency-pulse 2s infinite;
}

@keyframes emergency-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.7); }
  50% { box-shadow: 0 0 0 10px rgba(220, 38, 38, 0); }
}

.emergency-stop:hover {
  background: linear-gradient(135deg, #b91c1c 0%, #991b1b 100%);
  transform: translateY(-1px);
}

/* Warning Banner */
.warning-banner {
  display: flex;
  gap: 1rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border: 1px solid #f59e0b;
  border-radius: 0.75rem;
  margin-bottom: 2rem;
}

.warning-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.warning-content {
  flex: 1;
}

.warning-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #92400e;
  margin: 0 0 0.5rem 0;
}

.warning-text {
  font-size: 0.875rem;
  color: #92400e;
  margin: 0;
  line-height: 1.5;
}

/* Layout */
.live-trading-layout {
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: 2rem;
}

/* Configuration Panel */
.config-panel {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  overflow: hidden;
  height: fit-content;
  position: sticky;
  top: 6rem;
}

.config-panel.disabled {
  opacity: 0.7;
  pointer-events: none;
}

.panel-header {
  padding: 1.5rem;
  background-color: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.panel-status {
  display: flex;
  gap: 0.5rem;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-badge.running {
  background-color: #dcfce7;
  color: #15803d;
}

.config-sections {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.config-section {
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 2rem;
}

.config-section:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 1rem 0;
}

.form-group {
  margin-bottom: 1rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
}

.form-input,
.form-select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  transition: border-color 0.2s ease;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-input:disabled,
.form-select:disabled {
  background-color: #f9fafb;
  color: #6b7280;
  cursor: not-allowed;
}

.strategy-info {
  margin-top: 1rem;
  padding: 1rem;
  background-color: #f8fafc;
  border-radius: 0.5rem;
}

.strategy-meta {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.meta-item {
  font-size: 0.75rem;
}

.meta-label {
  color: #64748b;
  font-weight: 500;
}

.meta-value {
  color: #1e293b;
  font-weight: 600;
  margin-left: 0.25rem;
}

.strategy-description {
  font-size: 0.875rem;
  color: #64748b;
  margin: 0;
  line-height: 1.5;
}

.exchange-status {
  margin-top: 1rem;
  padding: 0.75rem;
  background-color: #f8fafc;
  border-radius: 0.375rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-label {
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 500;
}

.status-value {
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: capitalize;
}

.trading-controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.control-button {
  padding: 1rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.control-button.start {
  background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
  color: white;
}

.control-button.start:hover:not(:disabled) {
  background: linear-gradient(135deg, #15803d 0%, #166534 100%);
  transform: translateY(-1px);
}

.control-button.start:disabled {
  background-color: #d1d5db;
  color: #9ca3af;
  cursor: not-allowed;
  transform: none;
}

.control-button.stop {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  color: white;
}

.control-button.stop:hover {
  background: linear-gradient(135deg, #b91c1c 0%, #991b1b 100%);
  transform: translateY(-1px);
}

.validation-errors {
  padding: 1rem;
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 0.5rem;
}

.error-item {
  font-size: 0.875rem;
  color: #dc2626;
  margin: 0 0 0.25rem 0;
}

.error-item:last-child {
  margin-bottom: 0;
}

/* Dashboard Panel */
.dashboard-panel {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.dashboard-section {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  overflow: hidden;
}

.section-header {
  padding: 1rem 1.5rem;
  background-color: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.session-info,
.position-count,
.trade-count {
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 500;
}

.session-duration {
  color: #16a34a;
  font-weight: 600;
}

/* Portfolio Grid */
.portfolio-grid {
  padding: 1.5rem;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.portfolio-card {
  padding: 1.5rem;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  transition: all 0.2s ease;
}

.portfolio-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.card-title {
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 500;
}

.card-icon {
  font-size: 1.25rem;
}

.card-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 0.5rem;
}

.card-change {
  font-size: 0.75rem;
  color: #64748b;
}

.positive {
  color: #16a34a !important;
}

.negative {
  color: #dc2626 !important;
}

/* Positions & Trades */
.positions-container,
.trades-container {
  padding: 1.5rem;
  max-height: 400px;
  overflow-y: auto;
}

.empty-positions,
.empty-trades {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 3rem 1rem;
  color: #64748b;
}

.empty-icon {
  font-size: 3rem;
  opacity: 0.5;
}

.empty-text {
  font-size: 0.875rem;
  margin: 0;
}

.position-item,
.trade-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  margin-bottom: 0.75rem;
  transition: all 0.2s ease;
}

.position-item:hover,
.trade-item:hover {
  border-color: #cbd5e1;
  background-color: #f8fafc;
}

.position-item:last-child,
.trade-item:last-child {
  margin-bottom: 0;
}

.position-info,
.trade-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.position-symbol,
.trade-symbol {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1e293b;
}

.position-side,
.trade-side {
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.position-side.long,
.trade-side.buy {
  background-color: #dcfce7;
  color: #15803d;
}

.position-side.short,
.trade-side.sell {
  background-color: #fee2e2;
  color: #dc2626;
}

.trade-time {
  font-size: 0.75rem;
  color: #64748b;
}

.position-details {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  text-align: right;
}

.trade-details {
  display: flex;
  gap: 2rem;
  align-items: center;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.detail-label {
  font-size: 0.75rem;
  color: #64748b;
}

.detail-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1e293b;
}

.trade-price,
.trade-quantity,
.trade-pnl {
  font-size: 0.875rem;
  font-weight: 600;
  text-align: right;
}

.trade-price {
  color: #1e293b;
}

.trade-quantity {
  color: #64748b;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 0.75rem;
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow: hidden;
}

.modal-header {
  padding: 1.5rem 1.5rem 0 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #64748b;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.25rem;
}

.modal-close:hover {
  background-color: #f3f4f6;
}

.modal-body {
  padding: 1.5rem;
}

.confirmation-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.warning-section {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background-color: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 0.5rem;
}

.warning-section .warning-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.warning-section .warning-text {
  flex: 1;
}

.warning-section .warning-text p {
  font-size: 0.875rem;
  color: #92400e;
  margin: 0 0 0.5rem 0;
  line-height: 1.5;
}

.warning-section .warning-text p:last-child {
  margin-bottom: 0;
}

.confirmation-details {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f1f5f9;
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-row .detail-label {
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 500;
}

.detail-row .detail-value {
  font-size: 0.875rem;
  color: #1e293b;
  font-weight: 600;
}

.modal-footer {
  padding: 0 1.5rem 1.5rem 1.5rem;
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.modal-button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.modal-button.secondary {
  background-color: #f1f5f9;
  color: #475569;
  border: 1px solid #cbd5e1;
}

.modal-button.secondary:hover {
  background-color: #e2e8f0;
}

.modal-button.primary {
  background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
  color: white;
}

.modal-button.primary:hover {
  background: linear-gradient(135deg, #15803d 0%, #166534 100%);
}

.modal-button.danger {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  color: white;
}

.modal-button.danger:hover {
  background: linear-gradient(135deg, #b91c1c 0%, #991b1b 100%);
}

/* Responsive */
@media (max-width: 1024px) {
  .live-trading-layout {
    grid-template-columns: 1fr;
  }
  
  .config-panel {
    position: static;
    order: 2;
  }
  
  .dashboard-panel {
    order: 1;
  }
}

@media (max-width: 768px) {
  .live-trading-view {
    padding: 1rem;
  }
  
  .live-trading-header {
    flex-direction: column;
    gap: 1rem;
  }
  
  .header-status {
    width: 100%;
    justify-content: space-between;
  }
  
  .portfolio-grid {
    grid-template-columns: 1fr;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .position-details {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .trade-details {
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-end;
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
  .dashboard-section,
  .portfolio-card,
  .position-item,
  .trade-item,
  .modal-content {
    background: #1e293b;
    border-color: #334155;
  }
  
  .panel-header,
  .section-header {
    background-color: #0f172a;
    border-color: #475569;
  }
  
  .panel-title,
  .section-title,
  .modal-title {
    color: #f8fafc;
  }
  
  .card-value,
  .detail-value {
    color: #f8fafc;
  }
  
  .strategy-info,
  .exchange-status {
    background-color: #0f172a;
  }
}
</style>