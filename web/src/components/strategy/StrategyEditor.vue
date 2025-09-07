<template>
  <div class="strategy-editor h-full flex flex-col bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-slate-900">
    <!-- Enhanced Header with Gekko-inspired design -->
    <div class="flex-shrink-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-700/50 shadow-sm">
      <div class="px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-6">
            <div class="flex items-center space-x-3">
              <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
              </div>
              <div>
                <h1 class="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                  Strategy Editor
                </h1>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  Build and test your trading strategies
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex-1 flex min-h-0 bg-white/50 dark:bg-gray-900/50">
      <!-- Editor Panel -->
      <div class="flex-1 flex flex-col bg-white dark:bg-gray-900">
        <!-- Editor Container -->
        <div ref="editorContainer" class="flex-1 relative">
          <!-- Loading Overlay -->
          <div v-if="editorLoading" class="absolute inset-0 bg-white/80 dark:bg-gray-900/80 flex items-center justify-center z-10">
            <div class="flex items-center space-x-3">
              <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              <span class="text-sm text-gray-600 dark:text-gray-400">Loading editor...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import loader from '@monaco-editor/loader'
import type * as Monaco from 'monaco-editor'

// Refs
const editorContainer = ref<HTMLElement>()
let editor: Monaco.editor.IStandaloneCodeEditor | null = null
let monaco: typeof Monaco | null = null

// State
const editorLoading = ref(true)
const editorContent = ref(`// Sample Strategy
class SampleStrategy {
  init() {
    // Initialize your strategy
    console.log('Strategy initialized');
  }

  update(candle) {
    // Update indicators with new candle data
    console.log('New candle:', candle);
  }

  check(candle) {
    // Check for trading signals
    if (/* your condition */) {
      this.advice('buy');
    } else if (/* your condition */) {
      this.advice('sell');
    }
  }

  onTrade(trade) {
    // Handle trade execution
    console.log('Trade executed:', trade);
  }
}`)

// Monaco Editor setup
const initializeEditor = async () => {
  if (!editorContainer.value) return
  
  try {
    // Load Monaco Editor
    monaco = await loader.init()
    
    // Create editor
    editor = monaco.editor.create(editorContainer.value, {
      value: editorContent.value,
      language: 'javascript',
      theme: 'vs-dark',
      fontSize: 14,
      wordWrap: 'on',
      minimap: { enabled: true },
      automaticLayout: true,
      scrollBeyondLastLine: false,
      renderWhitespace: 'selection',
      lineNumbers: 'on',
      folding: true,
      bracketMatching: 'always'
    })
    
    editorLoading.value = false
  } catch (error) {
    console.error('Failed to initialize Monaco Editor:', error)
    editorLoading.value = false
  }
}

// Lifecycle
onMounted(() => {
  initializeEditor()
})

onUnmounted(() => {
  if (editor) {
    editor.dispose()
  }
})
</script>

<style scoped>
.strategy-editor {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}
</style>