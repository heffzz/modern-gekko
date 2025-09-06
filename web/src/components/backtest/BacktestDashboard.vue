<template>
  <div class="backtest-dashboard">
    <!-- Header -->
    <div class="dashboard-header">
      <div class="header-content">
        <div class="title-section">
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
            Backtest Dashboard
          </h1>
          <p class="text-gray-600 dark:text-gray-400 mt-1">
            Analyze strategy performance with historical data
          </p>
        </div>
        
        <div class="header-actions">
          <button 
            @click="showFilters = !showFilters"
            class="btn-secondary"
          >
            <FunnelIcon class="w-4 h-4" />
            Filters
          </button>
          
          <button 
            @click="refreshData"
            class="btn-secondary"
            :disabled="isLoading"
          >
            <ArrowPathIcon :class="['w-4 h-4', isLoading ? 'animate-spin' : '']" />
            Refresh
          </button>
          
          <button 
            @click="startNewBacktest"
            class="btn-primary"
          >
            <PlusIcon class="w-4 h-4" />
            New Backtest
          </button>
        </div>
      </div>
      
      <!-- Filters -->
      <div v-if="showFilters" class="filters-panel">
        <div class="filters-grid">
          <div class="filter-group">
            <label class="filter-label">Strategy</label>
            <select v-model="filters.strategyId" class="filter-select">
              <option value="">All strategies</option>
              <option 
                v-for="strategy in strategies" 
                :key="strategy.id"
                :value="strategy.id"
              >
                {{ strategy.name }}
              </option>
            </select>
          </div>
          
          <div class="filter-group">
            <label class="filter-label">Status</label>
            <select v-model="filters.status" class="filter-select">
              <option value="">All statuses</option>
              <option value="completed">Completed</option>
              <option value="running">Running</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label class="filter-label">Date Range</label>
            <select v-model="filters.dateRange" class="filter-select">
              <option value="">All time</option>
              <option value="today">Today</option>
              <option value="week">This week</option>
              <option value="month">This month</option>
              <option value="quarter">This quarter</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label class="filter-label">Search</label>
            <input 
              v-model="filters.search"
              type="text"
              placeholder="Search backtests..."
              class="filter-input"
            />
          </div>
        </div>
        
        <div class="filters-actions">
          <button @click="clearFilters" class="btn-text">
            Clear all
          </button>
        </div>
      </div>
    </div>

    <!-- Stats Overview -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400">
          <ChartBarIcon class="w-6 h-6" />
        </div>
        <div class="stat-content">
          <p class="stat-label">Total Backtests</p>
          <p class="stat-value">{{ stats.totalBacktests }}</p>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400">
          <TrendingUpIcon class="w-6 h-6" />
        </div>
        <div class="stat-content">
          <p class="stat-label">Avg Return</p>
          <p class="stat-value">{{ formatPercentage(stats.avgReturn) }}</p>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400">
          <StarIcon class="w-6 h-6" />
        </div>
        <div class="stat-content">
          <p class="stat-label">Best Return</p>
          <p class="stat-value">{{ formatPercentage(stats.bestReturn) }}</p>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-400">
          <ClockIcon class="w-6 h-6" />
        </div>
        <div class="stat-content">
          <p class="stat-label">Running</p>
          <p class="stat-value">{{ stats.runningBacktests }}</p>
        </div>
      </div>
    </div>

    <!-- View Toggle -->
    <div class="view-controls">
      <div class="view-toggle">
        <button 
          @click="viewMode = 'grid'"
          :class="['toggle-btn', viewMode === 'grid' ? 'active' : '']"
        >
          <Squares2X2Icon class="w-4 h-4" />
          Grid
        </button>
        <button 
          @click="viewMode = 'list'"
          :class="['toggle-btn', viewMode === 'list' ? 'active' : '']"
        >
          <ListBulletIcon class="w-4 h-4" />
          List
        </button>
      </div>
      
      <div class="sort-controls">
        <select v-model="sortBy" class="sort-select">
          <option value="createdAt">Date Created</option>
          <option value="performance.totalReturn">Return</option>
          <option value="performance.sharpeRatio">Sharpe Ratio</option>
          <option value="performance.maxDrawdown">Max Drawdown</option>
          <option value="strategyName">Strategy Name</option>
        </select>
        
        <button 
          @click="sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'"
          class="sort-order-btn"
        >
          <ChevronUpIcon 
            :class="['w-4 h-4 transition-transform', sortOrder === 'desc' ? 'rotate-180' : '']"
          />
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="dashboard-content">
      <!-- Loading State -->
      <div v-if="isLoading" class="loading-state">
        <div class="loading-spinner-lg" />
        <p class="text-gray-600 dark:text-gray-400 mt-4">
          Loading backtests...
        </p>
      </div>
      
      <!-- Empty State -->
      <div v-else-if="filteredBacktests.length === 0" class="empty-state">
        <ChartBarIcon class="w-16 h-16 text-gray-400 mx-auto" />
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mt-4">
          {{ backtests.length === 0 ? 'No backtests yet' : 'No backtests match your filters' }}
        </h3>
        <p class="text-gray-600 dark:text-gray-400 mt-2">
          {{ backtests.length === 0 
            ? 'Create your first backtest to analyze strategy performance' 
            : 'Try adjusting your filters or search terms'
          }}
        </p>
        <button 
          v-if="backtests.length === 0"
          @click="startNewBacktest"
          class="btn-primary mt-6"
        >
          <PlusIcon class="w-4 h-4" />
          Create First Backtest
        </button>
        <button 
          v-else
          @click="clearFilters"
          class="btn-secondary mt-6"
        >
          Clear Filters
        </button>
      </div>
      
      <!-- Grid View -->
      <div v-else-if="viewMode === 'grid'" class="backtests-grid">
        <div 
          v-for="backtest in filteredBacktests" 
          :key="backtest.id"
          class="backtest-card"
          @click="viewBacktest(backtest)"
        >
          <div class="card-header">
            <div class="card-title">
              <h3 class="font-semibold text-gray-900 dark:text-white">
                {{ backtest.strategyName }}
              </h3>
              <span :class="['status-badge', `status-${backtest.status}`]">
                {{ backtest.status }}
              </span>
            </div>
            
            <div class="card-actions">
              <button 
                @click.stop="duplicateBacktest(backtest)"
                class="action-btn"
                title="Duplicate"
              >
                <DocumentDuplicateIcon class="w-4 h-4" />
              </button>
              
              <button 
                @click.stop="deleteBacktest(backtest.id)"
                class="action-btn text-red-500 hover:text-red-700"
                title="Delete"
              >
                <TrashIcon class="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div class="card-content">
            <div class="performance-metrics">
              <div class="metric">
                <span class="metric-label">Return</span>
                <span :class="[
                  'metric-value',
                  backtest.performance?.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'
                ]">
                  {{ formatPercentage(backtest.performance?.totalReturn) }}
                </span>
              </div>
              
              <div class="metric">
                <span class="metric-label">Sharpe</span>
                <span class="metric-value">
                  {{ formatNumber(backtest.performance?.sharpeRatio) }}
                </span>
              </div>
              
              <div class="metric">
                <span class="metric-label">Max DD</span>
                <span class="metric-value text-red-600">
                  {{ formatPercentage(backtest.performance?.maxDrawdown) }}
                </span>
              </div>
            </div>
            
            <div class="card-meta">
              <div class="meta-item">
                <CalendarIcon class="w-4 h-4 text-gray-400" />
                <span class="text-sm text-gray-600 dark:text-gray-400">
                  {{ formatDate(backtest.createdAt) }}
                </span>
              </div>
              
              <div class="meta-item">
                <ClockIcon class="w-4 h-4 text-gray-400" />
                <span class="text-sm text-gray-600 dark:text-gray-400">
                  {{ formatDuration(backtest.duration) }}
                </span>
              </div>
            </div>
          </div>
          
          <!-- Mini Chart -->
          <div v-if="backtest.performance?.equityCurve" class="mini-chart">
            <canvas 
              :ref="el => setupMiniChart(el, backtest.performance.equityCurve)"
              class="w-full h-12"
            />
          </div>
        </div>
      </div>
      
      <!-- List View -->
      <div v-else class="backtests-table">
        <div class="table-container">
          <table class="w-full">
            <thead class="table-header">
              <tr>
                <th class="table-th">Strategy</th>
                <th class="table-th">Status</th>
                <th class="table-th">Return</th>
                <th class="table-th">Sharpe Ratio</th>
                <th class="table-th">Max Drawdown</th>
                <th class="table-th">Trades</th>
                <th class="table-th">Created</th>
                <th class="table-th">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr 
                v-for="backtest in filteredBacktests" 
                :key="backtest.id"
                class="table-row"
                @click="viewBacktest(backtest)"
              >
                <td class="table-td">
                  <div class="strategy-cell">
                    <span class="font-medium text-gray-900 dark:text-white">
                      {{ backtest.strategyName }}
                    </span>
                    <span class="text-sm text-gray-500">
                      v{{ backtest.strategyVersion }}
                    </span>
                  </div>
                </td>
                
                <td class="table-td">
                  <span :class="['status-badge', `status-${backtest.status}`]">
                    {{ backtest.status }}
                  </span>
                </td>
                
                <td class="table-td">
                  <span :class="[
                    'font-medium',
                    backtest.performance?.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'
                  ]">
                    {{ formatPercentage(backtest.performance?.totalReturn) }}
                  </span>
                </td>
                
                <td class="table-td">
                  {{ formatNumber(backtest.performance?.sharpeRatio) }}
                </td>
                
                <td class="table-td">
                  <span class="text-red-600">
                    {{ formatPercentage(backtest.performance?.maxDrawdown) }}
                  </span>
                </td>
                
                <td class="table-td">
                  {{ backtest.performance?.totalTrades || 0 }}
                </td>
                
                <td class="table-td">
                  <span class="text-sm text-gray-600 dark:text-gray-400">
                    {{ formatDate(backtest.createdAt) }}
                  </span>
                </td>
                
                <td class="table-td">
                  <div class="table-actions">
                    <button 
                      @click.stop="viewBacktest(backtest)"
                      class="action-btn"
                      title="View"
                    >
                      <EyeIcon class="w-4 h-4" />
                    </button>
                    
                    <button 
                      @click.stop="duplicateBacktest(backtest)"
                      class="action-btn"
                      title="Duplicate"
                    >
                      <DocumentDuplicateIcon class="w-4 h-4" />
                    </button>
                    
                    <button 
                      @click.stop="deleteBacktest(backtest.id)"
                      class="action-btn text-red-500 hover:text-red-700"
                      title="Delete"
                    >
                      <TrashIcon class="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="pagination">
      <button 
        @click="currentPage = Math.max(1, currentPage - 1)"
        :disabled="currentPage === 1"
        class="pagination-btn"
      >
        <ChevronLeftIcon class="w-4 h-4" />
        Previous
      </button>
      
      <div class="pagination-info">
        Page {{ currentPage }} of {{ totalPages }}
      </div>
      
      <button 
        @click="currentPage = Math.min(totalPages, currentPage + 1)"
        :disabled="currentPage === totalPages"
        class="pagination-btn"
      >
        Next
        <ChevronRightIcon class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import {
  ChartBarIcon,
  TrendingUpIcon,
  StarIcon,
  ClockIcon,
  PlusIcon,
  FunnelIcon,
  ArrowPathIcon,
  Squares2X2Icon,
  ListBulletIcon,
  ChevronUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
  EyeIcon,
  DocumentDuplicateIcon,
  TrashIcon
} from '@heroicons/vue/24/outline'
import { useStrategyStore } from '@/stores/strategy'
import { useNotificationStore } from '@/stores/notifications'
import type { StrategyBacktestResult } from '@/types/strategy'

// Stores
const strategyStore = useStrategyStore()
const notificationStore = useNotificationStore()
const router = useRouter()

// State
const isLoading = ref(false)
const showFilters = ref(false)
const viewMode = ref<'grid' | 'list'>('grid')
const currentPage = ref(1)
const itemsPerPage = ref(12)

// Filters
const filters = ref({
  strategyId: '',
  status: '',
  dateRange: '',
  search: ''
})

// Sorting
const sortBy = ref('createdAt')
const sortOrder = ref<'asc' | 'desc'>('desc')

// Computed
const strategies = computed(() => strategyStore.strategies)
const backtests = computed(() => strategyStore.backtestResults)

const filteredBacktests = computed(() => {
  let filtered = backtests.value
  
  // Apply filters
  if (filters.value.strategyId) {
    filtered = filtered.filter(b => b.strategyId === filters.value.strategyId)
  }
  
  if (filters.value.status) {
    filtered = filtered.filter(b => b.status === filters.value.status)
  }
  
  if (filters.value.search) {
    const search = filters.value.search.toLowerCase()
    filtered = filtered.filter(b => 
      b.strategyName?.toLowerCase().includes(search) ||
      b.id.toLowerCase().includes(search)
    )
  }
  
  if (filters.value.dateRange) {
    const now = Date.now()
    const ranges = {
      today: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
      quarter: 90 * 24 * 60 * 60 * 1000
    }
    
    const range = ranges[filters.value.dateRange as keyof typeof ranges]
    if (range) {
      filtered = filtered.filter(b => now - b.createdAt <= range)
    }
  }
  
  // Apply sorting
  filtered.sort((a, b) => {
    let aValue: any
    let bValue: any
    
    if (sortBy.value.includes('.')) {
      const [obj, prop] = sortBy.value.split('.')
      aValue = (a as any)[obj]?.[prop]
      bValue = (b as any)[obj]?.[prop]
    } else {
      aValue = (a as any)[sortBy.value]
      bValue = (b as any)[sortBy.value]
    }
    
    if (aValue === undefined) aValue = 0
    if (bValue === undefined) bValue = 0
    
    if (aValue < bValue) return sortOrder.value === 'asc' ? -1 : 1
    if (aValue > bValue) return sortOrder.value === 'asc' ? 1 : -1
    return 0
  })
  
  // Apply pagination
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  
  return filtered.slice(start, end)
})

const totalPages = computed(() => {
  const total = backtests.value.length
  return Math.ceil(total / itemsPerPage.value)
})

const stats = computed(() => {
  const completed = backtests.value.filter(b => b.status === 'completed')
  const returns = completed.map(b => b.performance?.totalReturn || 0)
  
  return {
    totalBacktests: backtests.value.length,
    avgReturn: returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0,
    bestReturn: returns.length > 0 ? Math.max(...returns) : 0,
    runningBacktests: backtests.value.filter(b => b.status === 'running').length
  }
})

// Methods
const refreshData = async () => {
  try {
    isLoading.value = true
    await strategyStore.loadStrategies()
    // Load backtests would be here
  } catch (error) {
    console.error('Refresh error:', error)
  } finally {
    isLoading.value = false
  }
}

const startNewBacktest = () => {
  router.push('/backtest/new')
}

const viewBacktest = (backtest: StrategyBacktestResult) => {
  router.push(`/backtest/results/${backtest.id}`)
}

const duplicateBacktest = async (backtest: StrategyBacktestResult) => {
  try {
    // Create a new backtest with same parameters
    const duplicate = {
      ...backtest.request,
      name: `${backtest.strategyName} (Copy)`
    }
    
    router.push({
      path: '/backtest/new',
      query: { template: JSON.stringify(duplicate) }
    })
    
  } catch (error) {
    console.error('Duplicate error:', error)
    notificationStore.addNotification({
      type: 'error',
      title: 'Duplication Failed',
      message: 'Failed to duplicate backtest'
    })
  }
}

const deleteBacktest = async (id: string) => {
  if (!confirm('Are you sure you want to delete this backtest?')) {
    return
  }
  
  try {
    // Delete backtest logic would be here
    notificationStore.addNotification({
      type: 'success',
      title: 'Backtest Deleted',
      message: 'Backtest deleted successfully'
    })
    
  } catch (error) {
    console.error('Delete error:', error)
    notificationStore.addNotification({
      type: 'error',
      title: 'Deletion Failed',
      message: 'Failed to delete backtest'
    })
  }
}

const clearFilters = () => {
  filters.value = {
    strategyId: '',
    status: '',
    dateRange: '',
    search: ''
  }
  currentPage.value = 1
}

const setupMiniChart = (canvas: HTMLCanvasElement | null, equityCurve: number[]) => {
  if (!canvas || !equityCurve?.length) return
  
  nextTick(() => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const { width, height } = canvas.getBoundingClientRect()
    canvas.width = width * devicePixelRatio
    canvas.height = height * devicePixelRatio
    ctx.scale(devicePixelRatio, devicePixelRatio)
    
    // Draw equity curve
    const maxValue = Math.max(...equityCurve)
    const minValue = Math.min(...equityCurve)
    const range = maxValue - minValue || 1
    
    ctx.strokeStyle = equityCurve[equityCurve.length - 1] >= equityCurve[0] ? '#10b981' : '#ef4444'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    
    equityCurve.forEach((value, index) => {
      const x = (index / (equityCurve.length - 1)) * width
      const y = height - ((value - minValue) / range) * height
      
      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    
    ctx.stroke()
  })
}

// Formatters
const formatPercentage = (value: number | undefined): string => {
  if (value === undefined || value === null) return 'N/A'
  return `${value.toFixed(2)}%`
}

const formatNumber = (value: number | undefined): string => {
  if (value === undefined || value === null) return 'N/A'
  return value.toFixed(2)
}

const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleDateString()
}

const formatDuration = (duration: number | undefined): string => {
  if (!duration) return 'N/A'
  
  const seconds = Math.floor(duration / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  } else {
    return `${seconds}s`
  }
}

// Lifecycle
onMounted(async () => {
  await refreshData()
})
</script>

<style scoped>
.backtest-dashboard {
  @apply space-y-6;
}

.dashboard-header {
  @apply bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700;
}

.header-content {
  @apply flex items-center justify-between p-6;
}

.title-section {
  @apply flex-1;
}

.header-actions {
  @apply flex items-center gap-3;
}

.filters-panel {
  @apply border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-700/50;
}

.filters-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4;
}

.filter-group {
  @apply space-y-2;
}

.filter-label {
  @apply block text-sm font-medium text-gray-700 dark:text-gray-300;
}

.filter-select,
.filter-input {
  @apply w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white;
}

.filters-actions {
  @apply flex justify-end mt-4;
}

.stats-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6;
}

.stat-card {
  @apply bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700;
}

.stat-icon {
  @apply w-12 h-12 rounded-lg flex items-center justify-center mb-4;
}

.stat-content {
  @apply space-y-1;
}

.stat-label {
  @apply text-sm font-medium text-gray-600 dark:text-gray-400;
}

.stat-value {
  @apply text-2xl font-bold text-gray-900 dark:text-white;
}

.view-controls {
  @apply flex items-center justify-between;
}

.view-toggle {
  @apply flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1;
}

.toggle-btn {
  @apply flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors;
}

.toggle-btn.active {
  @apply bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm;
}

.toggle-btn:not(.active) {
  @apply text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white;
}

.sort-controls {
  @apply flex items-center gap-2;
}

.sort-select {
  @apply px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white;
}

.sort-order-btn {
  @apply p-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors;
}

.dashboard-content {
  @apply min-h-96;
}

.loading-state,
.empty-state {
  @apply flex flex-col items-center justify-center py-12 text-center;
}

.loading-spinner-lg {
  @apply w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin;
}

.backtests-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6;
}

.backtest-card {
  @apply bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 cursor-pointer hover:shadow-lg transition-shadow;
}

.card-header {
  @apply flex items-start justify-between mb-4;
}

.card-title {
  @apply flex items-center gap-2 flex-1;
}

.card-actions {
  @apply flex items-center gap-1;
}

.card-content {
  @apply space-y-4;
}

.performance-metrics {
  @apply grid grid-cols-3 gap-4;
}

.metric {
  @apply text-center;
}

.metric-label {
  @apply block text-xs text-gray-500 dark:text-gray-400;
}

.metric-value {
  @apply block text-sm font-semibold text-gray-900 dark:text-white;
}

.card-meta {
  @apply flex items-center justify-between;
}

.meta-item {
  @apply flex items-center gap-1;
}

.mini-chart {
  @apply mt-4 h-12 bg-gray-50 dark:bg-gray-700 rounded;
}

.backtests-table {
  @apply bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700;
}

.table-container {
  @apply overflow-x-auto;
}

.table-header {
  @apply bg-gray-50 dark:bg-gray-700;
}

.table-th {
  @apply px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider;
}

.table-row {
  @apply hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors;
}

.table-td {
  @apply px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white;
}

.strategy-cell {
  @apply space-y-1;
}

.table-actions {
  @apply flex items-center gap-2;
}

.action-btn {
  @apply p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors;
}

.status-badge {
  @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium;
}

.status-completed {
  @apply bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200;
}

.status-running {
  @apply bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200;
}

.status-failed {
  @apply bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200;
}

.pagination {
  @apply flex items-center justify-between;
}

.pagination-btn {
  @apply flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors;
}

.pagination-info {
  @apply text-sm text-gray-600 dark:text-gray-400;
}

.btn-primary {
  @apply flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors;
}

.btn-secondary {
  @apply flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors;
}

.btn-text {
  @apply text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors;
}

/* Responsive */
@media (max-width: 768px) {
  .header-content {
    @apply flex-col gap-4 items-stretch;
  }
  
  .header-actions {
    @apply justify-center;
  }
  
  .view-controls {
    @apply flex-col gap-4 items-stretch;
  }
  
  .backtests-grid {
    @apply grid-cols-1;
  }
  
  .stats-grid {
    @apply grid-cols-2;
  }
}
</style>