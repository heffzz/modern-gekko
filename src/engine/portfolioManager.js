import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';

class PortfolioManager extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = {
      initialBalance: 10000,
      maxPositions: 10,
      maxRiskPerTrade: 0.02, // 2% per trade
      maxTotalRisk: 0.10, // 10% total portfolio risk
      commission: 0.001, // 0.1%
      slippage: 0.0005, // 0.05%
      marginRequirement: 1.0, // 100% margin (no leverage)
      ...config
    };

    this.balance = this.config.initialBalance;
    this.equity = this.config.initialBalance;
    this.positions = new Map();
    this.orders = new Map();
    this.trades = [];
    this.performance = this.initializePerformance();

    this.riskManager = new RiskManager(this.config);
    this.positionSizer = new PositionSizer(this.config);
    this.orderManager = new OrderManager(this.config);
  }

  initializePerformance() {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      totalProfit: 0,
      totalLoss: 0,
      maxDrawdown: 0,
      maxDrawdownPercent: 0,
      peakEquity: this.config.initialBalance,
      equityHistory: [{
        timestamp: Date.now(),
        equity: this.config.initialBalance,
        balance: this.config.initialBalance
      }],
      monthlyReturns: new Map(),
      dailyReturns: []
    };
  }

  /**
   * Open a new position
   */
  async openPosition(signal) {
    try {
      // Validate signal
      this.validateSignal(signal);

      // Check risk limits
      const riskCheck = this.riskManager.checkRisk(signal, this.positions, this.balance);
      if (!riskCheck.allowed) {
        logger.warn(`Position rejected: ${riskCheck.reason}`);
        return { success: false, reason: riskCheck.reason };
      }

      // Calculate position size
      const positionSize = this.positionSizer.calculateSize(signal, this.balance, this.equity);
      if (positionSize <= 0) {
        return { success: false, reason: 'Invalid position size' };
      }

      // Create position
      const position = {
        id: this.generatePositionId(),
        symbol: signal.symbol,
        side: signal.side,
        quantity: positionSize,
        entryPrice: signal.price,
        currentPrice: signal.price,
        entryTime: signal.timestamp || Date.now(),
        stopLoss: signal.stopLoss,
        takeProfit: signal.takeProfit,
        commission: this.calculateCommission(positionSize, signal.price),
        unrealizedPnL: 0,
        realizedPnL: 0,
        status: 'open',
        strategy: signal.strategy,
        metadata: signal.metadata || {}
      };

      // Apply commission and slippage
      const totalCost = this.calculateTotalCost(position);
      if (totalCost > this.balance) {
        return { success: false, reason: 'Insufficient balance' };
      }

      // Update balance
      this.balance -= totalCost;

      // Store position
      this.positions.set(position.id, position);

      // Create stop-loss and take-profit orders if specified
      if (position.stopLoss) {
        await this.createStopLossOrder(position);
      }
      if (position.takeProfit) {
        await this.createTakeProfitOrder(position);
      }

      // Update equity
      this.updateEquity();

      logger.info(`Position opened: ${position.symbol} ${position.side} ${position.quantity} @ ${position.entryPrice}`);
      this.emit('positionOpened', position);

      return { success: true, position };

    } catch (error) {
      logger.error('Error opening position:', error);
      return { success: false, reason: error.message };
    }
  }

  /**
   * Close a position
   */
  async closePosition(positionId, price = null, reason = 'manual') {
    try {
      const position = this.positions.get(positionId);
      if (!position) {
        return { success: false, reason: 'Position not found' };
      }

      if (position.status !== 'open') {
        return { success: false, reason: 'Position already closed' };
      }

      const exitPrice = price || position.currentPrice;
      const exitTime = Date.now();

      // Calculate final P&L
      const pnl = this.calculatePnL(position, exitPrice);
      const commission = this.calculateCommission(position.quantity, exitPrice);
      const netPnl = pnl - position.commission - commission;

      // Apply slippage
      const slippage = this.calculateSlippage(position.quantity, exitPrice);
      const finalPnl = netPnl - slippage;

      // Update balance
      const positionValue = position.quantity * exitPrice;
      this.balance += positionValue + finalPnl;

      // Update position
      position.status = 'closed';
      position.exitPrice = exitPrice;
      position.exitTime = exitTime;
      position.realizedPnL = finalPnl;
      position.closeReason = reason;

      // Record trade
      const trade = {
        id: this.generateTradeId(),
        positionId: position.id,
        symbol: position.symbol,
        side: position.side,
        quantity: position.quantity,
        entryPrice: position.entryPrice,
        exitPrice,
        entryTime: position.entryTime,
        exitTime,
        pnl: finalPnl,
        commission: position.commission + commission,
        slippage,
        duration: exitTime - position.entryTime,
        strategy: position.strategy,
        closeReason: reason
      };

      this.trades.push(trade);

      // Cancel related orders
      await this.cancelPositionOrders(positionId);

      // Update performance
      this.updatePerformance(trade);

      // Update equity
      this.updateEquity();

      logger.info(`Position closed: ${position.symbol} P&L: ${finalPnl.toFixed(2)}`);
      this.emit('positionClosed', { position, trade });

      return { success: true, position, trade };

    } catch (error) {
      logger.error('Error closing position:', error);
      return { success: false, reason: error.message };
    }
  }

  /**
   * Update position prices
   */
  updatePositionPrices(priceUpdates) {
    let hasUpdates = false;

    for (const [symbol, price] of Object.entries(priceUpdates)) {
      this.positions.forEach((position) => {
        if (position.symbol === symbol && position.status === 'open') {
          position.currentPrice = price;
          position.unrealizedPnL = this.calculatePnL(position, price);
          hasUpdates = true;

          // Check stop-loss and take-profit
          this.checkPositionTriggers(position);
        }
      });
    }

    if (hasUpdates) {
      this.updateEquity();
      this.emit('positionsUpdated', this.getOpenPositions());
    }
  }

  /**
   * Check position triggers (stop-loss, take-profit)
   */
  async checkPositionTriggers(position) {
    if (position.status !== 'open') return;

    const currentPrice = position.currentPrice;

    // Check stop-loss
    if (position.stopLoss) {
      const shouldTriggerStop = position.side === 'buy'
        ? currentPrice <= position.stopLoss
        : currentPrice >= position.stopLoss;

      if (shouldTriggerStop) {
        await this.closePosition(position.id, currentPrice, 'stop-loss');
        return;
      }
    }

    // Check take-profit
    if (position.takeProfit) {
      const shouldTriggerProfit = position.side === 'buy'
        ? currentPrice >= position.takeProfit
        : currentPrice <= position.takeProfit;

      if (shouldTriggerProfit) {
        await this.closePosition(position.id, currentPrice, 'take-profit');
        return;
      }
    }
  }

  /**
   * Update stop-loss for a position
   */
  updateStopLoss(positionId, newStopLoss) {
    const position = this.positions.get(positionId);
    if (!position || position.status !== 'open') {
      return { success: false, reason: 'Position not found or closed' };
    }

    const oldStopLoss = position.stopLoss;
    position.stopLoss = newStopLoss;

    logger.info(`Stop-loss updated for ${position.symbol}: ${oldStopLoss} -> ${newStopLoss}`);
    this.emit('stopLossUpdated', { positionId, oldStopLoss, newStopLoss });

    return { success: true };
  }

  /**
   * Update take-profit for a position
   */
  updateTakeProfit(positionId, newTakeProfit) {
    const position = this.positions.get(positionId);
    if (!position || position.status !== 'open') {
      return { success: false, reason: 'Position not found or closed' };
    }

    const oldTakeProfit = position.takeProfit;
    position.takeProfit = newTakeProfit;

    logger.info(`Take-profit updated for ${position.symbol}: ${oldTakeProfit} -> ${newTakeProfit}`);
    this.emit('takeProfitUpdated', { positionId, oldTakeProfit, newTakeProfit });

    return { success: true };
  }

  /**
   * Calculate position P&L
   */
  calculatePnL(position, currentPrice = null) {
    const price = currentPrice || position.currentPrice;
    const priceDiff = position.side === 'buy'
      ? price - position.entryPrice
      : position.entryPrice - price;

    return priceDiff * position.quantity;
  }

  /**
   * Calculate commission
   */
  calculateCommission(quantity, price) {
    return quantity * price * this.config.commission;
  }

  /**
   * Calculate slippage
   */
  calculateSlippage(quantity, price) {
    return quantity * price * this.config.slippage;
  }

  /**
   * Calculate total cost of position
   */
  calculateTotalCost(position) {
    const positionValue = position.quantity * position.entryPrice;
    const marginRequired = positionValue * this.config.marginRequirement;
    return marginRequired + position.commission;
  }

  /**
   * Update equity calculation
   */
  updateEquity() {
    let totalUnrealizedPnL = 0;

    this.positions.forEach((position) => {
      if (position.status === 'open') {
        totalUnrealizedPnL += position.unrealizedPnL;
      }
    });

    this.equity = this.balance + totalUnrealizedPnL;

    // Update performance tracking
    this.performance.equityHistory.push({
      timestamp: Date.now(),
      equity: this.equity,
      balance: this.balance,
      unrealizedPnL: totalUnrealizedPnL
    });

    // Update peak equity and drawdown
    if (this.equity > this.performance.peakEquity) {
      this.performance.peakEquity = this.equity;
    }

    const currentDrawdown = this.performance.peakEquity - this.equity;
    const currentDrawdownPercent = (currentDrawdown / this.performance.peakEquity) * 100;

    if (currentDrawdown > this.performance.maxDrawdown) {
      this.performance.maxDrawdown = currentDrawdown;
    }

    if (currentDrawdownPercent > this.performance.maxDrawdownPercent) {
      this.performance.maxDrawdownPercent = currentDrawdownPercent;
    }

    this.emit('equityUpdated', {
      equity: this.equity,
      balance: this.balance,
      unrealizedPnL: totalUnrealizedPnL,
      drawdown: currentDrawdown,
      drawdownPercent: currentDrawdownPercent
    });
  }

  /**
   * Update performance metrics
   */
  updatePerformance(trade) {
    this.performance.totalTrades++;

    if (trade.pnl > 0) {
      this.performance.winningTrades++;
      this.performance.totalProfit += trade.pnl;
    } else if (trade.pnl < 0) {
      this.performance.losingTrades++;
      this.performance.totalLoss += Math.abs(trade.pnl);
    }

    // Update monthly returns
    const month = new Date(trade.exitTime).toISOString().slice(0, 7);
    if (!this.performance.monthlyReturns.has(month)) {
      this.performance.monthlyReturns.set(month, 0);
    }
    this.performance.monthlyReturns.set(month,
      this.performance.monthlyReturns.get(month) + trade.pnl
    );
  }

  /**
   * Get portfolio summary
   */
  getPortfolioSummary() {
    const openPositions = this.getOpenPositions();
    const totalUnrealizedPnL = openPositions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0);
    const totalRealizedPnL = this.trades.reduce((sum, trade) => sum + trade.pnl, 0);

    return {
      balance: this.balance,
      equity: this.equity,
      totalUnrealizedPnL,
      totalRealizedPnL,
      totalPnL: totalRealizedPnL + totalUnrealizedPnL,
      openPositions: openPositions.length,
      totalPositions: this.positions.size,
      totalTrades: this.trades.length,
      performance: this.getPerformanceMetrics()
    };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    const winRate = this.performance.totalTrades > 0
      ? (this.performance.winningTrades / this.performance.totalTrades) * 100
      : 0;

    const profitFactor = this.performance.totalLoss > 0
      ? this.performance.totalProfit / this.performance.totalLoss
      : this.performance.totalProfit > 0 ? Infinity : 0;

    const roi = ((this.equity - this.config.initialBalance) / this.config.initialBalance) * 100;

    return {
      ...this.performance,
      winRate,
      profitFactor,
      roi,
      averageWin: this.performance.winningTrades > 0
        ? this.performance.totalProfit / this.performance.winningTrades
        : 0,
      averageLoss: this.performance.losingTrades > 0
        ? this.performance.totalLoss / this.performance.losingTrades
        : 0
    };
  }

  /**
   * Get open positions
   */
  getOpenPositions() {
    return Array.from(this.positions.values()).filter(pos => pos.status === 'open');
  }

  /**
   * Get position by ID
   */
  getPosition(positionId) {
    return this.positions.get(positionId);
  }

  /**
   * Get all trades
   */
  getTrades(limit = null) {
    const trades = [...this.trades].sort((a, b) => b.exitTime - a.exitTime);
    return limit ? trades.slice(0, limit) : trades;
  }

  /**
   * Validate trading signal
   */
  validateSignal(signal) {
    const required = ['symbol', 'side', 'price'];
    for (const field of required) {
      if (!(field in signal)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (!['buy', 'sell'].includes(signal.side)) {
      throw new Error('Invalid side: must be buy or sell');
    }

    if (signal.price <= 0) {
      throw new Error('Invalid price: must be positive');
    }
  }

  /**
   * Generate position ID
   */
  generatePositionId() {
    return `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate trade ID
   */
  generateTradeId() {
    return `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create stop-loss order
   */
  async createStopLossOrder(position) {
    // Implementation would depend on order management system
    logger.info(`Stop-loss order created for position ${position.id} at ${position.stopLoss}`);
  }

  /**
   * Create take-profit order
   */
  async createTakeProfitOrder(position) {
    // Implementation would depend on order management system
    logger.info(`Take-profit order created for position ${position.id} at ${position.takeProfit}`);
  }

  /**
   * Cancel orders for position
   */
  async cancelPositionOrders(positionId) {
    // Implementation would depend on order management system
    logger.info(`Orders cancelled for position ${positionId}`);
  }
}

/**
 * Risk management class
 */
class RiskManager {
  constructor(config) {
    this.config = config;
  }

  checkRisk(signal, positions, balance) {
    // Check maximum positions
    const openPositions = Array.from(positions.values()).filter(pos => pos.status === 'open');
    if (openPositions.length >= this.config.maxPositions) {
      return { allowed: false, reason: 'Maximum positions reached' };
    }

    // Check risk per trade
    const positionValue = signal.quantity * signal.price;
    const riskAmount = signal.stopLoss
      ? Math.abs(signal.price - signal.stopLoss) * signal.quantity
      : positionValue * this.config.maxRiskPerTrade;

    const riskPercent = riskAmount / balance;
    if (riskPercent > this.config.maxRiskPerTrade) {
      return { allowed: false, reason: 'Risk per trade exceeded' };
    }

    // Check total portfolio risk
    const totalRisk = openPositions.reduce((sum, pos) => {
      const posRisk = pos.stopLoss
        ? Math.abs(pos.currentPrice - pos.stopLoss) * pos.quantity
        : pos.quantity * pos.currentPrice * this.config.maxRiskPerTrade;
      return sum + posRisk;
    }, riskAmount);

    const totalRiskPercent = totalRisk / balance;
    if (totalRiskPercent > this.config.maxTotalRisk) {
      return { allowed: false, reason: 'Total portfolio risk exceeded' };
    }

    return { allowed: true };
  }
}

/**
 * Position sizing class
 */
class PositionSizer {
  constructor(config) {
    this.config = config;
  }

  calculateSize(signal, balance, equity) {
    // Fixed fractional method
    if (signal.quantity) {
      return signal.quantity;
    }

    // Risk-based sizing
    if (signal.stopLoss) {
      const riskAmount = balance * this.config.maxRiskPerTrade;
      const riskPerShare = Math.abs(signal.price - signal.stopLoss);
      return Math.floor(riskAmount / riskPerShare);
    }

    // Default percentage of balance
    const positionValue = balance * this.config.maxRiskPerTrade;
    return Math.floor(positionValue / signal.price);
  }
}

/**
 * Order management class
 */
class OrderManager {
  constructor(config) {
    this.config = config;
    this.orders = new Map();
  }

  createOrder(order) {
    const orderId = this.generateOrderId();
    this.orders.set(orderId, {
      ...order,
      id: orderId,
      status: 'pending',
      createdAt: Date.now()
    });
    return orderId;
  }

  cancelOrder(orderId) {
    const order = this.orders.get(orderId);
    if (order) {
      order.status = 'cancelled';
      return true;
    }
    return false;
  }

  generateOrderId() {
    return `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export {
  PortfolioManager,
  RiskManager,
  PositionSizer,
  OrderManager
};
