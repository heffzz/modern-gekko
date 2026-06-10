<template>
  <component
    :is="iconComponent"
    :class="[
      'icon',
      sizeClass,
      colorClass,
      { 'animate-spin': spin }
    ]"
    v-bind="$attrs"
  />
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'

interface Props {
  name: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'gray'
  spin?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  color: 'gray',
  spin: false
})

const iconComponent = computed(() => {
  // Map of icon names to their components
  const iconMap: Record<string, any> = {
    'search': () => import('@heroicons/vue/24/outline').then(m => ({ default: m.MagnifyingGlassIcon })),
    'grid': () => import('@heroicons/vue/24/outline').then(m => ({ default: m.Squares2X2Icon })),
    'list': () => import('@heroicons/vue/24/outline').then(m => ({ default: m.ListBulletIcon })),
    'chart': () => import('@heroicons/vue/24/outline').then(m => ({ default: m.ChartBarIcon })),
    'settings': () => import('@heroicons/vue/24/outline').then(m => ({ default: m.Cog6ToothIcon })),
    'play': () => import('@heroicons/vue/24/outline').then(m => ({ default: m.PlayIcon })),
    'stop': () => import('@heroicons/vue/24/outline').then(m => ({ default: m.StopIcon })),
    'download': () => import('@heroicons/vue/24/outline').then(m => ({ default: m.ArrowDownTrayIcon })),
    'upload': () => import('@heroicons/vue/24/outline').then(m => ({ default: m.ArrowUpTrayIcon })),
    'eye': () => import('@heroicons/vue/24/outline').then(m => ({ default: m.EyeIcon })),
    'eye-slash': () => import('@heroicons/vue/24/outline').then(m => ({ default: m.EyeSlashIcon })),
    'check': () => import('@heroicons/vue/24/outline').then(m => ({ default: m.CheckIcon })),
    'x': () => import('@heroicons/vue/24/outline').then(m => ({ default: m.XMarkIcon })),
    'plus': () => import('@heroicons/vue/24/outline').then(m => ({ default: m.PlusIcon })),
    'minus': () => import('@heroicons/vue/24/outline').then(m => ({ default: m.MinusIcon })),
    'arrow-left': () => import('@heroicons/vue/24/outline').then(m => ({ default: m.ArrowLeftIcon })),
    'arrow-right': () => import('@heroicons/vue/24/outline').then(m => ({ default: m.ArrowRightIcon })),
    'question-mark-circle': () => import('@heroicons/vue/24/outline').then(m => ({ default: m.QuestionMarkCircleIcon }))
  }

  return defineAsyncComponent(
    iconMap[props.name] || iconMap['question-mark-circle']
  )
})

const sizeClass = computed(() => {
  const sizes = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8'
  }
  return sizes[props.size]
})

const colorClass = computed(() => {
  const colors = {
    primary: 'text-blue-600',
    secondary: 'text-gray-600',
    success: 'text-green-600',
    warning: 'text-yellow-600',
    error: 'text-red-600',
    gray: 'text-gray-400'
  }
  return colors[props.color]
})
</script>

<style scoped>
.icon {
  display: inline-block;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>