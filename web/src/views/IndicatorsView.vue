<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useIndicatorsStore } from '@/stores/indicators'
import type { IndicatorConfig, IndicatorPreview } from '@/types'

const indicatorsStore = useIndicatorsStore()

// UI state
const searchQuery = ref('')
const selectedCategory = ref('all')
const selectedIndicator = ref<IndicatorConfig | null>(null)
const showPreview = ref(false)
const previewData = ref<IndicatorPreview | null>(null)
const previewLoading = ref(false)
const previewError = ref('')

// Preview parameters
const previewParams = ref<Record<string, any>>({})
const sampleData = ref<number[]>([100, 102, 101, 103, 105, 104, 106, 108, 107, 109, 111, 110, 112, 114, 113, 115])

// Categories
const categories = [
  { id: 'all', name: 'All Indicators', icon: '📊' },
  { id: 'trend', name: 'Trend', icon: '📈' },
  { id: 'momentum', name: 'Momentum', icon: '⚡' },
  { id: 'volatility', name: 'Volatility', icon: '📉' },
  { id: 'volume', name: 'Volume', icon: '📦' },
  { id: 'oscillator', name: 'Oscillators', icon: '🌊' },
  { id: 'support-resistance', name: 'Support/Resistance', icon: '🎯' },
  { id: 'statistical', name: 'Statistical', icon: '📐' }
]

// Computed properties
const filteredIndicators = computed(() => {
  let indicators = indicatorsStore.indicators
  
  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    indicators = indicators.filter(indicator => 
      indicator.name.toLowerCase().includes(query) ||
      indicator.description.toLowerCase().includes(query) ||
      indicator.tags.some(tag => tag.toLowerCase().includes(query))
    )
  }
  
  // Filter by category
  if (selectedCategory.value !== 'all') {
    indicators = indicators.filter(indicator => 
      indicator.category === selectedCategory.value
    )
  }
  
  return indicators
})

const categoriesWithCounts = computed(() => {
  const counts = indicatorsStore.indicators.reduce((acc, indicator) => {
    acc[indicator.category] = (acc[indicator.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  return categories.map(category => ({
    ...category,
    count: category.id === 'all' ? indicatorsStore.indicators.length : (counts[category.id] || 0)
  }))
})

const selectedIndicatorParams = computed(() => {
  if (!selectedIndicator.value) return []
  
  return Object.entries(selectedIndicator.value.parameters).map(([key, param]) => ({
    key,
    ...param,
    value: previewParams.value[key] ?? param.default
  }))
})

// Methods
const selectIndicator = (indicator: IndicatorConfig) => {
  selectedIndicator.value = indicator
  showPreview.value = true
  
  // Initialize preview parameters with defaults
  previewParams.value = Object.entries(indicator.parameters).reduce((acc, [key, param]) => {
    acc[key] = param.default
    return acc
  }, {} as Record<string, any>)
  
  // Auto-generate preview
  generatePreview()
}

const closePreview = () => {
  showPreview.value = false
  selectedIndicator.value = null
  previewData.value = null
  previewError.value = ''
}

const updateParameter = (key: string, value: any) => {
  previewParams.value[key] = value
  generatePreview()
}

const generatePreview = async () => {
  if (!selectedIndicator.value) return
  
  previewLoading.value = true
  previewError.value = ''
  
  try {
    const preview = await indicatorsStore.generatePreview(
      selectedIndicator.value.name,
      previewParams.value,
      sampleData.value
    )
    previewData.value = preview
  } catch (error) {
    console.error('Failed to generate preview:', error)
    previewError.value = error instanceof Error ? error.message : 'Failed to generate preview'
  } finally {
    previewLoading.value = false
  }
}

const addToChart = (indicator: IndicatorConfig) => {
  indicatorsStore.addIndicator({
    ...indicator,
    parameters: previewParams.value
  })
  
  if (typeof window !== 'undefined' && (window as any).$notify) {
    (window as any).$notify.success('Indicator Added', `${indicator.name} has been added to the chart`)
  }
}

const removeFromChart = (indicator: IndicatorConfig) => {
  indicatorsStore.removeIndicator(indicator.id)
  
  if (typeof window !== 'undefined' && (window as any).$notify) {
    (window as any).$notify.success('Indicator Removed', `${indicator.name} has been removed from the chart`)
  }
}

const isIndicatorActive = (indicator: IndicatorConfig) => {
  return indicatorsStore.activeIndicators.some(active => active.id === indicator.id)
}

const getIndicatorIcon = (category: string) => {
  const categoryData = categories.find(cat => cat.id === category)
  return categoryData?.icon || '📊'
}

const formatParameterValue = (value: any, type: string) => {
  if (type === 'number') {
    return typeof value === 'number' ? value.toFixed(2) : value
  }
  return value
}

const getParameterInputType = (type: string) => {
  switch (type) {
    case 'number': return 'number'
    case 'boolean': return 'checkbox'
    case 'string': return 'text'
    default: return 'text'
  }
}

const validateParameter = (param: any, value: any) => {
  if (param.type === 'number') {
    const numValue = Number(value)
    if (isNaN(numValue)) return false
    if (param.min !== undefined && numValue < param.min) return false
    if (param.max !== undefined && numValue > param.max) return false
  }
  return true
}

const resetParameters = () => {
  if (!selectedIndicator.value) return
  
  previewParams.value = Object.entries(selectedIndicator.value.parameters).reduce((acc, [key, param]) => {
    acc[key] = param.default
    return acc
  }, {} as Record<string, any>)
  
  generatePreview()
}

const exportIndicatorConfig = (indicator: IndicatorConfig) => {
  const config = {
    ...indicator,
    parameters: previewParams.value
  }
  
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${indicator.name.toLowerCase().replace(/\s+/g, '-')}-config.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

onMounted(() => {
  indicatorsStore.fetchIndicators()
})
</script>

<template>
  <div class="indicators-view">
    <!-- Header -->
    <div class="indicators-header">
      <div class="header-content">
        <h1 class="page-title">Technical Indicators</h1>
        <p class="page-subtitle">
          Explore and configure technical indicators for your trading strategies
        </p>
      </div>
      
      <div class="header-stats">
        <div class="stat-card">
          <div class="stat-value">{{ indicatorsStore.indicators.length }}</div>
          <div class="stat-label">Total Indicators</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ indicatorsStore.activeIndicators.length }}</div>
          <div class="stat-label">Active on Chart</div>
        </div>
      </div>
    </div>

    <div class="indicators-layout">
      <!-- Sidebar -->
      <div class="indicators-sidebar">
        <!-- Search -->
        <div class="sidebar-section">
          <div class="search-container">
            <span class="search-icon">🔍</span>
            <input 
              v-model="searchQuery"
              type="text" 
              placeholder="Search indicators..."
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
        </div>

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
              <span class="category-icon">{{ category.icon }}</span>
              <span class="category-name">{{ category.name }}</span>
              <span class="category-count">{{ category.count }}</span>
            </button>
          </div>
        </div>

        <!-- Active Indicators -->
        <div class="sidebar-section">
          <h3 class="sidebar-title">Active on Chart</h3>
          <div class="active-indicators">
            <div 
              v-for="indicator in indicatorsStore.activeIndicators"
              :key="indicator.id"
              class="active-indicator"
            >
              <div class="active-indicator-info">
                <span class="active-indicator-icon">{{ getIndicatorIcon(indicator.category) }}</span>
                <span class="active-indicator-name">{{ indicator.name }}</span>
              </div>
              <button 
                @click="removeFromChart(indicator)"
                class="remove-indicator"
                title="Remove from chart"
              >
                ×
              </button>
            </div>
            
            <div v-if="indicatorsStore.activeIndicators.length === 0" class="no-active-indicators">
              <span class="no-active-icon">📊</span>
              <span class="no-active-text">No active indicators</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="indicators-main">
        <!-- Indicators Grid -->
        <div class="indicators-grid">
          <div 
            v-for="indicator in filteredIndicators"
            :key="indicator.id"
            class="indicator-card"
            :class="{ 'active': isIndicatorActive(indicator) }"
          >
            <!-- Card Header -->
            <div class="card-header">
              <div class="indicator-info">
                <div class="indicator-icon">{{ getIndicatorIcon(indicator.category) }}</div>
                <div class="indicator-details">
                  <h3 class="indicator-name">{{ indicator.name }}</h3>
                  <div class="indicator-meta">
                    <span class="indicator-category">{{ indicator.category }}</span>
                    <span class="indicator-complexity" :class="`complexity-${indicator.complexity}`">
                      {{ indicator.complexity }}
                    </span>
                  </div>
                </div>
              </div>
              
              <div class="card-actions">
                <button 
                  @click="selectIndicator(indicator)"
                  class="action-button preview"
                  title="Preview indicator"
                >
                  👁️
                </button>
                <button 
                  v-if="!isIndicatorActive(indicator)"
                  @click="addToChart(indicator)"
                  class="action-button add"
                  title="Add to chart"
                >
                  ➕
                </button>
                <button 
                  v-else
                  @click="removeFromChart(indicator)"
                  class="action-button remove"
                  title="Remove from chart"
                >
                  ➖
                </button>
              </div>
            </div>

            <!-- Card Content -->
            <div class="card-content">
              <p class="indicator-description">{{ indicator.description }}</p>
              
              <div class="indicator-tags">
                <span 
                  v-for="tag in indicator.tags"
                  :key="tag"
                  class="indicator-tag"
                >
                  {{ tag }}
                </span>
              </div>
              
              <div class="indicator-params">
                <div class="params-header">
                  <span class="params-title">Parameters</span>
                  <span class="params-count">{{ Object.keys(indicator.parameters).length }}</span>
                </div>
                <div class="params-list">
                  <div 
                    v-for="[key, param] in Object.entries(indicator.parameters).slice(0, 3)"
                    :key="key"
                    class="param-item"
                  >
                    <span class="param-name">{{ key }}</span>
                    <span class="param-value">{{ formatParameterValue(param.default, param.type) }}</span>
                  </div>
                  <div v-if="Object.keys(indicator.parameters).length > 3" class="param-more">
                    +{{ Object.keys(indicator.parameters).length - 3 }} more
                  </div>
                </div>
              </div>
            </div>

            <!-- Card Footer -->
            <div class="card-footer">
              <div class="indicator-usage">
                <span class="usage-label">Usage:</span>
                <span class="usage-value">{{ indicator.usage || 'General' }}</span>
              </div>
              
              <div class="card-footer-actions">
                <button 
                  @click="selectIndicator(indicator)"
                  class="footer-button primary"
                >
                  Configure
                </button>
              </div>
            </div>
          </div>
          
          <!-- Empty State -->
          <div v-if="filteredIndicators.length === 0" class="empty-state">
            <div class="empty-icon">📊</div>
            <h3 class="empty-title">
              {{ searchQuery ? 'No indicators found' : 'No indicators available' }}
            </h3>
            <p class="empty-description">
              {{ searchQuery 
                ? 'Try adjusting your search terms or category filter' 
                : 'Indicators will appear here once they are loaded'
              }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Preview Panel -->
    <div v-if="showPreview" class="preview-overlay" @click="closePreview">
      <div class="preview-panel" @click.stop>
        <!-- Preview Header -->
        <div class="preview-header">
          <div class="preview-title-section">
            <div class="preview-icon">{{ getIndicatorIcon(selectedIndicator?.category || '') }}</div>
            <div class="preview-title-content">
              <h2 class="preview-title">{{ selectedIndicator?.name }}</h2>
              <p class="preview-subtitle">{{ selectedIndicator?.description }}</p>
            </div>
          </div>
          
          <div class="preview-actions">
            <button 
              v-if="selectedIndicator && !isIndicatorActive(selectedIndicator)"
              @click="addToChart(selectedIndicator)"
              class="preview-action-button primary"
            >
              ➕ Add to Chart
            </button>
            <button 
              v-else-if="selectedIndicator"
              @click="removeFromChart(selectedIndicator)"
              class="preview-action-button secondary"
            >
              ➖ Remove from Chart
            </button>
            <button 
              @click="exportIndicatorConfig(selectedIndicator!)"
              class="preview-action-button secondary"
            >
              📤 Export
            </button>
            <button @click="closePreview" class="preview-close">×</button>
          </div>
        </div>

        <!-- Preview Content -->
        <div class="preview-content">
          <!-- Parameters Configuration -->
          <div class="preview-section">
            <div class="section-header">
              <h3 class="section-title">Parameters</h3>
              <button @click="resetParameters" class="reset-button">
                🔄 Reset
              </button>
            </div>
            
            <div class="parameters-grid">
              <div 
                v-for="param in selectedIndicatorParams"
                :key="param.key"
                class="parameter-item"
              >
                <label class="parameter-label">
                  {{ param.key }}
                  <span v-if="param.required" class="required">*</span>
                </label>
                
                <div class="parameter-input-container">
                  <input 
                    v-if="param.type === 'number'"
                    :value="param.value"
                    @input="updateParameter(param.key, Number($event.target.value))"
                    type="number"
                    :min="param.min"
                    :max="param.max"
                    :step="param.step || 0.01"
                    class="parameter-input"
                    :class="{ 'invalid': !validateParameter(param, param.value) }"
                  >
                  
                  <input 
                    v-else-if="param.type === 'boolean'"
                    :checked="param.value"
                    @change="updateParameter(param.key, $event.target.checked)"
                    type="checkbox"
                    class="parameter-checkbox"
                  >
                  
                  <select 
                    v-else-if="param.options"
                    :value="param.value"
                    @change="updateParameter(param.key, $event.target.value)"
                    class="parameter-select"
                  >
                    <option 
                      v-for="option in param.options"
                      :key="option"
                      :value="option"
                    >
                      {{ option }}
                    </option>
                  </select>
                  
                  <input 
                    v-else
                    :value="param.value"
                    @input="updateParameter(param.key, $event.target.value)"
                    type="text"
                    class="parameter-input"
                  >
                </div>
                
                <div class="parameter-info">
                  <span class="parameter-description">{{ param.description }}</span>
                  <span v-if="param.type === 'number'" class="parameter-range">
                    {{ param.min !== undefined ? `Min: ${param.min}` : '' }}
                    {{ param.max !== undefined ? `Max: ${param.max}` : '' }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Preview Chart -->
          <div class="preview-section">
            <div class="section-header">
              <h3 class="section-title">Preview</h3>
              <button @click="generatePreview" class="refresh-button" :disabled="previewLoading">
                {{ previewLoading ? '⏳' : '🔄' }} Refresh
              </button>
            </div>
            
            <div class="preview-chart-container">
              <div v-if="previewLoading" class="preview-loading">
                <div class="loading-spinner"></div>
                <span class="loading-text">Generating preview...</span>
              </div>
              
              <div v-else-if="previewError" class="preview-error">
                <div class="error-icon">⚠️</div>
                <div class="error-message">{{ previewError }}</div>
                <button @click="generatePreview" class="retry-button">
                  🔄 Retry
                </button>
              </div>
              
              <div v-else-if="previewData" class="preview-chart">
                <!-- Simple chart visualization -->
                <div class="chart-header">
                  <span class="chart-title">{{ selectedIndicator?.name }} Output</span>
                  <span class="chart-info">{{ previewData.values.length }} data points</span>
                </div>
                
                <div class="chart-container">
                  <div class="chart-grid">
                    <div 
                      v-for="(value, index) in previewData.values.slice(-20)"
                      :key="index"
                      class="chart-bar"
                      :style="{ height: `${Math.abs(value) / Math.max(...previewData.values.map(Math.abs)) * 100}%` }"
                      :class="{ 'positive': value >= 0, 'negative': value < 0 }"
                      :title="`${index}: ${value.toFixed(4)}`"
                    ></div>
                  </div>
                </div>
                
                <div class="chart-stats">
                  <div class="stat">
                    <span class="stat-label">Min:</span>
                    <span class="stat-value">{{ Math.min(...previewData.values).toFixed(4) }}</span>
                  </div>
                  <div class="stat">
                    <span class="stat-label">Max:</span>
                    <span class="stat-value">{{ Math.max(...previewData.values).toFixed(4) }}</span>
                  </div>
                  <div class="stat">
                    <span class="stat-label">Avg:</span>
                    <span class="stat-value">{{ (previewData.values.reduce((a, b) => a + b, 0) / previewData.values.length).toFixed(4) }}</span>
                  </div>
                </div>
              </div>
              
              <div v-else class="preview-placeholder">
                <div class="placeholder-icon">📊</div>
                <div class="placeholder-text">Configure parameters to see preview</div>
              </div>
            </div>
          </div>

          <!-- Indicator Documentation -->
          <div class="preview-section">
            <div class="section-header">
              <h3 class="section-title">Documentation</h3>
            </div>
            
            <div class="documentation-content">
              <div class="doc-item">
                <h4 class="doc-title">Formula</h4>
                <p class="doc-text">{{ selectedIndicator?.formula || 'Formula not available' }}</p>
              </div>
              
              <div class="doc-item">
                <h4 class="doc-title">Interpretation</h4>
                <p class="doc-text">{{ selectedIndicator?.interpretation || 'Interpretation not available' }}</p>
              </div>
              
              <div class="doc-item">
                <h4 class="doc-title">Best Used For</h4>
                <p class="doc-text">{{ selectedIndicator?.usage || 'Usage information not available' }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.indicators-view {
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
  min-height: calc(100vh - 4rem);
}

/* Header */
.indicators-header {
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

.header-stats {
  display: flex;
  gap: 1rem;
}

.stat-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 1.5rem;
  text-align: center;
  min-width: 120px;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: #3b82f6;
  display: block;
  margin-bottom: 0.5rem;
}

.stat-label {
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 500;
}

/* Layout */
.indicators-layout {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 2rem;
}

/* Sidebar */
.indicators-sidebar {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.sidebar-section {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 1.5rem;
}

.sidebar-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 1rem 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.search-container {
  position: relative;
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
  font-size: 0.875rem;
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

.active-indicators {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.active-indicator {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  background-color: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 0.5rem;
}

.active-indicator-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
}

.active-indicator-icon {
  font-size: 0.875rem;
}

.active-indicator-name {
  font-size: 0.75rem;
  font-weight: 500;
  color: #0369a1;
}

.remove-indicator {
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.25rem;
  font-size: 1rem;
  line-height: 1;
}

.remove-indicator:hover {
  background-color: #fee2e2;
  color: #dc2626;
}

.no-active-indicators {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 2rem 1rem;
  color: #64748b;
  text-align: center;
}

.no-active-icon {
  font-size: 2rem;
  opacity: 0.5;
}

.no-active-text {
  font-size: 0.875rem;
}

/* Main Content */
.indicators-main {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 1.5rem;
}

.indicators-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

/* Indicator Cards */
.indicator-card {
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  overflow: hidden;
  transition: all 0.2s ease;
  background: white;
}

.indicator-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.indicator-card.active {
  border-color: #3b82f6;
  box-shadow: 0 0 0 1px #3b82f6;
}

.card-header {
  padding: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.indicator-info {
  display: flex;
  gap: 1rem;
  flex: 1;
}

.indicator-icon {
  font-size: 2rem;
  width: 3rem;
  height: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f8fafc;
  border-radius: 0.75rem;
}

.indicator-details {
  flex: 1;
}

.indicator-name {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 0.5rem 0;
}

.indicator-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.75rem;
}

.indicator-category {
  color: #64748b;
  font-weight: 500;
  text-transform: capitalize;
}

.indicator-complexity {
  font-weight: 600;
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
}

.complexity-simple {
  background-color: #dcfce7;
  color: #16a34a;
}

.complexity-moderate {
  background-color: #fef3c7;
  color: #d97706;
}

.complexity-advanced {
  background-color: #fee2e2;
  color: #dc2626;
}

.card-actions {
  display: flex;
  gap: 0.5rem;
}

.action-button {
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

.action-button:hover {
  background-color: #f8fafc;
  border-color: #cbd5e1;
}

.action-button.add {
  color: #16a34a;
}

.action-button.add:hover {
  background-color: #f0fdf4;
  border-color: #16a34a;
}

.action-button.remove {
  color: #dc2626;
}

.action-button.remove:hover {
  background-color: #fef2f2;
  border-color: #dc2626;
}

.card-content {
  padding: 0 1.5rem 1.5rem 1.5rem;
}

.indicator-description {
  font-size: 0.875rem;
  color: #64748b;
  margin: 0 0 1rem 0;
  line-height: 1.5;
}

.indicator-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.indicator-tag {
  padding: 0.25rem 0.5rem;
  background-color: #f1f5f9;
  color: #475569;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.indicator-params {
  border-top: 1px solid #f1f5f9;
  padding-top: 1rem;
}

.params-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.params-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
}

.params-count {
  font-size: 0.75rem;
  color: #64748b;
  background-color: #f1f5f9;
  padding: 0.125rem 0.5rem;
  border-radius: 0.75rem;
}

.params-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.param-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
}

.param-name {
  color: #64748b;
  font-weight: 500;
}

.param-value {
  color: #1e293b;
  font-weight: 600;
}

.param-more {
  font-size: 0.75rem;
  color: #64748b;
  font-style: italic;
  text-align: center;
  padding: 0.25rem;
}

.card-footer {
  padding: 1rem 1.5rem;
  background-color: #f8fafc;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.indicator-usage {
  flex: 1;
}

.usage-label {
  font-size: 0.75rem;
  color: #64748b;
  margin-right: 0.5rem;
}

.usage-value {
  font-size: 0.75rem;
  font-weight: 600;
  color: #1e293b;
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

/* Empty State */
.empty-state {
  grid-column: 1 / -1;
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
  margin: 0;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.6;
}

/* Preview Panel */
.preview-overlay {
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
  padding: 2rem;
}

.preview-panel {
  background: white;
  border-radius: 1rem;
  max-width: 1000px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.preview-header {
  padding: 2rem;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.preview-title-section {
  display: flex;
  gap: 1rem;
  flex: 1;
}

.preview-icon {
  font-size: 3rem;
  width: 4rem;
  height: 4rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f8fafc;
  border-radius: 1rem;
}

.preview-title-content {
  flex: 1;
}

.preview-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 0.5rem 0;
}

.preview-subtitle {
  font-size: 1rem;
  color: #64748b;
  margin: 0;
  line-height: 1.5;
}

.preview-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.preview-action-button {
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

.preview-action-button.primary {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
}

.preview-action-button.primary:hover {
  background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
}

.preview-action-button.secondary {
  background-color: #f1f5f9;
  color: #475569;
  border: 1px solid #cbd5e1;
}

.preview-action-button.secondary:hover {
  background-color: #e2e8f0;
}

.preview-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #64748b;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 0.5rem;
}

.preview-close:hover {
  background-color: #f3f4f6;
}

.preview-content {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.preview-section {
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

.reset-button,
.refresh-button {
  padding: 0.5rem 1rem;
  background: none;
  border: 1px solid #cbd5e1;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s ease;
}

.reset-button:hover,
.refresh-button:hover {
  background-color: #f1f5f9;
}

.refresh-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.parameters-grid {
  padding: 1.5rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.parameter-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.parameter-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.required {
  color: #dc2626;
}

.parameter-input-container {
  position: relative;
}

.parameter-input,
.parameter-select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  transition: border-color 0.2s ease;
}

.parameter-input:focus,
.parameter-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.parameter-input.invalid {
  border-color: #dc2626;
}

.parameter-checkbox {
  width: 1.25rem;
  height: 1.25rem;
  accent-color: #3b82f6;
}

.parameter-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.parameter-description {
  font-size: 0.75rem;
  color: #64748b;
  line-height: 1.4;
}

.parameter-range {
  font-size: 0.75rem;
  color: #9ca3af;
  font-style: italic;
}

/* Preview Chart */
.preview-chart-container {
  padding: 1.5rem;
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  color: #64748b;
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
}

.preview-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  color: #dc2626;
  text-align: center;
}

.error-icon {
  font-size: 2rem;
}

.error-message {
  font-size: 0.875rem;
  max-width: 400px;
}

.retry-button {
  padding: 0.5rem 1rem;
  background-color: #dc2626;
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.retry-button:hover {
  background-color: #b91c1c;
}

.preview-chart {
  width: 100%;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.chart-title {
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
}

.chart-info {
  font-size: 0.75rem;
  color: #64748b;
}

.chart-container {
  height: 200px;
  margin-bottom: 1rem;
}

.chart-grid {
  display: flex;
  align-items: end;
  justify-content: space-between;
  height: 100%;
  padding: 1rem 0;
  border-bottom: 1px solid #e2e8f0;
  gap: 2px;
}

.chart-bar {
  flex: 1;
  min-height: 2px;
  border-radius: 2px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.chart-bar.positive {
  background: linear-gradient(to top, #16a34a, #22c55e);
}

.chart-bar.negative {
  background: linear-gradient(to top, #dc2626, #ef4444);
}

.chart-bar:hover {
  opacity: 0.8;
  transform: scaleY(1.1);
}

.chart-stats {
  display: flex;
  justify-content: space-around;
  padding: 1rem;
  background-color: #f8fafc;
  border-radius: 0.5rem;
}

.stat {
  text-align: center;
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

.preview-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  color: #64748b;
}

.placeholder-icon {
  font-size: 3rem;
  opacity: 0.5;
}

.placeholder-text {
  font-size: 0.875rem;
}

/* Documentation */
.documentation-content {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.doc-item {
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 1rem;
}

.doc-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.doc-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 0.5rem 0;
}

.doc-text {
  font-size: 0.875rem;
  color: #64748b;
  margin: 0;
  line-height: 1.6;
}

/* Responsive */
@media (max-width: 1024px) {
  .indicators-layout {
    grid-template-columns: 1fr;
  }
  
  .indicators-sidebar {
    order: 2;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
  }
  
  .indicators-main {
    order: 1;
  }
}

@media (max-width: 768px) {
  .indicators-view {
    padding: 1rem;
  }
  
  .indicators-header {
    flex-direction: column;
    gap: 1rem;
  }
  
  .header-stats {
    width: 100%;
    justify-content: stretch;
  }
  
  .stat-card {
    flex: 1;
  }
  
  .indicators-grid {
    grid-template-columns: 1fr;
  }
  
  .preview-overlay {
    padding: 1rem;
  }
  
  .preview-header {
    flex-direction: column;
    gap: 1rem;
  }
  
  .preview-actions {
    width: 100%;
    justify-content: stretch;
  }
  
  .preview-action-button {
    flex: 1;
    justify-content: center;
  }
  
  .parameters-grid {
    grid-template-columns: 1fr;
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
  
  .stat-card,
  .sidebar-section,
  .indicators-main,
  .indicator-card,
  .preview-panel,
  .preview-section {
    background: #1e293b;
    border-color: #334155;
  }
  
  .sidebar-title,
  .section-title {
    color: #e2e8f0;
  }
  
  .indicator-name,
  .preview-title {
    color: #f8fafc;
  }
  
  .card-footer,
  .section-header {
    background-color: #0f172a;
    border-color: #475569;
  }
  
  .empty-title {
    color: #f8fafc;
  }
}
</style>