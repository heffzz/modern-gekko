<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useStrategiesStore } from '@/stores/strategies'
import type { Strategy } from '@/types'

const router = useRouter()
const strategiesStore = useStrategiesStore()

// Initialize strategies on mount
onMounted(async () => {
  try {
    await strategiesStore.fetchStrategies()
  } catch (error) {
    console.error('Failed to load strategies:', error)
  }
})

// UI state
const searchQuery = ref('')
const selectedCategory = ref('all')
const sortBy = ref<'name' | 'created' | 'modified'>('name')
const sortOrder = ref<'asc' | 'desc'>('asc')
const viewMode = ref<'grid' | 'list'>('grid')
const showDeleteModal = ref(false)
const strategyToDelete = ref<Strategy | null>(null)

// Strategy categories
const categories = [
  { id: 'all', name: 'All Strategies', count: 0 },
  { id: 'trend', name: 'Trend Following', count: 0 },
  { id: 'mean-reversion', name: 'Mean Reversion', count: 0 },
  { id: 'momentum', name: 'Momentum', count: 0 },
  { id: 'arbitrage', name: 'Arbitrage', count: 0 },
  { id: 'custom', name: 'Custom', count: 0 }
]

// Computed properties
const filteredStrategies = computed(() => {
  let strategies = strategiesStore.strategies || []
  
  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    strategies = strategies.filter(strategy => 
      strategy.name.toLowerCase().includes(query) ||
      strategy.config?.description?.toLowerCase().includes(query) ||
      (strategy.tags || []).some(tag => tag.toLowerCase().includes(query))
    )
  }
  
  // Filter by category
  if (selectedCategory.value !== 'all') {
    strategies = strategies.filter(strategy => 
      strategy.category === selectedCategory.value
    )
  }
  
  // Sort strategies
  strategies.sort((a: Strategy, b: Strategy) => {
    let aValue: string | number
    let bValue: string | number
    
    switch (sortBy.value) {
      case 'name':
        aValue = a.name.toLowerCase()
        bValue = b.name.toLowerCase()
        break
      case 'created':
        aValue = new Date(a.createdAt).getTime()
        bValue = new Date(b.createdAt).getTime()
        break
      case 'modified':
        aValue = new Date(a.updatedAt || a.createdAt).getTime()
        bValue = new Date(b.updatedAt || b.createdAt).getTime()
        break
      default:
        aValue = a.name.toLowerCase()
        bValue = b.name.toLowerCase()
    }
    
    if (sortOrder.value === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
    }
  })
  
  return strategies
})

const categoriesWithCounts = computed(() => {
  const strategies = strategiesStore.strategies || []
  const counts = strategies.reduce((acc, strategy) => {
    const category = strategy.category || 'custom'
    acc[category] = (acc[category] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  return categories.map(category => ({
    ...category,
    count: category.id === 'all' ? strategies.length : (counts[category.id] || 0)
  }))
})

// Methods
const createNewStrategy = () => {
  router.push('/strategies/new')
}

const editStrategy = (strategy: Strategy) => {
  strategiesStore.setCurrentStrategy(strategy)
  router.push(`/strategies/edit/${strategy.id}`)
}

const duplicateStrategy = async (strategy: Strategy) => {
  try {
    // TODO: Implement duplicate functionality
    console.log('Duplicate strategy:', strategy.name)
    // When implemented, this should create a copy and redirect to edit page
    // const duplicated = await strategiesStore.duplicateStrategy(strategy)
    // router.push(`/strategies/edit/${duplicated.id}`)
  } catch (error) {
    console.error('Failed to duplicate strategy:', error)
    if (typeof window !== 'undefined' && window.$notify) {
        window.$notify.error('Duplication Failed', 'Failed to duplicate strategy')
      }
  }
}

const confirmDelete = (strategy: Strategy) => {
  strategyToDelete.value = strategy
  showDeleteModal.value = true
}

const deleteStrategy = async () => {
  if (!strategyToDelete.value) return
  
  try {
    await strategiesStore.deleteStrategy(strategyToDelete.value.id)
    showDeleteModal.value = false
    strategyToDelete.value = null
    
    if (typeof window !== 'undefined' && window.$notify) {
        window.$notify.success('Strategy Deleted', 'Strategy has been successfully deleted')
      }
  } catch (error) {
    console.error('Failed to delete strategy:', error)
    if (typeof window !== 'undefined' && window.$notify) {
        window.$notify.error('Deletion Failed', 'Failed to delete strategy')
      }
  }
}

const cancelDelete = () => {
  showDeleteModal.value = false
  strategyToDelete.value = null
}

const runBacktest = (strategy: Strategy) => {
  strategiesStore.setCurrentStrategy(strategy)
  router.push('/backtest')
}

const exportStrategy = async (strategy: Strategy) => {
  try {
    // TODO: Implement export functionality
    console.log('Export strategy:', strategy.id)
    if (typeof window !== 'undefined' && window.$notify) {
        window.$notify.success('Export Successful', 'Strategy exported successfully')
      }
  } catch (error) {
    console.error('Failed to export strategy:', error)
    if (typeof window !== 'undefined' && window.$notify) {
        window.$notify.error('Export Failed', 'Failed to export strategy')
      }
  }
}

const importStrategy = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.js,.json'
  input.onchange = async (event) => {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (file) {
      try {
        // TODO: Implement import functionality
        console.log('Import strategy:', file.name)
        if (typeof window !== 'undefined' && window.$notify) {
          window.$notify.success('Import Successful', 'Strategy imported successfully')
        }
      } catch (error) {
        console.error('Failed to import strategy:', error)
        if (typeof window !== 'undefined' && window.$notify) {
          window.$notify.error('Import Failed', 'Failed to import strategy')
        }
      }
    }
  }
  input.click()
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'trend': return '📈'
    case 'mean-reversion': return '🔄'
    case 'momentum': return '⚡'
    case 'arbitrage': return '⚖️'
    case 'custom': return '🛠️'
    default: return '📊'
  }
}

const getStrategyStatusColor = (strategy: Strategy) => {
  if (strategy.isActive) return 'text-green-600'
  if (strategy.hasErrors) return 'text-red-600'
  return 'text-gray-600'
}

const getStrategyStatusText = (strategy: Strategy) => {
  if (strategy.isActive) return 'Active'
  if (strategy.hasErrors) return 'Error'
  return 'Inactive'
}

onMounted(() => {
  strategiesStore.fetchStrategies()
})
</script>

<template>
  <div class="strategies-view">
    <!-- Header -->
    <div class="strategies-header">
      <div class="header-content">
        <h1 class="page-title">Trading Strategies</h1>
        <p class="page-subtitle">
          Create, manage, and test your trading strategies
        </p>
      </div>
      
      <div class="header-actions">
        <button @click="importStrategy" class="action-button secondary">
          📥 Import
        </button>
        <button @click="createNewStrategy" class="action-button primary">
          ⚡ New Strategy
        </button>
      </div>
    </div>

    <div class="strategies-layout">
      <!-- Sidebar -->
      <div class="strategies-sidebar">
        <!-- Categories -->
        <div class="sidebar-section">
          <h3 class="sidebar-title">Categories</h3>
          <div class="category-list">
            <button
              v-for="category in categoriesWithCounts"
              :key="category.id"
              @click="selectedCategory = category.id"
              class="category-item"
              :class="{ 'active': selectedCategory === category.id }"
            >
              <span class="category-icon">{{ getCategoryIcon(category.id) }}</span>
              <span class="category-name">{{ category.name }}</span>
              <span class="category-count">{{ category.count }}</span>
            </button>
          </div>
        </div>

        <!-- Filters -->
        <div class="sidebar-section">
          <h3 class="sidebar-title">Sort & Filter</h3>
          
          <div class="filter-group">
            <label class="filter-label">Sort by</label>
            <select v-model="sortBy" class="filter-select">
              <option value="name">Name</option>
              <option value="created">Created Date</option>
              <option value="modified">Modified Date</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label class="filter-label">Order</label>
            <select v-model="sortOrder" class="filter-select">
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label class="filter-label">View</label>
            <div class="view-toggle">
              <button 
                @click="viewMode = 'grid'"
                class="view-button"
                :class="{ 'active': viewMode === 'grid' }"
              >
                ⊞
              </button>
              <button 
                @click="viewMode = 'list'"
                class="view-button"
                :class="{ 'active': viewMode === 'list' }"
              >
                ☰
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="strategies-main">
        <!-- Search Bar -->
        <div class="search-bar">
          <div class="search-input-container">
            <span class="search-icon">🔍</span>
            <input 
              v-model="searchQuery"
              type="text" 
              placeholder="Search strategies..."
              class="search-input"
            >
            <button 
              v-if="searchQuery"
              @click="searchQuery = ''"
              class="clear-search"
            >
              ×
            </button>
          </div>
          
          <div class="search-results">
            <span class="results-count">
              {{ filteredStrategies.length }} {{ filteredStrategies.length === 1 ? 'strategy' : 'strategies' }}
            </span>
          </div>
        </div>

        <!-- Strategies Grid/List -->
        <div class="strategies-container" :class="viewMode">
          <div 
            v-for="strategy in filteredStrategies"
            :key="strategy.id"
            class="strategy-card"
            :class="{ 'current': strategiesStore.currentStrategy?.id === strategy.id }"
          >
            <!-- Card Header -->
            <div class="card-header">
              <div class="strategy-info">
                <h3 class="strategy-name">{{ strategy.name }}</h3>
                <div class="strategy-meta">
                  <span class="strategy-category">
                    {{ getCategoryIcon(strategy.category || 'custom') }} {{ strategy.category || 'Custom' }}
                  </span>
                  <span class="strategy-status" :class="getStrategyStatusColor(strategy)">
                    {{ getStrategyStatusText(strategy) }}
                  </span>
                </div>
              </div>
              
              <div class="card-actions">
                <button 
                  @click="editStrategy(strategy)"
                  class="card-action-button"
                  title="Edit strategy"
                >
                  ✏️
                </button>
                <button 
                  @click="runBacktest(strategy)"
                  class="card-action-button"
                  title="Run backtest"
                >
                  📊
                </button>
                <div class="dropdown">
                  <button class="card-action-button dropdown-toggle">
                    ⋮
                  </button>
                  <div class="dropdown-menu">
                    <button @click="duplicateStrategy(strategy)" class="dropdown-item">
                      📋 Duplicate
                    </button>
                    <button @click="exportStrategy(strategy)" class="dropdown-item">
                      📤 Export
                    </button>
                    <hr class="dropdown-divider">
                    <button @click="confirmDelete(strategy)" class="dropdown-item danger">
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Card Content -->
            <div class="card-content">
              <p class="strategy-description">{{ strategy.config?.description }}</p>
              
              <div class="strategy-tags">
                <span 
                  v-for="tag in strategy.tags"
                  :key="tag"
                  class="strategy-tag"
                >
                  {{ tag }}
                </span>
              </div>
              
              <div class="strategy-stats">
                <div class="stat-item">
                  <span class="stat-label">Parameters</span>
                  <span class="stat-value">{{ Object.keys(strategy.config?.parameters || {}).length }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Indicators</span>
                  <span class="stat-value">{{ strategy.config?.indicators?.length || 0 }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Created</span>
                  <span class="stat-value">{{ new Date(strategy.createdAt).toLocaleDateString() }}</span>
                </div>
              </div>
            </div>

            <!-- Card Footer -->
            <div class="card-footer">
              <div class="performance-preview">
                <div v-if="strategy.lastBacktestResult" class="performance-item">
                  <span class="performance-label">Last Backtest</span>
                  <span 
                    class="performance-value"
                    :class="strategy.lastBacktestResult.totalReturn > 0 ? 'positive' : 'negative'"
                  >
                    {{ strategy.lastBacktestResult.totalReturn.toFixed(2) }}%
                  </span>
                </div>
                <div v-else class="performance-item">
                  <span class="performance-label">No backtest data</span>
                  <span class="performance-value">-</span>
                </div>
              </div>
              
              <div class="card-footer-actions">
                <button 
                  @click="editStrategy(strategy)"
                  class="footer-button primary"
                >
                  Edit
                </button>
                <button 
                  @click="runBacktest(strategy)"
                  class="footer-button secondary"
                >
                  Test
                </button>
              </div>
            </div>
          </div>
          
          <!-- Empty State -->
          <div v-if="filteredStrategies.length === 0" class="empty-state">
            <div class="empty-icon">⚡</div>
            <h3 class="empty-title">
              {{ searchQuery ? 'No strategies found' : 'No strategies yet' }}
            </h3>
            <p class="empty-description">
              {{ searchQuery 
                ? 'Try adjusting your search terms or filters' 
                : 'Create your first trading strategy to get started'
              }}
            </p>
            <button 
              v-if="!searchQuery"
              @click="createNewStrategy"
              class="empty-action"
            >
              ⚡ Create Strategy
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="modal-overlay" @click="cancelDelete">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">Delete Strategy</h3>
          <button @click="cancelDelete" class="modal-close">×</button>
        </div>
        
        <div class="modal-body">
          <p class="modal-text">
            Are you sure you want to delete <strong>{{ strategyToDelete?.name }}</strong>?
            This action cannot be undone.
          </p>
        </div>
        
        <div class="modal-footer">
          <button @click="cancelDelete" class="modal-button secondary">
            Cancel
          </button>
          <button @click="deleteStrategy" class="modal-button danger">
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.strategies-view {
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
  min-height: calc(100vh - 4rem);
}

/* Header */
.strategies-header {
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

.header-actions {
  display: flex;
  gap: 0.75rem;
}

.action-button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.action-button.primary {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
}

.action-button.primary:hover {
  background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
  transform: translateY(-1px);
}

.action-button.secondary {
  background-color: #f1f5f9;
  color: #475569;
  border: 1px solid #cbd5e1;
}

.action-button.secondary:hover {
  background-color: #e2e8f0;
}

/* Layout */
.strategies-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 2rem;
}

/* Sidebar */
.strategies-sidebar {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 1.5rem;
  height: fit-content;
  position: sticky;
  top: 6rem;
}

.sidebar-section {
  margin-bottom: 2rem;
}

.sidebar-section:last-child {
  margin-bottom: 0;
}

.sidebar-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 1rem 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.category-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.category-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: none;
  border: none;
  border-radius: 0.5rem;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
}

.category-item:hover {
  background-color: #f8fafc;
}

.category-item.active {
  background-color: #eff6ff;
  color: #1d4ed8;
}

.category-icon {
  font-size: 1rem;
}

.category-name {
  flex: 1;
  font-size: 0.875rem;
  font-weight: 500;
}

.category-count {
  font-size: 0.75rem;
  color: #64748b;
  background-color: #f1f5f9;
  padding: 0.125rem 0.5rem;
  border-radius: 0.75rem;
  min-width: 1.5rem;
  text-align: center;
}

.category-item.active .category-count {
  background-color: #dbeafe;
  color: #1d4ed8;
}

.filter-group {
  margin-bottom: 1rem;
}

.filter-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 500;
  color: #6b7280;
  margin-bottom: 0.5rem;
}

.filter-select {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  background: white;
}

.view-toggle {
  display: flex;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  overflow: hidden;
}

.view-button {
  flex: 1;
  padding: 0.5rem;
  background: white;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 1rem;
}

.view-button:hover {
  background-color: #f9fafb;
}

.view-button.active {
  background-color: #3b82f6;
  color: white;
}

/* Main Content */
.strategies-main {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.search-bar {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 1.5rem;
}

.search-input-container {
  position: relative;
  margin-bottom: 1rem;
}

.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #64748b;
  font-size: 1rem;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 1rem;
  transition: border-color 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.clear-search {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  font-size: 1.25rem;
  color: #64748b;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.25rem;
}

.clear-search:hover {
  background-color: #f3f4f6;
}

.search-results {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.results-count {
  font-size: 0.875rem;
  color: #64748b;
}

/* Strategies Container */
.strategies-container {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 1.5rem;
}

.strategies-container.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.strategies-container.list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Strategy Cards */
.strategy-card {
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  overflow: hidden;
  transition: all 0.2s ease;
  background: white;
}

.strategy-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.strategy-card.current {
  border-color: #3b82f6;
  box-shadow: 0 0 0 1px #3b82f6;
}

.strategies-container.list .strategy-card {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
}

.card-header {
  padding: 1.5rem 1.5rem 0 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.strategies-container.list .card-header {
  padding: 1rem 1.5rem;
}

.strategy-info {
  flex: 1;
}

.strategy-name {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 0.5rem 0;
}

.strategy-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.75rem;
}

.strategy-category {
  color: #64748b;
  font-weight: 500;
}

.strategy-status {
  font-weight: 600;
}

.card-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.card-action-button {
  width: 2rem;
  height: 2rem;
  background: none;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
}

.card-action-button:hover {
  background-color: #f8fafc;
  border-color: #cbd5e1;
}

.dropdown {
  position: relative;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
  padding: 0.5rem 0;
  min-width: 150px;
  z-index: 10;
  opacity: 0;
  visibility: hidden;
  transform: translateY(-10px);
  transition: all 0.2s ease;
}

.dropdown:hover .dropdown-menu {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

.dropdown-item {
  width: 100%;
  padding: 0.5rem 1rem;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  font-size: 0.875rem;
  color: #374151;
  transition: background-color 0.2s ease;
}

.dropdown-item:hover {
  background-color: #f9fafb;
}

.dropdown-item.danger {
  color: #dc2626;
}

.dropdown-item.danger:hover {
  background-color: #fef2f2;
}

.dropdown-divider {
  margin: 0.5rem 0;
  border: none;
  border-top: 1px solid #e5e7eb;
}

.card-content {
  padding: 0 1.5rem 1.5rem 1.5rem;
}

.strategies-container.list .card-content {
  padding: 0;
  margin-left: 1rem;
}

.strategy-description {
  font-size: 0.875rem;
  color: #64748b;
  margin: 0 0 1rem 0;
  line-height: 1.5;
}

.strategy-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.strategy-tag {
  padding: 0.25rem 0.5rem;
  background-color: #f1f5f9;
  color: #475569;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.strategy-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.strategies-container.list .strategy-stats {
  grid-template-columns: repeat(3, auto);
  gap: 2rem;
}

.stat-item {
  text-align: center;
}

.strategies-container.list .stat-item {
  text-align: left;
}

.stat-label {
  display: block;
  font-size: 0.75rem;
  color: #64748b;
  margin-bottom: 0.25rem;
}

.stat-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1e293b;
}

.card-footer {
  padding: 1rem 1.5rem;
  background-color: #f8fafc;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.strategies-container.list .card-footer {
  padding: 1rem;
  background: none;
  border: none;
}

.performance-preview {
  flex: 1;
}

.performance-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.performance-label {
  font-size: 0.75rem;
  color: #64748b;
}

.performance-value {
  font-size: 0.875rem;
  font-weight: 600;
}

.performance-value.positive {
  color: #16a34a;
}

.performance-value.negative {
  color: #dc2626;
}

.card-footer-actions {
  display: flex;
  gap: 0.5rem;
}

.footer-button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.footer-button.primary {
  background-color: #3b82f6;
  color: white;
}

.footer-button.primary:hover {
  background-color: #2563eb;
}

.footer-button.secondary {
  background-color: #f1f5f9;
  color: #475569;
  border: 1px solid #cbd5e1;
}

.footer-button.secondary:hover {
  background-color: #e2e8f0;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: #64748b;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
  color: #1e293b;
}

.empty-description {
  font-size: 1rem;
  margin: 0 0 2rem 0;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.6;
}

.empty-action {
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.empty-action:hover {
  background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
  transform: translateY(-1px);
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
  max-width: 400px;
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

.modal-text {
  font-size: 0.875rem;
  color: #64748b;
  margin: 0;
  line-height: 1.6;
}

.modal-footer {
  padding: 0 1.5rem 1.5rem 1.5rem;
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.modal-button {
  padding: 0.5rem 1rem;
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

.modal-button.danger {
  background-color: #dc2626;
  color: white;
}

.modal-button.danger:hover {
  background-color: #b91c1c;
}

/* Responsive */
@media (max-width: 1024px) {
  .strategies-layout {
    grid-template-columns: 1fr;
  }
  
  .strategies-sidebar {
    position: static;
    order: 2;
  }
  
  .strategies-main {
    order: 1;
  }
}

@media (max-width: 768px) {
  .strategies-view {
    padding: 1rem;
  }
  
  .strategies-header {
    flex-direction: column;
    gap: 1rem;
  }
  
  .header-actions {
    width: 100%;
    justify-content: stretch;
  }
  
  .action-button {
    flex: 1;
    justify-content: center;
  }
  
  .strategies-container.grid {
    grid-template-columns: 1fr;
  }
  
  .strategy-stats {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .card-footer {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .card-footer-actions {
    justify-content: stretch;
  }
  
  .footer-button {
    flex: 1;
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
  
  .strategies-sidebar,
  .search-bar,
  .strategies-container,
  .strategy-card {
    background: #1e293b;
    border-color: #334155;
  }
  
  .sidebar-title {
    color: #e2e8f0;
  }
  
  .category-item {
    color: #e2e8f0;
  }
  
  .category-item:hover {
    background-color: #0f172a;
  }
  
  .category-item.active {
    background-color: #1e40af;
    color: #dbeafe;
  }
  
  .strategy-name {
    color: #f8fafc;
  }
  
  .stat-value {
    color: #f8fafc;
  }
  
  .card-footer {
    background-color: #0f172a;
    border-color: #475569;
  }
  
  .empty-title {
    color: #f8fafc;
  }
  
  .modal-content {
    background: #1e293b;
  }
  
  .modal-title {
    color: #f8fafc;
  }
}
</style>