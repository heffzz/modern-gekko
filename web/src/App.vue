<script setup lang="ts">
import { RouterView } from 'vue-router'
import { onMounted } from 'vue'
import { useTheme } from './composables/useTheme'
import AppLayout from './components/AppLayout.vue'
import NotificationContainer from './components/ui/NotificationContainer.vue'

const { isDark, initSystemThemeListener } = useTheme()

onMounted(() => {
  initSystemThemeListener()
})
</script>

<template>
  <div id="app" :class="{ 'dark': isDark }">
    <AppLayout>
      <RouterView />
    </AppLayout>
    <NotificationContainer />
  </div>
</template>

<style>
/* Global styles */
* {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

#app {
  height: 100vh;
  overflow: hidden;
  transition: all 0.3s ease;
}

/* Dark mode styles */
.dark {
  background-color: #0f172a;
  color: #f8fafc;
}

/* Scrollbar styles */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #64748b;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #475569;
}

.dark ::-webkit-scrollbar-thumb {
  background: #475569;
}

.dark ::-webkit-scrollbar-thumb:hover {
  background: #64748b;
}
</style>
