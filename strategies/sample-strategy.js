/**
 * Sample Trading Strategy: SMA Crossover with RSI Filter
 * 
 * This strategy uses:
 * - Simple Moving Average crossover (fast SMA crosses above/below slow SMA)
 * - RSI filter to avoid trades in overbought/oversold conditions
 * - Basic risk management
 */

export default class SampleStrategy {
  constructor() {
    this.name = 'SMA Crossover with RSI Filter';
    this.description = 'Buy when fast SMA crosses above slow SMA and RSI is not overbought. Sell when fast SMA crosses below slow SMA or RSI is overbought.';
    
    // Strategy parameters
    this.fastSMA = 10;
    this.slowSMA = 20;
    this.rsiPeriod = 14;
    this.rsiOverbought = 70;
    this.rsiOversold = 30;
    
    // Position tracking
    this.position = null; // 'long', 'short', or null
    this.entryPrice = null;
    this.entryTime = null;
    
    // Risk management
    this.stopLossPercent = 5; // 5% stop loss
    this.takeProfitPercent = 10; // 10% take profit
    
    // Strategy state
    this.initialized = false;
  }

  /**
   * Initialize strategy (called once before backtesting starts)
   * @param {Object} config - Configuration object
   */
  init(config = {}) {
    this.currency = config.currency || 'USD';
    this.asset = config.asset || 'BTC';
    this.initialized = true;
    
    console.log(`Initialized ${this.name} for ${this.asset}/${this.currency}`);
    console.log(`Parameters: Fast SMA=${this.fastSMA}, Slow SMA=${this.slowSMA}, RSI=${this.rsiPeriod}`);
  }

  /**
   * Main strategy logic - called for each candle
   * @param {Object} candle - Current candle data
   * @param {Array} historicalCandles - All historical candles
   * @param {Object} engine - Strategy engine with indicators
   * @returns {Object|null} Trading advice or null
   */
  async onCandle(candle, historicalCandles, engine) {
    if (!this.initialized) {
      throw new Error('Strategy not initialized. Call init() first.');
    }

    // Need enough data for indicators
    if (historicalCandles.length < Math.max(this.slowSMA, this.rsiPeriod)) {
      return null;
    }

    // Get current indicators
    const fastSMA = engine.sma(this.fastSMA);
    const slowSMA = engine.sma(this.slowSMA);
    const rsi = engine.rsi(this.rsiPeriod);
    const currentPrice = candle.close;

    // Skip if indicators are not available
    if (fastSMA === null || slowSMA === null || rsi === null) {
      return null;
    }

    // Check for risk management exits first
    if (this.position === 'long') {
      const riskExit = this.checkRiskManagement(currentPrice, candle.timestamp);
      if (riskExit) {
        return riskExit;
      }
    }

    // Check for entry signals
    if (this.position === null) {
      return this.checkEntrySignals(engine, candle, fastSMA, slowSMA, rsi);
    }

    // Check for exit signals
    if (this.position === 'long') {
      return this.checkExitSignals(engine, candle, fastSMA, slowSMA, rsi);
    }

    return null;
  }

  /**
   * Check for entry signals
   * @param {Object} engine - Strategy engine
   * @param {Object} candle - Current candle
   * @param {number} fastSMA - Fast SMA value
   * @param {number} slowSMA - Slow SMA value
   * @param {number} rsi - RSI value
   * @returns {Object|null} Entry signal or null
   */
  checkEntrySignals(engine, candle, fastSMA, slowSMA, rsi) {
    // Bullish crossover: fast SMA crosses above slow SMA
    const bullishCrossover = engine.isBullishCrossover('sma', this.fastSMA, this.slowSMA);
    
    if (bullishCrossover) {
      // Additional filters
      const rsiFilter = rsi < this.rsiOverbought; // Don't buy when overbought
      const priceAboveSlow = candle.close > slowSMA; // Price should be above slow SMA
      
      if (rsiFilter && priceAboveSlow) {
        this.position = 'long';
        this.entryPrice = candle.close;
        this.entryTime = candle.timestamp;
        
        return {
          action: 'buy',
          amount: 'all', // Use all available cash
          price: candle.close,
          reason: `Bullish SMA crossover (${fastSMA.toFixed(2)} > ${slowSMA.toFixed(2)}), RSI: ${rsi.toFixed(2)}`,
          confidence: this.calculateConfidence(engine, rsi)
        };
      }
    }

    return null;
  }

  /**
   * Check for exit signals
   * @param {Object} engine - Strategy engine
   * @param {Object} candle - Current candle
   * @param {number} fastSMA - Fast SMA value
   * @param {number} slowSMA - Slow SMA value
   * @param {number} rsi - RSI value
   * @returns {Object|null} Exit signal or null
   */
  checkExitSignals(engine, candle, fastSMA, slowSMA, rsi) {
    // Bearish crossover: fast SMA crosses below slow SMA
    const bearishCrossover = engine.isBearishCrossover('sma', this.fastSMA, this.slowSMA);
    
    // RSI overbought condition
    const rsiOverbought = rsi > this.rsiOverbought;
    
    if (bearishCrossover || rsiOverbought) {
      this.position = null;
      this.entryPrice = null;
      this.entryTime = null;
      
      const reason = bearishCrossover 
        ? `Bearish SMA crossover (${fastSMA.toFixed(2)} < ${slowSMA.toFixed(2)})`
        : `RSI overbought (${rsi.toFixed(2)} > ${this.rsiOverbought})`;
      
      return {
        action: 'sell',
        amount: 'all', // Sell all position
        price: candle.close,
        reason,
        confidence: this.calculateConfidence(engine, rsi)
      };
    }

    return null;
  }

  /**
   * Check risk management rules (stop loss, take profit)
   * @param {number} currentPrice - Current price
   * @param {string} timestamp - Current timestamp
   * @returns {Object|null} Risk management exit or null
   */
  checkRiskManagement(currentPrice, timestamp) {
    if (!this.entryPrice) {
      return null;
    }

    const priceChange = ((currentPrice - this.entryPrice) / this.entryPrice) * 100;
    
    // Stop loss
    if (priceChange <= -this.stopLossPercent) {
      this.position = null;
      this.entryPrice = null;
      this.entryTime = null;
      
      return {
        action: 'sell',
        amount: 'all',
        price: currentPrice,
        reason: `Stop loss triggered (${priceChange.toFixed(2)}%)`,
        confidence: 1.0
      };
    }
    
    // Take profit
    if (priceChange >= this.takeProfitPercent) {
      this.position = null;
      this.entryPrice = null;
      this.entryTime = null;
      
      return {
        action: 'sell',
        amount: 'all',
        price: currentPrice,
        reason: `Take profit triggered (${priceChange.toFixed(2)}%)`,
        confidence: 1.0
      };
    }

    return null;
  }

  /**
   * Calculate confidence level for the signal
   * @param {Object} engine - Strategy engine
   * @param {number} rsi - RSI value
   * @returns {number} Confidence level (0-1)
   */
  calculateConfidence(engine, rsi) {
    let confidence = 0.5; // Base confidence
    
    // Increase confidence if RSI is in good range
    if (rsi > this.rsiOversold && rsi < this.rsiOverbought) {
      confidence += 0.2;
    }
    
    // Increase confidence if price is trending
    const priceChange = engine.getPercentageChange();
    if (priceChange !== null) {
      if (Math.abs(priceChange) > 1) { // Strong price movement
        confidence += 0.1;
      }
    }
    
    // Check volume if available
    const currentCandle = engine.getCurrentCandle();
    if (currentCandle.volume) {
      const volumes = engine.getVolumes(10);
      const avgVolume = volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length;
      
      if (currentCandle.volume > avgVolume * 1.5) { // High volume
        confidence += 0.1;
      }
    }
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Get strategy information
   * @returns {Object} Strategy info
   */
  getInfo() {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        fastSMA: this.fastSMA,
        slowSMA: this.slowSMA,
        rsiPeriod: this.rsiPeriod,
        rsiOverbought: this.rsiOverbought,
        rsiOversold: this.rsiOversold,
        stopLossPercent: this.stopLossPercent,
        takeProfitPercent: this.takeProfitPercent
      },
      currentPosition: this.position,
      entryPrice: this.entryPrice,
      entryTime: this.entryTime
    };
  }

  /**
   * Update strategy parameters
   * @param {Object} params - New parameters
   */
  updateParameters(params) {
    if (params.fastSMA) this.fastSMA = params.fastSMA;
    if (params.slowSMA) this.slowSMA = params.slowSMA;
    if (params.rsiPeriod) this.rsiPeriod = params.rsiPeriod;
    if (params.rsiOverbought) this.rsiOverbought = params.rsiOverbought;
    if (params.rsiOversold) this.rsiOversold = params.rsiOversold;
    if (params.stopLossPercent) this.stopLossPercent = params.stopLossPercent;
    if (params.takeProfitPercent) this.takeProfitPercent = params.takeProfitPercent;
  }

  /**
   * Reset strategy state
   */
  reset() {
    this.position = null;
    this.entryPrice = null;
    this.entryTime = null;
  }
}

// Named export for compatibility
export { SampleStrategy };