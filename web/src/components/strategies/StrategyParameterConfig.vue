<template>
  <div class="strategy-parameter-config">
    <!-- Strategy Selection -->
    <div class="mb-6">
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Seleziona Strategia
      </label>
      <select 
        v-model="selectedStrategy" 
        @change="onStrategyChange"
        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
      >
        <option value="">-- Seleziona una strategia --</option>
        <option 
          v-for="strategy in availableStrategies" 
          :key="strategy.id" 
          :value="strategy.id"
        >
          {{ strategy.name }} - {{ strategy.description }}
        </option>
      </select>
    </div>

    <!-- Strategy Information -->
    <div v-if="selectedStrategyInfo" class="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
      <h3 class="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-2">
        {{ selectedStrategyInfo.name }}
      </h3>
      <p class="text-blue-700 dark:text-blue-300 text-sm mb-2">
        {{ selectedStrategyInfo.description }}
      </p>
      <div class="flex flex-wrap gap-2">
        <span class="px-2 py-1 bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-xs rounded">
          Categoria: {{ selectedStrategyInfo.category }}
        </span>
        <span class="px-2 py-1 bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 text-xs rounded">
          Versione: {{ selectedStrategyInfo.version }}
        </span>
        <span class="px-2 py-1 bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 text-xs rounded">
          Autore: {{ selectedStrategyInfo.author }}
        </span>
      </div>
    </div>

    <!-- Parameter Configuration -->
    <div v-if="parameterCategories.length > 0" class="space-y-6">
      <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
        Configurazione Parametri
      </h3>
      
      <!-- Parameter Categories -->
      <div 
        v-for="category in parameterCategories" 
        :key="category.name"
        class="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
      >
        <h4 class="text-md font-medium text-gray-700 dark:text-gray-300 mb-4 flex items-center">
          <Icon :name="getCategoryIcon(category.name)" class="w-5 h-5 mr-2" />
          {{ category.name }}
          <span class="ml-2 text-xs text-gray-500 dark:text-gray-400">
            ({{ category.parameters.length }} parametri)
          </span>
        </h4>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div 
            v-for="param in category.parameters" 
            :key="param.name"
            class="parameter-field"
          >
            <!-- Number Parameter -->
            <div v-if="param.config.type === 'number'" class="space-y-2">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {{ param.config.label }}
                <span v-if="param.config.description" class="text-xs text-gray-500 dark:text-gray-400 block">
                  {{ param.config.description }}
                </span>
              </label>
              <div class="flex items-center space-x-2">
                <input
                  v-model.number="parameters[param.name]"
                  :min="param.config.min"
                  :max="param.config.max"
                  :step="param.config.step || 1"
                  type="number"
                  class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                  @input="validateAndUpdateParameter(param.name, ($event.target as HTMLInputElement).value, param.config)"
                />
                <button
                  @click="resetParameter(param.name, param.config.default)"
                  class="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                  title="Reset al valore predefinito"
                >
                  Reset
                </button>
              </div>
              <div v-if="param.config.min !== undefined && param.config.max !== undefined" class="text-xs text-gray-500 dark:text-gray-400">
                Range: {{ param.config.min }} - {{ param.config.max }}
              </div>
            </div>

            <!-- Boolean Parameter -->
            <div v-else-if="param.config.type === 'boolean'" class="space-y-2">
              <label class="flex items-center space-x-2 cursor-pointer">
                <input
                  v-model="parameters[param.name]"
                  type="checkbox"
                  class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  @change="updateParameter(param.name, ($event.target as HTMLInputElement).checked)"
                />
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {{ param.config.label }}
                </span>
              </label>
              <p v-if="param.config.description" class="text-xs text-gray-500 dark:text-gray-400">
                {{ param.config.description }}
              </p>
            </div>

            <!-- Select Parameter -->
            <div v-else-if="param.config.type === 'select'" class="space-y-2">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {{ param.config.label }}
                <span v-if="param.config.description" class="text-xs text-gray-500 dark:text-gray-400 block">
                  {{ param.config.description }}
                </span>
              </label>
              <select
                v-model="parameters[param.name]"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                @change="updateParameter(param.name, ($event.target as HTMLSelectElement).value)"
              >
                <option 
                  v-for="option in param.config.options" 
                  :key="option.value" 
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
            </div>

            <!-- String Parameter -->
            <div v-else-if="param.config.type === 'string'" class="space-y-2">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {{ param.config.label }}
                <span v-if="param.config.description" class="text-xs text-gray-500 dark:text-gray-400 block">
                  {{ param.config.description }}
                </span>
              </label>
              <input
                v-model="parameters[param.name]"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                @input="updateParameter(param.name, ($event.target as HTMLInputElement).value)"
              />
            </div>

            <!-- Validation Error -->
            <div v-if="validationErrors[param.name]" class="text-red-500 dark:text-red-400 text-xs mt-1">
              {{ validationErrors[param.name] }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Parameter Presets -->
    <div v-if="selectedStrategy" class="mt-6">
      <h4 class="text-md font-medium text-gray-700 dark:text-gray-300 mb-3">
        Preset Configurazioni
      </h4>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="preset in parameterPresets"
          :key="preset.name"
          @click="applyPreset(preset)"
          class="px-3 py-2 bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 text-sm rounded-md hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors"
        >
          {{ preset.name }}
        </button>
        <button
          @click="saveCurrentAsPreset"
          class="px-3 py-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-sm rounded-md hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
        >
          Salva Configurazione
        </button>
      </div>
    </div>

    <!-- Configuration Summary -->
    <div v-if="selectedStrategy" class="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <h4 class="text-md font-medium text-gray-700 dark:text-gray-300 mb-3">
        Riepilogo Configurazione
      </h4>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div>
          <span class="font-medium text-gray-600 dark:text-gray-400">Strategia:</span>
          <span class="ml-2 text-gray-800 dark:text-gray-200">{{ selectedStrategyInfo?.name }}</span>
        </div>
        <div>
          <span class="font-medium text-gray-600 dark:text-gray-400">Parametri modificati:</span>
          <span class="ml-2 text-gray-800 dark:text-gray-200">{{ modifiedParametersCount }}</span>
        </div>
        <div>
          <span class="font-medium text-gray-600 dark:text-gray-400">Validazione:</span>
          <span class="ml-2" :class="isConfigurationValid ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
            {{ isConfigurationValid ? 'Valida' : 'Errori presenti' }}
          </span>
        </div>
        <div>
          <span class="font-medium text-gray-600 dark:text-gray-400">Ultimo aggiornamento:</span>
          <span class="ml-2 text-gray-800 dark:text-gray-200">{{ lastUpdateTime }}</span>
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div v-if="selectedStrategy" class="mt-6 flex flex-wrap gap-3">
      <button
        @click="applyConfiguration"
        :disabled="!isConfigurationValid"
        class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        Applica Configurazione
      </button>
      <button
        @click="resetToDefaults"
        class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
      >
        Reset ai Valori Predefiniti
      </button>
      <button
        @click="exportConfiguration"
        class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
      >
        Esporta Configurazione
      </button>
      <button
        @click="importConfiguration"
        class="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
      >
        Importa Configurazione
      </button>
    </div>

    <!-- Hidden file input for import -->
    <input
      ref="fileInput"
      type="file"
      accept=".json"
      style="display: none"
      @change="handleFileImport"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useStrategiesStore } from '@/stores/strategies'
import { useNotificationStore } from '@/stores/notifications'
import Icon from '@/components/ui/Icon.vue'

// Props
interface Props {
  modelValue?: Record<string, any>
  strategyId?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => ({}),
  strategyId: ''
})

// Emits
interface Emits {
  'update:modelValue': [value: Record<string, any>]
  'strategy-changed': [strategyId: string]
  'configuration-applied': [config: Record<string, any>]
}

const emit = defineEmits<Emits>()

// Stores
const strategiesStore = useStrategiesStore()
const notificationsStore = useNotificationStore()

// Reactive data
const selectedStrategy = ref(props.strategyId)
const parameters = ref<Record<string, any>>({})
const validationErrors = ref<Record<string, string>>({})
const lastUpdateTime = ref('')
const fileInput = ref<HTMLInputElement>()

// Available strategies (mock data - replace with actual API call)
const availableStrategies = ref([
  {
    id: 'dema',
    name: 'DEMA Strategy',
    description: 'Double Exponential Moving Average',
    category: 'Trend Following',
    version: '1.0.0',
    author: 'Gekko Team'
  },
  {
    id: 'macd',
    name: 'MACD Strategy',
    description: 'Moving Average Convergence Divergence',
    category: 'Momentum',
    version: '1.0.0',
    author: 'Gekko Team'
  },
  {
    id: 'rsi',
    name: 'RSI Strategy',
    description: 'Relative Strength Index',
    category: 'Oscillator',
    version: '1.0.0',
    author: 'Gekko Team'
  },
  {
    id: 'ppo',
    name: 'PPO Strategy',
    description: 'Percentage Price Oscillator',
    category: 'Momentum',
    version: '1.0.0',
    author: 'Gekko Team'
  },
  {
    id: 'stochrsi',
    name: 'StochRSI Strategy',
    description: 'Stochastic RSI',
    category: 'Oscillator',
    version: '1.0.0',
    author: 'Gekko Team'
  },
  {
    id: 'cci',
    name: 'CCI Strategy',
    description: 'Commodity Channel Index',
    category: 'Oscillator',
    version: '1.0.0',
    author: 'Gekko Team'
  },
  {
    id: 'bollinger',
    name: 'Bollinger Bands Strategy',
    description: 'Bollinger Bands with multiple modes',
    category: 'Volatility',
    version: '1.0.0',
    author: 'Gekko Team'
  }
])

// Parameter presets
const parameterPresets = ref([
  {
    name: 'Conservativo',
    description: 'Configurazione conservativa con segnali meno frequenti',
    parameters: {}
  },
  {
    name: 'Aggressivo',
    description: 'Configurazione aggressiva con segnali più frequenti',
    parameters: {}
  },
  {
    name: 'Scalping',
    description: 'Ottimizzato per trading a breve termine',
    parameters: {}
  },
  {
    name: 'Swing Trading',
    description: 'Ottimizzato per trading a medio termine',
    parameters: {}
  }
])

// Computed properties
const selectedStrategyInfo = computed(() => {
  return availableStrategies.value.find(s => s.id === selectedStrategy.value)
})

const parameterDefinitions = computed(() => {
  // Mock parameter definitions - replace with actual API call
  if (!selectedStrategy.value) return {}
  
  // This would come from the strategy class
  return getParameterDefinitionsForStrategy(selectedStrategy.value)
})

const parameterCategories = computed(() => {
  const categories: Record<string, any[]> = {}
  
  for (const [name, config] of Object.entries(parameterDefinitions.value)) {
    const category = (config as any).category || 'Generale'
    if (!categories[category]) {
      categories[category] = []
    }
    categories[category].push({ name, config })
  }
  
  return Object.entries(categories).map(([name, parameters]) => ({
    name,
    parameters
  }))
})

const modifiedParametersCount = computed(() => {
  let count = 0
  for (const [name, config] of Object.entries(parameterDefinitions.value)) {
    if (parameters.value[name] !== (config as any).default) {
      count++
    }
  }
  return count
})

const isConfigurationValid = computed(() => {
  return Object.keys(validationErrors.value).length === 0
})

// Methods
function getParameterDefinitionsForStrategy(strategyId: string) {
  // Mock parameter definitions - in real implementation, this would come from the strategy classes
  const definitions: Record<string, any> = {
    dema: {
      fastPeriod: {
        label: 'Periodo DEMA Veloce',
        description: 'Periodo per il calcolo della DEMA veloce',
        type: 'number',
        default: 12,
        min: 5,
        max: 20,
        step: 1,
        category: 'Impostazioni Base'
      },
      slowPeriod: {
        label: 'Periodo DEMA Lenta',
        description: 'Periodo per il calcolo della DEMA lenta',
        type: 'number',
        default: 26,
        min: 20,
        max: 50,
        step: 1,
        category: 'Impostazioni Base'
      },
      tradingMode: {
        label: 'Modalità Trading',
        description: 'Strategia di trading da utilizzare',
        type: 'select',
        default: 'crossover',
        options: [
          { value: 'crossover', label: 'Crossover' },
          { value: 'trend_following', label: 'Trend Following' },
          { value: 'pullback', label: 'Pullback' },
          { value: 'breakout', label: 'Breakout' }
        ],
        category: 'Modalità Trading'
      },
      volatilityFilter: {
        label: 'Filtro Volatilità',
        description: 'Attiva il filtro di volatilità ATR',
        type: 'boolean',
        default: true,
        category: 'Filtri Segnale'
      },
      confirmationBars: {
        label: 'Barre di Conferma',
        description: 'Numero di barre per confermare il segnale',
        type: 'number',
        default: 2,
        min: 1,
        max: 5,
        step: 1,
        category: 'Filtri Segnale'
      }
    },
    macd: {
      fastEMA: {
        label: 'EMA Veloce',
        description: 'Periodo EMA veloce per MACD',
        type: 'number',
        default: 12,
        min: 8,
        max: 15,
        step: 1,
        category: 'Impostazioni Base'
      },
      slowEMA: {
        label: 'EMA Lenta',
        description: 'Periodo EMA lenta per MACD',
        type: 'number',
        default: 26,
        min: 20,
        max: 30,
        step: 1,
        category: 'Impostazioni Base'
      },
      signalEMA: {
        label: 'EMA Segnale',
        description: 'Periodo EMA per linea segnale',
        type: 'number',
        default: 9,
        min: 7,
        max: 12,
        step: 1,
        category: 'Impostazioni Base'
      },
      tradingMode: {
        label: 'Modalità Trading',
        description: 'Modalità di generazione segnali',
        type: 'select',
        default: 'crossover',
        options: [
          { value: 'crossover', label: 'Crossover MACD/Signal' },
          { value: 'zero_line', label: 'Zero Line Cross' },
          { value: 'divergence', label: 'Divergence Detection' },
          { value: 'histogram', label: 'Histogram Analysis' }
        ],
        category: 'Modalità Trading'
      },
      divergenceDetection: {
        label: 'Rilevamento Divergenze',
        description: 'Attiva il rilevamento delle divergenze',
        type: 'boolean',
        default: true,
        category: 'Funzionalità Avanzate'
      }
    },
    rsi: {
      period: {
        label: 'Periodo RSI',
        description: 'Periodo per il calcolo RSI',
        type: 'number',
        default: 14,
        min: 10,
        max: 20,
        step: 1,
        category: 'Impostazioni Base'
      },
      overboughtLevel: {
        label: 'Livello Ipercomprato',
        description: 'Soglia RSI per condizione di ipercomprato',
        type: 'number',
        default: 75,
        min: 70,
        max: 85,
        step: 1,
        category: 'Livelli Trading'
      },
      oversoldLevel: {
        label: 'Livello Ipervenduto',
        description: 'Soglia RSI per condizione di ipervenduto',
        type: 'number',
        default: 25,
        min: 15,
        max: 30,
        step: 1,
        category: 'Livelli Trading'
      },
      dynamicLevels: {
        label: 'Livelli Dinamici',
        description: 'Utilizza livelli dinamici basati sulla volatilità',
        type: 'boolean',
        default: true,
        category: 'Funzionalità Avanzate'
      }
    }
    // Add other strategies...
  }
  
  return definitions[strategyId] || {}
}

function getCategoryIcon(categoryName: string): string {
  const iconMap: Record<string, string> = {
    'Impostazioni Base': 'cog',
    'Modalità Trading': 'chart-line',
    'Filtri Segnale': 'filter',
    'Livelli Trading': 'target',
    'Funzionalità Avanzate': 'star',
    'Gestione Rischio': 'shield',
    'Generale': 'settings'
  }
  return iconMap[categoryName] || 'settings'
}

function onStrategyChange() {
  if (selectedStrategy.value) {
    initializeParameters()
    emit('strategy-changed', selectedStrategy.value)
  }
}

function initializeParameters() {
  const definitions = parameterDefinitions.value
  const newParameters: Record<string, any> = {}
  
  for (const [name, config] of Object.entries(definitions)) {
    newParameters[name] = (config as any).default
  }
  
  parameters.value = newParameters
  validationErrors.value = {}
  updateLastModified()
}

function validateAndUpdateParameter(name: string, value: any, config: any) {
  const errors = { ...validationErrors.value }
  delete errors[name]
  
  // Type validation
  if (config.type === 'number') {
    const numValue = Number(value)
    if (isNaN(numValue)) {
      errors[name] = 'Deve essere un numero valido'
    } else if (config.min !== undefined && numValue < config.min) {
      errors[name] = `Valore minimo: ${config.min}`
    } else if (config.max !== undefined && numValue > config.max) {
      errors[name] = `Valore massimo: ${config.max}`
    }
  }
  
  // Custom validation
  if (config.validation && typeof config.validation === 'function') {
    const result = config.validation(value)
    if (result !== true) {
      errors[name] = result
    }
  }
  
  validationErrors.value = errors
  updateParameter(name, value)
}

function updateParameter(name: string, value: any) {
  parameters.value[name] = value
  updateLastModified()
  emit('update:modelValue', { ...parameters.value })
}

function resetParameter(name: string, defaultValue: any) {
  updateParameter(name, defaultValue)
  const errors = { ...validationErrors.value }
  delete errors[name]
  validationErrors.value = errors
}

function resetToDefaults() {
  initializeParameters()
  notificationsStore.addNotification({
    type: 'success',
    title: 'Parametri ripristinati',
    message: 'Tutti i parametri sono stati ripristinati ai valori predefiniti'
  })
}

function applyConfiguration() {
  if (!isConfigurationValid.value) {
    notificationsStore.addNotification({
      type: 'error',
      title: 'Configurazione non valida',
      message: 'Correggere gli errori di validazione prima di applicare'
    })
    return
  }
  
  emit('configuration-applied', { ...parameters.value })
  notificationsStore.addNotification({
    type: 'success',
    title: 'Configurazione applicata',
    message: `Configurazione applicata per ${selectedStrategyInfo.value?.name}`
  })
}

function applyPreset(preset: any) {
  // Apply preset parameters
  for (const [name, value] of Object.entries(preset.parameters)) {
    if (parameters.value.hasOwnProperty(name)) {
      updateParameter(name, value)
    }
  }
  
  notificationsStore.addNotification({
    type: 'info',
    title: 'Preset applicato',
    message: `Preset "${preset.name}" applicato con successo`
  })
}

function saveCurrentAsPreset() {
  // Implementation for saving current configuration as preset
  const presetName = prompt('Nome del preset:')
  if (presetName) {
    parameterPresets.value.push({
      name: presetName,
      description: 'Configurazione personalizzata',
      parameters: { ...parameters.value }
    })
    
    notificationsStore.addNotification({
      type: 'success',
      title: 'Preset salvato',
      message: `Preset "${presetName}" salvato con successo`
    })
  }
}

function exportConfiguration() {
  const config = {
    strategy: selectedStrategy.value,
    strategyInfo: selectedStrategyInfo.value,
    parameters: parameters.value,
    timestamp: new Date().toISOString()
  }
  
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${selectedStrategy.value}-config-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
  
  notificationsStore.addNotification({
    type: 'success',
    title: 'Configurazione esportata',
    message: 'File di configurazione scaricato con successo'
  })
}

function importConfiguration() {
  fileInput.value?.click()
}

function handleFileImport(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const config = JSON.parse(e.target?.result as string)
      
      if (config.strategy && config.parameters) {
        selectedStrategy.value = config.strategy
        onStrategyChange()
        
        // Apply imported parameters
        for (const [name, value] of Object.entries(config.parameters)) {
          if (parameters.value.hasOwnProperty(name)) {
            updateParameter(name, value)
          }
        }
        
        notificationsStore.addNotification({
          type: 'success',
          title: 'Configurazione importata',
          message: 'Configurazione caricata con successo'
        })
      } else {
        throw new Error('Formato file non valido')
      }
    } catch (error) {
      notificationsStore.addNotification({
        type: 'error',
        title: 'Errore importazione',
        message: 'Impossibile caricare il file di configurazione'
      })
    }
  }
  reader.readAsText(file)
}

function updateLastModified() {
  lastUpdateTime.value = new Date().toLocaleTimeString()
}

// Watchers
watch(() => props.strategyId, (newStrategyId) => {
  if (newStrategyId && newStrategyId !== selectedStrategy.value) {
    selectedStrategy.value = newStrategyId
    onStrategyChange()
  }
})

watch(() => props.modelValue, (newValue) => {
  if (newValue && Object.keys(newValue).length > 0) {
    parameters.value = { ...newValue }
  }
}, { deep: true })

// Lifecycle
onMounted(() => {
  if (props.strategyId) {
    selectedStrategy.value = props.strategyId
    onStrategyChange()
  }
  
  if (Object.keys(props.modelValue).length > 0) {
    parameters.value = { ...props.modelValue }
  }
})
</script>

<style scoped>
.strategy-parameter-config {
  max-width: 72rem;
  margin-left: auto;
  margin-right: auto;
}

.parameter-field {
  transition: all 0.2s ease-in-out;
}

.parameter-field:hover {
  transform: scale(1.05);
}

/* Custom scrollbar for better UX */
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