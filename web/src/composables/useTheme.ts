import { ref, computed, watch } from 'vue'

type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'gekko-theme'

// Get initial theme from localStorage or default to system
const getInitialTheme = (): Theme => {
  if (typeof window === 'undefined') return 'system'
  
  const stored = localStorage.getItem(STORAGE_KEY) as Theme
  if (stored && ['light', 'dark', 'system'].includes(stored)) {
    return stored
  }
  return 'system'
}

// Check if system prefers dark mode
const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const theme = ref<Theme>(getInitialTheme())
const systemTheme = ref<'light' | 'dark'>(getSystemTheme())

export const useTheme = () => {
  // Computed actual theme (resolves 'system' to actual theme)
  const actualTheme = computed(() => {
    return theme.value === 'system' ? systemTheme.value : theme.value
  })

  // Set theme
  const setTheme = (newTheme: Theme) => {
    theme.value = newTheme
    localStorage.setItem(STORAGE_KEY, newTheme)
  }

  // Toggle between light and dark (skips system)
  const toggleTheme = () => {
    if (theme.value === 'light') {
      setTheme('dark')
    } else if (theme.value === 'dark') {
      setTheme('light')
    } else {
      // If system, toggle to opposite of current system theme
      setTheme(systemTheme.value === 'dark' ? 'light' : 'dark')
    }
  }

  // Apply theme to document
  const applyTheme = () => {
    if (typeof document === 'undefined') return
    
    const root = document.documentElement
    const isDark = actualTheme.value === 'dark'
    
    if (isDark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }

  // Listen for system theme changes
  const initSystemThemeListener = () => {
    if (typeof window === 'undefined') return
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleChange = (e: MediaQueryListEvent) => {
      systemTheme.value = e.matches ? 'dark' : 'light'
    }
    
    mediaQuery.addEventListener('change', handleChange)
    
    // Return cleanup function
    return () => mediaQuery.removeEventListener('change', handleChange)
  }

  // Watch for theme changes and apply them
  watch(actualTheme, applyTheme, { immediate: true })

  return {
    theme: theme.value,
    actualTheme,
    setTheme,
    toggleTheme,
    initSystemThemeListener,
    isDark: computed(() => actualTheme.value === 'dark')
  }
}

// Initialize theme on module load
if (typeof window !== 'undefined') {
  const { initSystemThemeListener } = useTheme()
  initSystemThemeListener()
}