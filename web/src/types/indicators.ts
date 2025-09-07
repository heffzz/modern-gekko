// Indicator parameter types
export interface IndicatorParameter {
  name: string
  type: 'number' | 'string' | 'boolean' | 'select'
  default: any
  min?: number
  max?: number
  step?: number
  options?: Array<{ label: string; value: any }>
  description?: string
  required?: boolean
}

// Indicator definition
export interface Indicator {
  name: string
  displayName: string
  category: 'trend' | 'momentum' | 'volatility' | 'volume' | 'oscillator' | 'support_resistance'
  description: string
  parameters: IndicatorParameter[]
  timeComplexity: string
  memoryUsage: 'Low' | 'Medium' | 'High'
  outputType: 'line' | 'oscillator' | 'multi-line' | 'bands' | 'histogram'
  scale: 'price' | 'separate' | 'volume'
  range?: { min: number; max: number }
}

// Configured indicator instance
export interface ConfiguredIndicator extends Omit<Indicator, 'parameters'> {
  id: string
  indicatorId: string
  parameters: Record<string, any>
  visible: boolean
  color: string
  lineWidth?: number
  opacity?: number
  style?: 'solid' | 'dashed' | 'dotted'
  values?: (number | null)[]
  overlay?: boolean
}

// Indicator preview data
export interface IndicatorPreviewData {
  values: (number | null)[]
  dataPoints: number
  timeRange: string
  lastValue: number | null
  statistics?: {
    min: number
    max: number
    mean: number
    stdDev: number
    [key: string]: number
  }
}

// Indicator calculation result
export interface IndicatorResult {
  name: string
  values: (number | null)[]
  timestamps: number[]
  metadata?: {
    parameters: Record<string, any>
    calculationTime: number
    dataPoints: number
    [key: string]: any
  }
}

// Multi-line indicator result (e.g., MACD, Stochastic)
export interface MultiLineIndicatorResult {
  name: string
  lines: {
    [lineName: string]: {
      values: (number | null)[]
      color?: string
      style?: 'solid' | 'dashed' | 'dotted'
    }
  }
  timestamps: number[]
  metadata?: {
    parameters: Record<string, any>
    calculationTime: number
    dataPoints: number
    [key: string]: any
  }
}

// Bands indicator result (e.g., Bollinger Bands)
export interface BandsIndicatorResult {
  name: string
  bands: {
    upper: (number | null)[]
    middle: (number | null)[]
    lower: (number | null)[]
  }
  timestamps: number[]
  metadata?: {
    parameters: Record<string, any>
    calculationTime: number
    dataPoints: number
    [key: string]: any
  }
}

// Histogram indicator result (e.g., MACD histogram)
export interface HistogramIndicatorResult {
  name: string
  values: (number | null)[]
  timestamps: number[]
  positiveColor?: string
  negativeColor?: string
  metadata?: {
    parameters: Record<string, any>
    calculationTime: number
    dataPoints: number
    [key: string]: any
  }
}

// Union type for all indicator results
export type AnyIndicatorResult = 
  | IndicatorResult 
  | MultiLineIndicatorResult 
  | BandsIndicatorResult 
  | HistogramIndicatorResult

// Indicator calculation request
export interface IndicatorCalculationRequest {
  indicator: string
  parameters: Record<string, any>
  data: {
    timestamps: number[]
    open: number[]
    high: number[]
    low: number[]
    close: number[]
    volume: number[]
  }
  options?: {
    startIndex?: number
    endIndex?: number
    outputFormat?: 'array' | 'object'
  }
}

// Indicator calculation response
export interface IndicatorCalculationResponse {
  success: boolean
  result?: AnyIndicatorResult
  error?: string
  executionTime?: number
}

// Indicator library state
export interface IndicatorLibraryState {
  availableIndicators: Indicator[]
  configuredIndicators: ConfiguredIndicator[]
  isLoading: boolean
  error: string | null
  lastUpdate: number | null
}

// Indicator preset
export interface IndicatorPreset {
  id: string
  name: string
  description: string
  indicators: Array<{
    indicator: string
    parameters: Record<string, any>
    display: {
      color: string
      visible: boolean
      lineWidth?: number
      opacity?: number
    }
  }>
  category: 'trend' | 'momentum' | 'volatility' | 'custom'
  isDefault?: boolean
  createdAt: number
  updatedAt: number
}

// Indicator performance metrics
export interface IndicatorPerformance {
  indicator: string
  parameters: Record<string, any>
  calculationTime: number
  memoryUsage: number
  dataPoints: number
  accuracy?: number
  timestamp: number
}

// Indicator validation result
export interface IndicatorValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
  suggestions?: string[]
}

// Indicator export format
export interface IndicatorExport {
  version: string
  timestamp: number
  indicators: ConfiguredIndicator[]
  presets?: IndicatorPreset[]
  metadata?: {
    exportedBy: string
    description?: string
    [key: string]: any
  }
}

// Chart overlay configuration
export interface ChartOverlayConfig {
  id: string
  type: 'indicator' | 'drawing' | 'annotation'
  indicator?: ConfiguredIndicator
  zIndex: number
  visible: boolean
  interactive: boolean
}

// Indicator color schemes
export interface IndicatorColorScheme {
  id: string
  name: string
  colors: string[]
  description?: string
  isDefault?: boolean
}

// Default color schemes
export const DEFAULT_COLOR_SCHEMES: IndicatorColorScheme[] = [
  {
    id: 'default',
    name: 'Default',
    colors: [
      '#3b82f6', // Blue
      '#ef4444', // Red
      '#10b981', // Green
      '#f59e0b', // Yellow
      '#8b5cf6', // Purple
      '#06b6d4', // Cyan
      '#f97316', // Orange
      '#84cc16'  // Lime
    ],
    isDefault: true
  },
  {
    id: 'professional',
    name: 'Professional',
    colors: [
      '#1f2937', // Gray-800
      '#dc2626', // Red-600
      '#059669', // Green-600
      '#d97706', // Yellow-600
      '#7c3aed', // Purple-600
      '#0891b2', // Cyan-600
      '#ea580c', // Orange-600
      '#65a30d'  // Lime-600
    ]
  },
  {
    id: 'colorful',
    name: 'Colorful',
    colors: [
      '#ff6b6b', // Coral
      '#4ecdc4', // Turquoise
      '#45b7d1', // Sky Blue
      '#96ceb4', // Mint
      '#feca57', // Yellow
      '#ff9ff3', // Pink
      '#54a0ff', // Blue
      '#5f27cd'  // Purple
    ]
  }
]

// Indicator categories with metadata
export const INDICATOR_CATEGORIES = {
  trend: {
    name: 'Trend',
    description: 'Indicators that identify market direction and trend strength',
    icon: 'TrendingUpIcon',
    color: '#3b82f6'
  },
  momentum: {
    name: 'Momentum',
    description: 'Indicators that measure the speed and strength of price movements',
    icon: 'BoltIcon',
    color: '#ef4444'
  },
  volatility: {
    name: 'Volatility',
    description: 'Indicators that measure market volatility and price dispersion',
    icon: 'ChartBarIcon',
    color: '#f59e0b'
  },
  volume: {
    name: 'Volume',
    description: 'Indicators based on trading volume analysis',
    icon: 'SpeakerWaveIcon',
    color: '#10b981'
  },
  oscillator: {
    name: 'Oscillator',
    description: 'Bounded indicators that oscillate between fixed values',
    icon: 'ArrowsUpDownIcon',
    color: '#8b5cf6'
  },
  support_resistance: {
    name: 'Support/Resistance',
    description: 'Indicators that identify key price levels',
    icon: 'Bars3BottomLeftIcon',
    color: '#06b6d4'
  }
} as const

// Type guards
export const isMultiLineResult = (result: AnyIndicatorResult): result is MultiLineIndicatorResult => {
  return 'lines' in result
}

export const isBandsResult = (result: AnyIndicatorResult): result is BandsIndicatorResult => {
  return 'bands' in result
}

export const isHistogramResult = (result: AnyIndicatorResult): result is HistogramIndicatorResult => {
  return 'values' in result && 'positiveColor' in result
}

export const isSimpleResult = (result: AnyIndicatorResult): result is IndicatorResult => {
  return 'values' in result && !('lines' in result) && !('bands' in result) && !('positiveColor' in result)
}