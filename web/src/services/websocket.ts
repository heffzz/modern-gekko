import { io, Socket } from 'socket.io-client'
import type { Candle, Trade } from '@/types'

class WebSocketService {
  private socket: Socket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000

  connect(url: string = 'http://localhost:3000'): void {
    if (this.socket?.connected) {
      return
    }

    this.socket = io(url, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
    })

    this.setupEventListeners()
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  private setupEventListeners(): void {
    if (!this.socket) return

    this.socket.on('connect', () => {
      console.log('WebSocket connected')
      this.reconnectAttempts = 0
    })

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason)
    })

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error)
      this.reconnectAttempts++
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached')
      }
    })
  }

  // Subscribe to real-time candle updates
  subscribeToCandles(
    symbol: string,
    timeframe: string,
    callback: (candle: Candle) => void
  ): void {
    if (!this.socket) {
      console.error('WebSocket not connected')
      return
    }

    const channel = `candles:${symbol}:${timeframe}`
    this.socket.on(channel, callback)
    this.socket.emit('subscribe', { channel, symbol, timeframe })
  }

  // Unsubscribe from candle updates
  unsubscribeFromCandles(symbol: string, timeframe: string): void {
    if (!this.socket) return

    const channel = `candles:${symbol}:${timeframe}`
    this.socket.off(channel)
    this.socket.emit('unsubscribe', { channel })
  }

  // Subscribe to trade updates
  subscribeToTrades(callback: (trade: Trade) => void): void {
    if (!this.socket) {
      console.error('WebSocket not connected')
      return
    }

    this.socket.on('trade', callback)
  }

  // Subscribe to portfolio updates
  subscribeToPortfolio(callback: (portfolio: any) => void): void {
    if (!this.socket) {
      console.error('WebSocket not connected')
      return
    }

    this.socket.on('portfolio', callback)
  }

  // Subscribe to strategy status updates
  subscribeToStrategyStatus(callback: (status: any) => void): void {
    if (!this.socket) {
      console.error('WebSocket not connected')
      return
    }

    this.socket.on('strategy:status', callback)
  }

  // Send strategy commands
  sendStrategyCommand(command: string, data?: any): void {
    if (!this.socket) {
      console.error('WebSocket not connected')
      return
    }

    this.socket.emit('strategy:command', { command, data })
  }

  // Get connection status
  get isConnected(): boolean {
    return this.socket?.connected ?? false
  }

  // Get socket instance for custom events
  get socketInstance(): Socket | null {
    return this.socket
  }
}

export const websocketService = new WebSocketService()
export default websocketService