<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
  persistent?: boolean
  actions?: Array<{
    label: string
    action: () => void
    style?: 'primary' | 'secondary'
  }>
}

const notifications = ref<Notification[]>([])
const maxNotifications = 5

// Auto-remove timer refs
const timers = new Map<string, NodeJS.Timeout>()

const visibleNotifications = computed(() => {
  return notifications.value.slice(-maxNotifications)
})

const addNotification = (notification: Omit<Notification, 'id'>) => {
  const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  const newNotification: Notification = {
    id,
    duration: 5000, // Default 5 seconds
    ...notification
  }
  
  notifications.value.push(newNotification)
  
  // Auto-remove after duration (unless persistent)
  if (!newNotification.persistent && newNotification.duration && newNotification.duration > 0) {
    const timer = setTimeout(() => {
      removeNotification(id)
    }, newNotification.duration)
    timers.set(id, timer)
  }
  
  // Remove oldest if exceeding max
  if (notifications.value.length > maxNotifications) {
    const oldestId = notifications.value[0].id
    removeNotification(oldestId)
  }
}

const removeNotification = (id: string) => {
  const index = notifications.value.findIndex(n => n.id === id)
  if (index > -1) {
    notifications.value.splice(index, 1)
    
    // Clear timer if exists
    const timer = timers.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.delete(id)
    }
  }
}

const clearAll = () => {
  // Clear all timers
  timers.forEach(timer => clearTimeout(timer))
  timers.clear()
  
  // Clear notifications
  notifications.value = []
}

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'success': return '✅'
    case 'error': return '❌'
    case 'warning': return '⚠️'
    case 'info': return 'ℹ️'
    default: return 'ℹ️'
  }
}

const getNotificationClasses = (type: Notification['type']) => {
  const baseClasses = 'notification-item'
  switch (type) {
    case 'success': return `${baseClasses} notification-success`
    case 'error': return `${baseClasses} notification-error`
    case 'warning': return `${baseClasses} notification-warning`
    case 'info': return `${baseClasses} notification-info`
    default: return `${baseClasses} notification-info`
  }
}

// Global notification methods
const showSuccess = (title: string, message?: string, options?: Partial<Notification>) => {
  addNotification({ type: 'success', title, message, ...options })
}

const showError = (title: string, message?: string, options?: Partial<Notification>) => {
  addNotification({ type: 'error', title, message, duration: 8000, ...options })
}

const showWarning = (title: string, message?: string, options?: Partial<Notification>) => {
  addNotification({ type: 'warning', title, message, duration: 6000, ...options })
}

const showInfo = (title: string, message?: string, options?: Partial<Notification>) => {
  addNotification({ type: 'info', title, message, ...options })
}

// Expose methods globally
if (typeof window !== 'undefined') {
  (window as any).$notify = {
    success: showSuccess,
    error: showError,
    warning: showWarning,
    info: showInfo,
    add: addNotification,
    remove: removeNotification,
    clear: clearAll
  }
}

// Cleanup on unmount
onUnmounted(() => {
  timers.forEach(timer => clearTimeout(timer))
  timers.clear()
})

// Listen for global events
onMounted(() => {
  // Listen for API errors
  window.addEventListener('api-error', (event: any) => {
    showError('API Error', event.detail.message)
  })
  
  // Listen for WebSocket events
  window.addEventListener('websocket-connected', () => {
    showSuccess('Connected', 'Real-time data connection established')
  })
  
  window.addEventListener('websocket-disconnected', () => {
    showWarning('Disconnected', 'Real-time data connection lost')
  })
  
  window.addEventListener('websocket-error', (event: any) => {
    showError('Connection Error', event.detail.message)
  })
})
</script>

<template>
  <Teleport to="body">
    <div class="notification-container">
      <TransitionGroup name="notification" tag="div" class="notification-list">
        <div
          v-for="notification in visibleNotifications"
          :key="notification.id"
          :class="getNotificationClasses(notification.type)"
        >
          <!-- Notification Content -->
          <div class="notification-content">
            <div class="notification-header">
              <span class="notification-icon">
                {{ getNotificationIcon(notification.type) }}
              </span>
              <h4 class="notification-title">{{ notification.title }}</h4>
              <button 
                @click="removeNotification(notification.id)"
                class="notification-close"
                aria-label="Close notification"
              >
                ×
              </button>
            </div>
            
            <p v-if="notification.message" class="notification-message">
              {{ notification.message }}
            </p>
            
            <!-- Actions -->
            <div v-if="notification.actions?.length" class="notification-actions">
              <button
                v-for="(action, index) in notification.actions"
                :key="index"
                @click="action.action(); removeNotification(notification.id)"
                :class="[
                  'notification-action',
                  action.style === 'primary' ? 'action-primary' : 'action-secondary'
                ]"
              >
                {{ action.label }}
              </button>
            </div>
          </div>
          
          <!-- Progress Bar (for timed notifications) -->
          <div 
            v-if="!notification.persistent && notification.duration"
            class="notification-progress"
            :style="{ animationDuration: `${notification.duration}ms` }"
          ></div>
        </div>
      </TransitionGroup>
      
      <!-- Clear All Button -->
      <div v-if="notifications.length > 1" class="notification-controls">
        <button @click="clearAll" class="clear-all-button">
          Clear All ({{ notifications.length }})
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.notification-container {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 9999;
  pointer-events: none;
  max-width: 400px;
  width: 100%;
}

.notification-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.notification-item {
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  border: 1px solid #e2e8f0;
  overflow: hidden;
  pointer-events: auto;
  position: relative;
  max-width: 100%;
}

.notification-success {
  border-left: 4px solid #10b981;
}

.notification-error {
  border-left: 4px solid #ef4444;
}

.notification-warning {
  border-left: 4px solid #f59e0b;
}

.notification-info {
  border-left: 4px solid #3b82f6;
}

.notification-content {
  padding: 1rem;
}

.notification-header {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.notification-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.notification-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
  flex: 1;
  line-height: 1.4;
}

.notification-close {
  background: none;
  border: none;
  font-size: 1.25rem;
  color: #6b7280;
  cursor: pointer;
  padding: 0;
  width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.25rem;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.notification-close:hover {
  background-color: #f3f4f6;
  color: #374151;
}

.notification-message {
  font-size: 0.8rem;
  color: #6b7280;
  margin: 0;
  line-height: 1.5;
  margin-left: 2rem;
}

.notification-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
  margin-left: 2rem;
}

.notification-action {
  padding: 0.375rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.action-primary {
  background-color: #3b82f6;
  color: white;
}

.action-primary:hover {
  background-color: #2563eb;
}

.action-secondary {
  background-color: #f3f4f6;
  color: #374151;
  border-color: #d1d5db;
}

.action-secondary:hover {
  background-color: #e5e7eb;
}

.notification-progress {
  height: 3px;
  background: linear-gradient(90deg, #3b82f6, #1d4ed8);
  animation: progress-shrink linear;
  transform-origin: left;
}

@keyframes progress-shrink {
  from {
    transform: scaleX(1);
  }
  to {
    transform: scaleX(0);
  }
}

.notification-controls {
  margin-top: 0.75rem;
  pointer-events: auto;
}

.clear-all-button {
  width: 100%;
  padding: 0.5rem;
  background-color: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-all-button:hover {
  background-color: #e5e7eb;
}

/* Transitions */
.notification-enter-active {
  transition: all 0.3s ease-out;
}

.notification-leave-active {
  transition: all 0.3s ease-in;
}

.notification-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.notification-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

.notification-move {
  transition: transform 0.3s ease;
}

/* Responsive */
@media (max-width: 640px) {
  .notification-container {
    top: 0.5rem;
    right: 0.5rem;
    left: 0.5rem;
    max-width: none;
  }
  
  .notification-item {
    border-radius: 0.5rem;
  }
  
  .notification-content {
    padding: 0.75rem;
  }
  
  .notification-message {
    margin-left: 1.75rem;
  }
  
  .notification-actions {
    margin-left: 1.75rem;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .notification-item {
    background: #1f2937;
    border-color: #374151;
  }
  
  .notification-title {
    color: #f9fafb;
  }
  
  .notification-message {
    color: #d1d5db;
  }
  
  .notification-close {
    color: #9ca3af;
  }
  
  .notification-close:hover {
    background-color: #374151;
    color: #f3f4f6;
  }
  
  .action-secondary {
    background-color: #374151;
    color: #f3f4f6;
    border-color: #4b5563;
  }
  
  .action-secondary:hover {
    background-color: #4b5563;
  }
  
  .clear-all-button {
    background-color: #374151;
    border-color: #4b5563;
    color: #f3f4f6;
  }
  
  .clear-all-button:hover {
    background-color: #4b5563;
  }
}
</style>