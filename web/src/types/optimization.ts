// Optimization Types
export interface OptimizationRequest {
  strategyId: string
  optimizationMetric: OptimizationMetric
  parameters: Record<string, ParameterRange>
  dataSource: DataSource
  portfolio: PortfolioConfig
  optimization: OptimizationConfig
}

export interface ParameterRange {
  type: 'range' | 'values'
  min?: number
  max?: number
  step?: number
  values?: (number | string | boolean)[]
}

export interface DataSource {
  type: 'csv' | 'database' | 'api'
  file?: File
  symbol?: string
  startDate: string
  endDate: string
  timeframe?: string
}

export interface PortfolioConfig {
  initialCapital: number
  tradingFee: number
  slippage?: number
  maxPositionSize?: number
}

export interface OptimizationConfig {
  maxCombinations: number
  parallelJobs: number
  randomSeed?: number
  enableEarlyStopping: boolean
  saveAllResults: boolean
  timeout?: number
}

export interface OptimizationResult {
  id: string
  strategyId: string
  status: OptimizationStatus
  startTime: string
  endTime?: string
  duration?: number
  totalCombinations: number
  completedCombinations: number
  bestParameters: Record<string, number | string | boolean>
  bestPerformance: PerformanceMetrics
  results: OptimizationPoint[]
  summary: OptimizationSummary
  error?: string
}

export interface OptimizationPoint {
  id: string
  parameters: Record<string, number | string | boolean>
  performance: PerformanceMetrics
  trades: number
  duration: number
  rank?: number
}

export interface PerformanceMetrics {
  totalReturn: number
  annualizedReturn: number
  sharpeRatio: number
  calmarRatio: number
  sortinoRatio: number
  maxDrawdown: number
  volatility: number
  profitFactor: number
  winRate: number
  avgWin: number
  avgLoss: number
  totalTrades: number
  winningTrades: number
  losingTrades: number
  largestWin: number
  largestLoss: number
  consecutiveWins: number
  consecutiveLosses: number
  recoveryFactor: number
  expectancy: number
}

export interface OptimizationSummary {
  totalCombinations: number
  validCombinations: number
  invalidCombinations: number
  bestMetricValue: number
  worstMetricValue: number
  averageMetricValue: number
  medianMetricValue: number
  standardDeviation: number
  improvementOverBaseline?: number
  convergenceInfo?: ConvergenceInfo
}

export interface ConvergenceInfo {
  converged: boolean
  iterations: number
  tolerance: number
  finalImprovement: number
}

export interface OptimizationProgress {
  completed: number
  total: number
  percentage: number
  elapsed: number
  remaining: number
  speed: number
  currentBest: OptimizationPoint | null
  recentResults: OptimizationPoint[]
  status: OptimizationStatus
}

export interface OptimizationTemplate {
  id: string
  name: string
  description: string
  strategyId: string
  parameters: Record<string, ParameterRange>
  optimization: OptimizationConfig
  tags: string[]
  createdAt: string
  updatedAt: string
  author: string
  isPublic: boolean
}

export interface HeatmapData {
  xParameter: string
  yParameter: string
  xValues: (number | string | boolean)[]
  yValues: (number | string | boolean)[]
  data: Map<string, HeatmapPoint>
  minValue: number
  maxValue: number
  colorScale: ColorScale
}

export interface HeatmapPoint {
  xValue: number | string | boolean
  yValue: number | string | boolean
  value: number
  result: OptimizationPoint
  rank: number
  color: string
}

export interface ParameterSweepConfig {
  strategyId: string
  optimizationMetric: OptimizationMetric
  parameters: Record<string, ParameterConfig>
  csvFile: File | null
  startDate: string
  endDate: string
  initialCapital: number
  tradingFee: number
  maxCombinations: number
  parallelJobs: number
  randomSeed: number | null
  enableEarlyStopping: boolean
  saveAllResults: boolean
}

export interface ParameterConfig {
  enabled: boolean
  fixed?: number | string | boolean
  min?: number
  max?: number
  step?: number
  values?: (number | string | boolean)[]
}

export interface OptimizationComparison {
  id: string
  name: string
  optimizations: string[]
  metrics: OptimizationMetric[]
  results: ComparisonResult[]
  summary: ComparisonSummary
  createdAt: string
}

export interface ComparisonResult {
  optimizationId: string
  strategyName: string
  bestParameters: Record<string, number | string | boolean>
  performance: PerformanceMetrics
  rank: Record<OptimizationMetric, number>
  scores: Record<OptimizationMetric, number>
}

export interface ComparisonSummary {
  totalOptimizations: number
  bestOverall: string
  worstOverall: string
  averagePerformance: PerformanceMetrics
  correlations: Record<string, number>
  rankings: Record<OptimizationMetric, string[]>
}

export interface OptimizationExport {
  format: ExportFormat
  includeRawData: boolean
  includeCharts: boolean
  includeStatistics: boolean
  compression: CompressionType
  filename?: string
}

export interface OptimizationImport {
  file: File
  format: ImportFormat
  validateData: boolean
  mergeStrategy: MergeStrategy
}

export interface OptimizationAlert {
  id: string
  optimizationId: string
  type: AlertType
  condition: AlertCondition
  threshold: number
  message: string
  isActive: boolean
  triggeredAt?: string
}

export interface AlertCondition {
  metric: OptimizationMetric
  operator: ComparisonOperator
  value: number
  duration?: number
}

// Enums
export enum OptimizationStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum OptimizationMetric {
  TOTAL_RETURN = 'totalReturn',
  ANNUALIZED_RETURN = 'annualizedReturn',
  SHARPE_RATIO = 'sharpeRatio',
  CALMAR_RATIO = 'calmarRatio',
  SORTINO_RATIO = 'sortinoRatio',
  MAX_DRAWDOWN = 'maxDrawdown',
  PROFIT_FACTOR = 'profitFactor',
  WIN_RATE = 'winRate',
  EXPECTANCY = 'expectancy',
  RECOVERY_FACTOR = 'recoveryFactor'
}

export enum ColorScale {
  LINEAR = 'linear',
  LOGARITHMIC = 'log',
  PERCENTILE = 'percentile'
}

export enum ExportFormat {
  JSON = 'json',
  CSV = 'csv',
  EXCEL = 'excel',
  PDF = 'pdf'
}

export enum ImportFormat {
  JSON = 'json',
  CSV = 'csv',
  EXCEL = 'excel'
}

export enum CompressionType {
  NONE = 'none',
  ZIP = 'zip',
  GZIP = 'gzip'
}

export enum MergeStrategy {
  REPLACE = 'replace',
  MERGE = 'merge',
  SKIP = 'skip'
}

export enum AlertType {
  PERFORMANCE_THRESHOLD = 'performance_threshold',
  COMPLETION = 'completion',
  ERROR = 'error',
  TIMEOUT = 'timeout'
}

export enum ComparisonOperator {
  GREATER_THAN = 'gt',
  LESS_THAN = 'lt',
  GREATER_EQUAL = 'gte',
  LESS_EQUAL = 'lte',
  EQUAL = 'eq',
  NOT_EQUAL = 'ne'
}

// Type Guards
export function isOptimizationResult(obj: unknown): obj is OptimizationResult {
  return obj !== null &&
    typeof obj === 'object' &&
    'id' in obj &&
    'strategyId' in obj &&
    'status' in obj &&
    'startTime' in obj &&
    'totalCombinations' in obj &&
    'results' in obj &&
    typeof (obj as any).id === 'string' &&
    typeof (obj as any).strategyId === 'string' &&
    Object.values(OptimizationStatus).includes((obj as any).status) &&
    typeof (obj as any).startTime === 'string' &&
    typeof (obj as any).totalCombinations === 'number' &&
    Array.isArray((obj as any).results)
}

export function isOptimizationPoint(obj: unknown): obj is OptimizationPoint {
  return obj !== null &&
    typeof obj === 'object' &&
    'id' in obj &&
    'parameters' in obj &&
    'performance' in obj &&
    'trades' in obj &&
    typeof (obj as any).id === 'string' &&
    typeof (obj as any).parameters === 'object' &&
    typeof (obj as any).performance === 'object' &&
    typeof (obj as any).trades === 'number'
}

export function isPerformanceMetrics(obj: unknown): obj is PerformanceMetrics {
  return obj !== null &&
    typeof obj === 'object' &&
    'totalReturn' in obj &&
    'sharpeRatio' in obj &&
    'maxDrawdown' in obj &&
    typeof (obj as any).totalReturn === 'number' &&
    typeof (obj as any).sharpeRatio === 'number' &&
    typeof (obj as any).maxDrawdown === 'number'
}

// Utility Functions
export function calculateOptimizationScore(
  performance: PerformanceMetrics,
  weights: Partial<Record<keyof PerformanceMetrics, number>> = {}
): number {
  const defaultWeights = {
    totalReturn: 0.3,
    sharpeRatio: 0.25,
    maxDrawdown: 0.2,
    profitFactor: 0.15,
    winRate: 0.1
  }
  
  const finalWeights = { ...defaultWeights, ...weights }
  
  let score = 0
  score += performance.totalReturn * finalWeights.totalReturn!
  score += performance.sharpeRatio * finalWeights.sharpeRatio! * 10
  score -= Math.abs(performance.maxDrawdown) * finalWeights.maxDrawdown!
  score += (performance.profitFactor - 1) * finalWeights.profitFactor! * 20
  score += performance.winRate * finalWeights.winRate! * 100
  
  return score
}

export function rankOptimizationResults(
  results: OptimizationPoint[],
  metric: OptimizationMetric
): OptimizationPoint[] {
  const isLowerBetter = metric === OptimizationMetric.MAX_DRAWDOWN
  
  return results
    .sort((a, b) => {
      const aValue = a.performance[metric] || 0
      const bValue = b.performance[metric] || 0
      return isLowerBetter ? aValue - bValue : bValue - aValue
    })
    .map((result, index) => ({
      ...result,
      rank: index + 1
    }))
}

export function generateParameterCombinations(
  parameters: Record<string, ParameterRange>,
  maxCombinations: number = 1000
): Record<string, number | string | boolean>[] {
  const paramNames = Object.keys(parameters)
  const paramValues: Record<string, (number | string | boolean)[]> = {}
  
  // Generate value arrays for each parameter
  for (const name of paramNames) {
    const param = parameters[name]
    
    if (param.type === 'range' && param.min !== undefined && param.max !== undefined) {
      const values = []
      const step = param.step || 1
      
      for (let value = param.min; value <= param.max; value += step) {
        values.push(value)
        if (values.length >= 100) break // Prevent too many values
      }
      
      paramValues[name] = values
    } else if (param.type === 'values' && param.values) {
      paramValues[name] = param.values
    }
  }
  
  // Generate all combinations
  const combinations: Record<string, any>[] = []
  
  function generateCombos(index: number, current: Record<string, any>) {
    if (index >= paramNames.length) {
      combinations.push({ ...current })
      return
    }
    
    if (combinations.length >= maxCombinations) {
      return
    }
    
    const paramName = paramNames[index]
    const values = paramValues[paramName] || []
    
    for (const value of values) {
      current[paramName] = value
      generateCombos(index + 1, current)
      
      if (combinations.length >= maxCombinations) {
        break
      }
    }
  }
  
  generateCombos(0, {})
  
  // Shuffle if we hit the limit
  if (combinations.length >= maxCombinations) {
    for (let i = combinations.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[combinations[i], combinations[j]] = [combinations[j], combinations[i]]
    }
  }
  
  return combinations.slice(0, maxCombinations)
}

export function estimateOptimizationTime(
  combinations: number,
  avgTimePerTest: number = 2,
  parallelJobs: number = 4
): number {
  return (combinations * avgTimePerTest) / parallelJobs
}

export function formatOptimizationDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`
  } else {
    return `${secs}s`
  }
}

export function getMetricDisplayName(metric: OptimizationMetric): string {
  const names: Record<OptimizationMetric, string> = {
    [OptimizationMetric.TOTAL_RETURN]: 'Total Return',
    [OptimizationMetric.ANNUALIZED_RETURN]: 'Annualized Return',
    [OptimizationMetric.SHARPE_RATIO]: 'Sharpe Ratio',
    [OptimizationMetric.CALMAR_RATIO]: 'Calmar Ratio',
    [OptimizationMetric.SORTINO_RATIO]: 'Sortino Ratio',
    [OptimizationMetric.MAX_DRAWDOWN]: 'Max Drawdown',
    [OptimizationMetric.PROFIT_FACTOR]: 'Profit Factor',
    [OptimizationMetric.WIN_RATE]: 'Win Rate',
    [OptimizationMetric.EXPECTANCY]: 'Expectancy',
    [OptimizationMetric.RECOVERY_FACTOR]: 'Recovery Factor'
  }
  
  return names[metric] || metric
}

export function getMetricUnit(metric: OptimizationMetric): string {
  const units: Record<OptimizationMetric, string> = {
    [OptimizationMetric.TOTAL_RETURN]: '%',
    [OptimizationMetric.ANNUALIZED_RETURN]: '%',
    [OptimizationMetric.SHARPE_RATIO]: '',
    [OptimizationMetric.CALMAR_RATIO]: '',
    [OptimizationMetric.SORTINO_RATIO]: '',
    [OptimizationMetric.MAX_DRAWDOWN]: '%',
    [OptimizationMetric.PROFIT_FACTOR]: '',
    [OptimizationMetric.WIN_RATE]: '%',
    [OptimizationMetric.EXPECTANCY]: '',
    [OptimizationMetric.RECOVERY_FACTOR]: ''
  }
  
  return units[metric] || ''
}

// Default Values
export const DEFAULT_OPTIMIZATION_CONFIG: OptimizationConfig = {
  maxCombinations: 1000,
  parallelJobs: 4,
  enableEarlyStopping: true,
  saveAllResults: false,
  timeout: 3600 // 1 hour
}

export const DEFAULT_PORTFOLIO_CONFIG: PortfolioConfig = {
  initialCapital: 10000,
  tradingFee: 0.1,
  slippage: 0.05,
  maxPositionSize: 1.0
}

export const OPTIMIZATION_METRICS = Object.values(OptimizationMetric)
export const COLOR_SCALES = Object.values(ColorScale)
export const EXPORT_FORMATS = Object.values(ExportFormat)
export const IMPORT_FORMATS = Object.values(ImportFormat)