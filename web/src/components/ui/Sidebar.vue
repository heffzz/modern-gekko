<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

interface Props {
  collapsed?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  collapsed: false
})

const emit = defineEmits<{
  toggle: []
}>()

const route = useRoute()
const router = useRouter()

const menuItems = [
  {
    name: 'Dashboard',
    path: '/',
    icon: 'M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z',
    description: 'Panoramica e stato sistema'
  },
  {
    name: 'Backtest',
    path: '/backtest',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    description: 'Simulazione strategie su dati storici'
  },
  {
    name: 'Strategie',
    path: '/strategies',
    icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547A8.014 8.014 0 004 21h16a8.014 8.014 0 00-.244-5.572zM12 2a3 3 0 013 3v6a3 3 0 11-6 0V5a3 3 0 013-3z',
    description: 'Gestione algoritmi di trading'
  },
  {
    name: 'Indicatori',
    path: '/indicators',
    icon: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z',
    description: 'Analisi tecnica avanzata'
  },
  {
    name: 'Trading Live',
    path: '/live-trading',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
    description: 'Interfaccia trading in tempo reale'
  },
  {
    name: 'Logs',
    path: '/logs',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    description: 'Monitoraggio sistema e operazioni'
  },
  {
    name: 'Impostazioni',
    path: '/settings',
    icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
    description: 'Configurazione applicazione'
  }
]

const isActive = (path: string) => {
  if (path === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(path)
}

const navigateTo = (path: string) => {
  router.push(path)
}
</script>

<template>
  <aside 
    :class="[
      'h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 border-r border-emerald-400/30 flex flex-col transition-all duration-300 relative shadow-2xl backdrop-blur-xl shadow-emerald-500/15',
      collapsed ? 'w-16' : 'w-72'
    ]"
  >
    <!-- Logo/Brand -->
    <div class="p-10 border-b border-white/3">
      <div class="flex items-center space-x-4">
        <div class="relative">
           <div class="w-14 h-14 bg-gradient-to-br from-emerald-400 via-blue-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl ring-2 ring-white/10">
             <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
             </svg>
           </div>
           <div class="absolute -top-1 -right-1 w-5 h-5 bg-green-400 rounded-full border-3 border-gray-900 animate-pulse"></div>
         </div>
        <div v-if="!collapsed">
          <h1 class="text-3xl font-black text-white tracking-tighter bg-gradient-to-r from-emerald-300 via-green-400 to-teal-400 bg-clip-text text-transparent drop-shadow-lg">GEKKO</h1>
           <p class="text-sm font-semibold text-emerald-300/90 tracking-widest uppercase">AI TRADING</p>
        </div>
      </div>
    </div>

    <!-- Navigation -->
    <div class="contrast-separator"></div>
    <nav class="flex-1 px-8 py-10 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent flex flex-col items-center zone-navigation">
      <button
        v-for="item in menuItems"
        :key="item.name"
        @click="navigateTo(item.path)"
        :class="[
           'w-full max-w-sm flex items-center px-8 py-6 text-center rounded-3xl transition-all duration-700 group relative overflow-hidden mx-auto border-2 backdrop-blur-xl',
           'before:absolute before:inset-0 before:bg-gradient-to-br before:from-emerald-400/0 before:via-green-400/0 before:to-teal-400/0 before:transition-all before:duration-700 before:rounded-3xl',
           'hover:before:from-emerald-400/12 hover:before:via-green-400/8 hover:before:to-teal-400/12',
           isActive(item.path)
             ? 'bg-gradient-to-br from-emerald-500/40 via-green-500/35 to-teal-500/40 text-white border-emerald-300/80 shadow-2xl shadow-emerald-400/50 transform scale-[1.03] ring-2 ring-emerald-300/40'
             : 'bg-gradient-to-br from-slate-800/70 via-gray-800/60 to-slate-700/70 text-gray-200 border-gray-500/60 hover:text-white hover:bg-gradient-to-br hover:from-emerald-500/30 hover:via-green-500/25 hover:to-teal-500/30 hover:border-emerald-300/70 hover:shadow-2xl hover:shadow-emerald-400/35 hover:transform hover:scale-[1.02] hover:ring-1 hover:ring-emerald-300/30'
         ]"
        :title="collapsed ? item.name : ''"
      >
        <!-- Active indicator -->
         <div v-if="isActive(item.path)" class="absolute left-0 top-3 bottom-3 w-2 bg-gradient-to-b from-emerald-400 via-green-400 to-teal-500 rounded-full shadow-lg shadow-emerald-400/60 animate-pulse"></div>
         
         <!-- Glow effect for active state -->
         <div v-if="isActive(item.path)" class="absolute inset-0 bg-gradient-to-br from-emerald-400/8 via-transparent to-teal-400/8 rounded-3xl animate-pulse"></div>
        
        <div class="flex items-center space-x-5 w-full relative z-10">
          <div :class="[
            'flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-2xl transition-all duration-700 transform group-hover:scale-110 group-hover:rotate-3 relative',
            'before:absolute before:inset-0 before:bg-gradient-to-br before:from-emerald-400/0 before:to-teal-400/0 before:rounded-2xl before:transition-all before:duration-700',
            'group-hover:before:from-emerald-400/25 group-hover:before:to-teal-400/25',
            isActive(item.path) 
              ? 'bg-gradient-to-br from-emerald-400/35 via-green-400/25 to-teal-400/35 text-emerald-100 shadow-lg shadow-emerald-400/30 ring-2 ring-emerald-400/25' 
              : 'bg-gradient-to-br from-slate-700/60 to-slate-600/60 text-gray-400 group-hover:bg-gradient-to-br group-hover:from-emerald-400/25 group-hover:to-teal-400/25 group-hover:text-emerald-200 group-hover:shadow-lg group-hover:shadow-emerald-400/20'
          ]">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon"/>
            </svg>
          </div>
          <div v-if="!collapsed" class="flex-1 min-w-0">
             <div :class="[
                'font-black text-xl transition-all duration-700 tracking-tight leading-tight uppercase text-center transform group-hover:scale-105',
                isActive(item.path) 
                  ? 'text-white bg-gradient-to-r from-emerald-200 via-green-200 to-teal-200 bg-clip-text text-transparent drop-shadow-lg' 
                  : 'text-gray-200 group-hover:text-white group-hover:bg-gradient-to-r group-hover:from-emerald-300 group-hover:to-teal-300 group-hover:bg-clip-text group-hover:text-transparent'
              ]">{{ item.name }}</div>
              <div :class="[
                'text-sm mt-2 transition-all duration-700 font-semibold leading-relaxed tracking-wide text-center transform group-hover:scale-105',
                isActive(item.path) ? 'text-emerald-200/95' : 'text-gray-400 group-hover:text-emerald-200/85'
              ]">{{ item.description }}</div>
           </div>
          
          <!-- Arrow indicator -->
          <div v-if="!collapsed" :class="[
            'flex-shrink-0 w-5 h-5 transition-all duration-700 transform group-hover:rotate-90',
            isActive(item.path) 
              ? 'text-emerald-300 translate-x-2 scale-110 drop-shadow-lg' 
              : 'text-gray-500 group-hover:text-emerald-300 group-hover:translate-x-2 group-hover:scale-110 opacity-60 group-hover:opacity-100'
          ]">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
            </svg>
          </div>
        </div>
      </button>
    </nav>

    <!-- System Status -->
    <div class="contrast-separator"></div>
    <div class="p-8">
      <div class="zone-status rounded-3xl p-5 backdrop-blur-md shadow-lg shadow-emerald-500/8">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center space-x-3">
            <div class="relative">
              <div class="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
              <div class="absolute inset-0 w-3 h-3 bg-emerald-400 rounded-full animate-ping opacity-30"></div>
            </div>
            <span v-if="!collapsed" class="text-sm text-white font-black tracking-wide uppercase">SISTEMA ATTIVO</span>
          </div>
          <div v-if="!collapsed" class="text-xs text-emerald-300 font-black tracking-widest uppercase bg-emerald-500/15 px-3 py-1.5 rounded-2xl">V2.1.0</div>
        </div>
        <div v-if="!collapsed" class="grid grid-cols-2 gap-2 text-xs">
           <div class="text-gray-300">
             <span class="text-gray-400 font-semibold tracking-wide uppercase">CPU:</span> <span class="text-emerald-300 font-black tracking-wider">12%</span>
           </div>
           <div class="text-gray-300">
             <span class="text-gray-400 font-semibold tracking-wide uppercase">RAM:</span> <span class="text-teal-300 font-black tracking-wider">2.1GB</span>
           </div>
         </div>
      </div>
    </div>

    <!-- Collapse Toggle -->
    <button 
      @click="emit('toggle')"
      class="absolute -right-4 top-24 w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600/50 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:from-slate-600 hover:to-slate-700 transition-all duration-300 shadow-xl hover:shadow-2xl z-50 backdrop-blur-sm"
      :title="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
    >
      <svg class="w-5 h-5 transition-transform duration-300 drop-shadow-sm" :class="{ 'rotate-180': collapsed }" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
      </svg>
    </button>
  </aside>
</template>

<style scoped>
/* Custom Scrollbar */
.scrollbar-thin::-webkit-scrollbar {
  width: 6px;
}

.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
  border-radius: 12px;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
  background: linear-gradient(to bottom, rgba(16, 185, 129, 0.2), rgba(59, 130, 246, 0.2));
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(to bottom, rgba(16, 185, 129, 0.4), rgba(59, 130, 246, 0.4));
}

/* Smooth transitions for all interactive elements */
* {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

/* Enhanced hover effects */
.group:hover {
  transform: translateX(3px) scale(1.005);
}

/* Soft rounded corners */
.rounded-3xl {
  border-radius: 1.5rem;
}

.rounded-2xl {
  border-radius: 1rem;
}

/* Modern Typography */
.font-black {
  font-weight: 900;
  letter-spacing: -0.025em;
}

.tracking-tighter {
  letter-spacing: -0.05em;
}

.tracking-widest {
  letter-spacing: 0.1em;
}

.tracking-wider {
  letter-spacing: 0.05em;
}

/* Text gradient effects */
.bg-clip-text {
  -webkit-background-clip: text;
  background-clip: text;
}

/* Enhanced text shadows for better readability */
.text-white {
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

/* Smooth font rendering */
* {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

/* Modern button effects with improved contrast */
.group:hover {
  transform-style: preserve-3d;
}

/* Ring effects with emerald theme */
.ring-1 {
  box-shadow: 0 0 0 1px currentColor;
}

.ring-2 {
  box-shadow: 0 0 0 2px currentColor;
}

.group:hover .ring-effect {
  box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.3);
}

/* Advanced pseudo-element effects */
.before\:absolute::before {
  content: '';
  position: absolute;
}

.before\:inset-0::before {
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
}

.group::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, transparent 0%, rgba(16, 185, 129, 0.08) 50%, transparent 100%);
  border-radius: inherit;
  opacity: 0;
  transition: opacity 0.7s cubic-bezier(0.4, 0, 0.2, 1);
}

.group:hover::before {
  opacity: 1;
}

/* Enhanced transform effects */
.group:hover .group-hover\:rotate-3 {
  transform: rotate(3deg) scale(1.1);
}

.group:hover .group-hover\:rotate-90 {
  transform: rotate(90deg) translateX(0.5rem) scale(1.1);
}

.group:hover .transform-3d {
  transform: perspective(1000px) rotateX(5deg) rotateY(-5deg) scale(1.05);
}

/* Improved scale animations */
.group:hover .group-hover\:scale-105 {
  transform: scale(1.05);
  transition: transform 0.7s cubic-bezier(0.4, 0, 0.2, 1);
}

.group:hover .scale-animation {
  animation: scaleFloat 2s ease-in-out infinite;
}

@keyframes scaleFloat {
  0%, 100% { transform: scale(1) rotate(0deg); }
  50% { transform: scale(1.05) rotate(1deg); }
}

/* Enhanced glow effects with emerald theme */
.shadow-cyan-400\/25 {
  box-shadow: 0 10px 25px -3px rgba(16, 185, 129, 0.25), 0 4px 6px -2px rgba(16, 185, 129, 0.1);
}

.shadow-cyan-500\/30 {
  box-shadow: 0 20px 25px -5px rgba(16, 185, 129, 0.3), 0 10px 10px -5px rgba(16, 185, 129, 0.2);
}

.group:hover .glow-effect {
  box-shadow: 
    0 0 20px rgba(16, 185, 129, 0.4),
    0 0 40px rgba(16, 185, 129, 0.25),
    0 0 60px rgba(16, 185, 129, 0.15);
}

/* High contrast separators */
.contrast-separator {
  background: linear-gradient(90deg, 
    transparent 0%, 
    rgba(16, 185, 129, 0.3) 20%, 
    rgba(16, 185, 129, 0.6) 50%, 
    rgba(16, 185, 129, 0.3) 80%, 
    transparent 100%);
  height: 1px;
  margin: 1rem 0;
}

/* Distinct background zones */
.zone-navigation {
  background: linear-gradient(180deg, 
    rgba(15, 23, 42, 0.8) 0%, 
    rgba(30, 41, 59, 0.6) 50%, 
    rgba(15, 23, 42, 0.8) 100%);
  border-radius: 1.5rem;
  padding: 1rem;
  margin: 0.5rem;
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.zone-status {
  background: linear-gradient(135deg, 
    rgba(6, 78, 59, 0.4) 0%, 
    rgba(4, 120, 87, 0.3) 50%, 
    rgba(6, 78, 59, 0.4) 100%);
  border: 2px solid rgba(16, 185, 129, 0.4);
}

/* Glassmorphism effect */
.backdrop-blur-md {
  backdrop-filter: blur(12px) saturate(180%);
  -webkit-backdrop-filter: blur(12px) saturate(180%);
}

/* Enhanced shadows */
.shadow-2xl {
  box-shadow: 
    0 25px 50px -12px rgba(99, 102, 241, 0.15),
    0 8px 32px -8px rgba(34, 211, 238, 0.1),
    0 0 0 1px rgba(34, 211, 238, 0.1);
}

/* Custom gradient backgrounds */
.bg-gradient-to-br {
  background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 50%, #581c87 100%);
}

/* Improved text shadows */
.drop-shadow-lg {
  filter: drop-shadow(0 10px 8px rgba(34, 211, 238, 0.2));
}

/* Soft glow effect */
.shadow-xl {
  box-shadow: 
    0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04),
    0 0 0 1px rgba(255, 255, 255, 0.02);
}

/* Pulse animation for status indicator */
@keyframes pulse-glow {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.1);
  }
}

.animate-pulse {
  animation: pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>