import axios from 'axios'
import type { ApiResponse, ServerHealth, BacktestResult, Strategy, Indicator } from '@/types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error)
    return Promise.reject(error)
  }
)

export const apiService = {
  // Health endpoint
  async getHealth(): Promise<ServerHealth> {
    const response = await api.get<ApiResponse<ServerHealth>>('/health')
    return response.data.data!
  },

  // Backtest endpoints
  async runBacktest(data: {
    strategy: string
    data: File | string
    parameters?: Record<string, any>
  }): Promise<BacktestResult> {
    const formData = new FormData()
    formData.append('strategy', data.strategy)
    
    if (data.data instanceof File) {
      formData.append('data', data.data)
    } else {
      formData.append('data', data.data)
    }
    
    if (data.parameters) {
      formData.append('parameters', JSON.stringify(data.parameters))
    }

    const response = await api.post<ApiResponse<BacktestResult>>('/backtest', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data.data!
  },

  async getBacktests(): Promise<BacktestResult[]> {
    const response = await api.get<ApiResponse<BacktestResult[]>>('/backtests')
    return response.data.data!
  },

  async startBacktest(request: any): Promise<BacktestResult> {
    const response = await api.post<ApiResponse<BacktestResult>>('/backtests', request)
    return response.data.data!
  },

  async stopBacktest(id: string): Promise<void> {
    await api.post(`/backtests/${id}/stop`)
  },

  async deleteBacktest(id: string): Promise<void> {
    await api.delete(`/backtests/${id}`)
  },

  // Strategy endpoints
  async getStrategies(): Promise<Strategy[]> {
    const response = await api.get<ApiResponse<Strategy[]>>('/strategies')
    return response.data.data!
  },

  async getStrategy(id: string): Promise<Strategy> {
    const response = await api.get<ApiResponse<Strategy>>(`/strategies/${id}`)
    return response.data.data!
  },

  async saveStrategy(strategy: Omit<Strategy, 'id' | 'createdAt' | 'updatedAt'>): Promise<Strategy> {
    const response = await api.post<ApiResponse<Strategy>>('/strategies', strategy)
    return response.data.data!
  },

  async updateStrategy(id: string, strategy: Partial<Strategy>): Promise<Strategy> {
    const response = await api.put<ApiResponse<Strategy>>(`/strategies/${id}`, strategy)
    return response.data.data!
  },

  async deleteStrategy(id: string): Promise<void> {
    await api.delete(`/strategies/${id}`)
  },

  // Indicator endpoints
  async getIndicators(): Promise<Indicator[]> {
    const response = await api.get<ApiResponse<Indicator[]>>('/indicators')
    return response.data.data!
  },

  async getIndicatorPreview(
    name: string,
    params: Record<string, any>,
    data: number[]
  ): Promise<number[]> {
    const response = await api.post<ApiResponse<number[]>>(`/indicators/${name}/preview`, {
      params,
      data,
    })
    return response.data.data!
  },

  // Market data endpoints
  async getCandles(
    symbol: string,
    timeframe: string,
    from?: number,
    to?: number
  ): Promise<any[]> {
    const response = await api.get<ApiResponse<any[]>>('/candles', {
      params: { symbol, timeframe, from, to },
    })
    return response.data.data!
  },
}

export default api