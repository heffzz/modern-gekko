// Strategy Types
export interface Strategy {
  id: string
  name: string
  description?: string
  code: string
  type: StrategyType
  category: StrategyCategory
  author?: string
  version?: string
  createdAt: number
  lastModified?: number
  isActive?: boolean
  tags?: string[]
  parameters?: StrategyParameter[]
  performance?: StrategyPerformance
  metadata?: StrategyMetadata
}

export interface StrategyTemplate {
  id: string
  name: string
  description: string
  category: StrategyCategory
  code: string
  parameters: StrategyParameter[]
  author: string
  version: string
  tags: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimatedTime: string
  prerequisites?: string[]
  learningObjectives?: string[]
}

export interface StrategyParameter {
  name: string
  type: 'number' | 'string' | 'boolean' | 'select' | 'range'
  default: any
  min?: number
  max?: number
  step?: number
  options?: Array<{ label: string; value: any }>
  description?: string
  required?: boolean
  validation?: {
    pattern?: string
    message?: string
  }
}

export interface StrategyPerformance {
  totalReturn: number
  annualizedReturn: number
  maxDrawdown: number
  sharpeRatio: number
  sortinoRatio: number
  winRate: number
  profitFactor: number
  totalTrades: number
  avgTradeDuration: number
  volatility: number
  beta?: number
  alpha?: number
  calmarRatio?: number
  informationRatio?: number
  treynorRatio?: number
}

export interface StrategyMetadata {
  indicators: string[]
  timeframes: string[]
  markets: string[]
  complexity: number
  riskLevel: 'low' | 'medium' | 'high'
  tradingStyle: 'scalping' | 'day' | 'swing' | 'position'
  requiredCapital?: number
  maxPositions?: number
  stopLoss?: boolean
  takeProfit?: boolean
}

export interface StrategyValidationResult {
  valid: boolean
  errors: StrategyValidationError[]
  warnings: StrategyValidationWarning[]
  suggestions: string[]
  performance?: {
    syntaxCheck: boolean
    typeCheck: boolean
    logicCheck: boolean
    performanceCheck: boolean
  }
  estimatedComplexity?: number
  estimatedMemoryUsage?: string
}

export interface StrategyValidationError {
  line: number
  column?: number
  message: string
  type: 'syntax' | 'type' | 'logic' | 'performance'
  severity: 'error' | 'warning'
  suggestion?: string
  code?: string
}

export interface StrategyValidationWarning {
  line: number
  column?: number
  message: string
  type: 'performance' | 'best-practice' | 'compatibility'
  suggestion?: string
}

export interface StrategyBacktestRequest {
  strategyId: string
  parameters?: Record<string, any>
  dataSource: {
    symbol: string
    timeframe: string
    startDate: string
    endDate: string
  }
  initialCapital: number
  commission: number
  slippage?: number
  options?: {
    benchmark?: string
    riskFreeRate?: number
    maxPositions?: number
    positionSizing?: 'fixed' | 'percentage' | 'kelly' | 'optimal-f'
  }
}

export interface StrategyBacktestResult {
  id: string
  strategyId: string
  parameters: Record<string, any>
  performance: StrategyPerformance
  trades: BacktestTrade[]
  equityCurve: EquityPoint[]
  drawdownCurve: DrawdownPoint[]
  monthlyReturns: MonthlyReturn[]
  statistics: BacktestStatistics
  riskMetrics: RiskMetrics
  startDate: string
  endDate: string
  duration: number
  createdAt: number
}

export interface BacktestTrade {
  id: string
  entryTime: number
  exitTime?: number
  type: 'long' | 'short'
  entryPrice: number
  exitPrice?: number
  quantity: number
  pnl?: number
  pnlPercent?: number
  commission: number
  slippage?: number
  duration?: number
  maxFavorableExcursion?: number
  maxAdverseExcursion?: number
  entryReason?: string
  exitReason?: string
  tags?: string[]
}

export interface EquityPoint {
  timestamp: number
  equity: number
  drawdown: number
  returns: number
}

export interface DrawdownPoint {
  timestamp: number
  drawdown: number
  duration: number
  peak: number
  trough: number
}

export interface MonthlyReturn {
  year: number
  month: number
  return: number
  trades: number
}

export interface BacktestStatistics {
  totalDays: number
  tradingDays: number
  totalTrades: number
  winningTrades: number
  losingTrades: number
  winRate: number
  avgWin: number
  avgLoss: number
  largestWin: number
  largestLoss: number
  avgTradeDuration: number
  avgWinDuration: number
  avgLossDuration: number
  profitFactor: number
  expectancy: number
  systemQualityNumber?: number
  ulcerIndex?: number
  recoveryFactor?: number
}

export interface RiskMetrics {
  valueAtRisk: {
    daily95: number
    daily99: number
    monthly95: number
    monthly99: number
  }
  conditionalValueAtRisk: {
    daily95: number
    daily99: number
  }
  maxDrawdownDuration: number
  averageDrawdownDuration: number
  drawdownFrequency: number
  tailRatio: number
  gainToPainRatio: number
  lakeRatio: number
  burkeRatio: number
}

export interface StrategyOptimizationRequest {
  strategyId: string
  parameters: {
    [key: string]: {
      min: number
      max: number
      step: number
    }
  }
  dataSource: {
    symbol: string
    timeframe: string
    startDate: string
    endDate: string
  }
  objective: 'totalReturn' | 'sharpeRatio' | 'sortinoRatio' | 'calmarRatio' | 'profitFactor'
  constraints?: {
    maxDrawdown?: number
    minTrades?: number
    minWinRate?: number
  }
  method: 'grid' | 'genetic' | 'particle-swarm' | 'bayesian'
  maxIterations?: number
  populationSize?: number
}

export interface StrategyOptimizationResult {
  id: string
  strategyId: string
  request: StrategyOptimizationRequest
  results: OptimizationPoint[]
  bestParameters: Record<string, any>
  bestPerformance: StrategyPerformance
  convergenceData: ConvergencePoint[]
  heatmapData?: HeatmapPoint[]
  statistics: OptimizationStatistics
  duration: number
  createdAt: number
}

export interface OptimizationPoint {
  parameters: Record<string, any>
  performance: StrategyPerformance
  rank: number
  fitness: number
}

export interface ConvergencePoint {
  iteration: number
  bestFitness: number
  avgFitness: number
  diversity: number
}

export interface HeatmapPoint {
  x: number
  y: number
  value: number
  parameters: Record<string, any>
}

export interface OptimizationStatistics {
  totalCombinations: number
  evaluatedCombinations: number
  convergenceIteration?: number
  improvementRate: number
  diversityMaintained: boolean
  overfittingRisk: 'low' | 'medium' | 'high'
}

export interface StrategyComparison {
  strategies: {
    id: string
    name: string
    performance: StrategyPerformance
    color: string
  }[]
  metrics: {
    name: string
    values: number[]
    format: 'percentage' | 'number' | 'currency' | 'ratio'
  }[]
  equityCurves: {
    strategyId: string
    data: EquityPoint[]
  }[]
  correlationMatrix: number[][]
  riskReturnScatter: {
    strategyId: string
    risk: number
    return: number
  }[]
}

export interface StrategyPortfolio {
  id: string
  name: string
  description?: string
  strategies: {
    strategyId: string
    allocation: number
    parameters?: Record<string, any>
  }[]
  rebalanceFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly'
  riskBudget?: number
  constraints?: {
    maxAllocation?: number
    minAllocation?: number
    maxStrategies?: number
    correlationLimit?: number
  }
  performance?: StrategyPerformance
  createdAt: number
  lastModified?: number
}

export interface StrategySignal {
  id: string
  strategyId: string
  timestamp: number
  type: 'buy' | 'sell' | 'hold'
  confidence: number
  price: number
  quantity?: number
  reason: string
  metadata?: {
    indicators?: Record<string, any>
    conditions?: string[]
    riskLevel?: number
  }
  executed?: boolean
  executedAt?: number
  executedPrice?: number
}

export interface StrategyAlert {
  id: string
  strategyId: string
  type: 'signal' | 'error' | 'warning' | 'performance'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  message: string
  timestamp: number
  acknowledged?: boolean
  acknowledgedAt?: number
  metadata?: Record<string, any>
}

// Enums and Types
export type StrategyType = 'built-in' | 'custom' | 'template' | 'imported'
export type StrategyCategory = 
  | 'trend' 
  | 'momentum' 
  | 'mean-reversion' 
  | 'arbitrage' 
  | 'market-making' 
  | 'breakout' 
  | 'grid' 
  | 'dca' 
  | 'custom'

export type StrategyStatus = 'draft' | 'testing' | 'validated' | 'live' | 'paused' | 'archived'

export type OptimizationMethod = 'grid' | 'genetic' | 'particle-swarm' | 'bayesian' | 'random'

export type ObjectiveFunction = 
  | 'totalReturn'
  | 'sharpeRatio'
  | 'sortinoRatio'
  | 'calmarRatio'
  | 'profitFactor'
  | 'maxDrawdown'
  | 'winRate'
  | 'expectancy'

// Default values and constants
export const DEFAULT_STRATEGY_PARAMETERS: StrategyParameter[] = [
  {
    name: 'initialCapital',
    type: 'number',
    default: 10000,
    min: 1000,
    max: 1000000,
    description: 'Initial capital for backtesting',
    required: true
  },
  {
    name: 'commission',
    type: 'number',
    default: 0.001,
    min: 0,
    max: 0.01,
    step: 0.0001,
    description: 'Commission rate per trade',
    required: true
  },
  {
    name: 'slippage',
    type: 'number',
    default: 0.0005,
    min: 0,
    max: 0.005,
    step: 0.0001,
    description: 'Slippage rate per trade'
  }
]

export const STRATEGY_CATEGORIES: Array<{ value: StrategyCategory; label: string; description: string }> = [
  {
    value: 'trend',
    label: 'Trend Following',
    description: 'Strategies that follow market trends'
  },
  {
    value: 'momentum',
    label: 'Momentum',
    description: 'Strategies based on price momentum'
  },
  {
    value: 'mean-reversion',
    label: 'Mean Reversion',
    description: 'Strategies that bet on price returning to mean'
  },
  {
    value: 'arbitrage',
    label: 'Arbitrage',
    description: 'Strategies that exploit price differences'
  },
  {
    value: 'market-making',
    label: 'Market Making',
    description: 'Strategies that provide liquidity'
  },
  {
    value: 'breakout',
    label: 'Breakout',
    description: 'Strategies that trade price breakouts'
  },
  {
    value: 'grid',
    label: 'Grid Trading',
    description: 'Strategies using grid-based orders'
  },
  {
    value: 'dca',
    label: 'Dollar Cost Averaging',
    description: 'Strategies using regular purchases'
  },
  {
    value: 'custom',
    label: 'Custom',
    description: 'Custom strategy implementations'
  }
]

export const RISK_LEVELS: Array<{ value: string; label: string; color: string }> = [
  { value: 'low', label: 'Low Risk', color: 'green' },
  { value: 'medium', label: 'Medium Risk', color: 'yellow' },
  { value: 'high', label: 'High Risk', color: 'red' }
]

export const TRADING_STYLES: Array<{ value: string; label: string; description: string }> = [
  {
    value: 'scalping',
    label: 'Scalping',
    description: 'Very short-term trades (seconds to minutes)'
  },
  {
    value: 'day',
    label: 'Day Trading',
    description: 'Intraday trades (minutes to hours)'
  },
  {
    value: 'swing',
    label: 'Swing Trading',
    description: 'Short to medium-term trades (days to weeks)'
  },
  {
    value: 'position',
    label: 'Position Trading',
    description: 'Long-term trades (weeks to months)'
  }
]

// Type guards
export const isStrategy = (obj: any): obj is Strategy => {
  return obj && 
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.code === 'string' &&
    typeof obj.type === 'string' &&
    typeof obj.category === 'string'
}

export const isStrategyTemplate = (obj: any): obj is StrategyTemplate => {
  return obj &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.code === 'string' &&
    Array.isArray(obj.parameters)
}

export const isBacktestResult = (obj: any): obj is StrategyBacktestResult => {
  return obj &&
    typeof obj.id === 'string' &&
    typeof obj.strategyId === 'string' &&
    obj.performance &&
    Array.isArray(obj.trades) &&
    Array.isArray(obj.equityCurve)
}

// Utility functions
export const calculateSharpeRatio = (returns: number[], riskFreeRate: number = 0): number => {
  if (returns.length === 0) return 0
  
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
  const stdDev = Math.sqrt(variance)
  
  return stdDev === 0 ? 0 : (avgReturn - riskFreeRate) / stdDev
}

export const calculateMaxDrawdown = (equityCurve: EquityPoint[]): number => {
  if (equityCurve.length === 0) return 0
  
  let maxDrawdown = 0
  let peak = equityCurve[0].equity
  
  for (const point of equityCurve) {
    if (point.equity > peak) {
      peak = point.equity
    }
    
    const drawdown = (peak - point.equity) / peak
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown
    }
  }
  
  return maxDrawdown
}

export const formatPerformanceMetric = (value: number, type: string): string => {
  switch (type) {
    case 'percentage':
      return `${(value * 100).toFixed(2)}%`
    case 'currency':
      return `$${value.toLocaleString()}`
    case 'ratio':
      return value.toFixed(3)
    default:
      return value.toFixed(2)
  }
}

export const getStrategyRiskLevel = (performance: StrategyPerformance): 'low' | 'medium' | 'high' => {
  const { maxDrawdown, volatility } = performance
  
  if (maxDrawdown > 0.3 || volatility > 0.4) return 'high'
  if (maxDrawdown > 0.15 || volatility > 0.2) return 'medium'
  return 'low'
}

export const validateStrategyCode = (code: string): StrategyValidationResult => {
  const errors: StrategyValidationError[] = []
  const warnings: StrategyValidationWarning[] = []
  const suggestions: string[] = []
  
  // Basic syntax validation
  try {
    new Function(code)
  } catch {
    errors.push({
      line: 1,
      message: 'Syntax error in strategy code',
      type: 'syntax',
      severity: 'error',
      suggestion: 'Check for missing brackets, semicolons, or invalid syntax'
    })
  }
  
  // Check for required methods
  const requiredMethods = ['init', 'update', 'check']
  for (const method of requiredMethods) {
    if (!code.includes(method)) {
      errors.push({
        line: 1,
        message: `Missing required method: ${method}`,
        type: 'logic',
        severity: 'error',
        suggestion: `Add the ${method} method to your strategy`
      })
    }
  }
  
  // Performance suggestions
  if (code.includes('console.log')) {
    warnings.push({
      line: 1,
      message: 'Console.log statements found',
      type: 'performance',
      suggestion: 'Remove console.log statements for better performance'
    })
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    suggestions
  }
}