<template>
  <div class="relative">
    <!-- Theme Toggle Button -->
    <button
      @click="toggleDropdown"
      class="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      :aria-label="`Current theme: ${currentTheme}. Click to change theme`"
    >
      <component :is="currentIcon" class="w-4 h-4" />
      <span class="text-sm font-medium capitalize">{{ currentTheme }}</span>
      <ChevronDownIcon class="w-4 h-4" :class="{ 'rotate-180': isOpen }" />
    </button>

    <!-- Dropdown Menu -->
    <Transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <div
        v-if="isOpen"
        class="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50"
        @click.stop
      >
        <div class="py-1">
          <button
            v-for="option in themeOptions"
            :key="option.value"
            @click="selectTheme(option.value)"
            class="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            :class="{
              'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300': theme === option.value
            }"
          >
            <component :is="option.icon" class="w-4 h-4" />
            <span class="flex-1 text-left">{{ option.label }}</span>
            <CheckIcon
              v-if="theme === option.value"
              class="w-4 h-4 text-blue-600 dark:text-blue-400"
            />
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useTheme } from '@/composables/useTheme'
import {
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  ChevronDownIcon,
  CheckIcon
} from '@heroicons/vue/24/outline'

const { theme, actualTheme, setTheme, initSystemThemeListener } = useTheme()

const isOpen = ref(false)
let cleanupSystemListener: (() => void) | undefined

const themeOptions = [
  {
    value: 'light' as const,
    label: 'Light',
    icon: SunIcon
  },
  {
    value: 'dark' as const,
    label: 'Dark',
    icon: MoonIcon
  },
  {
    value: 'system' as const,
    label: 'System',
    icon: ComputerDesktopIcon
  }
]

const currentTheme = computed(() => {
  if (theme === 'system') {
    return `System (${actualTheme.value})`
  }
  return theme
})

const currentIcon = computed(() => {
  if (theme === 'system') {
    return ComputerDesktopIcon
  }
  return theme === 'dark' ? MoonIcon : SunIcon
})

const toggleDropdown = () => {
  isOpen.value = !isOpen.value
}

const selectTheme = (newTheme: 'light' | 'dark' | 'system') => {
  setTheme(newTheme)
  isOpen.value = false
}

const closeDropdown = (event: Event) => {
  if (!event.target) return
  
  const target = event.target as Element
  if (!target.closest('.relative')) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', closeDropdown)
  cleanupSystemListener = initSystemThemeListener()
})

onUnmounted(() => {
  document.removeEventListener('click', closeDropdown)
  if (cleanupSystemListener) {
    cleanupSystemListener()
  }
})
</script>