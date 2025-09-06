import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useMainStore } from './stores/main'
import { useIndicatorsStore } from './stores/indicators'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Initialize stores
const mainStore = useMainStore()
const indicatorsStore = useIndicatorsStore()

// Initialize application
mainStore.initialize()
indicatorsStore.initialize()

app.mount('#app')
