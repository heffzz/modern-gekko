<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import Sidebar from './ui/Sidebar.vue'
import Header from './ui/Header.vue'
const sidebarCollapsed = ref(false)
const isMobile = ref(false)

function checkMobile() {
  isMobile.value = window.innerWidth < 768
  if (isMobile.value) {
    sidebarCollapsed.value = true
  }
}

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

function handleResize() {
  checkMobile()
}

function handleTouchStart(e: TouchEvent) {
  if (isMobile.value && e.touches[0].clientX < 20) {
    sidebarCollapsed.value = false
  }
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', handleResize)
  document.addEventListener('touchstart', handleTouchStart)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  document.removeEventListener('touchstart', handleTouchStart)
})
</script>

<template>
  <div class="app-layout" :class="{ 'mobile': isMobile }">
    <!-- Mobile Overlay -->
    <Transition name="overlay">
      <div 
        v-if="!sidebarCollapsed && isMobile" 
        class="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-all duration-300 ease-out"
        @click="toggleSidebar"
        @touchstart.prevent="toggleSidebar"
      ></div>
    </Transition>
    
    <!-- Sidebar -->
    <Sidebar 
      :collapsed="sidebarCollapsed" 
      :is-mobile="isMobile"
      @toggle="toggleSidebar"
      class="sidebar"
    />
    
    <!-- Main Content -->
    <div class="main-content" :class="{ 
      'sidebar-collapsed': sidebarCollapsed,
      'mobile': isMobile 
    }">
      <!-- Header -->
      <Header 
        :title="($route.meta.title as string) || String($route.name) || 'Dashboard'"
        :is-mobile="isMobile"
        @toggle-sidebar="toggleSidebar"
        class="header"
      />
      
      <!-- Page Content -->
      <main class="page-content">
        <div class="content-wrapper">
          <slot />
        </div>
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
  position: relative;
}

.app-layout.mobile {
  flex-direction: column;
}

.dark .app-layout {
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
}

.sidebar {
  flex-shrink: 0;
  z-index: 30;
  transition: transform 0.3s ease;
}

@media (max-width: 767px) {
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    transform: translateX(-100%);
  }
  
  .sidebar:not(.collapsed) {
    transform: translateX(0);
  }
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

.main-content.mobile {
  width: 100%;
  margin-left: 0 !important;
}

.main-content.sidebar-collapsed {
  margin-left: 0;
}

.page-content {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.content-wrapper {
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 1rem;
  -webkit-overflow-scrolling: touch;
}

@media (min-width: 768px) {
  .content-wrapper {
    padding: 1.5rem;
  }
}

@media (min-width: 1024px) {
  .content-wrapper {
    padding: 2rem;
  }
}

/* Overlay transitions */
.overlay-enter-active,
.overlay-leave-active {
  transition: opacity 0.3s ease;
}

.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}

/* Touch improvements */
@media (hover: none) and (pointer: coarse) {
  .app-layout {
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
  }
  
  .content-wrapper {
    scroll-behavior: smooth;
  }
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