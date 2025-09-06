<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useMainStore } from '@/stores/main'
import type { UserSettings, ExchangeConfig, NotificationSettings } from '@/types'

const mainStore = useMainStore()

// Settings categories
const activeTab = ref('general')
const tabs = [
  { id: 'general', name: 'General', icon: '⚙️' },
  { id: 'exchanges', name: 'Exchanges', icon: '🏦' },
  { id: 'notifications', name: 'Notifications', icon: '🔔' },
  { id: 'security', name: 'Security', icon: '🔒' },
  { id: 'advanced', name: 'Advanced', icon: '🔧' }
]

// General settings
const generalSettings = ref({
  theme: 'auto',
  language: 'en',
  timezone: 'UTC',
  currency: 'USD',
  dateFormat: 'MM/DD/YYYY',
  timeFormat: '24h',
  autoSave: true,
  confirmActions: true,
  showTooltips: true,
  compactMode: false
})

// Exchange settings
const exchangeConfigs = ref<ExchangeConfig[]>([
  {
    id: 'binance',
    name: 'Binance',
    enabled: false,
    apiKey: '',
    apiSecret: '',
    sandbox: true,
    testConnection: false,
    lastConnected: null,
    status: 'disconnected',
    supportedFeatures: ['spot', 'futures', 'margin'],
    rateLimits: {
      requests: 1200,
      orders: 10,
      weight: 1200
    }
  },
  {
    id: 'coinbase',
    name: 'Coinbase Pro',
    enabled: false,
    apiKey: '',
    apiSecret: '',
    passphrase: '',
    sandbox: true,
    testConnection: false,
    lastConnected: null,
    status: 'disconnected',
    supportedFeatures: ['spot'],
    rateLimits: {
      requests: 10,
      orders: 5,
      weight: 10
    }
  },
  {
    id: 'kraken',
    name: 'Kraken',
    enabled: false,
    apiKey: '',
    apiSecret: '',
    sandbox: true,
    testConnection: false,
    lastConnected: null,
    status: 'disconnected',
    supportedFeatures: ['spot', 'futures'],
    rateLimits: {
      requests: 15,
      orders: 60,
      weight: 15
    }
  }
])

// Notification settings
const notificationSettings = ref<NotificationSettings>({
  email: {
    enabled: true,
    address: '',
    trades: true,
    errors: true,
    dailyReports: true,
    weeklyReports: false
  },
  webhook: {
    enabled: false,
    url: '',
    trades: false,
    errors: true,
    dailyReports: false
  },
  browser: {
    enabled: true,
    trades: true,
    errors: true,
    warnings: true
  },
  telegram: {
    enabled: false,
    botToken: '',
    chatId: '',
    trades: false,
    errors: true,
    dailyReports: false
  }
})

// Security settings
const securitySettings = ref({
  twoFactorAuth: false,
  sessionTimeout: 30,
  ipWhitelist: '',
  apiKeyExpiry: 90,
  encryptLocalData: true,
  requirePasswordForTrades: false,
  maxDailyLoss: 1000,
  maxPositionSize: 10000
})

// Advanced settings
const advancedSettings = ref({
  logLevel: 'info',
  maxLogFiles: 10,
  backupFrequency: 'daily',
  dataRetention: 365,
  performanceMode: false,
  debugMode: false,
  experimentalFeatures: false,
  customIndicators: true,
  apiTimeout: 30,
  retryAttempts: 3,
  concurrentRequests: 5
})

// UI state
const saving = ref(false)
const testing = ref<string | null>(null)
const showApiKeyModal = ref(false)
const selectedExchange = ref<ExchangeConfig | null>(null)
const showConfirmReset = ref(false)
const resetCategory = ref<string | null>(null)

// Available options
const themeOptions = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'auto', label: 'Auto (System)' }
]

const languageOptions = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'it', label: 'Italiano' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'zh', label: '中文' }
]

const currencyOptions = [
  { value: 'USD', label: 'US Dollar (USD)' },
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'GBP', label: 'British Pound (GBP)' },
  { value: 'JPY', label: 'Japanese Yen (JPY)' },
  { value: 'BTC', label: 'Bitcoin (BTC)' },
  { value: 'ETH', label: 'Ethereum (ETH)' }
]

const timezoneOptions = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time' },
  { value: 'America/Chicago', label: 'Central Time' },
  { value: 'America/Denver', label: 'Mountain Time' },
  { value: 'America/Los_Angeles', label: 'Pacific Time' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Asia/Shanghai', label: 'Shanghai' }
]

const logLevelOptions = [
  { value: 'error', label: 'Error' },
  { value: 'warn', label: 'Warning' },
  { value: 'info', label: 'Info' },
  { value: 'debug', label: 'Debug' },
  { value: 'trace', label: 'Trace' }
]

// Computed properties
const hasUnsavedChanges = computed(() => {
  // In a real app, this would compare current settings with saved settings
  return false
})

const connectedExchanges = computed(() => {
  return exchangeConfigs.value.filter(ex => ex.status === 'connected').length
})

const totalExchanges = computed(() => {
  return exchangeConfigs.value.length
})

// Methods
const saveSettings = async () => {
  saving.value = true
  
  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const settings: UserSettings = {
      general: generalSettings.value,
      exchanges: exchangeConfigs.value,
      notifications: notificationSettings.value,
      security: securitySettings.value,
      advanced: advancedSettings.value
    }
    
    // In a real app, this would save to the backend
    localStorage.setItem('gekko-settings', JSON.stringify(settings))
    
    if (typeof window !== 'undefined' && (window as any).$notify) {
      (window as any).$notify.success('Settings Saved', 'Your settings have been saved successfully')
    }
    
  } catch (error) {
    console.error('Failed to save settings:', error)
    
    if (typeof window !== 'undefined' && (window as any).$notify) {
      (window as any).$notify.error('Save Failed', 'Could not save settings')
    }
  } finally {
    saving.value = false
  }
}

const loadSettings = async () => {
  try {
    const saved = localStorage.getItem('gekko-settings')
    if (saved) {
      const settings: UserSettings = JSON.parse(saved)
      
      if (settings.general) generalSettings.value = { ...generalSettings.value, ...settings.general }
      if (settings.exchanges) exchangeConfigs.value = settings.exchanges
      if (settings.notifications) notificationSettings.value = { ...notificationSettings.value, ...settings.notifications }
      if (settings.security) securitySettings.value = { ...securitySettings.value, ...settings.security }
      if (settings.advanced) advancedSettings.value = { ...advancedSettings.value, ...settings.advanced }
    }
  } catch (error) {
    console.error('Failed to load settings:', error)
  }
}

const testExchangeConnection = async (exchange: ExchangeConfig) => {
  if (!exchange.apiKey || !exchange.apiSecret) {
    if (typeof window !== 'undefined' && (window as any).$notify) {
      (window as any).$notify.error('Missing Credentials', 'Please enter API key and secret')
    }
    return
  }
  
  testing.value = exchange.id
  
  try {
    // Simulate API test
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Mock success/failure
    const success = Math.random() > 0.3
    
    if (success) {
      exchange.status = 'connected'
      exchange.lastConnected = new Date().toISOString()
      exchange.testConnection = true
      
      if (typeof window !== 'undefined' && (window as any).$notify) {
        (window as any).$notify.success('Connection Successful', `Connected to ${exchange.name}`)
      }
    } else {
      exchange.status = 'error'
      exchange.testConnection = false
      
      if (typeof window !== 'undefined' && (window as any).$notify) {
        (window as any).$notify.error('Connection Failed', `Could not connect to ${exchange.name}`)
      }
    }
    
  } catch (error) {
    console.error('Connection test failed:', error)
    exchange.status = 'error'
    exchange.testConnection = false
    
    if (typeof window !== 'undefined' && (window as any).$notify) {
      (window as any).$notify.error('Test Failed', 'Connection test failed')
    }
  } finally {
    testing.value = null
  }
}

const openApiKeyModal = (exchange: ExchangeConfig) => {
  selectedExchange.value = exchange
  showApiKeyModal.value = true
}

const closeApiKeyModal = () => {
  selectedExchange.value = null
  showApiKeyModal.value = false
}

const saveApiKeys = () => {
  if (selectedExchange.value) {
    // Keys are already bound to the exchange object
    closeApiKeyModal()
    
    if (typeof window !== 'undefined' && (window as any).$notify) {
      (window as any).$notify.success('API Keys Saved', 'Exchange credentials have been updated')
    }
  }
}

const resetSettings = (category: string) => {
  resetCategory.value = category
  showConfirmReset.value = true
}

const confirmReset = () => {
  if (resetCategory.value) {
    switch (resetCategory.value) {
      case 'general':
        generalSettings.value = {
          theme: 'auto',
          language: 'en',
          timezone: 'UTC',
          currency: 'USD',
          dateFormat: 'MM/DD/YYYY',
          timeFormat: '24h',
          autoSave: true,
          confirmActions: true,
          showTooltips: true,
          compactMode: false
        }
        break
      case 'notifications':
        notificationSettings.value = {
          email: {
            enabled: true,
            address: '',
            trades: true,
            errors: true,
            dailyReports: true,
            weeklyReports: false
          },
          webhook: {
            enabled: false,
            url: '',
            trades: false,
            errors: true,
            dailyReports: false
          },
          browser: {
            enabled: true,
            trades: true,
            errors: true,
            warnings: true
          },
          telegram: {
            enabled: false,
            botToken: '',
            chatId: '',
            trades: false,
            errors: true,
            dailyReports: false
          }
        }
        break
      case 'security':
        securitySettings.value = {
          twoFactorAuth: false,
          sessionTimeout: 30,
          ipWhitelist: '',
          apiKeyExpiry: 90,
          encryptLocalData: true,
          requirePasswordForTrades: false,
          maxDailyLoss: 1000,
          maxPositionSize: 10000
        }
        break
      case 'advanced':
        advancedSettings.value = {
          logLevel: 'info',
          maxLogFiles: 10,
          backupFrequency: 'daily',
          dataRetention: 365,
          performanceMode: false,
          debugMode: false,
          experimentalFeatures: false,
          customIndicators: true,
          apiTimeout: 30,
          retryAttempts: 3,
          concurrentRequests: 5
        }
        break
    }
    
    if (typeof window !== 'undefined' && (window as any).$notify) {
      (window as any).$notify.success('Settings Reset', `${resetCategory.value} settings have been reset to defaults`)
    }
  }
  
  showConfirmReset.value = false
  resetCategory.value = null
}

const cancelReset = () => {
  showConfirmReset.value = false
  resetCategory.value = null
}

const exportSettings = () => {
  const settings = {
    general: generalSettings.value,
    notifications: notificationSettings.value,
    security: { ...securitySettings.value, twoFactorAuth: false }, // Don't export sensitive settings
    advanced: advancedSettings.value
  }
  
  const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `gekko-settings-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  
  if (typeof window !== 'undefined' && (window as any).$notify) {
    (window as any).$notify.success('Settings Exported', 'Settings have been downloaded')
  }
}

const importSettings = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const settings = JSON.parse(e.target?.result as string)
      
      if (settings.general) generalSettings.value = { ...generalSettings.value, ...settings.general }
      if (settings.notifications) notificationSettings.value = { ...notificationSettings.value, ...settings.notifications }
      if (settings.security) securitySettings.value = { ...securitySettings.value, ...settings.security }
      if (settings.advanced) advancedSettings.value = { ...advancedSettings.value, ...settings.advanced }
      
      if (typeof window !== 'undefined' && (window as any).$notify) {
        (window as any).$notify.success('Settings Imported', 'Settings have been imported successfully')
      }
      
    } catch (error) {
      console.error('Failed to import settings:', error)
      
      if (typeof window !== 'undefined' && (window as any).$notify) {
        (window as any).$notify.error('Import Failed', 'Invalid settings file')
      }
    }
  }
  reader.readAsText(file)
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'connected': return 'text-green-600'
    case 'disconnected': return 'text-gray-600'
    case 'error': return 'text-red-600'
    case 'connecting': return 'text-yellow-600'
    default: return 'text-gray-600'
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'connected': return '✅'
    case 'disconnected': return '⚪'
    case 'error': return '❌'
    case 'connecting': return '🔄'
    default: return '⚪'
  }
}

const formatLastConnected = (timestamp: string | null) => {
  if (!timestamp) return 'Never'
  return new Date(timestamp).toLocaleString()
}

onMounted(() => {
  loadSettings()
})
</script>

<template>
  <div class="settings-view">
    <!-- Header -->
    <div class="settings-header">
      <div class="header-content">
        <h1 class="page-title">Settings</h1>
        <p class="page-subtitle">
          Configure your trading environment, exchanges, and preferences
        </p>
      </div>
      
      <div class="header-actions">
        <button @click="exportSettings" class="action-button secondary">
          📤 Export
        </button>
        
        <label class="action-button secondary">
          📥 Import
          <input 
            type="file" 
            accept=".json" 
            @change="importSettings" 
            style="display: none;"
          >
        </label>
        
        <button 
          @click="saveSettings" 
          :disabled="saving"
          class="action-button primary"
        >
          {{ saving ? '💾 Saving...' : '💾 Save All' }}
        </button>
      </div>
    </div>

    <div class="settings-layout">
      <!-- Sidebar Navigation -->
      <div class="settings-sidebar">
        <nav class="settings-nav">
          <button 
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            class="nav-item"
            :class="{ 'active': activeTab === tab.id }"
          >
            <span class="nav-icon">{{ tab.icon }}</span>
            <span class="nav-label">{{ tab.name }}</span>
          </button>
        </nav>
        
        <div class="sidebar-footer">
          <div class="connection-status">
            <div class="status-item">
              <span class="status-label">Exchanges:</span>
              <span class="status-value">{{ connectedExchanges }}/{{ totalExchanges }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Settings Content -->
      <div class="settings-content">
        <!-- General Settings -->
        <div v-if="activeTab === 'general'" class="settings-section">
          <div class="section-header">
            <h2 class="section-title">General Settings</h2>
            <button @click="resetSettings('general')" class="reset-button">
              🔄 Reset to Defaults
            </button>
          </div>
          
          <div class="settings-grid">
            <div class="setting-group">
              <h3 class="group-title">Appearance</h3>
              
              <div class="form-group">
                <label class="form-label">Theme</label>
                <select v-model="generalSettings.theme" class="form-select">
                  <option 
                    v-for="option in themeOptions"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </option>
                </select>
              </div>
              
              <div class="form-group">
                <label class="form-label">Language</label>
                <select v-model="generalSettings.language" class="form-select">
                  <option 
                    v-for="option in languageOptions"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </option>
                </select>
              </div>
              
              <div class="form-group">
                <label class="form-label">Compact Mode</label>
                <div class="toggle-group">
                  <input 
                    v-model="generalSettings.compactMode"
                    type="checkbox"
                    class="form-toggle"
                  >
                  <span class="toggle-description">Use compact layout to fit more content</span>
                </div>
              </div>
            </div>
            
            <div class="setting-group">
              <h3 class="group-title">Localization</h3>
              
              <div class="form-group">
                <label class="form-label">Timezone</label>
                <select v-model="generalSettings.timezone" class="form-select">
                  <option 
                    v-for="option in timezoneOptions"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </option>
                </select>
              </div>
              
              <div class="form-group">
                <label class="form-label">Currency</label>
                <select v-model="generalSettings.currency" class="form-select">
                  <option 
                    v-for="option in currencyOptions"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </option>
                </select>
              </div>
              
              <div class="form-group">
                <label class="form-label">Date Format</label>
                <select v-model="generalSettings.dateFormat" class="form-select">
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>
              
              <div class="form-group">
                <label class="form-label">Time Format</label>
                <select v-model="generalSettings.timeFormat" class="form-select">
                  <option value="12h">12 Hour</option>
                  <option value="24h">24 Hour</option>
                </select>
              </div>
            </div>
            
            <div class="setting-group">
              <h3 class="group-title">Behavior</h3>
              
              <div class="form-group">
                <label class="form-label">Auto Save</label>
                <div class="toggle-group">
                  <input 
                    v-model="generalSettings.autoSave"
                    type="checkbox"
                    class="form-toggle"
                  >
                  <span class="toggle-description">Automatically save changes</span>
                </div>
              </div>
              
              <div class="form-group">
                <label class="form-label">Confirm Actions</label>
                <div class="toggle-group">
                  <input 
                    v-model="generalSettings.confirmActions"
                    type="checkbox"
                    class="form-toggle"
                  >
                  <span class="toggle-description">Show confirmation dialogs for important actions</span>
                </div>
              </div>
              
              <div class="form-group">
                <label class="form-label">Show Tooltips</label>
                <div class="toggle-group">
                  <input 
                    v-model="generalSettings.showTooltips"
                    type="checkbox"
                    class="form-toggle"
                  >
                  <span class="toggle-description">Display helpful tooltips throughout the interface</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Exchange Settings -->
        <div v-if="activeTab === 'exchanges'" class="settings-section">
          <div class="section-header">
            <h2 class="section-title">Exchange Configuration</h2>
            <div class="section-info">
              <span class="info-text">{{ connectedExchanges }} of {{ totalExchanges }} exchanges connected</span>
            </div>
          </div>
          
          <div class="exchanges-grid">
            <div 
              v-for="exchange in exchangeConfigs"
              :key="exchange.id"
              class="exchange-card"
            >
              <div class="exchange-header">
                <div class="exchange-info">
                  <h3 class="exchange-name">{{ exchange.name }}</h3>
                  <div class="exchange-status">
                    <span class="status-icon">{{ getStatusIcon(exchange.status) }}</span>
                    <span class="status-text" :class="getStatusColor(exchange.status)">
                      {{ exchange.status }}
                    </span>
                  </div>
                </div>
                
                <div class="exchange-actions">
                  <button 
                    @click="openApiKeyModal(exchange)"
                    class="action-button small secondary"
                  >
                    🔑 Configure
                  </button>
                  
                  <button 
                    @click="testExchangeConnection(exchange)"
                    :disabled="testing === exchange.id || !exchange.apiKey"
                    class="action-button small primary"
                  >
                    {{ testing === exchange.id ? '🔄 Testing...' : '🔗 Test' }}
                  </button>
                </div>
              </div>
              
              <div class="exchange-details">
                <div class="detail-row">
                  <span class="detail-label">API Key:</span>
                  <span class="detail-value">
                    {{ exchange.apiKey ? '••••••••••••' + exchange.apiKey.slice(-4) : 'Not configured' }}
                  </span>
                </div>
                
                <div class="detail-row">
                  <span class="detail-label">Last Connected:</span>
                  <span class="detail-value">{{ formatLastConnected(exchange.lastConnected) }}</span>
                </div>
                
                <div class="detail-row">
                  <span class="detail-label">Sandbox Mode:</span>
                  <span class="detail-value">
                    <input 
                      v-model="exchange.sandbox"
                      type="checkbox"
                      class="form-toggle small"
                    >
                  </span>
                </div>
                
                <div class="detail-row">
                  <span class="detail-label">Enabled:</span>
                  <span class="detail-value">
                    <input 
                      v-model="exchange.enabled"
                      type="checkbox"
                      class="form-toggle small"
                    >
                  </span>
                </div>
              </div>
              
              <div class="exchange-features">
                <div class="features-label">Supported Features:</div>
                <div class="features-list">
                  <span 
                    v-for="feature in exchange.supportedFeatures"
                    :key="feature"
                    class="feature-tag"
                  >
                    {{ feature }}
                  </span>
                </div>
              </div>
              
              <div class="exchange-limits">
                <div class="limits-label">Rate Limits:</div>
                <div class="limits-grid">
                  <div class="limit-item">
                    <span class="limit-label">Requests/min:</span>
                    <span class="limit-value">{{ exchange.rateLimits.requests }}</span>
                  </div>
                  <div class="limit-item">
                    <span class="limit-label">Orders/sec:</span>
                    <span class="limit-value">{{ exchange.rateLimits.orders }}</span>
                  </div>
                  <div class="limit-item">
                    <span class="limit-label">Weight/min:</span>
                    <span class="limit-value">{{ exchange.rateLimits.weight }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Notification Settings -->
        <div v-if="activeTab === 'notifications'" class="settings-section">
          <div class="section-header">
            <h2 class="section-title">Notification Settings</h2>
            <button @click="resetSettings('notifications')" class="reset-button">
              🔄 Reset to Defaults
            </button>
          </div>
          
          <div class="settings-grid">
            <!-- Email Notifications -->
            <div class="setting-group">
              <h3 class="group-title">📧 Email Notifications</h3>
              
              <div class="form-group">
                <label class="form-label">Enable Email Notifications</label>
                <div class="toggle-group">
                  <input 
                    v-model="notificationSettings.email.enabled"
                    type="checkbox"
                    class="form-toggle"
                  >
                  <span class="toggle-description">Receive notifications via email</span>
                </div>
              </div>
              
              <div v-if="notificationSettings.email.enabled" class="form-group">
                <label class="form-label">Email Address</label>
                <input 
                  v-model="notificationSettings.email.address"
                  type="email"
                  placeholder="your@email.com"
                  class="form-input"
                >
              </div>
              
              <div v-if="notificationSettings.email.enabled" class="checkbox-group">
                <label class="checkbox-item">
                  <input 
                    v-model="notificationSettings.email.trades"
                    type="checkbox"
                    class="form-checkbox"
                  >
                  <span class="checkbox-label">Trade Executions</span>
                </label>
                
                <label class="checkbox-item">
                  <input 
                    v-model="notificationSettings.email.errors"
                    type="checkbox"
                    class="form-checkbox"
                  >
                  <span class="checkbox-label">Errors & Warnings</span>
                </label>
                
                <label class="checkbox-item">
                  <input 
                    v-model="notificationSettings.email.dailyReports"
                    type="checkbox"
                    class="form-checkbox"
                  >
                  <span class="checkbox-label">Daily Reports</span>
                </label>
                
                <label class="checkbox-item">
                  <input 
                    v-model="notificationSettings.email.weeklyReports"
                    type="checkbox"
                    class="form-checkbox"
                  >
                  <span class="checkbox-label">Weekly Reports</span>
                </label>
              </div>
            </div>
            
            <!-- Browser Notifications -->
            <div class="setting-group">
              <h3 class="group-title">🌐 Browser Notifications</h3>
              
              <div class="form-group">
                <label class="form-label">Enable Browser Notifications</label>
                <div class="toggle-group">
                  <input 
                    v-model="notificationSettings.browser.enabled"
                    type="checkbox"
                    class="form-toggle"
                  >
                  <span class="toggle-description">Show desktop notifications</span>
                </div>
              </div>
              
              <div v-if="notificationSettings.browser.enabled" class="checkbox-group">
                <label class="checkbox-item">
                  <input 
                    v-model="notificationSettings.browser.trades"
                    type="checkbox"
                    class="form-checkbox"
                  >
                  <span class="checkbox-label">Trade Executions</span>
                </label>
                
                <label class="checkbox-item">
                  <input 
                    v-model="notificationSettings.browser.errors"
                    type="checkbox"
                    class="form-checkbox"
                  >
                  <span class="checkbox-label">Errors & Warnings</span>
                </label>
                
                <label class="checkbox-item">
                  <input 
                    v-model="notificationSettings.browser.warnings"
                    type="checkbox"
                    class="form-checkbox"
                  >
                  <span class="checkbox-label">System Warnings</span>
                </label>
              </div>
            </div>
            
            <!-- Webhook Notifications -->
            <div class="setting-group">
              <h3 class="group-title">🔗 Webhook Notifications</h3>
              
              <div class="form-group">
                <label class="form-label">Enable Webhook Notifications</label>
                <div class="toggle-group">
                  <input 
                    v-model="notificationSettings.webhook.enabled"
                    type="checkbox"
                    class="form-toggle"
                  >
                  <span class="toggle-description">Send notifications to webhook URL</span>
                </div>
              </div>
              
              <div v-if="notificationSettings.webhook.enabled" class="form-group">
                <label class="form-label">Webhook URL</label>
                <input 
                  v-model="notificationSettings.webhook.url"
                  type="url"
                  placeholder="https://your-webhook-url.com"
                  class="form-input"
                >
              </div>
              
              <div v-if="notificationSettings.webhook.enabled" class="checkbox-group">
                <label class="checkbox-item">
                  <input 
                    v-model="notificationSettings.webhook.trades"
                    type="checkbox"
                    class="form-checkbox"
                  >
                  <span class="checkbox-label">Trade Executions</span>
                </label>
                
                <label class="checkbox-item">
                  <input 
                    v-model="notificationSettings.webhook.errors"
                    type="checkbox"
                    class="form-checkbox"
                  >
                  <span class="checkbox-label">Errors & Warnings</span>
                </label>
                
                <label class="checkbox-item">
                  <input 
                    v-model="notificationSettings.webhook.dailyReports"
                    type="checkbox"
                    class="form-checkbox"
                  >
                  <span class="checkbox-label">Daily Reports</span>
                </label>
              </div>
            </div>
            
            <!-- Telegram Notifications -->
            <div class="setting-group">
              <h3 class="group-title">📱 Telegram Notifications</h3>
              
              <div class="form-group">
                <label class="form-label">Enable Telegram Notifications</label>
                <div class="toggle-group">
                  <input 
                    v-model="notificationSettings.telegram.enabled"
                    type="checkbox"
                    class="form-toggle"
                  >
                  <span class="toggle-description">Send notifications via Telegram bot</span>
                </div>
              </div>
              
              <div v-if="notificationSettings.telegram.enabled" class="form-group">
                <label class="form-label">Bot Token</label>
                <input 
                  v-model="notificationSettings.telegram.botToken"
                  type="password"
                  placeholder="Your Telegram bot token"
                  class="form-input"
                >
              </div>
              
              <div v-if="notificationSettings.telegram.enabled" class="form-group">
                <label class="form-label">Chat ID</label>
                <input 
                  v-model="notificationSettings.telegram.chatId"
                  type="text"
                  placeholder="Your Telegram chat ID"
                  class="form-input"
                >
              </div>
              
              <div v-if="notificationSettings.telegram.enabled" class="checkbox-group">
                <label class="checkbox-item">
                  <input 
                    v-model="notificationSettings.telegram.trades"
                    type="checkbox"
                    class="form-checkbox"
                  >
                  <span class="checkbox-label">Trade Executions</span>
                </label>
                
                <label class="checkbox-item">
                  <input 
                    v-model="notificationSettings.telegram.errors"
                    type="checkbox"
                    class="form-checkbox"
                  >
                  <span class="checkbox-label">Errors & Warnings</span>
                </label>
                
                <label class="checkbox-item">
                  <input 
                    v-model="notificationSettings.telegram.dailyReports"
                    type="checkbox"
                    class="form-checkbox"
                  >
                  <span class="checkbox-label">Daily Reports</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- Security Settings -->
        <div v-if="activeTab === 'security'" class="settings-section">
          <div class="section-header">
            <h2 class="section-title">Security Settings</h2>
            <button @click="resetSettings('security')" class="reset-button">
              🔄 Reset to Defaults
            </button>
          </div>
          
          <div class="settings-grid">
            <div class="setting-group">
              <h3 class="group-title">Authentication</h3>
              
              <div class="form-group">
                <label class="form-label">Two-Factor Authentication</label>
                <div class="toggle-group">
                  <input 
                    v-model="securitySettings.twoFactorAuth"
                    type="checkbox"
                    class="form-toggle"
                  >
                  <span class="toggle-description">Enable 2FA for additional security</span>
                </div>
              </div>
              
              <div class="form-group">
                <label class="form-label">Session Timeout (minutes)</label>
                <input 
                  v-model.number="securitySettings.sessionTimeout"
                  type="number"
                  min="5"
                  max="480"
                  class="form-input"
                >
              </div>
              
              <div class="form-group">
                <label class="form-label">IP Whitelist</label>
                <textarea 
                  v-model="securitySettings.ipWhitelist"
                  placeholder="Enter IP addresses (one per line)"
                  rows="3"
                  class="form-textarea"
                ></textarea>
              </div>
            </div>
            
            <div class="setting-group">
              <h3 class="group-title">API Security</h3>
              
              <div class="form-group">
                <label class="form-label">API Key Expiry (days)</label>
                <input 
                  v-model.number="securitySettings.apiKeyExpiry"
                  type="number"
                  min="1"
                  max="365"
                  class="form-input"
                >
              </div>
              
              <div class="form-group">
                <label class="form-label">Encrypt Local Data</label>
                <div class="toggle-group">
                  <input 
                    v-model="securitySettings.encryptLocalData"
                    type="checkbox"
                    class="form-toggle"
                  >
                  <span class="toggle-description">Encrypt sensitive data stored locally</span>
                </div>
              </div>
            </div>
            
            <div class="setting-group">
              <h3 class="group-title">Trading Security</h3>
              
              <div class="form-group">
                <label class="form-label">Require Password for Trades</label>
                <div class="toggle-group">
                  <input 
                    v-model="securitySettings.requirePasswordForTrades"
                    type="checkbox"
                    class="form-toggle"
                  >
                  <span class="toggle-description">Require password confirmation for live trades</span>
                </div>
              </div>
              
              <div class="form-group">
                <label class="form-label">Max Daily Loss ($)</label>
                <input 
                  v-model.number="securitySettings.maxDailyLoss"
                  type="number"
                  min="0"
                  step="100"
                  class="form-input"
                >
              </div>
              
              <div class="form-group">
                <label class="form-label">Max Position Size ($)</label>
                <input 
                  v-model.number="securitySettings.maxPositionSize"
                  type="number"
                  min="0"
                  step="1000"
                  class="form-input"
                >
              </div>
            </div>
          </div>
        </div>

        <!-- Advanced Settings -->
        <div v-if="activeTab === 'advanced'" class="settings-section">
          <div class="section-header">
            <h2 class="section-title">Advanced Settings</h2>
            <button @click="resetSettings('advanced')" class="reset-button">
              🔄 Reset to Defaults
            </button>
          </div>
          
          <div class="settings-grid">
            <div class="setting-group">
              <h3 class="group-title">Logging & Debugging</h3>
              
              <div class="form-group">
                <label class="form-label">Log Level</label>
                <select v-model="advancedSettings.logLevel" class="form-select">
                  <option 
                    v-for="option in logLevelOptions"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </option>
                </select>
              </div>
              
              <div class="form-group">
                <label class="form-label">Max Log Files</label>
                <input 
                  v-model.number="advancedSettings.maxLogFiles"
                  type="number"
                  min="1"
                  max="100"
                  class="form-input"
                >
              </div>
              
              <div class="form-group">
                <label class="form-label">Debug Mode</label>
                <div class="toggle-group">
                  <input 
                    v-model="advancedSettings.debugMode"
                    type="checkbox"
                    class="form-toggle"
                  >
                  <span class="toggle-description">Enable detailed debugging information</span>
                </div>
              </div>
            </div>
            
            <div class="setting-group">
              <h3 class="group-title">Data Management</h3>
              
              <div class="form-group">
                <label class="form-label">Backup Frequency</label>
                <select v-model="advancedSettings.backupFrequency" class="form-select">
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              
              <div class="form-group">
                <label class="form-label">Data Retention (days)</label>
                <input 
                  v-model.number="advancedSettings.dataRetention"
                  type="number"
                  min="30"
                  max="3650"
                  class="form-input"
                >
              </div>
            </div>
            
            <div class="setting-group">
              <h3 class="group-title">Performance</h3>
              
              <div class="form-group">
                <label class="form-label">Performance Mode</label>
                <div class="toggle-group">
                  <input 
                    v-model="advancedSettings.performanceMode"
                    type="checkbox"
                    class="form-toggle"
                  >
                  <span class="toggle-description">Optimize for performance over features</span>
                </div>
              </div>
              
              <div class="form-group">
                <label class="form-label">API Timeout (seconds)</label>
                <input 
                  v-model.number="advancedSettings.apiTimeout"
                  type="number"
                  min="5"
                  max="120"
                  class="form-input"
                >
              </div>
              
              <div class="form-group">
                <label class="form-label">Retry Attempts</label>
                <input 
                  v-model.number="advancedSettings.retryAttempts"
                  type="number"
                  min="0"
                  max="10"
                  class="form-input"
                >
              </div>
              
              <div class="form-group">
                <label class="form-label">Concurrent Requests</label>
                <input 
                  v-model.number="advancedSettings.concurrentRequests"
                  type="number"
                  min="1"
                  max="20"
                  class="form-input"
                >
              </div>
            </div>
            
            <div class="setting-group">
              <h3 class="group-title">Features</h3>
              
              <div class="form-group">
                <label class="form-label">Experimental Features</label>
                <div class="toggle-group">
                  <input 
                    v-model="advancedSettings.experimentalFeatures"
                    type="checkbox"
                    class="form-toggle"
                  >
                  <span class="toggle-description">Enable experimental features (may be unstable)</span>
                </div>
              </div>
              
              <div class="form-group">
                <label class="form-label">Custom Indicators</label>
                <div class="toggle-group">
                  <input 
                    v-model="advancedSettings.customIndicators"
                    type="checkbox"
                    class="form-toggle"
                  >
                  <span class="toggle-description">Allow loading custom indicator plugins</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- API Key Modal -->
    <div v-if="showApiKeyModal" class="modal-overlay" @click="closeApiKeyModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">Configure {{ selectedExchange?.name }} API</h3>
          <button @click="closeApiKeyModal" class="modal-close">×</button>
        </div>
        
        <div class="modal-body">
          <div v-if="selectedExchange" class="api-config">
            <div class="warning-banner">
              <div class="warning-icon">⚠️</div>
              <div class="warning-text">
                <p><strong>Security Notice:</strong></p>
                <p>Never share your API keys. Use read-only keys when possible and enable IP restrictions on your exchange account.</p>
              </div>
            </div>
            
            <div class="form-group">
              <label class="form-label">API Key</label>
              <input 
                v-model="selectedExchange.apiKey"
                type="password"
                placeholder="Enter your API key"
                class="form-input"
              >
            </div>
            
            <div class="form-group">
              <label class="form-label">API Secret</label>
              <input 
                v-model="selectedExchange.apiSecret"
                type="password"
                placeholder="Enter your API secret"
                class="form-input"
              >
            </div>
            
            <div v-if="selectedExchange.id === 'coinbase'" class="form-group">
              <label class="form-label">Passphrase</label>
              <input 
                v-model="selectedExchange.passphrase"
                type="password"
                placeholder="Enter your passphrase"
                class="form-input"
              >
            </div>
            
            <div class="form-group">
              <label class="form-label">Sandbox Mode</label>
              <div class="toggle-group">
                <input 
                  v-model="selectedExchange.sandbox"
                  type="checkbox"
                  class="form-toggle"
                >
                <span class="toggle-description">Use sandbox/testnet environment</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button @click="closeApiKeyModal" class="modal-button secondary">
            Cancel
          </button>
          <button @click="saveApiKeys" class="modal-button primary">
            Save API Keys
          </button>
        </div>
      </div>
    </div>

    <!-- Reset Confirmation Modal -->
    <div v-if="showConfirmReset" class="modal-overlay" @click="cancelReset">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">Reset Settings</h3>
          <button @click="cancelReset" class="modal-close">×</button>
        </div>
        
        <div class="modal-body">
          <p>Are you sure you want to reset all {{ resetCategory }} settings to their default values?</p>
          <p class="warning-text">This action cannot be undone.</p>
        </div>
        
        <div class="modal-footer">
          <button @click="cancelReset" class="modal-button secondary">
            Cancel
          </button>
          <button @click="confirmReset" class="modal-button danger">
            Reset Settings
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-view {
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
  min-height: calc(100vh - 4rem);
}

/* Header */
.settings-header {
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
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.action-button.primary {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
}

.action-button.primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  transform: translateY(-1px);
}

.action-button.primary:disabled {
  background-color: #d1d5db;
  color: #9ca3af;
  cursor: not-allowed;
  transform: none;
}

.action-button.secondary {
  background-color: #f1f5f9;
  color: #475569;
  border: 1px solid #cbd5e1;
}

.action-button.secondary:hover {
  background-color: #e2e8f0;
  border-color: #94a3b8;
}

.action-button.small {
  padding: 0.5rem 1rem;
  font-size: 0.75rem;
}

/* Layout */
.settings-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 2rem;
}

/* Sidebar */
.settings-sidebar {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  overflow: hidden;
  height: fit-content;
  position: sticky;
  top: 6rem;
}

.settings-nav {
  padding: 1rem;
}

.nav-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: none;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 0.25rem;
}

.nav-item:hover {
  background-color: #f8fafc;
  color: #374151;
}

.nav-item.active {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
}

.nav-icon {
  font-size: 1rem;
  flex-shrink: 0;
}

.nav-label {
  flex: 1;
  text-align: left;
}

.sidebar-footer {
  padding: 1rem;
  border-top: 1px solid #e2e8f0;
  background-color: #f8fafc;
}

.connection-status {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-label {
  font-size: 0.75rem;
  color: #64748b;
  font-weight: 500;
}

.status-value {
  font-size: 0.75rem;
  color: #1e293b;
  font-weight: 600;
}

/* Content */
.settings-content {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  overflow: hidden;
}

.settings-section {
  padding: 2rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e2e8f0;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.section-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.info-text {
  font-size: 0.875rem;
  color: #64748b;
}

.reset-button {
  padding: 0.5rem 1rem;
  background-color: #f1f5f9;
  color: #475569;
  border: 1px solid #cbd5e1;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.reset-button:hover {
  background-color: #e2e8f0;
  border-color: #94a3b8;
}

/* Settings Grid */
.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 2rem;
}

.setting-group {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  padding: 1.5rem;
}

.group-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 1.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Form Elements */
.form-group {
  margin-bottom: 1.5rem;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  background-color: white;
  transition: all 0.2s ease;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.form-toggle {
  width: 44px;
  height: 24px;
  background-color: #d1d5db;
  border: none;
  border-radius: 12px;
  position: relative;
  cursor: pointer;
  transition: all 0.2s ease;
  appearance: none;
}

.form-toggle:checked {
  background-color: #3b82f6;
}

.form-toggle::before {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background-color: white;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.form-toggle:checked::before {
  transform: translateX(20px);
}

.form-toggle.small {
  width: 36px;
  height: 20px;
  border-radius: 10px;
}

.form-toggle.small::before {
  width: 16px;
  height: 16px;
}

.form-toggle.small:checked::before {
  transform: translateX(16px);
}

.toggle-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.toggle-description {
  font-size: 0.875rem;
  color: #64748b;
  flex: 1;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
}

.form-checkbox {
  width: 16px;
  height: 16px;
  border: 1px solid #d1d5db;
  border-radius: 0.25rem;
  cursor: pointer;
}

.checkbox-label {
  font-size: 0.875rem;
  color: #374151;
  cursor: pointer;
}

/* Exchange Cards */
.exchanges-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.5rem;
}

.exchange-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 1.5rem;
  transition: all 0.2s ease;
}

.exchange-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.exchange-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.exchange-info {
  flex: 1;
}

.exchange-name {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 0.5rem 0;
}

.exchange-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-icon {
  font-size: 0.875rem;
}

.status-text {
  font-size: 0.875rem;
  font-weight: 500;
  text-transform: capitalize;
}

.exchange-actions {
  display: flex;
  gap: 0.5rem;
}

.exchange-details {
  margin-bottom: 1rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f1f5f9;
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-label {
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 500;
}

.detail-value {
  font-size: 0.875rem;
  color: #1e293b;
  font-weight: 500;
}

.exchange-features {
  margin-bottom: 1rem;
}

.features-label {
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.features-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.feature-tag {
  padding: 0.25rem 0.5rem;
  background-color: #e0f2fe;
  color: #0369a1;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.exchange-limits {
  border-top: 1px solid #f1f5f9;
  padding-top: 1rem;
}

.limits-label {
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.limits-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}

.limit-item {
  text-align: center;
}

.limit-label {
  display: block;
  font-size: 0.75rem;
  color: #64748b;
  margin-bottom: 0.25rem;
}

.limit-value {
  display: block;
  font-size: 0.875rem;
  color: #1e293b;
  font-weight: 600;
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
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 0.75rem;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 1.5rem 0 1.5rem;
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
  line-height: 1;
}

.modal-close:hover {
  color: #374151;
}

.modal-body {
  padding: 1.5rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 0 1.5rem 1.5rem 1.5rem;
}

.modal-button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.modal-button.primary {
  background-color: #3b82f6;
  color: white;
}

.modal-button.primary:hover {
  background-color: #2563eb;
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
  background-color: #ef4444;
  color: white;
}

.modal-button.danger:hover {
  background-color: #dc2626;
}

/* API Config */
.api-config {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.warning-banner {
  display: flex;
  gap: 0.75rem;
  padding: 1rem;
  background-color: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 0.5rem;
}

.warning-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.warning-text {
  flex: 1;
}

.warning-text p {
  margin: 0 0 0.5rem 0;
  font-size: 0.875rem;
  color: #92400e;
}

.warning-text p:last-child {
  margin-bottom: 0;
}

.warning-text strong {
  font-weight: 600;
}

/* Dark Mode */
@media (prefers-color-scheme: dark) {
  .settings-view {
    background-color: #0f172a;
    color: #e2e8f0;
  }
  
  .page-title {
    color: #f1f5f9;
  }
  
  .page-subtitle {
    color: #94a3b8;
  }
  
  .settings-sidebar,
  .settings-content,
  .exchange-card,
  .modal-content {
    background-color: #1e293b;
    border-color: #334155;
  }
  
  .setting-group {
    background-color: #0f172a;
    border-color: #334155;
  }
  
  .section-title,
  .group-title,
  .exchange-name,
  .modal-title {
    color: #f1f5f9;
  }
  
  .form-input,
  .form-select,
  .form-textarea {
    background-color: #0f172a;
    border-color: #475569;
    color: #e2e8f0;
  }
  
  .form-input:focus,
  .form-select:focus,
  .form-textarea:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
  }
  
  .detail-row {
    border-color: #334155;
  }
  
  .detail-label,
  .features-label,
  .limits-label {
    color: #94a3b8;
  }
  
  .detail-value,
  .limit-value {
    color: #f1f5f9;
  }
}

/* Responsive */
@media (max-width: 1024px) {
  .settings-layout {
    grid-template-columns: 1fr;
  }
  
  .settings-sidebar {
    position: static;
  }
  
  .settings-nav {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 0.5rem;
  }
  
  .nav-item {
    margin-bottom: 0;
  }
}

@media (max-width: 768px) {
  .settings-view {
    padding: 1rem;
  }
  
  .settings-header {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }
  
  .header-actions {
    justify-content: stretch;
  }
  
  .action-button {
    flex: 1;
    justify-content: center;
  }
  
  .settings-grid,
  .exchanges-grid {
    grid-template-columns: 1fr;
  }
  
  .exchange-header {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }
  
  .exchange-actions {
    justify-content: stretch;
  }
  
  .limits-grid {
    grid-template-columns: 1fr;
  }
  
  .modal-content {
    margin: 1rem;
    max-width: none;
  }
}
</style>