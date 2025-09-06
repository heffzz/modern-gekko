<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { useMainStore } from '@/stores/main'
import Sidebar from './ui/Sidebar.vue'
import Header from './ui/Header.vue'

const route = useRoute()
const mainStore = useMainStore()
const sidebarCollapsed = ref(false)

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
}
</script>

<template>
  <div class="app-layout">
    <!-- Mobile Overlay -->
    <div 
      v-if="!sidebarCollapsed" 
      class="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
      @click="toggleSidebar"
    ></div>
    
    <!-- Sidebar -->
    <Sidebar 
      :collapsed="sidebarCollapsed" 
      @toggle="toggleSidebar"
      class="sidebar"
    />
    
    <!-- Main Content -->
    <div class="main-content" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
      <!-- Header -->
      <Header 
        :title="(route.meta.title as string) || String(route.name) || 'Dashboard'"
        @toggle-sidebar="toggleSidebar"
        class="header"
      />
      
      <!-- Page Content -->
      <main class="page-content">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  transition: all 0.3s ease;
  overflow: hidden;
}

.dark .app-layout {
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
}

.sidebar {
  flex-shrink: 0;
  z-index: 30;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  transition: margin-left 0.3s ease;
  overflow: hidden;
}

.main-content.sidebar-collapsed {
  margin-left: 0;
}

.header {
  flex-shrink: 0;
  z-index: 20;
}

.page-content {
  flex: 1;
  overflow: auto;
  padding: 1.5rem;
  background: transparent;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.dark .page-content {
  background: transparent;
}

/* Responsive design */
@media (max-width: 1024px) {
  .sidebar {
    width: 280px !important;
  }
}

@media (max-width: 768px) {
  .app-layout {
    position: relative;
  }
  
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    width: 280px !important;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    z-index: 50;
  }
  
  .sidebar:not(.collapsed) {
    transform: translateX(0);
  }
  
  .main-content {
    margin-left: 0;
    width: 100%;
  }
  
  .page-content {
    padding: 1rem;
  }
}

@media (max-width: 640px) {
  .page-content {
    padding: 0.75rem;
  }
  
  .sidebar {
    width: 260px !important;
  }
}

@media (max-width: 480px) {
  .page-content {
    padding: 0.5rem;
  }
  
  .sidebar {
    width: 240px !important;
  }
}
</style>