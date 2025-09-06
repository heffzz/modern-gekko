import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface Notification {
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
  createdAt: Date
}

export const useNotificationStore = defineStore('notifications', () => {
  // State
  const notifications = ref<Notification[]>([])
  const maxNotifications = ref(5)
  const defaultDuration = ref(5000)

  // Computed
  const activeNotifications = computed(() => 
    notifications.value.filter(n => !n.persistent || Date.now() - n.createdAt.getTime() < (n.duration || defaultDuration.value))
  )

  const errorNotifications = computed(() => 
    notifications.value.filter(n => n.type === 'error')
  )

  const hasErrors = computed(() => errorNotifications.value.length > 0)

  // Actions
  function generateId(): string {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  function add(notification: Omit<Notification, 'id' | 'createdAt'>): string {
    const id = generateId()
    const newNotification: Notification = {
      ...notification,
      id,
      createdAt: new Date(),
      duration: notification.duration || defaultDuration.value
    }

    notifications.value.unshift(newNotification)

    // Limit number of notifications
    if (notifications.value.length > maxNotifications.value) {
      notifications.value = notifications.value.slice(0, maxNotifications.value)
    }

    // Auto-remove non-persistent notifications
    if (!newNotification.persistent) {
      setTimeout(() => {
        remove(id)
      }, newNotification.duration)
    }

    return id
  }

  function remove(id: string): void {
    const index = notifications.value.findIndex(n => n.id === id)
    if (index > -1) {
      notifications.value.splice(index, 1)
    }
  }

  function clear(): void {
    notifications.value = []
  }

  function clearByType(type: Notification['type']): void {
    notifications.value = notifications.value.filter(n => n.type !== type)
  }

  // Convenience methods
  function success(title: string, message?: string, options?: Partial<Notification>): string {
    return add({
      type: 'success',
      title,
      message,
      ...options
    })
  }

  function error(title: string, message?: string, options?: Partial<Notification>): string {
    return add({
      type: 'error',
      title,
      message,
      persistent: true,
      ...options
    })
  }

  function warning(title: string, message?: string, options?: Partial<Notification>): string {
    return add({
      type: 'warning',
      title,
      message,
      ...options
    })
  }

  function info(title: string, message?: string, options?: Partial<Notification>): string {
    return add({
      type: 'info',
      title,
      message,
      ...options
    })
  }

  function notifyBacktestStarted(backtestId: string, strategyName: string): string {
    return success(
      'Backtest Started',
      `Backtest for strategy "${strategyName}" has been started.`,
      {
        actions: [
          {
            label: 'View Progress',
            action: () => {
              // Navigate to backtest progress page
              console.log(`Navigate to backtest ${backtestId}`)
            }
          }
        ]
      }
    )
  }

  function notifyBacktestCompleted(backtestId: string, strategyName: string, performance: any): string {
    const isProfit = performance.totalReturn > 0
    return add({
      type: isProfit ? 'success' : 'warning',
      title: 'Backtest Completed',
      message: `Strategy "${strategyName}" completed with ${(performance.totalReturn * 100).toFixed(2)}% return.`,
      actions: [
        {
          label: 'View Results',
          action: () => {
            console.log(`Navigate to backtest results ${backtestId}`)
          }
        }
      ]
    })
  }

  function notifyBacktestFailed(backtestId: string, strategyName: string, errorMessage: string): string {
    return error(
      'Backtest Failed',
      `Strategy "${strategyName}" failed: ${errorMessage}`,
      {
        actions: [
          {
            label: 'Retry',
            action: () => {
              console.log(`Retry backtest ${backtestId}`)
            }
          },
          {
            label: 'View Logs',
            action: () => {
              console.log(`View logs for backtest ${backtestId}`)
            },
            style: 'secondary'
          }
        ]
      }
    )
  }

  return {
    // State
    notifications,
    maxNotifications,
    defaultDuration,
    
    // Computed
    activeNotifications,
    errorNotifications,
    hasErrors,
    
    // Actions
    add,
    remove,
    clear,
    clearByType,
    success,
    error,
    warning,
    info,
    notifyBacktestStarted,
    notifyBacktestCompleted,
    notifyBacktestFailed
  }
})