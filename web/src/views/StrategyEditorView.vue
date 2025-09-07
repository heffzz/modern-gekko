<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import StrategyEditor from '@/components/strategy/StrategyEditor.vue'
import { useStrategyStore } from '@/stores/strategy'
import type { Strategy } from '@/types/strategy'

const route = useRoute()
const router = useRouter()
const strategyStore = useStrategyStore()

const currentStrategy = ref<Strategy | null>(null)
const isLoading = ref(false)

onMounted(async () => {
  await loadStrategy()
})

const loadStrategy = async () => {
  const strategyId = route.params.id as string
  
  if (strategyId && strategyId !== 'new') {
    isLoading.value = true
    try {
      currentStrategy.value = await strategyStore.getStrategy(strategyId)
    } catch (error) {
      console.error('Failed to load strategy:', error)
      // Redirect to strategies list if strategy not found
      router.push('/strategies')
    } finally {
      isLoading.value = false
    }
  }
}

const handleStrategySaved = (strategy: Strategy) => {
  currentStrategy.value = strategy
  // Update URL if creating new strategy
  if (route.params.id === 'new') {
    router.replace(`/strategies/edit/${strategy.id}`)
  }
}

const handleStrategyValidated = (result: any) => {
  console.log('Strategy validation result:', result)
}
</script>

<template>
  <div class="h-full flex flex-col">
    <div v-if="isLoading" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p class="text-gray-600 dark:text-gray-400">Loading strategy...</p>
      </div>
    </div>
    
    <StrategyEditor
      v-else
      :strategy="currentStrategy"
      @strategy-saved="handleStrategySaved"
      @strategy-validated="handleStrategyValidated"
      class="flex-1"
    />
  </div>
</template>