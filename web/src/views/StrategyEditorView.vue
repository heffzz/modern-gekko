<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useNotificationStore } from '@/stores/notifications'

const notificationStore = useNotificationStore()

const strategies = ref([])
const selectedStrategy = ref(null)
const isLoading = ref(false)

onMounted(() => {
  loadStrategies()
})

const loadStrategies = async () => {
  isLoading.value = true
  try {
    // Mock data for now
    strategies.value = [
      {
        id: 1,
        name: 'Sample Strategy',
        description: 'A basic moving average crossover strategy',
        created: new Date().toISOString()
      }
    ]
  } catch (error) {
    notificationStore.addNotification({
      type: 'error',
      title: 'Error',
      message: 'Failed to load strategies'
    })
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="p-6">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Strategy Editor
      </h1>
      <p class="text-gray-600 dark:text-gray-400">
        Create and edit trading strategies
      </p>
    </div>

    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div class="text-center py-12">
        <div class="text-6xl mb-4">⚡</div>
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Strategy Editor Coming Soon
        </h3>
        <p class="text-gray-500 dark:text-gray-400">
          Advanced strategy editor with Monaco IDE integration
        </p>
      </div>
    </div>
  </div>
</template>