<template>
  <div class="strategy-editor h-full flex flex-col bg-white dark:bg-gray-900">
    <!-- Header -->
    <div class="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 p-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
            Strategy Editor
          </h2>
          <div class="flex items-center space-x-2">
            <span class="text-sm text-gray-500 dark:text-gray-400">
              {{ currentStrategy?.name || 'Untitled Strategy' }}
            </span>
            <div v-if="hasUnsavedChanges" class="w-2 h-2 bg-orange-500 rounded-full" title="Unsaved changes"></div>
          </div>
        </div>
        
        <div class="flex items-center space-x-2">
          <!-- Template Selector -->
          <select 
            v-model="selectedTemplate"
            @change="loadTemplate"
            class="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select Template</option>
            <option v-for="template in templates" :key="template.id" :value="template.id">
              {{ template.name }}
            </option>
          </select>
          
          <!-- Actions -->
          <button
            @click="validateStrategy"
            :disabled="!editorContent.trim()"
            class="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Validate
          </button>
          
          <button
            @click="saveStrategy"
            :disabled="!editorContent.trim() || !hasUnsavedChanges"
            class="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Save
          </button>
          
          <button
            @click="showSaveAsDialog = true"
            :disabled="!editorContent.trim()"
            class="px-3 py-1.5 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Save As
          </button>
        </div>
      </div>
      
      <!-- Strategy Info -->
      <div v-if="currentStrategy" class="mt-3 flex items-center space-x-6 text-sm text-gray-600 dark:text-gray-400">
        <span>Type: {{ currentStrategy.type }}</span>
        <span>Created: {{ formatDate(currentStrategy.createdAt) }}</span>
        <span v-if="currentStrategy.lastModified">Modified: {{ formatDate(currentStrategy.lastModified) }}</span>
        <span v-if="validationResult">Status: 
          <span :class="validationResult.valid ? 'text-green-600' : 'text-red-600'">
            {{ validationResult.valid ? 'Valid' : 'Invalid' }}
          </span>
        </span>
      </div>
    </div>
    
    <!-- Editor Container -->
    <div class="flex-1 flex min-h-0">
      <!-- Monaco Editor -->
      <div class="flex-1 relative">
        <div ref="editorContainer" class="absolute inset-0"></div>
      </div>
      
      <!-- Side Panel -->
      <div class="w-80 border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex flex-col">
        <!-- Panel Tabs -->
        <div class="flex border-b border-gray-200 dark:border-gray-700">
          <button
            v-for="tab in sidePanelTabs"
            :key="tab.id"
            @click="activeSidePanel = tab.id"
            :class="[
              'flex-1 px-3 py-2 text-sm font-medium transition-colors',
              activeSidePanel === tab.id
                ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            ]"
          >
            {{ tab.name }}
          </button>
        </div>
        
        <!-- Panel Content -->
        <div class="flex-1 overflow-y-auto p-4">
          <!-- Documentation Panel -->
          <div v-if="activeSidePanel === 'docs'" class="space-y-4">
            <div>
              <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-2">Strategy Lifecycle</h3>
              <div class="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                <div class="p-2 bg-white dark:bg-gray-900 rounded border">
                  <code class="text-blue-600 dark:text-blue-400">init()</code>
                  <p class="mt-1">Initialize strategy parameters and state</p>
                </div>
                <div class="p-2 bg-white dark:bg-gray-900 rounded border">
                  <code class="text-blue-600 dark:text-blue-400">update(candle)</code>
                  <p class="mt-1">Process new market data</p>
                </div>
                <div class="p-2 bg-white dark:bg-gray-900 rounded border">
                  <code class="text-blue-600 dark:text-blue-400">check(candle)</code>
                  <p class="mt-1">Generate trading signals</p>
                </div>
                <div class="p-2 bg-white dark:bg-gray-900 rounded border">
                  <code class="text-blue-600 dark:text-blue-400">onTrade(trade)</code>
                  <p class="mt-1">Handle trade execution events</p>
                </div>
              </div>
            </div>
            
            <div>
              <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-2">Available Indicators</h3>
              <div class="space-y-1 text-xs">
                <div v-for="indicator in availableIndicators" :key="indicator.name" 
                     class="p-2 bg-white dark:bg-gray-900 rounded border cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                     @click="insertIndicator(indicator)">
                  <div class="font-medium text-gray-900 dark:text-white">{{ indicator.displayName }}</div>
                  <div class="text-gray-600 dark:text-gray-400">{{ indicator.name }}</div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Validation Panel -->
          <div v-else-if="activeSidePanel === 'validation'" class="space-y-4">
            <div v-if="validationResult">
              <div class="flex items-center space-x-2 mb-3">
                <div :class="[
                  'w-3 h-3 rounded-full',
                  validationResult.valid ? 'bg-green-500' : 'bg-red-500'
                ]"></div>
                <span class="text-sm font-medium" :class="[
                  validationResult.valid ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
                ]">
                  {{ validationResult.valid ? 'Strategy is valid' : 'Strategy has errors' }}
                </span>
              </div>
              
              <div v-if="validationResult.errors.length > 0" class="space-y-2">
                <h4 class="text-sm font-medium text-red-700 dark:text-red-400">Errors:</h4>
                <div v-for="error in validationResult.errors" :key="error.line" 
                     class="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs">
                  <div class="font-medium text-red-800 dark:text-red-400">Line {{ error.line }}: {{ error.message }}</div>
                  <div v-if="error.suggestion" class="text-red-600 dark:text-red-500 mt-1">{{ error.suggestion }}</div>
                </div>
              </div>
              
              <div v-if="validationResult.warnings.length > 0" class="space-y-2">
                <h4 class="text-sm font-medium text-yellow-700 dark:text-yellow-400">Warnings:</h4>
                <div v-for="warning in validationResult.warnings" :key="warning.line" 
                     class="p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs">
                  <div class="font-medium text-yellow-800 dark:text-yellow-400">Line {{ warning.line }}: {{ warning.message }}</div>
                </div>
              </div>
              
              <div v-if="validationResult.suggestions.length > 0" class="space-y-2">
                <h4 class="text-sm font-medium text-blue-700 dark:text-blue-400">Suggestions:</h4>
                <div v-for="suggestion in validationResult.suggestions" :key="suggestion" 
                     class="p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-xs text-blue-800 dark:text-blue-400">
                  {{ suggestion }}
                </div>
              </div>
            </div>
            
            <div v-else class="text-sm text-gray-500 dark:text-gray-400">
              Click "Validate" to check your strategy for errors
            </div>
          </div>
          
          <!-- Settings Panel -->
          <div v-else-if="activeSidePanel === 'settings'" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Editor Theme
              </label>
              <select v-model="editorTheme" @change="updateEditorTheme" 
                      class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                <option value="vs">Light</option>
                <option value="vs-dark">Dark</option>
                <option value="hc-black">High Contrast</option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Font Size
              </label>
              <input v-model.number="fontSize" @change="updateFontSize" 
                     type="range" min="10" max="24" step="1"
                     class="w-full">
              <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ fontSize }}px</div>
            </div>
            
            <div class="flex items-center space-x-2">
              <input v-model="wordWrap" @change="updateWordWrap" 
                     type="checkbox" id="wordWrap" 
                     class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
              <label for="wordWrap" class="text-sm text-gray-700 dark:text-gray-300">Word Wrap</label>
            </div>
            
            <div class="flex items-center space-x-2">
              <input v-model="minimap" @change="updateMinimap" 
                     type="checkbox" id="minimap" 
                     class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
              <label for="minimap" class="text-sm text-gray-700 dark:text-gray-300">Show Minimap</label>
            </div>
            
            <div class="flex items-center space-x-2">
              <input v-model="autoSave" @change="updateAutoSave" 
                     type="checkbox" id="autoSave" 
                     class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
              <label for="autoSave" class="text-sm text-gray-700 dark:text-gray-300">Auto Save</label>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Save As Dialog -->
    <div v-if="showSaveAsDialog" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 max-w-full mx-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Save Strategy As</h3>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Strategy Name
            </label>
            <input v-model="saveAsName" 
                   type="text" 
                   placeholder="Enter strategy name"
                   class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea v-model="saveAsDescription" 
                      rows="3" 
                      placeholder="Optional description"
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"></textarea>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category
            </label>
            <select v-model="saveAsCategory" 
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
              <option value="trend">Trend Following</option>
              <option value="momentum">Momentum</option>
              <option value="mean-reversion">Mean Reversion</option>
              <option value="arbitrage">Arbitrage</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>
        
        <div class="flex justify-end space-x-3 mt-6">
          <button @click="showSaveAsDialog = false" 
                  class="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            Cancel
          </button>
          <button @click="saveStrategyAs" 
                  :disabled="!saveAsName.trim()"
                  class="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            Save
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue'
import * as monaco from 'monaco-editor'
import { useStrategyStore } from '@/stores/strategy'
import { useIndicatorsStore } from '@/stores/indicators'
import { useNotificationStore } from '@/stores/notifications'
import type { Strategy, StrategyTemplate, StrategyValidationResult } from '@/types/strategy'

interface Props {
  strategy?: Strategy | null
}

const props = withDefaults(defineProps<Props>(), {
  strategy: null
})

const emit = defineEmits<{
  'strategy-saved': [strategy: Strategy]
  'strategy-validated': [result: StrategyValidationResult]
}>()

// Stores
const strategyStore = useStrategyStore()
const indicatorStore = useIndicatorsStore()
const notificationStore = useNotificationStore()

// Refs
const editorContainer = ref<HTMLElement>()
let editor: monaco.editor.IStandaloneCodeEditor | null = null

// State
const editorContent = ref('')
const currentStrategy = ref<Strategy | null>(props.strategy)
const hasUnsavedChanges = ref(false)
const validationResult = ref<StrategyValidationResult | null>(null)
const selectedTemplate = ref('')
const activeSidePanel = ref('docs')

// Editor settings
const editorTheme = ref('vs-dark')
const fontSize = ref(14)
const wordWrap = ref(true)
const minimap = ref(true)
const autoSave = ref(false)

// Save As dialog
const showSaveAsDialog = ref(false)
const saveAsName = ref('')
const saveAsDescription = ref('')
const saveAsCategory = ref('custom')

// Side panel tabs
const sidePanelTabs = [
  { id: 'docs', name: 'Docs' },
  { id: 'validation', name: 'Validation' },
  { id: 'settings', name: 'Settings' }
]

// Computed
const templates = computed(() => strategyStore.templates)
const availableIndicators = computed(() => indicatorStore.availableIndicators)

// Auto-save timer
let autoSaveTimer: NodeJS.Timeout | null = null

// Monaco Editor setup
const initializeEditor = async () => {
  if (!editorContainer.value) return
  
  // Configure Monaco for JavaScript/TypeScript
  monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ES2020,
    allowNonTsExtensions: true,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    module: monaco.languages.typescript.ModuleKind.CommonJS,
    noEmit: true,
    esModuleInterop: true,
    jsx: monaco.languages.typescript.JsxEmit.React,
    reactNamespace: 'React',
    allowJs: true,
    typeRoots: ['node_modules/@types']
  })
  
  // Add Gekko strategy types
  const gekkoTypes = `
    interface Candle {
      timestamp: number;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }
    
    interface Trade {
      id: string;
      timestamp: number;
      type: 'buy' | 'sell';
      price: number;
      amount: number;
      fee: number;
    }
    
    interface StrategyContext {
      candle: Candle;
      indicators: Record<string, any>;
      portfolio: {
        balance: number;
        asset: number;
        total: number;
      };
      advice: (action: 'buy' | 'sell' | 'hold') => void;
      log: (...args: any[]) => void;
    }
    
    declare const this: StrategyContext;
  `
  
  monaco.languages.typescript.javascriptDefaults.addExtraLib(
    gekkoTypes,
    'gekko-types.d.ts'
  )
  
  // Create editor
  editor = monaco.editor.create(editorContainer.value, {
    value: editorContent.value,
    language: 'javascript',
    theme: editorTheme.value,
    fontSize: fontSize.value,
    wordWrap: wordWrap.value ? 'on' : 'off',
    minimap: { enabled: minimap.value },
    automaticLayout: true,
    scrollBeyondLastLine: false,
    renderWhitespace: 'selection',
    lineNumbers: 'on',
    folding: true,
    bracketMatching: 'always',
    autoIndent: 'full',
    formatOnPaste: true,
    formatOnType: true,
    suggestOnTriggerCharacters: true,
    acceptSuggestionOnEnter: 'on',
    tabCompletion: 'on'
  })
  
  // Listen for content changes
  editor.onDidChangeModelContent(() => {
    editorContent.value = editor?.getValue() || ''
    hasUnsavedChanges.value = true
    validationResult.value = null
    
    // Reset auto-save timer
    if (autoSave.value) {
      if (autoSaveTimer) clearTimeout(autoSaveTimer)
      autoSaveTimer = setTimeout(() => {
        if (hasUnsavedChanges.value && currentStrategy.value) {
          saveStrategy()
        }
      }, 2000)
    }
  })
  
  // Add keyboard shortcuts
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
    saveStrategy()
  })
  
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyS, () => {
    showSaveAsDialog.value = true
  })
  
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyE, () => {
    validateStrategy()
  })
}

// Template management
const loadTemplate = async () => {
  if (!selectedTemplate.value) return
  
  const template = templates.value.find(t => t.id === selectedTemplate.value)
  if (!template) return
  
  if (hasUnsavedChanges.value) {
    const confirmed = confirm('You have unsaved changes. Loading a template will discard them. Continue?')
    if (!confirmed) {
      selectedTemplate.value = ''
      return
    }
  }
  
  editorContent.value = template.code
  if (editor) {
    editor.setValue(template.code)
  }
  
  currentStrategy.value = null
  hasUnsavedChanges.value = true
  validationResult.value = null
  selectedTemplate.value = ''
}

// Strategy operations
const saveStrategy = async () => {
  if (!editorContent.value.trim()) return
  
  try {
    let strategy: Strategy
    
    if (currentStrategy.value) {
      // Update existing strategy
      strategy = await strategyStore.updateStrategy(currentStrategy.value.id, {
        code: editorContent.value,
        lastModified: Date.now()
      })
    } else {
      // Create new strategy
      strategy = await strategyStore.createStrategy({
        name: 'Untitled Strategy',
        code: editorContent.value,
        type: 'custom',
        category: 'custom'
      })
    }
    
    currentStrategy.value = strategy
    hasUnsavedChanges.value = false
    
    notificationStore.addNotification({
      type: 'success',
      title: 'Strategy Saved',
      message: `Strategy "${strategy.name}" saved successfully`
    })
    
    emit('strategy-saved', strategy)
    
  } catch (error) {
    console.error('Save strategy error:', error)
    notificationStore.addNotification({
      type: 'error',
      title: 'Save Failed',
      message: error instanceof Error ? error.message : 'Failed to save strategy'
    })
  }
}

const saveStrategyAs = async () => {
  if (!saveAsName.value.trim() || !editorContent.value.trim()) return
  
  try {
    const strategy = await strategyStore.createStrategy({
      name: saveAsName.value,
      description: saveAsDescription.value,
      code: editorContent.value,
      type: 'custom',
      category: saveAsCategory.value
    })
    
    currentStrategy.value = strategy
    hasUnsavedChanges.value = false
    showSaveAsDialog.value = false
    
    // Reset form
    saveAsName.value = ''
    saveAsDescription.value = ''
    saveAsCategory.value = 'custom'
    
    notificationStore.addNotification({
      type: 'success',
      title: 'Strategy Saved',
      message: `Strategy "${strategy.name}" saved successfully`
    })
    
    emit('strategy-saved', strategy)
    
  } catch (error) {
    console.error('Save strategy as error:', error)
    notificationStore.addNotification({
      type: 'error',
      title: 'Save Failed',
      message: error instanceof Error ? error.message : 'Failed to save strategy'
    })
  }
}

const validateStrategy = async () => {
  if (!editorContent.value.trim()) return
  
  try {
    const result = await strategyStore.validateStrategy(editorContent.value)
    validationResult.value = result
    activeSidePanel.value = 'validation'
    
    emit('strategy-validated', result)
    
    if (result.valid) {
      notificationStore.addNotification({
        type: 'success',
        title: 'Validation Passed',
        message: 'Strategy is valid and ready to use'
      })
    } else {
      notificationStore.addNotification({
        type: 'warning',
        title: 'Validation Issues',
        message: `Found ${result.errors.length} errors and ${result.warnings.length} warnings`
      })
    }
    
  } catch (error) {
    console.error('Validation error:', error)
    notificationStore.addNotification({
      type: 'error',
      title: 'Validation Failed',
      message: error instanceof Error ? error.message : 'Failed to validate strategy'
    })
  }
}

// Editor settings
const updateEditorTheme = () => {
  if (editor) {
    monaco.editor.setTheme(editorTheme.value)
  }
}

const updateFontSize = () => {
  if (editor) {
    editor.updateOptions({ fontSize: fontSize.value })
  }
}

const updateWordWrap = () => {
  if (editor) {
    editor.updateOptions({ wordWrap: wordWrap.value ? 'on' : 'off' })
  }
}

const updateMinimap = () => {
  if (editor) {
    editor.updateOptions({ minimap: { enabled: minimap.value } })
  }
}

const updateAutoSave = () => {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer)
    autoSaveTimer = null
  }
}

// Helper functions
const insertIndicator = (indicator: any) => {
  if (!editor) return
  
  const position = editor.getPosition()
  if (!position) return
  
  const indicatorCode = `
// ${indicator.displayName}
const ${indicator.name} = this.indicators.${indicator.name};
if (${indicator.name}.result !== undefined) {
  // Use ${indicator.name}.result for your logic
  console.log('${indicator.displayName}:', ${indicator.name}.result);
}
`
  
  editor.executeEdits('insert-indicator', [{
    range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
    text: indicatorCode
  }])
  
  editor.focus()
}

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleDateString()
}

// Watchers
watch(() => props.strategy, (newStrategy) => {
  if (newStrategy && newStrategy !== currentStrategy.value) {
    if (hasUnsavedChanges.value) {
      const confirmed = confirm('You have unsaved changes. Loading a new strategy will discard them. Continue?')
      if (!confirmed) return
    }
    
    currentStrategy.value = newStrategy
    editorContent.value = newStrategy.code
    
    if (editor) {
      editor.setValue(newStrategy.code)
    }
    
    hasUnsavedChanges.value = false
    validationResult.value = null
  }
}, { immediate: true })

// Lifecycle
onMounted(async () => {
  await nextTick()
  await initializeEditor()
  
  // Load templates
  await strategyStore.loadTemplates()
  
  // Load current strategy if provided
  if (props.strategy) {
    editorContent.value = props.strategy.code
    if (editor) {
      editor.setValue(props.strategy.code)
    }
  }
})

onUnmounted(() => {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer)
  }
  
  if (editor) {
    editor.dispose()
  }
})
</script>

<style scoped>
/* Monaco editor will handle its own styling */
.strategy-editor {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

/* Custom scrollbar for side panel */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  @apply bg-gray-100 dark:bg-gray-800;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  @apply bg-gray-300 dark:bg-gray-600 rounded-full;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  @apply bg-gray-400 dark:bg-gray-500;
}
</style>