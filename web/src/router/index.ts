import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '../views/DashboardView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: DashboardView,
    },
    {
      path: '/backtest',
      name: 'backtest',
      component: () => import('../views/BacktestView.vue'),
    },
    {
      path: '/strategies',
      name: 'strategies',
      component: () => import('../views/StrategiesView.vue'),
    },
    {
      path: '/strategies/editor/:id?',
      name: 'strategy-editor',
      component: () => import('../views/StrategyEditorView.vue'),
    },
    {
      path: '/indicators',
      name: 'indicators',
      component: () => import('../views/IndicatorsView.vue'),
    },
    {
      path: '/live-trading',
      name: 'live-trading',
      component: () => import('../views/LiveTradingView.vue'),
    },
    {
      path: '/logs',
      name: 'logs',
      component: () => import('../views/LogsView.vue'),
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../views/SettingsView.vue'),
    },
  ],
})

export default router
