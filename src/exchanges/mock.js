/**
 * Mock Exchange Implementation
 *
 * This mock exchange simulates trading operations for backtesting purposes.
 * It provides realistic fee structures, slippage simulation, and order execution.
 */

import { EventEmitter } from 'events';

export default class MockExchange extends EventEmitter {
  constructor(config = {}) {
    super();

    this.name = 'Mock Exchange';
    this.config = {
      // Fee structure
      makerFee: config.makerFee || 0.001, // 0.1%
      takerFee: config.takerFee || 0.001, // 0.1%

      // Slippage simulation
      slippage: config.slippage || 0.0005, // 0.05%

      // Market conditions
      volatility: config.volatility || 0.01, // 1%

      // Order execution
      partialFills: config.partialFills || false,
      executionDelay: config.executionDelay || 0, // ms

      // Balance
      initialBalance: config.initialBalance || 10000,
      currency: config.currency || 'USD',
      asset: config.asset || 'BTC'
    };

    // Exchange state
    this.balances = {
      [this.config.currency]: this.config.initialBalance,
      [this.config.asset]: 0
    };

    this.orders = new Map();
    this.trades = [];
    this.orderIdCounter = 1;

    // Market data
    this.currentPrice = null;
    this.orderBook = {
      bids: [],
      asks: []
    };

    this.connected = false;
    this.tradingEnabled = true;
    
    // Live trading support
    this.balance = this.config.initialBalance;
    this.positions = [];
    this.openOrders = [];
  }

  /**
   * Connect to the mock exchange
   * @returns {Promise<boolean>} Connection status
   */
  async connect() {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.connected = true;
        this.emit('connected');
        resolve(true);
      }, this.config.executionDelay);
    });
  }

  /**
   * Disconnect from the mock exchange
   * @returns {Promise<boolean>} Disconnection status
   */
  async disconnect() {
    this.connected = false;
    this.emit('disconnected');
    return true;
  }

  /**
   * Check if exchange is connected
   * @returns {boolean} Connection status
   */
  isConnected() {
    return this.connected;
  }

  /**
   * Update current market price
   * @param {number} price - Current market price
   */
  updatePrice(price) {
    if (typeof price !== 'number' || price <= 0) {
      throw new Error('Price must be a positive number');
    }

    this.currentPrice = price;
    this.emit('priceUpdate', { price, timestamp: Date.now() });

    // Update order book with mock data
    this.updateOrderBook(price);
  }

  /**
   * Update order book with mock data
   * @param {number} price - Current price
   */
  updateOrderBook(price) {
    const spread = price * 0.001; // 0.1% spread

    this.orderBook = {
      bids: [
        { price: price - spread / 2, amount: 1.5 },
        { price: price - spread, amount: 2.0 },
        { price: price - spread * 1.5, amount: 3.0 }
      ],
      asks: [
        { price: price + spread / 2, amount: 1.5 },
        { price: price + spread, amount: 2.0 },
        { price: price + spread * 1.5, amount: 3.0 }
      ]
    };
  }

  /**
   * Get current balances
   * @returns {Object} Current balances
   */
  getBalances() {
    return { ...this.balances };
  }

  /**
   * Get balance for specific currency
   * @param {string} currency - Currency symbol
   * @returns {number} Balance amount
   */
  getBalance(currency) {
    return this.balances[currency] || 0;
  }

  /**
   * Place a market buy order
   * @param {number} amount - Amount to buy (in quote currency)
   * @returns {Promise<Object>} Order result
   */
  async marketBuy(amount) {
    if (!this.connected) {
      throw new Error('Exchange not connected');
    }

    if (!this.tradingEnabled) {
      throw new Error('Trading is disabled');
    }

    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    if (this.currentPrice === null) {
      throw new Error('No market price available');
    }

    const availableBalance = this.getBalance(this.config.currency);
    if (amount > availableBalance) {
      throw new Error(`Insufficient balance. Available: ${availableBalance}, Required: ${amount}`);
    }

    // Calculate execution price with slippage
    const slippageAmount = this.currentPrice * this.config.slippage;
    const executionPrice = this.currentPrice + slippageAmount;

    // Calculate asset amount after fees
    const fee = amount * this.config.takerFee;
    const netAmount = amount - fee;
    const assetAmount = netAmount / executionPrice;

    // Execute trade
    const orderId = this.generateOrderId();
    const trade = {
      id: orderId,
      type: 'market',
      side: 'buy',
      amount: assetAmount,
      price: executionPrice,
      cost: amount,
      fee,
      feeCurrency: this.config.currency,
      timestamp: Date.now(),
      status: 'filled'
    };

    // Update balances
    this.balances[this.config.currency] -= amount;
    this.balances[this.config.asset] += assetAmount;

    // Store trade
    this.trades.push(trade);

    // Emit events
    this.emit('trade', trade);
    this.emit('balanceUpdate', this.getBalances());

    return trade;
  }

  /**
   * Place a market sell order
   * @param {number} amount - Amount to sell (in base currency)
   * @returns {Promise<Object>} Order result
   */
  async marketSell(amount) {
    if (!this.connected) {
      throw new Error('Exchange not connected');
    }

    if (!this.tradingEnabled) {
      throw new Error('Trading is disabled');
    }

    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    if (this.currentPrice === null) {
      throw new Error('No market price available');
    }

    const availableBalance = this.getBalance(this.config.asset);
    if (amount > availableBalance) {
      throw new Error(`Insufficient balance. Available: ${availableBalance}, Required: ${amount}`);
    }

    // Calculate execution price with slippage
    const slippageAmount = this.currentPrice * this.config.slippage;
    const executionPrice = this.currentPrice - slippageAmount;

    // Calculate proceeds after fees
    const grossProceeds = amount * executionPrice;
    const fee = grossProceeds * this.config.takerFee;
    const netProceeds = grossProceeds - fee;

    // Execute trade
    const orderId = this.generateOrderId();
    const trade = {
      id: orderId,
      type: 'market',
      side: 'sell',
      amount,
      price: executionPrice,
      cost: grossProceeds,
      fee,
      feeCurrency: this.config.currency,
      timestamp: Date.now(),
      status: 'filled'
    };

    // Update balances
    this.balances[this.config.asset] -= amount;
    this.balances[this.config.currency] += netProceeds;

    // Store trade
    this.trades.push(trade);

    // Emit events
    this.emit('trade', trade);
    this.emit('balanceUpdate', this.getBalances());

    return trade;
  }

  /**
   * Get trading history
   * @param {number} limit - Maximum number of trades to return
   * @returns {Array} Array of trades
   */
  getTrades(limit = 100) {
    return this.trades.slice(-limit);
  }

  /**
   * Get current market price
   * @returns {number|null} Current price
   */
  getCurrentPrice() {
    return this.currentPrice;
  }

  /**
   * Get order book
   * @returns {Object} Order book with bids and asks
   */
  getOrderBook() {
    return { ...this.orderBook };
  }

  /**
   * Calculate total portfolio value
   * @returns {number} Total value in quote currency
   */
  getTotalValue() {
    if (this.currentPrice === null) {
      return this.getBalance(this.config.currency);
    }

    const cashValue = this.getBalance(this.config.currency);
    const assetValue = this.getBalance(this.config.asset) * this.currentPrice;

    return cashValue + assetValue;
  }

  /**
   * Get exchange statistics
   * @returns {Object} Exchange statistics
   */
  getStats() {
    const totalTrades = this.trades.length;
    const totalFees = this.trades.reduce((sum, trade) => sum + trade.fee, 0);
    const totalVolume = this.trades.reduce((sum, trade) => sum + trade.cost, 0);

    return {
      totalTrades,
      totalFees,
      totalVolume,
      currentPrice: this.currentPrice,
      totalValue: this.getTotalValue(),
      balances: this.getBalances()
    };
  }

  /**
   * Reset exchange to initial state
   */
  reset() {
    this.balances = {
      [this.config.currency]: this.config.initialBalance,
      [this.config.asset]: 0
    };

    this.orders.clear();
    this.trades = [];
    this.orderIdCounter = 1;
    this.currentPrice = null;

    this.emit('reset');
  }

  /**
   * Enable or disable trading
   * @param {boolean} enabled - Trading enabled status
   */
  setTradingEnabled(enabled) {
    this.tradingEnabled = enabled;
    this.emit('tradingStatusChanged', enabled);
  }

  /**
   * Generate unique order ID
   * @returns {string} Order ID
   */
  generateOrderId() {
    return `mock_${this.orderIdCounter++}_${Date.now()}`;
  }

  /**
   * Simulate market volatility
   * @param {number} basePrice - Base price
   * @returns {number} Price with volatility
   */
  simulateVolatility(basePrice) {
    const volatilityFactor = (Math.random() - 0.5) * 2 * this.config.volatility;
    return basePrice * (1 + volatilityFactor);
  }

  /**
   * Get exchange information
   * @returns {Object} Exchange info
   */
  getInfo() {
    return {
      name: this.name,
      connected: this.connected,
      tradingEnabled: this.tradingEnabled,
      config: { ...this.config },
      stats: this.getStats()
    };
  }

  /**
   * Convert to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      name: this.name,
      config: this.config,
      balances: this.balances,
      trades: this.trades,
      currentPrice: this.currentPrice,
      connected: this.connected,
      tradingEnabled: this.tradingEnabled
    };
  }
  
  // Live Trading Support Methods
  
  /**
   * Get account information
   * @returns {Promise<Object>} Account info
   */
  async getAccountInfo() {
    if (!this.connected) {
      throw new Error('Exchange not connected');
    }
    
    return {
      balance: this.balance,
      currency: this.config.currency,
      timestamp: Date.now()
    };
  }
  
  /**
   * Get current positions
   * @returns {Promise<Array>} Positions array
   */
  async getPositions() {
    if (!this.connected) {
      throw new Error('Exchange not connected');
    }
    
    return [...this.positions];
  }
  
  /**
   * Get open orders
   * @returns {Promise<Array>} Open orders array
   */
  async getOpenOrders() {
    if (!this.connected) {
      throw new Error('Exchange not connected');
    }
    
    return [...this.openOrders];
  }
  
  /**
   * Create a new order
   * @param {Object} orderRequest - Order parameters
   * @returns {Promise<Object>} Created order
   */
  async createOrder(orderRequest) {
    if (!this.connected) {
      throw new Error('Exchange not connected');
    }
    
    if (!this.tradingEnabled) {
      throw new Error('Trading is disabled');
    }
    
    const { symbol, side, quantity, type, price } = orderRequest;
    
    if (!symbol || !side || !quantity || !type) {
      throw new Error('Missing required order parameters');
    }
    
    if (quantity <= 0) {
      throw new Error('Quantity must be positive');
    }
    
    const orderId = this.generateOrderId();
    const order = {
      id: orderId,
      symbol,
      side,
      quantity,
      type,
      price: price || this.currentPrice,
      status: 'pending',
      timestamp: Date.now(),
      filled: 0,
      remaining: quantity
    };
    
    // For market orders, execute immediately
    if (type === 'market') {
      order.status = 'filled';
      order.filled = quantity;
      order.remaining = 0;
      order.executedPrice = this.currentPrice;
      
      // Update positions
      this.updatePosition(symbol, side, quantity, this.currentPrice);
    } else {
      // For limit orders, add to open orders
      this.openOrders.push(order);
    }
    
    this.emit('orderCreated', order);
    return order;
  }
  
  /**
   * Cancel an order
   * @param {string} orderId - Order ID to cancel
   * @returns {Promise<Object>} Cancelled order
   */
  async cancelOrder(orderId) {
    if (!this.connected) {
      throw new Error('Exchange not connected');
    }
    
    const orderIndex = this.openOrders.findIndex(order => order.id === orderId);
    if (orderIndex === -1) {
      throw new Error(`Order ${orderId} not found`);
    }
    
    const order = this.openOrders[orderIndex];
    order.status = 'cancelled';
    order.cancelledAt = Date.now();
    
    // Remove from open orders
    this.openOrders.splice(orderIndex, 1);
    
    this.emit('orderCancelled', order);
    return order;
  }
  
  /**
   * Update position after order execution
   * @param {string} symbol - Trading symbol
   * @param {string} side - Order side (buy/sell)
   * @param {number} quantity - Order quantity
   * @param {number} price - Execution price
   */
  updatePosition(symbol, side, quantity, price) {
    let position = this.positions.find(pos => pos.symbol === symbol);
    
    if (!position) {
      position = {
        symbol,
        quantity: 0,
        avgPrice: 0,
        unrealizedPnL: 0
      };
      this.positions.push(position);
    }
    
    const currentValue = position.quantity * position.avgPrice;
    const newValue = quantity * price;
    
    if (side === 'buy') {
      position.quantity += quantity;
      position.avgPrice = (currentValue + newValue) / position.quantity;
    } else {
      position.quantity -= quantity;
      if (position.quantity <= 0) {
        // Close position
        const index = this.positions.indexOf(position);
        this.positions.splice(index, 1);
      } else {
        // Partial close, keep average price
      }
    }
  }
  
  /**
   * Ping the exchange
   * @returns {Promise<Object>} Ping response
   */
  async ping() {
    if (!this.connected) {
      throw new Error('Exchange not connected');
    }
    
    return {
      timestamp: Date.now(),
      latency: Math.random() * 10 + 5 // 5-15ms simulated latency
    };
  }
  
  /**
   * Test connection to exchange
   * @returns {Promise<boolean>} Connection test result
   */
  async testConnection() {
    if (!this.connected) {
      throw new Error('Exchange not connected');
    }
    
    // Simulate connection test
    await new Promise(resolve => setTimeout(resolve, 10));
    return true;
  }
}

// Named export for compatibility
export { MockExchange };
