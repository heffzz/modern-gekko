<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useNotificationStore } from '@/stores/notifications'

const notificationStore = useNotificationStore()

const logs = ref([])
const isLoading = ref(false)
const selectedLevel = ref('all')

const logLevels = [
  { value: 'all', label: 'All Levels', color: 'gray' },
  { value: 'info', label: 'Info', color: 'blue' },
  { value: 'warn', label: 'Warning', color: 'yellow' },
  { value: 'error', label: 'Error', color: 'red' },
  { value: 'debug', label: 'Debug', color: 'purple' }
]

onMounted(() => {
  loadLogs()
})

const loadLogs = async () => {
  isLoading.value = true
  try {
    // Mock data for now
    logs.value = [
      {
        id: 1,
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Application started successfully',
        source: 'system'
      },
      {
        id: 2,
        timestamp: new Date(Date.now() - 60000).toISOString(),
        level: 'info',
        message: 'Connected to mock exchange',
        source: 'exchange'
      }
    ]
  } catch (error) {
    notificationStore.addNotification({
      type: 'error',
      title: 'Error',
      message: 'Failed to load logs'
    })
  } finally {
    isLoading.value = false
  }
}

const getLevelColor = (level: string) => {
  const levelConfig = logLevels.find(l => l.value === level)
  return levelConfig?.color || 'gray'
}

const formatTimestamp = (timestamp: string) => {
  return new Date(timestamp).toLocaleString()
}
</script>

<template>
  <div class="p-6">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        System Logs
      </h1>
      <p class="text-gray-600 dark:text-gray-400">
        Monitor system and trading activity
      </p>
    </div>

    <!-- Filters -->
    <div class="mb-6">
      <div class="flex gap-4 items-center">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
          Filter by level:
        </label>
        <select 
          v-model="selectedLevel"
          class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option 
            v-for="level in logLevels" 
            :key="level.value" 
            :value="level.value"
          >
            {{ level.label }}
          </option>
        </select>
      </div>
    </div>

    <!-- Logs Table -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Timestamp
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Level
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Source
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Message
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
            <tr 
              v-for="log in logs" 
              :key="log.id"
              class="hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-mono">
                {{ formatTimestamp(log.timestamp) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span 
                  :class="[
                    'inline-flex px-2 py-1 text-xs font-semibold rounded-full',
                    {
                      'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200': log.level === 'info',
                      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200': log.level === 'warn',
                      'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200': log.level === 'error',
                      'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200': log.level === 'debug'
                    }
                  ]"
                >
                  {{ log.level.toUpperCase() }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                {{ log.source }}
              </td>
              <td class="px-6 py-4 text-sm text-gray-900 dark:text-white">
                {{ log.message }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div v-if="logs.length === 0" class="text-center py-12">
        <div class="text-6xl mb-4">📝</div>
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No logs found
        </h3>
        <p class="text-gray-500 dark:text-gray-400">
          System logs will appear here when available
        </p>
      </div>
    </div>
  </div>
</template>