<script setup lang="ts">
import { computed } from 'vue'
import { useMainStore } from '@/stores/main'
import ThemeToggle from './ThemeToggle.vue'

interface Props {
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Dashboard'
})

const emit = defineEmits<{
  'toggle-sidebar': []
}>()

const mainStore = useMainStore()

const formattedTitle = computed(() => {
  if (typeof props.title === 'string') {
    return props.title.charAt(0).toUpperCase() + props.title.slice(1)
  }
  return 'Dashboard'
})

const currentTime = computed(() => {
  return new Date().toLocaleTimeString()
})
</script>

<template>
  <header class="h-16 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between px-6 sticky top-0 z-10 shadow-sm">
    <!-- Left Section -->
    <div class="flex items-center gap-4">
      <!-- Mobile Menu Toggle -->
      <button 
        @click="emit('toggle-sidebar')"
        class="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-all duration-200 hover:scale-105"
        aria-label="Toggle menu"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
      </button>
      
      <!-- Page Title -->
      <div class="">
        <h1 class="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">{{ formattedTitle }}</h1>
        <div class="flex items-center text-sm text-gray-500 dark:text-gray-400">
          <span>Trading Bot</span>
          <span class="mx-2">›</span>
          <span class="text-gray-700 dark:text-gray-300">{{ formattedTitle }}</span>
        </div>
      </div>
    </div>

    <!-- Right Section -->
    <div class="flex items-center gap-4">
      <!-- Server Status -->
      <div class="flex items-center gap-2 px-3 py-1 rounded-full text-sm" :class="mainStore.isServerHealthy ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'">
        <div class="w-2 h-2 rounded-full" :class="mainStore.isServerHealthy ? 'bg-green-500' : 'bg-red-500'"></div>
        <span>
          {{ mainStore.isServerHealthy ? 'Healthy' : 'Offline' }}
        </span>
      </div>

      <!-- Server Info -->
      <div v-if="mainStore.serverHealth" class="hidden lg:flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
        <div class="flex items-center gap-1">
          <span class="font-medium">Uptime:</span>
          <span>{{ mainStore.formatUptime(mainStore.serverHealth.uptime) }}</span>
        </div>
        <div class="flex items-center gap-1">
          <span class="font-medium">Memory:</span>
          <span>{{ mainStore.memoryUsagePercent }}%</span>
        </div>
      </div>

      <!-- Theme Toggle -->
      <ThemeToggle />

      <!-- Refresh Button -->
      <button 
        @click="mainStore.fetchServerHealth"
        class="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
        :disabled="mainStore.loading"
        title="Refresh server status"
      >
        <span class="text-lg" :class="{ 'animate-spin': mainStore.loading }">
          🔄
        </span>
      </button>

      <!-- Current Time -->
      <div class="hidden md:block text-sm text-gray-600 dark:text-gray-400">
        <span>{{ currentTime }}</span>
      </div>
    </div>
  </header>
</template>