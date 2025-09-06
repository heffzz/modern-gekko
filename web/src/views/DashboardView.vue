<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useMainStore } from '@/stores/main'
import { useBacktestStore } from '@/stores/backtest'
import { useStrategiesStore } from '@/stores/strategies'
import { useIndicatorsStore } from '@/stores/indicators'

const mainStore = useMainStore()
const backtestStore = useBacktestStore()
const strategiesStore = useStrategiesStore()
const indicatorsStore = useIndicatorsStore()

const refreshInterval = ref<NodeJS.Timeout | null>(null)
const lastUpdate = ref(new Date())

// Dashboard stats
const dashboardStats = computed(() => ({
  totalStrategies: strategiesStore.strategiesCount,
  totalIndicators: indicatorsStore.indicatorsByCategory.length,
  totalBacktests: backtestStore.results.length,
  serverUptime: mainStore.serverHealth?.uptime || 0,
  memoryUsage: mainStore.memoryUsagePercent,
  isConnected: mainStore.isServerHealthy
}))

// Recent activity
const recentActivity = computed(() => {
  const activities = []
  
  // Recent backtest results
  backtestStore.results.slice(-3).forEach(result => {
    activities.push({
      id: `backtest-${result.id}`,
      type: 'backtest',
      title: `Backtest completed: ${result.strategy}`,
      description: `ROI: ${result.metrics.totalReturn.toFixed(2)}%, Trades: ${result.trades.length}`,
      timestamp: new Date(result.endTime || Date.now()),
      status: result.metrics.totalReturn > 0 ? 'success' : 'error'
    })
  })
  
  // Recent strategy updates
  if (strategiesStore.currentStrategy) {
    activities.push({
      id: 'strategy-current',
      type: 'strategy',
      title: `Strategy loaded: ${strategiesStore.currentStrategy.name}`,
      description: 'Ready for backtesting',
      timestamp: new Date(),
      status: 'info'
    })
  }
  
  return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 5)
})

// Quick actions
const quickActions = [
  {
    title: 'Run Backtest',
    description: 'Test your strategy with historical data',
    icon: '📊',
    route: '/backtest',
    color: 'blue'
  },
  {
    title: 'Create Strategy',
    description: 'Build a new trading strategy',
    icon: '⚡',
    route: '/strategies/new',
    color: 'green'
  },
  {
    title: 'View Indicators',
    description: 'Explore technical indicators',
    icon: '📈',
    route: '/indicators',
    color: 'purple'
  },
  {
    title: 'Live Trading',
    description: 'Start live trading session',
    icon: '🚀',
    route: '/live',
    color: 'red'
  }
]

const refreshData = async () => {
  try {
    await Promise.all([
      mainStore.fetchServerHealth(),
      strategiesStore.fetchStrategies(),
      indicatorsStore.loadAvailableIndicators()
    ])
    lastUpdate.value = new Date()
  } catch (error) {
    console.error('Failed to refresh dashboard data:', error)
  }
}

const startAutoRefresh = () => {
  refreshInterval.value = setInterval(refreshData, 30000) // 30 seconds
}

const stopAutoRefresh = () => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
    refreshInterval.value = null
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'success': return 'text-green-600'
    case 'error': return 'text-red-600'
    case 'warning': return 'text-yellow-600'
    case 'info': return 'text-blue-600'
    default: return 'text-gray-600'
  }
}

const getActionColorClasses = (color: string) => {
  switch (color) {
    case 'blue': return 'bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-700'
    case 'green': return 'bg-green-50 border-green-200 hover:bg-green-100 text-green-700'
    case 'purple': return 'bg-purple-50 border-purple-200 hover:bg-purple-100 text-purple-700'
    case 'red': return 'bg-red-50 border-red-200 hover:bg-red-100 text-red-700'
    default: return 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-700'
  }
}

const formatUptime = (seconds: number) => {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

const formatTimestamp = (date: Date) => {
  return date.toLocaleString()
}

onMounted(() => {
  refreshData()
  startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<template>
  <div class="dashboard-view">
    <!-- Header Section -->
    <div class="dashboard-header">
      <div class="header-content">
        <h1 class="dashboard-title">Trading Dashboard</h1>
        <p class="dashboard-subtitle">
          Monitor your trading bot performance and manage strategies
        </p>
      </div>
      
      <div class="header-actions">
        <button 
          @click="refreshData"
          :disabled="mainStore.loading"
          class="refresh-button"
        >
          <span class="refresh-icon" :class="{ 'spinning': mainStore.loading }">🔄</span>
          Refresh
        </button>
        
        <div class="last-update">
          <span class="update-label">Last updated:</span>
          <span class="update-time">{{ formatTimestamp(lastUpdate) }}</span>
        </div>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">⚡</div>
        <div class="stat-content">
          <div class="stat-value">{{ dashboardStats.totalStrategies }}</div>
          <div class="stat-label">Strategies</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">📊</div>
        <div class="stat-content">
          <div class="stat-value">{{ dashboardStats.totalIndicators }}</div>
          <div class="stat-label">Indicators</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">🧪</div>
        <div class="stat-content">
          <div class="stat-value">{{ dashboardStats.totalBacktests }}</div>
          <div class="stat-label">Backtests</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">⏱️</div>
        <div class="stat-content">
          <div class="stat-value">{{ formatUptime(dashboardStats.serverUptime) }}</div>
          <div class="stat-label">Uptime</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">💾</div>
        <div class="stat-content">
          <div class="stat-value">{{ dashboardStats.memoryUsage }}%</div>
          <div class="stat-label">Memory</div>
        </div>
      </div>
      
      <div class="stat-card" :class="{ 'stat-healthy': dashboardStats.isConnected }">
        <div class="stat-icon">{{ dashboardStats.isConnected ? '🟢' : '🔴' }}</div>
        <div class="stat-content">
          <div class="stat-value">{{ dashboardStats.isConnected ? 'Online' : 'Offline' }}</div>
          <div class="stat-label">Status</div>
        </div>
      </div>
    </div>

    <!-- Main Content Grid -->
    <div class="content-grid">
      <!-- Quick Actions -->
      <div class="content-section">
        <h2 class="section-title">Quick Actions</h2>
        <div class="quick-actions-grid">
          <RouterLink
            v-for="action in quickActions"
            :key="action.title"
            :to="action.route"
            class="quick-action-card"
            :class="getActionColorClasses(action.color)"
          >
            <div class="action-icon">{{ action.icon }}</div>
            <div class="action-content">
              <h3 class="action-title">{{ action.title }}</h3>
              <p class="action-description">{{ action.description }}</p>
            </div>
          </RouterLink>
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="content-section">
        <h2 class="section-title">Recent Activity</h2>
        <div class="activity-list">
          <div 
            v-for="activity in recentActivity"
            :key="activity.id"
            class="activity-item"
          >
            <div class="activity-icon" :class="getStatusColor(activity.status)">
              {{ activity.type === 'backtest' ? '📊' : activity.type === 'strategy' ? '⚡' : '📈' }}
            </div>
            <div class="activity-content">
              <h4 class="activity-title">{{ activity.title }}</h4>
              <p class="activity-description">{{ activity.description }}</p>
              <span class="activity-timestamp">{{ formatTimestamp(activity.timestamp) }}</span>
            </div>
          </div>
          
          <div v-if="recentActivity.length === 0" class="empty-activity">
            <div class="empty-icon">📝</div>
            <p class="empty-text">No recent activity</p>
            <p class="empty-subtext">Start by running a backtest or creating a strategy</p>
          </div>
        </div>
      </div>

      <!-- System Status -->
      <div class="content-section">
        <h2 class="section-title">System Status</h2>
        <div class="status-grid">
          <div class="status-item">
            <div class="status-label">API Server</div>
            <div class="status-value" :class="dashboardStats.isConnected ? 'status-healthy' : 'status-error'">
              {{ dashboardStats.isConnected ? 'Healthy' : 'Offline' }}
            </div>
          </div>
          
          <div class="status-item">
            <div class="status-label">WebSocket</div>
            <div class="status-value" :class="mainStore.isWebSocketConnected ? 'status-healthy' : 'status-warning'">
              {{ mainStore.isWebSocketConnected ? 'Connected' : 'Disconnected' }}
            </div>
          </div>
          
          <div class="status-item">
            <div class="status-label">Memory Usage</div>
            <div class="status-value" :class="dashboardStats.memoryUsage > 80 ? 'status-warning' : 'status-healthy'">
              {{ dashboardStats.memoryUsage }}%
            </div>
          </div>
          
          <div class="status-item">
            <div class="status-label">Active Strategies</div>
            <div class="status-value status-info">
              {{ strategiesStore.currentStrategy ? '1' : '0' }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-view {
  padding: 1.5rem;
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  overflow: hidden;
}

/* Header */
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 3rem;
  padding: 2rem;
  background: white;
  border-radius: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
  gap: 2rem;
}

.header-content {
  flex: 1;
}

.dashboard-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 0.5rem 0;
}

.dashboard-subtitle {
  font-size: 1.125rem;
  color: #64748b;
  margin: 0;
  font-weight: 400;
}

.header-actions {
  display: flex;
  align-items: flex-end;
  gap: 1.5rem;
  flex-direction: column;
}

.refresh-button {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.5rem;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 1rem;
}

.refresh-button:hover {
  background-color: #2563eb;
}

.refresh-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.refresh-icon.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.last-update {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  font-size: 0.75rem;
}

.update-label {
  color: #64748b;
}

.update-time {
  color: #1e293b;
  font-weight: 500;
  font-family: monospace;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
  width: 100%;
}

.stat-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 1rem;
  padding: 2rem;
  display: flex;
  align-items: center;
  gap: 1.5rem;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.stat-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.stat-card.stat-healthy {
  border-color: #10b981;
  background: linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%);
}

.stat-icon {
  font-size: 2.5rem;
  opacity: 0.9;
  min-width: 3rem;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
  line-height: 1.2;
}

.stat-label {
  font-size: 1rem;
  color: #64748b;
  margin-top: 0.5rem;
  font-weight: 500;
}

/* Content Grid */
.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 1.5rem;
  margin-top: 1.5rem;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.content-section {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border: 1px solid #e2e8f0;
  border-radius: 1.5rem;
  padding: 1.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  position: relative;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 700;
  background: linear-gradient(135deg, #1e293b 0%, #475569 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0 0 1.25rem 0;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid #e2e8f0;
  flex-shrink: 0;
}

/* Quick Actions */
.quick-actions-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  flex: 1;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.quick-action-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  border: 1px solid;
  border-radius: 1rem;
  text-decoration: none;
  transition: all 0.3s ease;
  min-height: 70px;
  backdrop-filter: blur(10px);
  transform: translateY(0);
}

.quick-action-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.action-icon {
  font-size: 1.5rem;
}

.action-content {
  flex: 1;
}

.action-title {
  font-size: 0.875rem;
  font-weight: 600;
  margin: 0 0 0.25rem 0;
}

.action-description {
  font-size: 0.75rem;
  opacity: 0.8;
  margin: 0;
}

/* Activity List */
.activity-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  flex: 1;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.activity-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
  border-radius: 1rem;
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
  backdrop-filter: blur(5px);
}

.activity-item:hover {
  transform: translateX(4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: #cbd5e1;
}

.activity-icon {
  font-size: 1.25rem;
  margin-top: 0.125rem;
}

.activity-content {
  flex: 1;
  min-width: 0;
}

.activity-title {
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 0.5rem 0;
  line-height: 1.4;
}

.activity-description {
  font-size: 0.875rem;
  color: #64748b;
  margin: 0 0 0.5rem 0;
  line-height: 1.4;
}

.activity-timestamp {
  font-size: 0.8rem;
  color: #94a3b8;
  font-family: monospace;
  margin-top: 0.5rem;
  font-weight: 500;
}

.empty-activity {
  text-align: center;
  padding: 2rem;
  color: #64748b;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-text {
  font-weight: 500;
  margin: 0 0 0.5rem 0;
}

.empty-subtext {
  font-size: 0.875rem;
  opacity: 0.8;
  margin: 0;
}

/* Status Items */
.status-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  flex: 1;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
  border-radius: 1rem;
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
  backdrop-filter: blur(5px);
}

.status-item:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: #cbd5e1;
}

.status-label {
  font-size: 1rem;
  color: #64748b;
  font-weight: 500;
}

.status-value {
  font-size: 0.875rem;
  font-weight: 600;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
}

.status-healthy {
  background-color: #dcfce7;
  color: #166534;
}

.status-warning {
  background-color: #fef3c7;
  color: #92400e;
}

.status-error {
  background-color: #fee2e2;
  color: #991b1b;
}

.status-info {
  background-color: #dbeafe;
  color: #1e40af;
}

/* Responsive */
@media (max-width: 1200px) {
  .content-grid {
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
  }
}

@media (max-width: 1024px) {
  .content-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  
  .quick-actions-grid {
    grid-template-columns: 1fr;
  }
  
  .status-grid {
    grid-template-columns: 1fr 1fr;
  }
  
  .stats-grid {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  }
}

@media (max-width: 768px) {
  .dashboard-view {
    padding: 1rem;
    height: 100vh;
  }
  
  .dashboard-header {
    flex-direction: column;
    align-items: stretch;
    gap: 1.5rem;
    padding: 1.5rem;
  }
  
  .header-actions {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
  
  .dashboard-title {
    font-size: 2rem;
  }
  
  .dashboard-subtitle {
    font-size: 1rem;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  
  .stat-card {
    padding: 1.25rem;
  }
  
  .content-grid {
    grid-template-columns: 1fr;
    gap: 1.25rem;
    margin-top: 1rem;
  }
  
  .content-section {
    padding: 1.25rem;
    min-height: 300px;
    max-height: 400px;
  }
  
  .section-title {
    font-size: 1.125rem;
    margin-bottom: 1rem;
  }
  
  .status-grid {
    grid-template-columns: 1fr;
  }
  
  .quick-actions-grid {
    grid-template-columns: 1fr;
  }
  
  .activity-list {
    max-height: 250px;
  }
  
  .status-grid {
    max-height: 250px;
  }
}

/* Custom Scrollbar */
.quick-actions-grid::-webkit-scrollbar,
.activity-list::-webkit-scrollbar,
.status-grid::-webkit-scrollbar {
  width: 6px;
}

.quick-actions-grid::-webkit-scrollbar-track,
.activity-list::-webkit-scrollbar-track,
.status-grid::-webkit-scrollbar-track {
  background: transparent;
}

.quick-actions-grid::-webkit-scrollbar-thumb,
.activity-list::-webkit-scrollbar-thumb,
.status-grid::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.quick-actions-grid::-webkit-scrollbar-thumb:hover,
.activity-list::-webkit-scrollbar-thumb:hover,
.status-grid::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* Glassmorphism Effects */
.content-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
  border-radius: 1.5rem;
  pointer-events: none;
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .dashboard-view {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  }
  
  .dashboard-title {
    color: #f8fafc;
  }
  
  .dashboard-subtitle {
    color: #94a3b8;
  }
  
  .update-time {
    color: #f8fafc;
  }
  
  .stat-card {
    background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
    border-color: #475569;
  }
  
  .stat-value {
    color: #f8fafc;
  }
  
  .content-section {
    background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
    border-color: #475569;
  }
  
  .section-title {
    background: linear-gradient(135deg, #f8fafc 0%, #cbd5e1 100%);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  
  .activity-item {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    border-color: #334155;
  }
  
  .activity-title {
    color: #f8fafc;
  }
  
  .status-item {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    border-color: #334155;
  }
  
  .quick-action-card {
    backdrop-filter: blur(20px);
  }
}
</style>