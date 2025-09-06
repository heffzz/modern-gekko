import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ServerHealth, Theme } from '@/types'
import { apiService } from '@/services/api'
import { websocketService } from '@/services/websocket'

export const useMainStore = defineStore('main', () => {
  // State
  const loading = ref(false)
  const serverHealth = ref<ServerHealth | null>(null)
  const theme = ref<Theme>({
    mode: 'dark',
    primary: '#3b82f6',
    background: '#0f172a',
    surface: '#1e293b',
    text: '#f8fafc',
  })
  const isConnected = ref(false)
  const notifications = ref<Array<{
    id: string
    type: 'success' | 'error' | 'warning' | 'info'
    title: string
    message: string
    timestamp: Date
  }>>([])

  // Getters
  const isDarkMode = computed(() => theme.value.mode === 'dark')
  const isServerHealthy = computed(() => serverHealth.value?.status === 'healthy')
  const isWebSocketConnected = computed(() => isConnected.value)
  const memoryUsagePercent = computed(() => {
    if (!serverHealth.value) return 0
    return Math.round((serverHealth.value.memory.used / serverHealth.value.memory.total) * 100)
  })

  // Actions
  async function fetchServerHealth() {
    try {
      loading.value = true
      serverHealth.value = await apiService.getHealth()
    } catch (error) {
      console.error('Failed to fetch server health:', error)
      addNotification({
        type: 'error',
        title: 'Connection Error',
        message: 'Failed to connect to server',
      })
    } finally {
      loading.value = false
    }
  }

  function toggleTheme() {
    theme.value.mode = theme.value.mode === 'light' ? 'dark' : 'light'
    
    if (theme.value.mode === 'dark') {
      theme.value.background = '#0f172a'
      theme.value.surface = '#1e293b'
      theme.value.text = '#f8fafc'
    } else {
      theme.value.background = '#ffffff'
      theme.value.surface = '#f8fafc'
      theme.value.text = '#0f172a'
    }
    
    // Save to localStorage
    localStorage.setItem('theme', JSON.stringify(theme.value))
    
    // Apply to document
    document.documentElement.classList.toggle('dark', theme.value.mode === 'dark')
  }

  function loadTheme() {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) {
      try {
        theme.value = JSON.parse(savedTheme)
      } catch (error) {
        console.error('Failed to parse saved theme:', error)
      }
    }
    
    // Apply to document
    document.documentElement.classList.toggle('dark', theme.value.mode === 'dark')
  }

  function connectWebSocket() {
    websocketService.connect()
    isConnected.value = websocketService.isConnected
    
    // Monitor connection status
    const checkConnection = () => {
      isConnected.value = websocketService.isConnected
    }
    
    setInterval(checkConnection, 5000)
  }

  function addNotification(notification: Omit<typeof notifications.value[0], 'id' | 'timestamp'>) {
    const id = Math.random().toString(36).substr(2, 9)
    notifications.value.push({
      ...notification,
      id,
      timestamp: new Date(),
    })
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      removeNotification(id)
    }, 5000)
  }

  function removeNotification(id: string) {
    const index = notifications.value.findIndex(n => n.id === id)
    if (index > -1) {
      notifications.value.splice(index, 1)
    }
  }

  function formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else {
      return `${minutes}m`
    }
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Initialize
  function initialize() {
    loadTheme()
    fetchServerHealth()
    connectWebSocket()
  }

  return {
    // State
    loading,
    serverHealth,
    theme,
    isConnected,
    notifications,
    
    // Getters
    isDarkMode,
    isServerHealthy,
    isWebSocketConnected,
    memoryUsagePercent,
    
    // Actions
    fetchServerHealth,
    toggleTheme,
    loadTheme,
    connectWebSocket,
    addNotification,
    removeNotification,
    formatUptime,
    formatBytes,
    initialize,
  }
})