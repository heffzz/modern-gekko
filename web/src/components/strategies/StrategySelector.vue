<template>
  <div class="strategy-selector">
    <!-- Header -->
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Seleziona Strategia di Trading
      </h2>
      <p class="text-gray-600 dark:text-gray-400">
        Scegli una strategia e configura i suoi parametri per il backtesting o il trading live.
      </p>
    </div>

    <!-- Search and Filter -->
    <div class="mb-6 flex flex-col sm:flex-row gap-4">
      <!-- Search -->
      <div class="flex-1">
        <div class="relative">
          <Icon name="search" class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cerca strategie..."
            class="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>
      
      <!-- Category Filter -->
      <div class="sm:w-48">
        <select
          v-model="selectedCategory"
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
        >
          <option value="">Tutte le categorie</option>
          <option v-for="category in categories" :key="category" :value="category">
            {{ category }}
          </option>
        </select>
      </div>
      
      <!-- View Toggle -->
      <div class="flex border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
        <button
          @click="viewMode = 'grid'"
          :class="[
            'px-3 py-2 text-sm font-medium transition-colors',
            viewMode === 'grid'
              ? 'bg-blue-600 text-white'
              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
          ]"
        >
          <Icon name="grid" class="w-4 h-4" />
        </button>
        <button
          @click="viewMode = 'list'"
          :class="[
            'px-3 py-2 text-sm font-medium transition-colors border-l border-gray-300 dark:border-gray-600',
            viewMode === 'list'
              ? 'bg-blue-600 text-white'
              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
          ]"
        >
          <Icon name="list" class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Strategy Grid/List -->
    <div v-if="filteredStrategies.length > 0" :class="viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'">
      <div
        v-for="strategy in filteredStrategies"
        :key="strategy.id"
        :class="[
          'border border-gray-200 dark:border-gray-700 rounded-lg p-6 cursor-pointer transition-all duration-200 hover:shadow-lg',
          selectedStrategy?.id === strategy.id
            ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800',
          viewMode === 'list' ? 'flex items-center space-x-4' : ''
        ]"
        @click="selectStrategy(strategy)"
      >
        <!-- Strategy Icon -->
        <div :class="viewMode === 'list' ? 'flex-shrink-0' : 'mb-4'">
          <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Icon :name="getStrategyIcon(strategy.category)" class="w-6 h-6 text-white" />
          </div>
        </div>
        
        <!-- Strategy Content -->
        <div :class="viewMode === 'list' ? 'flex-1 min-w-0' : ''">
          <!-- Header -->
          <div :class="viewMode === 'list' ? 'flex items-center justify-between' : 'mb-3'">
            <div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                {{ strategy.name }}
              </h3>
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {{ strategy.description || 'No description available' }}
              </p>
            </div>
            
            <!-- Quick Stats (List View) -->
            <div v-if="viewMode === 'list'" class="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
              <span>{{ (strategy.parameters?.length || 0) }} parametri</span>
              <span class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                {{ strategy.category }}
              </span>
            </div>
          </div>
          
          <!-- Strategy Details -->
          <div :class="viewMode === 'grid' ? 'space-y-3' : 'mt-2'">
            <!-- Category and Version (Grid View) -->
            <div v-if="viewMode === 'grid'" class="flex items-center justify-between text-sm">
              <span class="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                {{ strategy.category }}
              </span>
              <span class="text-gray-500 dark:text-gray-400">
                v{{ strategy.version || '1.0.0' }}
              </span>
            </div>
            
            <!-- Parameters Count -->
            <div class="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Parametri configurabili:</span>
              <span class="font-medium">{{ strategy.parameters?.length || 0 }}</span>
            </div>
            
            <!-- Performance Metrics (if available) -->
            <div v-if="strategy.performance" class="grid grid-cols-2 gap-2 text-xs">
              <div class="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
                <div class="font-medium text-green-700 dark:text-green-400">
                  {{ strategy.performance.winRate?.toFixed(1) || 0 }}%
                </div>
                <div class="text-green-600 dark:text-green-500">Win Rate</div>
              </div>
              <div class="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                <div class="font-medium text-blue-700 dark:text-blue-400">
                  {{ strategy.performance.totalReturn?.toFixed(1) || 0 }}%
                </div>
                <div class="text-blue-600 dark:text-blue-500">Total Return</div>
              </div>
            </div>
            
            <!-- Tags -->
            <div v-if="strategy.tags?.length" class="flex flex-wrap gap-1">
              <span
                v-for="tag in strategy.tags"
                :key="tag"
                class="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded"
              >
                {{ tag }}
              </span>
            </div>
            
            <!-- Author and Last Updated -->
            <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-700">
              <span>{{ strategy.author || 'Unknown' }}</span>
              <span>{{ formatDate(strategy.lastModified || strategy.createdAt) }}</span>
            </div>
          </div>
        </div>
        
        <!-- Selection Indicator -->
        <div v-if="selectedStrategy?.id === strategy.id" class="absolute top-2 right-2">
          <div class="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
            <Icon name="check" class="w-4 h-4 text-white" />
          </div>
        </div>
      </div>
    </div>
    
    <!-- No Results -->
    <div v-else class="text-center py-12">
      <Icon name="search" class="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
        Nessuna strategia trovata
      </h3>
      <p class="text-gray-600 dark:text-gray-400">
        Prova a modificare i criteri di ricerca o i filtri.
      </p>
    </div>
    
    <!-- Selected Strategy Actions -->
    <div v-if="selectedStrategy" class="mt-8 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ selectedStrategy.name }} selezionata
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {{ selectedStrategy.description }}
          </p>
        </div>
        <button
          @click="clearSelection"
          class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <Icon name="x" class="w-5 h-5" />
        </button>
      </div>
      
      <div class="flex flex-wrap gap-3">
        <button
          @click="configureStrategy"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Configura Parametri
        </button>
        <button
          @click="viewStrategyDetails"
          class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Visualizza Dettagli
        </button>
        <button
          @click="runBacktest"
          class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          Avvia Backtest
        </button>
        <button
          v-if="selectedStrategy.hasPresets"
          @click="loadPresets"
          class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          Carica Preset
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useStrategiesStore } from '@/stores/strategies'
import { useNotificationStore } from '@/stores/notifications'
import { type Strategy } from '@/types/strategy'
import Icon from '@/components/ui/Icon.vue'

// Props
interface Props {
  modelValue?: any
  showActions?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showActions: true
})

// Emits
interface Emits {
  'update:modelValue': [strategy: any]
  'strategy-selected': [strategy: any]
  'configure-strategy': [strategy: any]
  'run-backtest': [strategy: any]
}

const emit = defineEmits<Emits>()

// Composables
const router = useRouter()
const strategiesStore = useStrategiesStore()
const notificationsStore = useNotificationStore()

// Reactive data
const searchQuery = ref('')
const selectedCategory = ref('')
const viewMode = ref<'grid' | 'list'>('grid')
const selectedStrategy = ref<any>(props.modelValue)

// Available strategies
const strategies = ref<Strategy[]>([])

// Computed properties
const categories = computed(() => {
  const cats = [...new Set(strategies.value.map(s => s.category))]
  return cats.sort()
})

const filteredStrategies = computed(() => {
  let filtered = strategies.value
  
  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(strategy => 
      strategy.name.toLowerCase().includes(query) ||
      (strategy.description && strategy.description.toLowerCase().includes(query)) ||
      (strategy.tags?.some(tag => tag.toLowerCase().includes(query)))
    )
  }
  
  // Filter by category
  if (selectedCategory.value) {
    filtered = filtered.filter(strategy => strategy.category === selectedCategory.value)
  }
  
  return filtered
})

// Methods
function getStrategyIcon(category: string): string {
  const iconMap: Record<string, string> = {
    'Trend Following': 'trending-up',
    'Momentum': 'zap',
    'Oscillator': 'activity',
    'Volatility': 'bar-chart',
    'Mean Reversion': 'target',
    'Breakout': 'arrow-up-right'
  }
  return iconMap[category] || 'chart-line'
}

function selectStrategy(strategy: Strategy) {
  selectedStrategy.value = strategy
  emit('update:modelValue', strategy)
  emit('strategy-selected', strategy)
  
  notificationsStore.addNotification({
    type: 'info',
    title: 'Strategia selezionata',
    message: `${strategy.name} è stata selezionata`
  })
}

function formatDate(timestamp?: number): string {
  if (!timestamp) return 'N/A'
  return new Date(timestamp).toLocaleDateString('it-IT')
}

function clearSelection() {
  selectedStrategy.value = null
  emit('update:modelValue', null)
}

function configureStrategy() {
  if (selectedStrategy.value) {
    emit('configure-strategy', selectedStrategy.value)
    router.push({
      name: 'strategy-config',
      params: { strategyId: selectedStrategy.value.id }
    })
  }
}

function viewStrategyDetails() {
  if (selectedStrategy.value) {
    router.push({
      name: 'strategy-details',
      params: { strategyId: selectedStrategy.value.id }
    })
  }
}

function runBacktest() {
  if (selectedStrategy.value) {
    emit('run-backtest', selectedStrategy.value)
    router.push({
      name: 'backtest',
      query: { strategy: selectedStrategy.value.id }
    })
  }
}

function loadPresets() {
  if (selectedStrategy.value) {
    router.push({
      name: 'strategy-presets',
      params: { strategyId: selectedStrategy.value.id }
    })
  }
}



// Lifecycle
onMounted(() => {
  // Load strategies from store if available
  if (strategiesStore.strategies.length > 0) {
    strategies.value = strategiesStore.strategies
  }
})
</script>

<style scoped>
.strategy-selector {
  max-width: 80rem;
  margin-left: auto;
  margin-right: auto;
}

/* Card hover effects */
.strategy-card {
  transition: all 0.3s ease-in-out;
}

.strategy-card:hover {
  transform: translateY(-0.25rem);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

/* Selection animation */
.strategy-card.selected {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background-color: #f3f4f6;
}

.dark ::-webkit-scrollbar-track {
  background-color: #1f2937;
}

::-webkit-scrollbar-thumb {
  background-color: #9ca3af;
  border-radius: 9999px;
}

.dark ::-webkit-scrollbar-thumb {
  background-color: #4b5563;
}

::-webkit-scrollbar-thumb:hover {
  background-color: #6b7280;
}

.dark ::-webkit-scrollbar-thumb:hover {
  background-color: #6b7280;
}
</style>