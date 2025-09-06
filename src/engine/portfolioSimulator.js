export class PortfolioSimulator {
  constructor(options = {}) {
    this.initialBalance = options.initialBalance || 10000;
    this.balance = this.initialBalance; // Cash balance
    this.position = 0; // Asset position (e.g., BTC amount)
    this.currency = options.currency || 'USD';
    this.asset = options.asset || 'BTC';
    this.fee = options.fee || 0.1; // Trading fee percentage
    this.trades = [];
    this.totalFees = 0;
  }

  /**
   * Get current portfolio value
   * @param {number} currentPrice - Current asset price
   * @returns {number} Total portfolio value
   */
  getTotalValue(currentPrice) {
    return this.balance + (this.position * currentPrice);
  }

  /**
   * Get portfolio allocation
   * @param {number} currentPrice - Current asset price
   * @returns {Object} Portfolio allocation details
   */
  getAllocation(currentPrice) {
    const totalValue = this.getTotalValue(currentPrice);
    const cashValue = this.balance;
    const assetValue = this.position * currentPrice;

    return {
      totalValue,
      cash: {
        amount: this.balance,
        value: cashValue,
        percentage: totalValue > 0 ? (cashValue / totalValue) * 100 : 0
      },
      asset: {
        amount: this.position,
        value: assetValue,
        percentage: totalValue > 0 ? (assetValue / totalValue) * 100 : 0
      }
    };
  }

  /**
   * Calculate trading fee
   * @param {number} amount - Trade amount
   * @returns {number} Fee amount
   */
  calculateFee(amount) {
    return (amount * this.fee) / 100;
  }

  /**
   * Buy asset
   * @param {number|string} amount - Amount to buy ('all' for all available cash)
   * @param {number} price - Price per unit
   * @param {string} timestamp - Trade timestamp
   * @returns {Object|null} Trade object or null if trade failed
   */
  buy(amount, price, timestamp) {
    if (price <= 0) {
      throw new Error('Price must be positive');
    }

    let cashToSpend;

    if (amount === 'all') {
      cashToSpend = this.balance;
    } else if (typeof amount === 'number') {
      if (amount <= 0) {
        throw new Error('Amount must be positive');
      }
      cashToSpend = amount * price;
    } else {
      throw new Error('Amount must be a number or "all"');
    }

    if (cashToSpend > this.balance) {
      throw new Error(`Insufficient balance. Available: ${this.balance}, Required: ${cashToSpend}`);
    }

    if (cashToSpend <= 0) {
      throw new Error('No cash available to buy');
    }

    // Calculate fee
    const fee = this.calculateFee(cashToSpend);
    const netCashToSpend = cashToSpend - fee;

    if (netCashToSpend <= 0) {
      throw new Error('Trade amount too small after fees');
    }

    // Calculate asset amount to buy
    const assetAmount = netCashToSpend / price;

    // Execute trade
    this.balance -= cashToSpend;
    this.position += assetAmount;
    this.totalFees += fee;

    const trade = {
      id: this.trades.length + 1,
      action: 'buy',
      amount: assetAmount,
      price,
      cost: cashToSpend,
      fee,
      netCost: netCashToSpend,
      timestamp,
      balanceAfter: this.balance,
      positionAfter: this.position
    };

    this.trades.push(trade);
    return trade;
  }

  /**
   * Sell asset
   * @param {number|string} amount - Amount to sell ('all' for all position)
   * @param {number} price - Price per unit
   * @param {string} timestamp - Trade timestamp
   * @returns {Object|null} Trade object or null if trade failed
   */
  sell(amount, price, timestamp) {
    if (price <= 0) {
      throw new Error('Price must be positive');
    }

    let assetToSell;

    if (amount === 'all') {
      assetToSell = this.position;
    } else if (typeof amount === 'number') {
      if (amount <= 0) {
        throw new Error('Amount must be positive');
      }
      assetToSell = amount;
    } else {
      throw new Error('Amount must be a number or "all"');
    }

    if (assetToSell > this.position) {
      throw new Error(`Insufficient position. Available: ${this.position}, Required: ${assetToSell}`);
    }

    if (assetToSell <= 0) {
      throw new Error('No position available to sell');
    }

    // Calculate gross proceeds
    const grossProceeds = assetToSell * price;

    // Calculate fee
    const fee = this.calculateFee(grossProceeds);
    const netProceeds = grossProceeds - fee;

    if (netProceeds <= 0) {
      throw new Error('Trade amount too small after fees');
    }

    // Find average buy price for profit calculation
    const avgBuyPrice = this.calculateAverageBuyPrice();
    const profit = avgBuyPrice ? (price - avgBuyPrice) * assetToSell - fee : 0;

    // Execute trade
    this.position -= assetToSell;
    this.balance += netProceeds;
    this.totalFees += fee;

    const trade = {
      id: this.trades.length + 1,
      action: 'sell',
      amount: assetToSell,
      price,
      proceeds: grossProceeds,
      fee,
      netProceeds,
      profit,
      timestamp,
      balanceAfter: this.balance,
      positionAfter: this.position
    };

    this.trades.push(trade);
    return trade;
  }

  /**
   * Calculate average buy price from trade history
   * @returns {number|null} Average buy price or null if no buy trades
   */
  calculateAverageBuyPrice() {
    const buyTrades = this.trades.filter(trade => trade.action === 'buy');

    if (buyTrades.length === 0) {
      return null;
    }

    let totalCost = 0;
    let totalAmount = 0;

    for (const trade of buyTrades) {
      totalCost += trade.netCost;
      totalAmount += trade.amount;
    }

    return totalAmount > 0 ? totalCost / totalAmount : null;
  }

  /**
   * Get portfolio statistics
   * @param {number} currentPrice - Current asset price
   * @returns {Object} Portfolio statistics
   */
  getStatistics(currentPrice) {
    const currentValue = this.getTotalValue(currentPrice);
    const totalReturn = currentValue - this.initialBalance;
    const roi = (totalReturn / this.initialBalance) * 100;

    const buyTrades = this.trades.filter(t => t.action === 'buy');
    const sellTrades = this.trades.filter(t => t.action === 'sell');

    const totalBought = buyTrades.reduce((sum, t) => sum + t.amount, 0);
    const totalSold = sellTrades.reduce((sum, t) => sum + t.amount, 0);

    const realizedProfit = sellTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
    const unrealizedProfit = this.position > 0 && currentPrice ?
      (currentPrice - (this.calculateAverageBuyPrice() || 0)) * this.position : 0;

    return {
      initialBalance: this.initialBalance,
      currentBalance: this.balance,
      currentPosition: this.position,
      currentValue,
      totalReturn,
      roi,
      totalFees: this.totalFees,
      totalTrades: this.trades.length,
      buyTrades: buyTrades.length,
      sellTrades: sellTrades.length,
      totalBought,
      totalSold,
      realizedProfit,
      unrealizedProfit,
      totalProfit: realizedProfit + unrealizedProfit,
      averageBuyPrice: this.calculateAverageBuyPrice()
    };
  }

  /**
   * Check if portfolio can buy a certain amount
   * @param {number|string} amount - Amount to check
   * @param {number} price - Price per unit
   * @returns {boolean} True if can buy
   */
  canBuy(amount, price) {
    try {
      let cashNeeded;

      if (amount === 'all') {
        return this.balance > 0;
      } else {
        cashNeeded = amount * price;
      }

      const fee = this.calculateFee(cashNeeded);
      return this.balance >= (cashNeeded + fee);
    } catch {
      return false;
    }
  }

  /**
   * Check if portfolio can sell a certain amount
   * @param {number|string} amount - Amount to check
   * @returns {boolean} True if can sell
   */
  canSell(amount) {
    try {
      if (amount === 'all') {
        return this.position > 0;
      } else {
        return this.position >= amount;
      }
    } catch {
      return false;
    }
  }

  /**
   * Get maximum buyable amount at current price
   * @param {number} price - Price per unit
   * @returns {number} Maximum buyable amount
   */
  getMaxBuyAmount(price) {
    if (price <= 0 || this.balance <= 0) {
      return 0;
    }

    // Account for fees: balance = amount * price + fee
    // fee = (amount * price) * (fee% / 100)
    // balance = amount * price * (1 + fee% / 100)
    // amount = balance / (price * (1 + fee% / 100))

    const feeMultiplier = 1 + (this.fee / 100);
    return this.balance / (price * feeMultiplier);
  }

  /**
   * Reset portfolio to initial state
   */
  reset() {
    this.balance = this.initialBalance;
    this.position = 0;
    this.trades = [];
    this.totalFees = 0;
  }

  /**
   * Get portfolio state snapshot
   * @returns {Object} Portfolio state
   */
  getSnapshot() {
    return {
      balance: this.balance,
      position: this.position,
      totalFees: this.totalFees,
      tradesCount: this.trades.length,
      lastTrade: this.trades.length > 0 ? this.trades[this.trades.length - 1] : null
    };
  }

  /**
   * Clone portfolio (for testing/simulation)
   * @returns {PortfolioSimulator} New portfolio instance with same state
   */
  clone() {
    const clone = new PortfolioSimulator({
      initialBalance: this.initialBalance,
      currency: this.currency,
      asset: this.asset,
      fee: this.fee
    });

    clone.balance = this.balance;
    clone.position = this.position;
    clone.totalFees = this.totalFees;
    clone.trades = [...this.trades];

    return clone;
  }
}
