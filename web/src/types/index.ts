// Re-export indicator types
export type { ConfiguredIndicator } from './indicators'

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
  price: number
  amount: number
  profit?: number
  fees?: number
  pnl?: number
  balance?: number
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
  parameters: Record<string, any>
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
  parameters: Record<string, any>
  indicators: string[]
}

export interface Strategy {
  id: string
  name: string
  code: string
  config: StrategyConfig
  createdAt: Date
  updatedAt: Date
  category?: string
  tags?: string[]
  isActive?: boolean
  hasErrors?: boolean
  lastBacktestResult?: {
    totalReturn: number
    winRate: number
    maxDrawdown: number
  }
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

export interface Indicator {
  name: string
  displayName: string
  description: string
  parameters: Array<{
    name: string
    type: 'number' | 'string' | 'boolean'
    default: any
    min?: number
    max?: number
  }>
  category: 'trend' | 'momentum' | 'volatility' | 'volume' | 'overlay'
}

// API Types
export interface ApiResponse<T = any> {
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