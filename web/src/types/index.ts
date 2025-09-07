// Re-export indicator types
export type { ConfiguredIndicator } from './indicators'

// Re-export strategy types
export type { Strategy, StrategyTemplate, StrategyParameter, StrategyPerformance, StrategyMetadata } from './strategy'

// Global Window interface extension
declare global {
  interface Window {
    $notify?: {
      success: (title: string, message?: string) => void
      error: (title: string, message?: string) => void
      warning: (title: string, message?: string) => void
      info: (title: string, message?: string) => void
    }
  }
}

// Trading Types
export interface Candle {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface Trade {
  id: string
  timestamp: number
  type: 'buy' | 'sell'
  side: 'buy' | 'sell'
  price: number
  amount: number
  quantity: number
  symbol: string
  profit?: number
  fees?: number
  pnl?: number
  balance?: number
}

export interface Position {
  id: string
  symbol: string
  side: 'long' | 'short'
  size: number
  entryPrice: number
  currentPrice: number
  price: number
  unrealizedPnL: number
  timestamp: number
}

export interface LiveTradingSession {
  id: string
  strategyId: string
  exchange: string
  pair: string
  startTime: string
  endTime?: string
  status: 'running' | 'stopped' | 'paused'
  initialBalance: number
  currentBalance: number
  settings?: {
    maxDrawdown: number
    stopLoss: number
    takeProfit: number
  }
}

export interface BacktestResult {
  id?: string
  strategy?: string
  trades: Trade[]
  equity: Array<{ timestamp: number; value: number }>
  metrics: {
    totalTrades: number
    winRate: number
    profit: number
    maxDrawdown: number
    roi: number
    totalReturn: number
    profitFactor: number
    sharpeRatio?: number
    finalCapital: number
  }
  endTime?: number
}

export interface BacktestRequest {
  strategy: string
  strategyId?: string
  candles: Candle[]
  parameters: Record<string, number | string | boolean>
  startDate?: string
  endDate?: string
}

export enum BacktestStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  COMPLETED = 'completed',
  ERROR = 'error'
}

// Strategy Types
export interface StrategyConfig {
  name: string
  description: string
  parameters: Record<string, number | string | boolean>
  indicators: string[]
}

// Indicator Types
export interface IndicatorConfig {
  name: string
  parameters: Record<string, number | string>
}

export interface IndicatorValue {
  timestamp: number
  value: number | number[]
}

// Indicator interface is now imported from indicators.ts
export type { Indicator } from './indicators'

// API Types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export interface ServerHealth {
  status: 'healthy' | 'unhealthy'
  uptime: number
  memory: {
    used: number
    total: number
  }
  version: string
}

// UI Types
export interface ChartConfig {
  timeframe: string
  indicators: IndicatorConfig[]
  overlays: string[]
}

export interface Theme {
  mode: 'light' | 'dark'
  primary: string
  background: string
  surface: string
  text: string
}

// User Settings Types
export interface UserSettings {
  theme: Theme
  notifications: NotificationSettings
  trading: {
    defaultAmount: number
    riskPercentage: number
    autoTrade: boolean
  }
  exchanges: ExchangeConfig[]
  general?: {
    theme: string
    language: string
    currency: string
    timezone: string
    dateFormat: string
    numberFormat: string
    autoSave: boolean
    confirmActions: boolean
    showTooltips: boolean
    compactMode: boolean
  }
  security?: {
    twoFactorAuth: boolean
    sessionTimeout: number
    ipWhitelist: string
    apiKeyExpiry: number
    encryptLocalData: boolean
    requirePasswordForTrades: boolean
    maxDailyLoss: number
    maxPositionSize: number
  }
  advanced?: {
    logLevel: string
    maxLogFiles: number
    backupFrequency: string
    dataRetention: number
    performanceMode: boolean
    debugMode: boolean
    experimentalFeatures: boolean
    customIndicators: boolean
    apiTimeout: number
    retryAttempts: number
    concurrentRequests: number
  }
}

export interface ExchangeConfig {
  id: string
  name: string
  apiKey?: string
  apiSecret?: string
  passphrase?: string
  testnet?: boolean
  sandbox: boolean
  enabled: boolean
  status?: 'connected' | 'disconnected' | 'error'
  lastConnected?: string
  supportedFeatures?: string[]
  testConnection?: boolean
  rateLimits: {
    requests: number
    orders: number
    weight: number
  }
}

export interface NotificationSettings {
  email: {
    enabled: boolean
    address: string
    trades: boolean
    errors: boolean
    dailyReports: boolean
    weeklyReports: boolean
  }
  push: {
    enabled: boolean
    trades: boolean
    errors: boolean
    warnings: boolean
  }
  sound: {
    enabled: boolean
    trades: boolean
    errors: boolean
    warnings: boolean
  }
  trades: boolean
  alerts: boolean
  browser: {
    enabled: boolean
    trades: boolean
    errors: boolean
    warnings: boolean
  }
  webhook: {
    enabled: boolean
    url: string
    trades: boolean
    errors: boolean
    dailyReports: boolean
  }
  telegram: {
    enabled: boolean
    botToken: string
    chatId: string
    trades: boolean
    errors: boolean
    dailyReports: boolean
  }
}

// Log Entry Type
export interface LogEntry {
  id: string
  timestamp: number
  level: 'info' | 'warn' | 'error' | 'debug'
  source: string
  message: string
  data?: Record<string, unknown>
}

// Notification Type
export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message?: string
  duration?: number
  persistent?: boolean
  actions?: Array<{
    label: string
    action: () => void
  }>
  createdAt: Date
}