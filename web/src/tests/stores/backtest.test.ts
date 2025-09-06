import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useBacktestStore } from '@/stores/backtest'
import { BacktestStatus, type BacktestRequest, type BacktestResult } from '@/types'

// Mock the main store
vi.mock('@/stores/main', () => ({
  useMainStore: () => ({
    addNotification: vi.fn()
  })
}))

// Mock the API service
vi.mock('@/services/api', () => ({
  apiService: {
    getBacktests: vi.fn(),
    startBacktest: vi.fn(),
    stopBacktest: vi.fn(),
    deleteBacktest: vi.fn(),
    runBacktest: vi.fn()
  }
}))

describe('Backtest Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('should initialize with default state', () => {
    const store = useBacktestStore()
    
    expect(store.backtests).toEqual([])
    expect(store.currentBacktest).toBeNull()
    expect(store.isLoading).toBe(false)
    expect(store.isRunning).toBe(false)
    expect(store.progress).toBeNull()
  })

  it('should load backtests successfully', async () => {
    const { apiService } = await import('@/services/api')
    const mockBacktests: BacktestResult[] = [
      {
        id: 'test-1',
        trades: [],
        equity: [],
        metrics: {
          totalTrades: 100,
          winRate: 0.65,
          profit: 1500,
          maxDrawdown: 0.05,
          roi: 0.15,
          totalReturn: 0.15,
          profitFactor: 1.8,
          sharpeRatio: 1.2,
          finalCapital: 11500
        }
      }
    ]

    vi.mocked(apiService.getBacktests).mockResolvedValue(mockBacktests)
    
    const store = useBacktestStore()
    await store.loadBacktests()
    
    expect(store.backtests).toEqual(mockBacktests)
    expect(store.isLoading).toBe(false)
  })

  it('should handle backtest loading error', async () => {
    const { apiService } = await import('@/services/api')
    vi.mocked(apiService.getBacktests).mockRejectedValue(new Error('API Error'))
    
    const store = useBacktestStore()
    
    await expect(store.loadBacktests()).rejects.toThrow('API Error')
    expect(store.backtests).toEqual([])
  })

  it('should start backtest successfully', async () => {
    const { apiService } = await import('@/services/api')
    const mockRequest: BacktestRequest = {
      strategy: 'strategy-1',
      candles: [],
      parameters: { period: 20 }
    }

    const mockResult: BacktestResult = {
      id: 'test-1',
      trades: [],
      equity: [],
      metrics: {
        totalTrades: 0,
        winRate: 0,
        profit: 0,
        maxDrawdown: 0,
        roi: 0,
        totalReturn: 0,
        profitFactor: 0,
        sharpeRatio: 0,
        finalCapital: 10000
      }
    }

    vi.mocked(apiService.startBacktest).mockResolvedValue(mockResult)
    
    const store = useBacktestStore()
    const result = await store.startBacktest(mockRequest)
    
    expect(result).toEqual(mockResult)
    expect(store.backtests).toHaveLength(1)
    expect(store.backtests[0]).toEqual(mockResult)
    expect(store.currentBacktest).toEqual(mockResult)
    expect(store.isRunning).toBe(true)
  })

  it('should stop backtest successfully', async () => {
    const { apiService } = await import('@/services/api')
    const store = useBacktestStore()
    store.isRunning = true
    
    vi.mocked(apiService.stopBacktest).mockResolvedValue()
    
    await store.stopBacktest('test-1')
    
    expect(store.isRunning).toBe(false)
    expect(store.progress).toBeNull()
  })

  it('should delete backtest successfully', async () => {
    const { apiService } = await import('@/services/api')
    const store = useBacktestStore()
    const mockBacktest: BacktestResult = {
      id: 'test-1',
      trades: [],
      equity: [],
      metrics: {
        totalTrades: 100,
        winRate: 0.65,
        profit: 1500,
        maxDrawdown: 0.05,
        roi: 0.15,
        totalReturn: 0.15,
        profitFactor: 1.8,
        sharpeRatio: 1.2,
        finalCapital: 11500
      }
    }
    
    // Simulate having a backtest loaded
    store.backtests.push(mockBacktest)
    store.setCurrentBacktest(mockBacktest)
    
    // Mock the API service deleteBacktest method
    vi.mocked(apiService.deleteBacktest).mockResolvedValue()
    
    await store.deleteBacktest('test-1')
    
    expect(store.backtests).not.toContain(mockBacktest)
    expect(store.currentBacktest).toBe(null)
    expect(apiService.deleteBacktest).toHaveBeenCalledWith('test-1')
  })

  it('should filter backtests correctly', () => {
    const store = useBacktestStore()
    const mockBacktests: any[] = [
      {
        id: 'test-1',
        status: BacktestStatus.COMPLETED,
        strategyId: 'strategy-1',
        dataSource: { symbol: 'BTCUSD' },
        trades: [],
        equity: [],
        metrics: {
          totalTrades: 100,
          winRate: 0.65,
          profit: 1500,
          maxDrawdown: 0.05,
          roi: 0.15,
          sharpeRatio: 1.2
         }
      },
      {
        id: 'test-2',
        status: BacktestStatus.RUNNING,
        strategyId: 'strategy-2',
        dataSource: { symbol: 'ETHUSD' },
        trades: [],
        equity: [],
        metrics: {
          totalTrades: 0,
          winRate: 0,
          profit: 0,
          maxDrawdown: 0,
          roi: 0,
          sharpeRatio: 0
        }
      }
    ]
    
    store.backtests = mockBacktests
    
    // Test status filter
    store.setFilters({ status: [BacktestStatus.COMPLETED] })
    expect(store.filteredBacktests).toHaveLength(1)
    expect(store.filteredBacktests[0].id).toBe('test-1')
    
    // Test strategy filter
    store.setFilters({ status: [], strategy: ['strategy-2'] })
    expect(store.filteredBacktests).toHaveLength(1)
    expect(store.filteredBacktests[0].id).toBe('test-2')
    
    // Test search filter
    store.setFilters({ status: [], strategy: [], search: 'BTCUSD' })
    expect(store.filteredBacktests).toHaveLength(1)
    expect(store.filteredBacktests[0].id).toBe('test-1')
  })

  it('should compute running backtests correctly', () => {
    const store = useBacktestStore()
    const mockBacktests: any[] = [
      {
        id: 'test-1',
        status: 'completed',
        trades: [],
        equity: [],
        metrics: {
          totalTrades: 100,
          winRate: 0.65,
          profit: 1500,
          maxDrawdown: 0.05,
          roi: 0.15,
          sharpeRatio: 1.2
         }
      },
      {
        id: 'test-2',
        status: 'running',
        trades: [],
        equity: [],
        metrics: {
          totalTrades: 0,
          winRate: 0,
          profit: 0,
          maxDrawdown: 0,
          roi: 0,
          sharpeRatio: 0
        }
      }
    ]
    
    store.backtests = mockBacktests
    
    expect(store.runningBacktests).toHaveLength(1)
    expect(store.runningBacktests[0].id).toBe('test-2')
  })

  it('should validate backtest request correctly', () => {
    const store = useBacktestStore()
    
    // Valid request
    const validRequest: BacktestRequest = {
      strategy: 'strategy-1',
      candles: [],
      parameters: { period: 20 },
      startDate: '2024-01-01',
      endDate: '2024-01-31'
    }
    
    expect(store.validateRequest(validRequest)).toEqual([])
    
    // Invalid request - missing strategy
    const invalidRequest: BacktestRequest = {
      strategy: '',
      candles: [],
      parameters: { period: 20 },
      startDate: '2024-01-01',
      endDate: '2024-01-31'
    }
    
    const errors = store.validateRequest(invalidRequest)
    expect(errors).toContain('Strategy is required')
  })
})