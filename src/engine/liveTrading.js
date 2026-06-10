const EventEmitter = require('events');
const { v4: uuidv4 } = require('uuid');
const PaperTradingEngine = require('./paperTrading.js');

class LiveTradingEngine extends EventEmitter {
  constructor(exchange, config = {}) {
    super();

    this.exchange = exchange;
    this.config = {
      maxPositions: 5,
      maxRiskPerTrade: 0.02, // 2%
      maxTotalRisk: 0.10, // 10%
      maxDrawdown: 0.20, // 20% max drawdown
      stopLossRequired: true,
      takeProfitRecommended: true,
      confirmationRequired: true,
      emergencyStopEnabled: true,
      ...config
    };

    this.isLive = false;
    this.isConfirmed = false;
    this.portfolio = {
      balance: 0,
      initialBalance: 0,
      positions: new Map(),
      orders: new Map(),
      trades: [],
      riskMetrics: {
        totalRisk: 0,
        positionRisks: new Map(),
        maxDrawdown: 0,
        currentDrawdown: 0
      }
    };

    this.marketPrices = new Map();

    this.riskManager = new RiskManager(this.config);
    this.orderManager = new OrderManager(this.exchange);

    // Safety mechanisms
    this.emergencyStop = false;
    this.lastHeartbeat = new Date();
    this.heartbeatInterval = null;

    this.setupSafetyMechanisms();
  }

  async initialize() {
    try {
      // Establish the exchange connection if the adapter supports it and is
      // not already connected, then verify it.
      if (typeof this.exchange.connect === 'function' &&
          typeof this.exchange.isConnected === 'function' &&
          !this.exchange.isConnected()) {
        await this.exchange.connect();
      }

      // Verify exchange connection
      await this.exchange.testConnection();

      // Load account information
      const accountInfo = await this.exchange.getAccountInfo();
      this.portfolio.balance = accountInfo.balance;
      this.portfolio.initialBalance = accountInfo.balance;

      // Load existing positions
      const positions = await this.exchange.getPositions();
      positions.forEach(pos => {
        this.portfolio.positions.set(pos.symbol, pos);
      });

      // Load open orders
      const orders = await this.exchange.getOpenOrders();
      orders.forEach(order => {
        this.portfolio.orders.set(order.id, order);
      });

      this.emit('initialized', {
        balance: this.portfolio.balance,
        positions: positions.length,
        orders: orders.length
      });

      return true;
    } catch (error) {
      this.emit('error', { type: 'initialization', error });
      throw error;
    }
  }

  async confirmLiveTrading() {
    if (this.isLive) {
      throw new Error('Live trading is already active');
    }

    console.log('\n⚠️  LIVE TRADING CONFIRMATION REQUIRED ⚠️');
    console.log('You are about to enable LIVE TRADING with REAL MONEY.');
    console.log('This will place REAL ORDERS on the exchange.');
    console.log('\nCurrent Configuration:');
    console.log(`- Exchange: ${this.exchange.name}`);
    console.log(`- Max Risk Per Trade: ${(this.config.maxRiskPerTrade * 100).toFixed(1)}%`);
    console.log(`- Max Total Risk: ${(this.config.maxTotalRisk * 100).toFixed(1)}%`);
    console.log(`- Max Positions: ${this.config.maxPositions}`);
    console.log(`- Emergency Stop: ${this.config.emergencyStopEnabled ? 'Enabled' : 'Disabled'}`);

    // In a real implementation, this would require user confirmation
    // For now, we'll require explicit confirmation through environment variable
    const liveConfirmed = process.env.LIVE_TRADING_CONFIRMED === 'true';

    if (!liveConfirmed) {
      throw new Error('Live trading not confirmed. Set LIVE_TRADING_CONFIRMED=true to enable.');
    }

    this.isConfirmed = true;
    this.emit('confirmed');

    return true;
  }

  async start() {
    if (!this.isConfirmed) {
      throw new Error('Live trading must be confirmed before starting');
    }

    try {
      await this.initialize();

      this.isLive = true;
      this.startHeartbeat();

      this.emit('started', {
        timestamp: new Date(),
        mode: 'live',
        balance: this.portfolio.balance
      });

      console.log('🚀 Live Trading Engine started');

      return true;
    } catch (error) {
      this.emit('error', { type: 'start', error });
      throw error;
    }
  }

  async stop() {
    this.isLive = false;
    this.stopHeartbeat();

    try {
      // Cancel all pending orders
      await this.cancelAllOrders();

      this.emit('stopped', {
        timestamp: new Date(),
        finalBalance: this.portfolio.balance
      });

      console.log('🛑 Live Trading Engine stopped');

      return true;
    } catch (error) {
      this.emit('error', { type: 'stop', error });
      throw error;
    }
  }

  async emergencyStopAll() {
    console.log('🚨 EMERGENCY STOP ACTIVATED');

    this.emergencyStop = true;
    this.isLive = false;

    try {
      // Cancel all orders immediately
      await this.cancelAllOrders();

      // Close all positions at market price
      const positions = Array.from(this.portfolio.positions.values());
      for (const position of positions) {
        await this.closePositionImmediate(position.symbol);
      }

      this.emit('emergencyStop', {
        timestamp: new Date(),
        reason: 'Manual emergency stop'
      });

      return true;
    } catch (error) {
      this.emit('error', { type: 'emergencyStop', error });
      throw error;
    }
  }

  async placeOrder(orderRequest) {
    if (!this.isLive) {
      throw new Error('Live trading is not active');
    }

    if (this.emergencyStop) {
      throw new Error('Emergency stop is active');
    }

    try {
      // Risk management check
      const riskCheck = await this.riskManager.validateOrder(orderRequest, this.portfolio);
      if (!riskCheck.approved) {
        throw new Error(`Order rejected by risk management: ${riskCheck.reason}`);
      }

      // Place order on exchange
      const exchangeOrder = await this.orderManager.placeOrder(orderRequest);

      // Track the order locally as pending; fills are reconciled later via
      // syncWithExchange. The exchange order id is preserved so the order can
      // still be cancelled.
      const order = { ...exchangeOrder, status: 'pending' };
      this.portfolio.orders.set(order.id, order);

      this.emit('orderPlaced', order);

      return order;
    } catch (error) {
      this.emit('error', { type: 'placeOrder', error, orderRequest });
      throw error;
    }
  }

  async cancelOrder(orderId) {
    // Cancelling is allowed even when not live (e.g. during shutdown or an
    // emergency stop) so pending orders can always be cleaned up.
    try {
      const result = await this.orderManager.cancelOrder(orderId);

      // Update local portfolio
      const order = this.portfolio.orders.get(orderId);
      if (order) {
        order.status = 'cancelled';
        order.cancelledAt = new Date();
      }

      this.emit('orderCancelled', { orderId, result });

      return result;
    } catch (error) {
      this.emit('error', { type: 'cancelOrder', error, orderId });
      throw error;
    }
  }

  async cancelAllOrders() {
    const orders = Array.from(this.portfolio.orders.values())
      .filter(order => order.status === 'pending');

    const results = [];
    for (const order of orders) {
      try {
        const result = await this.cancelOrder(order.id);
        results.push({ orderId: order.id, success: true, result });
      } catch (error) {
        results.push({ orderId: order.id, success: false, error });
      }
    }

    return results;
  }

  async closePositionImmediate(symbol) {
    const position = this.portfolio.positions.get(symbol);
    if (!position) {
      throw new Error(`No position found for ${symbol}`);
    }

    try {
      // Submit directly through the order manager: closing a position must
      // work even while not live or during an emergency stop, where the
      // public placeOrder guards would otherwise block it.
      const order = await this.orderManager.placeOrder({
        symbol,
        side: position.quantity > 0 ? 'sell' : 'buy',
        quantity: Math.abs(position.quantity),
        type: 'market'
      });

      this.portfolio.orders.set(order.id, order);

      this.emit('positionClosed', { symbol, order });

      return order;
    } catch (error) {
      this.emit('error', { type: 'closePosition', error, symbol });
      throw error;
    }
  }

  async syncWithExchange() {
    if (!this.isLive) return;

    try {
      // Sync account balance
      const accountInfo = await this.exchange.getAccountInfo();
      this.portfolio.balance = accountInfo.balance;

      // Sync positions
      const positions = await this.exchange.getPositions();
      this.portfolio.positions.clear();
      positions.forEach(pos => {
        this.portfolio.positions.set(pos.symbol, pos);
      });

      // Sync orders
      const orders = await this.exchange.getOpenOrders();
      this.portfolio.orders.clear();
      orders.forEach(order => {
        this.portfolio.orders.set(order.id, order);
      });

      // Update risk metrics
      this.riskManager.updateRiskMetrics(this.portfolio);

      this.emit('synced', {
        timestamp: new Date(),
        balance: this.portfolio.balance,
        positions: positions.length,
        orders: orders.length
      });

    } catch (error) {
      this.emit('error', { type: 'sync', error });
    }
  }

  setupSafetyMechanisms() {
    // Monitor for excessive drawdown and other emergency conditions on every
    // position update. checkEmergencyConditions uses the full portfolio value
    // (cash + open positions) against the equity peak and triggers the
    // emergency stop itself when limits are breached.
    this.on('positionUpdate', () => {
      this.checkEmergencyConditions();
    });

    // Monitor for connection issues
    this.on('connectionLost', () => {
      console.log('⚠️  Exchange connection lost - stopping live trading');
      this.stop();
    });
  }

  startHeartbeat() {
    this.lastSync = Date.now();
    this.heartbeatInterval = setInterval(async() => {
      try {
        await this.exchange.ping();
        this.lastHeartbeat = new Date();

        // Sync with exchange every 30 seconds. Compare against the last sync
        // time, not lastHeartbeat (which was just refreshed above).
        if (Date.now() - this.lastSync > 30000) {
          await this.syncWithExchange();
          this.lastSync = Date.now();
        }
      } catch (error) {
        this.emit('connectionLost', error);
      }
    }, 5000); // 5 second heartbeat
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  getPortfolio() {
    return {
      ...this.portfolio,
      positions: Array.from(this.portfolio.positions.values()),
      orders: Array.from(this.portfolio.orders.values()),
      riskMetrics: this.riskManager.getRiskMetrics(this.portfolio)
    };
  }

  getRiskStatus() {
    return this.riskManager.getRiskStatus(this.portfolio);
  }

  setMarketPrice(symbol, price) {
    this.marketPrices.set(symbol, price);
    this.emit('priceUpdate', { symbol, price, timestamp: new Date() });
  }

  getMarketPrice(symbol) {
    return this.marketPrices.get(symbol);
  }

  calculatePortfolioValue() {
    let totalValue = this.portfolio.balance;

    for (const [symbol, position] of this.portfolio.positions) {
      const marketPrice = this.getMarketPrice(symbol) || position.avgPrice;
      totalValue += position.quantity * marketPrice;
    }

    return totalValue;
  }

  calculateUnrealizedPnL() {
    let totalPnL = 0;

    for (const [symbol, position] of this.portfolio.positions) {
      const marketPrice = this.getMarketPrice(symbol) || position.avgPrice;
      const pnl = (marketPrice - position.avgPrice) * position.quantity;
      totalPnL += pnl;
    }

    return totalPnL;
  }

  getPerformanceMetrics() {
    const currentValue = this.calculatePortfolioValue();
    const initialValue = this.portfolio.initialBalance;
    const totalReturn = ((currentValue - initialValue) / initialValue) * 100;
    const unrealizedPnL = this.calculateUnrealizedPnL();

    // Calculate total PnL from trades
    const totalPnL = this.portfolio.trades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
    const winningTrades = this.portfolio.trades.filter(trade => (trade.pnl || 0) > 0).length;
    const winRate = this.portfolio.trades.length > 0 ? winningTrades / this.portfolio.trades.length : 0;

    return {
      totalReturn,
      unrealizedPnL,
      currentValue,
      initialValue,
      totalTrades: this.portfolio.trades.length,
      totalPnL,
      winRate,
      activePositions: this.portfolio.positions.size,
      pendingOrders: Array.from(this.portfolio.orders.values()).filter(o => o.status === 'pending').length
    };
  }

  checkEmergencyConditions() {
    const currentValue = this.calculatePortfolioValue();
    const initialValue = this.portfolio.initialBalance || currentValue;

    // Track the equity peak so drawdown is measured peak-to-trough rather than
    // only against the initial balance.
    const previousPeak = this.portfolio.riskMetrics.peakValue;
    const peak = Math.max(
      previousPeak === undefined ? initialValue : previousPeak,
      currentValue,
      initialValue
    );
    this.portfolio.riskMetrics.peakValue = peak;

    const drawdown = peak > 0 ? ((peak - currentValue) / peak) * 100 : 0;

    const conditions = {
      maxDrawdownExceeded: drawdown > (this.config.maxDrawdown * 100),
      maxRiskExceeded: this.riskManager.calculateTotalRisk(this.portfolio) > this.config.maxTotalRisk,
      connectionLost: Date.now() - this.lastHeartbeat.getTime() > 60000, // 1 minute
      emergencyStopActive: this.emergencyStop
    };

    const shouldStop = Object.values(conditions).some(condition => condition);

    // Automatically trigger emergency stop if conditions are met
    if (shouldStop && !this.emergencyStop) {
      this.emergencyStopAll();
    }

    return {
      shouldStop,
      conditions,
      currentDrawdown: drawdown
    };
  }
}

class RiskManager {
  constructor(config) {
    this.config = config;
  }

  async validateOrder(orderRequest, portfolio) {
    // Check position limits first: a new position cannot be opened once the
    // cap is reached, regardless of other order attributes.
    if (orderRequest.side === 'buy' && portfolio.positions.size >= this.config.maxPositions) {
      return {
        approved: false,
        reason: 'Maximum positions limit reached'
      };
    }

    // Check if stop loss is required
    if (this.config.stopLossRequired && !orderRequest.stopLoss) {
      return {
        approved: false,
        reason: 'Stop loss is required for all orders'
      };
    }

    // Check risk per trade
    const riskAmount = this.calculateOrderRisk(orderRequest, portfolio);
    const riskPercent = riskAmount / portfolio.balance;

    if (riskPercent > this.config.maxRiskPerTrade) {
      return {
        approved: false,
        reason: `Order risk (${(riskPercent * 100).toFixed(1)}%) exceeds maximum per trade (${(this.config.maxRiskPerTrade * 100).toFixed(1)}%)`
      };
    }

    // Check total portfolio risk
    const totalRisk = this.calculateTotalRisk(portfolio) + riskPercent;
    if (totalRisk > this.config.maxTotalRisk) {
      return {
        approved: false,
        reason: `Total portfolio risk would exceed maximum (${(this.config.maxTotalRisk * 100).toFixed(1)}%)`
      };
    }

    return { approved: true };
  }

  calculateOrderRisk(orderRequest, portfolio) {
    if (!orderRequest.stopLoss) return 0;

    const entryPrice = orderRequest.price || orderRequest.estimatedPrice;
    const stopLossPrice = orderRequest.stopLoss;
    const quantity = orderRequest.quantity;

    const riskPerShare = Math.abs(entryPrice - stopLossPrice);
    return riskPerShare * quantity;
  }

  calculateTotalRisk(portfolio) {
    let totalRisk = 0;

    for (const position of portfolio.positions.values()) {
      if (position.stopLoss) {
        const currentPrice = position.currentPrice || position.avgPrice;
        const riskPerShare = Math.abs(currentPrice - position.stopLoss);
        const positionRisk = riskPerShare * position.quantity;
        totalRisk += positionRisk;
      }
    }

    return totalRisk / portfolio.balance;
  }

  calculateDrawdown(portfolio) {
    if (!portfolio || !portfolio.riskMetrics) {
      return 0;
    }

    const current = portfolio.balance || 0;
    const initial = portfolio.initialBalance || current;
    const previousPeak = portfolio.riskMetrics.peakValue;
    const peak = Math.max(
      previousPeak === undefined ? initial : previousPeak,
      current,
      initial
    );

    portfolio.riskMetrics.peakValue = peak;

    if (peak <= 0) {
      return 0;
    }

    // Returns drawdown as a fraction (0..1) from the equity peak.
    return Math.max(0, (peak - current) / peak);
  }

  updateRiskMetrics(portfolio) {
    portfolio.riskMetrics.totalRisk = this.calculateTotalRisk(portfolio);
    portfolio.riskMetrics.currentDrawdown = this.calculateDrawdown(portfolio);
  }

  getRiskMetrics(portfolio) {
    return {
      totalRisk: this.calculateTotalRisk(portfolio),
      riskPerPosition: this.calculateRiskPerPosition(portfolio),
      maxRiskPerTrade: this.config.maxRiskPerTrade,
      maxTotalRisk: this.config.maxTotalRisk,
      currentDrawdown: this.calculateDrawdown(portfolio)
    };
  }

  calculateRiskPerPosition(portfolio) {
    const risks = new Map();

    for (const [symbol, position] of portfolio.positions) {
      if (position.stopLoss) {
        const currentPrice = position.currentPrice || position.avgPrice;
        const riskPerShare = Math.abs(currentPrice - position.stopLoss);
        const positionRisk = riskPerShare * position.quantity;
        const riskPercent = positionRisk / portfolio.balance;
        risks.set(symbol, riskPercent);
      }
    }

    return risks;
  }

  getRiskStatus(portfolio) {
    const totalRisk = this.calculateTotalRisk(portfolio);
    const riskLevel = totalRisk < 0.05 ? 'low' : totalRisk < 0.08 ? 'medium' : 'high';

    return {
      level: riskLevel,
      totalRisk,
      maxRisk: this.config.maxTotalRisk,
      utilizationPercent: (totalRisk / this.config.maxTotalRisk) * 100,
      positionsCount: portfolio.positions.size,
      maxPositions: this.config.maxPositions
    };
  }
}

class OrderManager {
  constructor(exchange) {
    this.exchange = exchange;
    this.orderQueue = [];
    this.processing = false;
  }

  async placeOrder(orderRequest) {
    try {
      const order = await this.exchange.createOrder(orderRequest);
      return order;
    } catch (error) {
      throw new Error(`Failed to place order: ${error.message}`);
    }
  }

  async cancelOrder(orderId) {
    try {
      const result = await this.exchange.cancelOrder(orderId);
      return result;
    } catch (error) {
      throw new Error(`Failed to cancel order: ${error.message}`);
    }
  }
}

module.exports = LiveTradingEngine;
module.exports.LiveTradingEngine = LiveTradingEngine;
module.exports.RiskManager = RiskManager;
module.exports.OrderManager = OrderManager;
