/**
 * CCI (Commodity Channel Index) Strategy
 * 
 * CCI measures the current price level relative to an average price level over a given period.
 * It oscillates around zero and typically ranges between -100 and +100, but can exceed these levels.
 * 
 * CCI = (Typical Price - SMA of Typical Price) / (0.015 * Mean Deviation)
 * Typical Price = (High + Low + Close) / 3
 * 
 * Trading signals:
 * - Buy: CCI crosses above -100 from below (oversold recovery)
 * - Sell: CCI crosses below +100 from above (overbought decline)
 * - Additional signals from zero line crosses and divergences
 */

import BaseStrategy from './BaseStrategy.js';

export default class CCIStrategy extends BaseStrategy {
  constructor() {
    super();
    
    this.name = 'CCI Strategy';
    this.description = 'Commodity Channel Index strategy with multiple signal modes and confirmation filters';
    this.author = 'Gekko Team';
    this.version = '1.0.0';
    this.category = 'Oscillator';
    
    // CCI state
    this.cci = null;
    this.previousCCI = null;
    this.typicalPrice = null;
    this.smaTypicalPrice = null;
    this.meanDeviation = null;
    
    // Historical data for calculations
    this.typicalPriceHistory = [];
    this.cciHistory = [];
    this.priceHistory = [];
    
    // Signal state
    this.lastSignalType = null;
    this.lastSignalTime = null;
    this.consecutiveAbove100 = 0;
    this.consecutiveBelow100 = 0;
    this.consecutiveAboveZero = 0;
    this.consecutiveBelowZero = 0;
    this.extremeReadings = { high: 0, low: 0 };
    
    this.initializeParameters();
  }

  initializeParameters() {
    super.initializeParameters();
    
    // CCI calculation parameters
    this.defineParameter('period', {
      label: 'CCI Period',
      description: 'Period for CCI calculation',
      type: 'number',
      default: 20,
      min: 5,
      max: 50,
      step: 1,
      category: 'CCI Settings'
    });
    
    this.defineParameter('constant', {
      label: 'CCI Constant',
      description: 'Constant multiplier for mean deviation (typically 0.015)',
      type: 'number',
      default: 0.015,
      min: 0.01,
      max: 0.03,
      step: 0.001,
      category: 'CCI Settings'
    });
    
    // Signal levels
    this.defineParameter('overboughtLevel', {
      label: 'Overbought Level',
      description: 'CCI level considered overbought',
      type: 'number',
      default: 100,
      min: 80,
      max: 150,
      step: 10,
      category: 'Signal Levels'
    });
    
    this.defineParameter('oversoldLevel', {
      label: 'Oversold Level',
      description: 'CCI level considered oversold',
      type: 'number',
      default: -100,
      min: -150,
      max: -80,
      step: 10,
      category: 'Signal Levels',
      validation: (value) => {
        if (value >= this.parameters.overboughtLevel) {
          return 'Oversold level must be less than overbought level';
        }
        return true;
      }
    });
    
    this.defineParameter('extremeOverbought', {
      label: 'Extreme Overbought Level',
      description: 'CCI level for extreme overbought conditions',
      type: 'number',
      default: 200,
      min: 150,
      max: 300,
      step: 25,
      category: 'Signal Levels'
    });
    
    this.defineParameter('extremeOversold', {
      label: 'Extreme Oversold Level',
      description: 'CCI level for extreme oversold conditions',
      type: 'number',
      default: -200,
      min: -300,
      max: -150,
      step: 25,
      category: 'Signal Levels'
    });
    
    // Trading mode
    this.defineParameter('tradingMode', {
      label: 'Trading Mode',
      description: 'Strategy approach for signal generation',
      type: 'select',
      default: 'standard',
      options: [
        { value: 'standard', label: 'Standard (±100 levels)' },
        { value: 'zero_line', label: 'Zero Line Crosses' },
        { value: 'extreme', label: 'Extreme Levels (±200)' },
        { value: 'trend_following', label: 'Trend Following' },
        { value: 'mean_reversion', label: 'Mean Reversion' },
        { value: 'divergence', label: 'Divergence Focus' }
      ],
      category: 'Strategy Mode'
    });
    
    // Signal confirmation
    this.defineParameter('requireMomentumConfirmation', {
      label: 'Require Momentum Confirmation',
      description: 'Require CCI momentum in signal direction',
      type: 'boolean',
      default: true,
      category: 'Signal Confirmation'
    });
    
    this.defineParameter('consecutiveBarsRequired', {
      label: 'Consecutive Bars Required',
      description: 'Number of consecutive bars in zone before signal',
      type: 'number',
      default: 2,
      min: 1,
      max: 5,
      step: 1,
      category: 'Signal Confirmation'
    });
    
    this.defineParameter('minCCIChange', {
      label: 'Min CCI Change',
      description: 'Minimum CCI change for valid momentum signal',
      type: 'number',
      default: 10,
      min: 5,
      max: 30,
      step: 5,
      category: 'Signal Confirmation'
    });
    
    // Advanced features
    this.defineParameter('dynamicLevels', {
      label: 'Dynamic Levels',
      description: 'Adjust overbought/oversold levels based on volatility',
      type: 'boolean',
      default: false,
      category: 'Advanced Features'
    });
    
    this.defineParameter('divergenceDetection', {
      label: 'Enable Divergence Detection',
      description: 'Detect price-CCI divergences',
      type: 'boolean',
      default: true,
      category: 'Advanced Features'
    });
    
    this.defineParameter('trendFilter', {
      label: 'Trend Filter',
      description: 'Filter signals based on trend direction',
      type: 'select',
      default: 'off',
      options: [
        { value: 'off', label: 'Disabled' },
        { value: 'ema', label: 'EMA Trend Filter' },
        { value: 'sma', label: 'SMA Trend Filter' },
        { value: 'cci_trend', label: 'CCI Trend Filter' }
      ],
      category: 'Signal Confirmation'
    });
    
    this.defineParameter('trendPeriod', {
      label: 'Trend Filter Period',
      description: 'Period for trend filter calculation',
      type: 'number',
      default: 50,
      min: 20,
      max: 200,
      step: 5,
      category: 'Signal Confirmation'
    });
    
    this.defineParameter('volatilityFilter', {
      label: 'Volatility Filter',
      description: 'Filter signals based on market volatility',
      type: 'boolean',
      default: false,
      category: 'Advanced Features'
    });
    
    this.defineParameter('volatilityPeriod', {
      label: 'Volatility Period',
      description: 'Period for volatility calculation',
      type: 'number',
      default: 20,
      min: 10,
      max: 50,
      step: 5,
      category: 'Advanced Features'
    });
    
    this.defineParameter('signalCooldown', {
      label: 'Signal Cooldown (bars)',
      description: 'Minimum bars between signals to reduce noise',
      type: 'number',
      default: 3,
      min: 0,
      max: 15,
      step: 1,
      category: 'Signal Confirmation'
    });
  }

  /**
   * Calculate Typical Price
   * @param {Object} candle - OHLC candle
   * @returns {number} Typical price
   */
  calculateTypicalPrice(candle) {
    return (candle.high + candle.low + candle.close) / 3;
  }

  /**
   * Calculate Simple Moving Average
   * @param {Array} values - Values array
   * @param {number} period - SMA period
   * @returns {number|null} SMA value
   */
  calculateSMA(values, period) {
    if (values.length < period) {
      return null;
    }
    
    const slice = values.slice(-period);
    return slice.reduce((sum, val) => sum + val, 0) / period;
  }

  /**
   * Calculate Mean Deviation
   * @param {Array} values - Values array
   * @param {number} sma - Simple moving average
   * @param {number} period - Period
   * @returns {number|null} Mean deviation
   */
  calculateMeanDeviation(values, sma, period) {
    if (values.length < period) {
      return null;
    }
    
    const slice = values.slice(-period);
    const deviations = slice.map(val => Math.abs(val - sma));
    return deviations.reduce((sum, dev) => sum + dev, 0) / period;
  }

  /**
   * Calculate CCI
   * @param {Array} data - Typical price array or candle array
   * @param {number} period - CCI period
   * @returns {number|null} CCI value
   */
  calculateCCI(data, period) {
    if (data.length < period) {
      return null;
    }
    
    // Convert candles to typical prices if needed
    let typicalPrices;
    if (typeof data[0] === 'object' && data[0].high !== undefined) {
      typicalPrices = data.map(candle => this.calculateTypicalPrice(candle));
    } else {
      typicalPrices = data;
    }
    
    const currentTypicalPrice = typicalPrices[typicalPrices.length - 1];
    const sma = this.calculateSMA(typicalPrices, period);
    
    if (sma === null) {
      return null;
    }
    
    const meanDeviation = this.calculateMeanDeviation(typicalPrices, sma, period);
    
    if (meanDeviation === null || meanDeviation === 0) {
      return 0;
    }
    
    // Use default constant if not defined
    const constant = this.parameters?.constant || 0.015;
    
    return (currentTypicalPrice - sma) / (constant * meanDeviation);
  }

  /**
   * Calculate dynamic overbought/oversold levels
   * @param {Array} cciHistory - CCI history
   * @returns {Object} Dynamic levels
   */
  calculateDynamicLevels(cciHistory) {
    if (!this.parameters.dynamicLevels || cciHistory.length < 20) {
      return {
        overbought: this.parameters.overboughtLevel,
        oversold: this.parameters.oversoldLevel,
        extremeOverbought: this.parameters.extremeOverbought,
        extremeOversold: this.parameters.extremeOversold
      };
    }
    
    const recent = cciHistory.slice(-20);
    const mean = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const variance = recent.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / recent.length;
    const stdDev = Math.sqrt(variance);
    
    // Adjust levels based on volatility
    const volatilityFactor = Math.min(2, Math.max(0.5, stdDev / 50));
    
    return {
      overbought: this.parameters.overboughtLevel * volatilityFactor,
      oversold: this.parameters.oversoldLevel * volatilityFactor,
      extremeOverbought: this.parameters.extremeOverbought * volatilityFactor,
      extremeOversold: this.parameters.extremeOversold * volatilityFactor
    };
  }

  /**
   * Detect divergences between price and CCI
   * @param {Array} prices - Price history
   * @param {Array} cciHistory - CCI history
   * @returns {Object|null} Divergence information
   */
  detectDivergence(prices, cciHistory) {
    if (!this.parameters.divergenceDetection || prices.length < 15 || cciHistory.length < 15) {
      return null;
    }
    
    const lookback = 10;
    const recentPrices = prices.slice(-lookback);
    const recentCCI = cciHistory.slice(-lookback);
    
    // Find peaks and troughs
    const priceHighs = [];
    const priceLows = [];
    const cciHighs = [];
    const cciLows = [];
    
    for (let i = 1; i < lookback - 1; i++) {
      // Price peaks
      if (recentPrices[i] > recentPrices[i - 1] && recentPrices[i] > recentPrices[i + 1]) {
        priceHighs.push({ index: i, value: recentPrices[i] });
      }
      
      // Price troughs
      if (recentPrices[i] < recentPrices[i - 1] && recentPrices[i] < recentPrices[i + 1]) {
        priceLows.push({ index: i, value: recentPrices[i] });
      }
      
      // CCI peaks
      if (recentCCI[i] > recentCCI[i - 1] && recentCCI[i] > recentCCI[i + 1]) {
        cciHighs.push({ index: i, value: recentCCI[i] });
      }
      
      // CCI troughs
      if (recentCCI[i] < recentCCI[i - 1] && recentCCI[i] < recentCCI[i + 1]) {
        cciLows.push({ index: i, value: recentCCI[i] });
      }
    }
    
    // Check for bullish divergence
    if (priceLows.length >= 2 && cciLows.length >= 2) {
      const lastPriceLow = priceLows[priceLows.length - 1];
      const prevPriceLow = priceLows[priceLows.length - 2];
      const lastCCILow = cciLows[cciLows.length - 1];
      const prevCCILow = cciLows[cciLows.length - 2];
      
      if (lastPriceLow.value < prevPriceLow.value && lastCCILow.value > prevCCILow.value) {
        return { 
          type: 'bullish', 
          strength: this.calculateDivergenceStrength(lastPriceLow, prevPriceLow, lastCCILow, prevCCILow)
        };
      }
    }
    
    // Check for bearish divergence
    if (priceHighs.length >= 2 && cciHighs.length >= 2) {
      const lastPriceHigh = priceHighs[priceHighs.length - 1];
      const prevPriceHigh = priceHighs[priceHighs.length - 2];
      const lastCCIHigh = cciHighs[cciHighs.length - 1];
      const prevCCIHigh = cciHighs[cciHighs.length - 2];
      
      if (lastPriceHigh.value > prevPriceHigh.value && lastCCIHigh.value < prevCCIHigh.value) {
        return { 
          type: 'bearish', 
          strength: this.calculateDivergenceStrength(lastPriceHigh, prevPriceHigh, lastCCIHigh, prevCCIHigh)
        };
      }
    }
    
    return null;
  }

  /**
   * Calculate divergence strength
   * @param {Object} lastPrice - Last price point
   * @param {Object} prevPrice - Previous price point
   * @param {Object} lastCCI - Last CCI point
   * @param {Object} prevCCI - Previous CCI point
   * @returns {string} Divergence strength
   */
  calculateDivergenceStrength(lastPrice, prevPrice, lastCCI, prevCCI) {
    const priceChange = Math.abs((lastPrice.value - prevPrice.value) / prevPrice.value);
    const cciChange = Math.abs(lastCCI.value - prevCCI.value);
    
    if (priceChange > 0.03 && cciChange > 50) {
      return 'strong';
    } else if (priceChange > 0.015 && cciChange > 25) {
      return 'medium';
    }
    
    return 'weak';
  }

  /**
   * Check trend filter
   * @param {Array} prices - Price history
   * @param {Array} cciHistory - CCI history
   * @returns {string} Trend direction: 'up', 'down', 'sideways'
   */
  checkTrendFilter(prices, cciHistory) {
    if (this.parameters.trendFilter === 'off') {
      return 'sideways';
    }
    
    const currentPrice = prices[prices.length - 1];
    
    switch (this.parameters.trendFilter) {
      case 'sma': {
        if (prices.length < this.parameters.trendPeriod) return 'sideways';
        const sma = this.calculateSMA(prices, this.parameters.trendPeriod);
        return currentPrice > sma * 1.005 ? 'up' : currentPrice < sma * 0.995 ? 'down' : 'sideways';
      }
      
      case 'ema': {
        if (prices.length < this.parameters.trendPeriod) return 'sideways';
        const ema = this.calculateEMA(prices, this.parameters.trendPeriod);
        if (!ema) return 'sideways';
        const currentEMA = ema[ema.length - 1];
        return currentPrice > currentEMA * 1.005 ? 'up' : currentPrice < currentEMA * 0.995 ? 'down' : 'sideways';
      }
      
      case 'cci_trend': {
        if (cciHistory.length < 10) return 'sideways';
        const recentCCI = cciHistory.slice(-10);
        const cciTrend = recentCCI[recentCCI.length - 1] - recentCCI[0];
        return cciTrend > 20 ? 'up' : cciTrend < -20 ? 'down' : 'sideways';
      }
      
      default:
        return 'sideways';
    }
  }

  /**
   * Calculate EMA for trend filter
   * @param {Array} prices - Price array
   * @param {number} period - EMA period
   * @returns {Array} EMA values
   */
  calculateEMA(prices, period) {
    if (prices.length < period) {
      return null;
    }
    
    const ema = [];
    const multiplier = 2 / (period + 1);
    
    // Start with SMA
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += prices[i];
    }
    ema.push(sum / period);
    
    // Calculate EMA
    for (let i = period; i < prices.length; i++) {
      const emaValue = (prices[i] * multiplier) + (ema[ema.length - 1] * (1 - multiplier));
      ema.push(emaValue);
    }
    
    return ema;
  }

  /**
   * Check volatility filter
   * @param {Array} prices - Price history
   * @returns {boolean} Whether volatility allows trading
   */
  checkVolatilityFilter(prices) {
    if (!this.parameters.volatilityFilter || prices.length < this.parameters.volatilityPeriod) {
      return true;
    }
    
    const recent = prices.slice(-this.parameters.volatilityPeriod);
    const returns = [];
    
    for (let i = 1; i < recent.length; i++) {
      returns.push((recent[i] - recent[i - 1]) / recent[i - 1]);
    }
    
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance);
    
    // Allow trading only in moderate volatility conditions
    return volatility > 0.005 && volatility < 0.05;
  }

  /**
   * Main strategy logic
   * @param {Object} candle - Current candle
   * @param {Array} historicalCandles - All historical candles
   * @param {Object} engine - Strategy engine
   * @returns {Object|null} Trading signal or null
   */
  async onCandle(candle, historicalCandles, engine) {
    if (!this.initialized) {
      throw new Error('Strategy not initialized');
    }
    
    // Need enough data
    const requiredBars = Math.max(
      this.parameters.period + 10,
      this.parameters.trendPeriod,
      this.parameters.volatilityPeriod,
      30
    );
    
    if (historicalCandles.length < requiredBars) {
      return null;
    }
    
    // Check risk management
    const riskSignal = this.checkRiskManagement(candle.close, candle.timestamp);
    if (riskSignal) {
      return riskSignal;
    }
    
    // Calculate typical price
    this.typicalPrice = this.calculateTypicalPrice(candle);
    this.typicalPriceHistory.push(this.typicalPrice);
    
    // Keep history manageable
    if (this.typicalPriceHistory.length > 100) {
      this.typicalPriceHistory = this.typicalPriceHistory.slice(-50);
    }
    
    // Calculate CCI
    this.previousCCI = this.cci;
    this.cci = this.calculateCCI(this.typicalPriceHistory, this.parameters.period);
    
    if (this.cci === null || this.previousCCI === null) {
      return null;
    }
    
    // Update CCI history
    this.cciHistory.push(this.cci);
    this.priceHistory.push(candle.close);
    
    // Keep history manageable
    if (this.cciHistory.length > 50) {
      this.cciHistory = this.cciHistory.slice(-30);
      this.priceHistory = this.priceHistory.slice(-30);
    }
    
    // Get dynamic levels
    const levels = this.calculateDynamicLevels(this.cciHistory);
    
    // Check trend filter
    const trend = this.checkTrendFilter(this.priceHistory, this.cciHistory);
    
    // Check volatility filter
    if (!this.checkVolatilityFilter(this.priceHistory)) {
      return null;
    }
    
    // Detect divergence
    const divergence = this.detectDivergence(this.priceHistory, this.cciHistory);
    
    // Check signal cooldown
    if (this.lastSignalTime && 
        (candle.timestamp - this.lastSignalTime) < (this.parameters.signalCooldown * 60000)) {
      return null;
    }
    
    // Update consecutive counters
    this.updateConsecutiveCounters(levels);
    
    // Update extreme readings
    this.updateExtremeReadings(levels);
    
    // Generate signals based on trading mode
    if (!this.position) {
      const signal = this.generateEntrySignal(candle, levels, trend, divergence);
      if (signal) {
        this.lastSignalTime = candle.timestamp;
        this.lastSignalType = signal.direction;
        return signal;
      }
    } else if (this.position === 'long') {
      const exitSignal = this.generateExitSignal(candle, levels, trend, divergence);
      if (exitSignal) {
        this.lastSignalTime = candle.timestamp;
        return exitSignal;
      }
    }
    
    return null;
  }

  /**
   * Update consecutive counters
   * @param {Object} levels - Dynamic levels
   */
  updateConsecutiveCounters(levels) {
    // Overbought/Oversold counters
    if (this.cci >= levels.overbought) {
      this.consecutiveAbove100++;
      this.consecutiveBelow100 = 0;
    } else if (this.cci <= levels.oversold) {
      this.consecutiveBelow100++;
      this.consecutiveAbove100 = 0;
    } else {
      this.consecutiveAbove100 = 0;
      this.consecutiveBelow100 = 0;
    }
    
    // Zero line counters
    if (this.cci > 0) {
      this.consecutiveAboveZero++;
      this.consecutiveBelowZero = 0;
    } else if (this.cci < 0) {
      this.consecutiveBelowZero++;
      this.consecutiveAboveZero = 0;
    } else {
      this.consecutiveAboveZero = 0;
      this.consecutiveBelowZero = 0;
    }
  }

  /**
   * Update extreme readings
   * @param {Object} levels - Dynamic levels
   */
  updateExtremeReadings(levels) {
    if (this.cci >= levels.extremeOverbought) {
      this.extremeReadings.high++;
    } else {
      this.extremeReadings.high = 0;
    }
    
    if (this.cci <= levels.extremeOversold) {
      this.extremeReadings.low++;
    } else {
      this.extremeReadings.low = 0;
    }
  }

  /**
   * Generate entry signal based on trading mode
   * @param {Object} candle - Current candle
   * @param {Object} levels - Dynamic levels
   * @param {string} trend - Trend direction
   * @param {Object} divergence - Divergence data
   * @returns {Object|null} Entry signal or null
   */
  generateEntrySignal(candle, levels, trend, divergence) {
    switch (this.parameters.tradingMode) {
      case 'standard':
        return this.generateStandardSignal(candle, levels, trend, divergence);
      
      case 'zero_line':
        return this.generateZeroLineSignal(candle, levels, trend, divergence);
      
      case 'extreme':
        return this.generateExtremeSignal(candle, levels, trend, divergence);
      
      case 'trend_following':
        return this.generateTrendFollowingSignal(candle, levels, trend, divergence);
      
      case 'mean_reversion':
        return this.generateMeanReversionSignal(candle, levels, trend, divergence);
      
      case 'divergence':
        return this.generateDivergenceSignal(candle, levels, trend, divergence);
      
      default:
        return null;
    }
  }

  /**
   * Generate standard CCI signal (±100 levels)
   * @param {Object} candle - Current candle
   * @param {Object} levels - Dynamic levels
   * @param {string} trend - Trend direction
   * @param {Object} divergence - Divergence data
   * @returns {Object|null} Entry signal or null
   */
  generateStandardSignal(candle, levels, trend, divergence) {
    // Buy when CCI crosses above oversold level from below
    if (this.previousCCI <= levels.oversold && this.cci > levels.oversold) {
      
      // Check momentum confirmation
      if (this.parameters.requireMomentumConfirmation) {
        const momentum = this.cci - this.previousCCI;
        if (momentum < this.parameters.minCCIChange) {
          return null;
        }
      }
      
      // Check trend filter
      if (trend === 'down' && this.parameters.trendFilter !== 'off') {
        return null;
      }
      
      const confidence = this.calculateSignalConfidence('bullish', levels, divergence, trend);
      
      return this.createEntrySignal('long', candle.close, candle.timestamp, {
        reason: 'CCI oversold recovery',
        cci: this.cci,
        previousCCI: this.previousCCI,
        levels,
        trend,
        divergence,
        confidence
      });
    }
    
    return null;
  }

  /**
   * Generate zero line cross signal
   * @param {Object} candle - Current candle
   * @param {Object} levels - Dynamic levels
   * @param {string} trend - Trend direction
   * @param {Object} divergence - Divergence data
   * @returns {Object|null} Entry signal or null
   */
  generateZeroLineSignal(candle, levels, trend, divergence) {
    // Buy when CCI crosses above zero from below
    if (this.previousCCI <= 0 && this.cci > 0) {
      
      // Check momentum confirmation
      if (this.parameters.requireMomentumConfirmation) {
        const momentum = this.cci - this.previousCCI;
        if (momentum < this.parameters.minCCIChange) {
          return null;
        }
      }
      
      // Check trend filter
      if (trend === 'down' && this.parameters.trendFilter !== 'off') {
        return null;
      }
      
      const confidence = this.calculateSignalConfidence('bullish', levels, divergence, trend);
      
      return this.createEntrySignal('long', candle.close, candle.timestamp, {
        reason: 'CCI zero line cross',
        cci: this.cci,
        previousCCI: this.previousCCI,
        confidence
      });
    }
    
    return null;
  }

  /**
   * Generate extreme level signal
   * @param {Object} candle - Current candle
   * @param {Object} levels - Dynamic levels
   * @param {string} trend - Trend direction
   * @param {Object} divergence - Divergence data
   * @returns {Object|null} Entry signal or null
   */
  generateExtremeSignal(candle, levels, trend, divergence) {
    // Buy when CCI recovers from extreme oversold
    if (this.extremeReadings.low >= this.parameters.consecutiveBarsRequired &&
        this.cci > this.previousCCI && 
        this.cci > levels.extremeOversold) {
      
      const confidence = this.calculateSignalConfidence('bullish', levels, divergence, trend);
      
      return this.createEntrySignal('long', candle.close, candle.timestamp, {
        reason: 'CCI extreme oversold recovery',
        cci: this.cci,
        extremeReadings: this.extremeReadings.low,
        confidence: Math.min(0.9, confidence + 0.15) // Boost confidence for extreme levels
      });
    }
    
    return null;
  }

  /**
   * Generate trend following signal
   * @param {Object} candle - Current candle
   * @param {Object} levels - Dynamic levels
   * @param {string} trend - Trend direction
   * @param {Object} divergence - Divergence data
   * @returns {Object|null} Entry signal or null
   */
  generateTrendFollowingSignal(candle, levels, trend, divergence) {
    // Buy on pullbacks in uptrend
    if (trend === 'up' && 
        this.consecutiveBelowZero >= this.parameters.consecutiveBarsRequired &&
        this.cci > this.previousCCI) {
      
      const confidence = this.calculateSignalConfidence('bullish', levels, divergence, trend);
      
      return this.createEntrySignal('long', candle.close, candle.timestamp, {
        reason: 'CCI trend following pullback',
        cci: this.cci,
        trend,
        consecutiveBelowZero: this.consecutiveBelowZero,
        confidence
      });
    }
    
    return null;
  }

  /**
   * Generate mean reversion signal
   * @param {Object} candle - Current candle
   * @param {Object} levels - Dynamic levels
   * @param {string} trend - Trend direction
   * @param {Object} divergence - Divergence data
   * @returns {Object|null} Entry signal or null
   */
  generateMeanReversionSignal(candle, levels, trend, divergence) {
    // Buy when CCI is oversold and starting to revert to mean
    if (this.cci <= levels.oversold && 
        this.cci > this.previousCCI &&
        Math.abs(this.cci) > Math.abs(this.previousCCI)) {
      
      // Avoid trading against strong trends
      if (trend === 'down' && this.parameters.trendFilter !== 'off') {
        return null;
      }
      
      const confidence = this.calculateSignalConfidence('bullish', levels, divergence, trend);
      
      return this.createEntrySignal('long', candle.close, candle.timestamp, {
        reason: 'CCI mean reversion',
        cci: this.cci,
        previousCCI: this.previousCCI,
        confidence
      });
    }
    
    return null;
  }

  /**
   * Generate divergence-focused signal
   * @param {Object} candle - Current candle
   * @param {Object} levels - Dynamic levels
   * @param {string} trend - Trend direction
   * @param {Object} divergence - Divergence data
   * @returns {Object|null} Entry signal or null
   */
  generateDivergenceSignal(candle, levels, trend, divergence) {
    if (!divergence || divergence.type !== 'bullish' || divergence.strength === 'weak') {
      return null;
    }
    
    // Require CCI to be in lower half and showing upward momentum
    if (this.cci < 0 && this.cci > this.previousCCI) {
      const confidence = this.calculateSignalConfidence('bullish', levels, divergence, trend);
      
      return this.createEntrySignal('long', candle.close, candle.timestamp, {
        reason: 'CCI bullish divergence',
        cci: this.cci,
        divergence,
        confidence: Math.min(0.9, confidence + 0.2) // Boost confidence for divergence
      });
    }
    
    return null;
  }

  /**
   * Generate exit signal
   * @param {Object} candle - Current candle
   * @param {Object} levels - Dynamic levels
   * @param {string} trend - Trend direction
   * @param {Object} divergence - Divergence data
   * @returns {Object|null} Exit signal or null
   */
  generateExitSignal(candle, levels, trend, divergence) {
    // Exit when CCI crosses below overbought level
    if (this.previousCCI >= levels.overbought && this.cci < levels.overbought) {
      return this.createExitSignal('cci_overbought', candle.close, candle.timestamp, {
        reason: 'CCI overbought decline',
        cci: this.cci,
        previousCCI: this.previousCCI,
        levels
      });
    }
    
    // Exit on extreme overbought with momentum loss
    if (this.extremeReadings.high >= this.parameters.consecutiveBarsRequired &&
        this.cci < this.previousCCI) {
      
      return this.createExitSignal('cci_extreme', candle.close, candle.timestamp, {
        reason: 'CCI extreme overbought reversal',
        cci: this.cci,
        extremeReadings: this.extremeReadings.high
      });
    }
    
    // Exit on bearish divergence
    if (divergence && divergence.type === 'bearish' && divergence.strength !== 'weak') {
      return this.createExitSignal('bearish_divergence', candle.close, candle.timestamp, {
        reason: 'CCI bearish divergence',
        cci: this.cci,
        divergence
      });
    }
    
    // Exit on zero line cross down (for trend following mode)
    if (this.parameters.tradingMode === 'trend_following' &&
        this.previousCCI >= 0 && this.cci < 0) {
      
      return this.createExitSignal('zero_line_cross', candle.close, candle.timestamp, {
        reason: 'CCI zero line cross down',
        cci: this.cci
      });
    }
    
    return null;
  }

  /**
   * Calculate signal confidence
   * @param {string} direction - Signal direction
   * @param {Object} levels - Dynamic levels
   * @param {Object} divergence - Divergence data
   * @param {string} trend - Trend direction
   * @returns {number} Confidence score (0-1)
   */
  calculateSignalConfidence(direction, levels, divergence, trend) {
    let confidence = 0.5;
    
    // Extremity bonus
    if (direction === 'bullish') {
      const extremity = Math.max(0, (levels.oversold - this.cci) / Math.abs(levels.oversold));
      confidence += Math.min(0.25, extremity);
    }
    
    // Momentum strength
    const momentum = Math.abs(this.cci - this.previousCCI);
    confidence += Math.min(0.2, momentum / 50);
    
    // Consecutive bars bonus
    const consecutiveBonus = Math.min(0.15, (this.consecutiveBelow100 + this.consecutiveAbove100) * 0.05);
    confidence += consecutiveBonus;
    
    // Extreme readings bonus
    if (this.extremeReadings.low > 0 || this.extremeReadings.high > 0) {
      confidence += 0.1;
    }
    
    // Divergence bonus
    if (divergence && 
        ((direction === 'bullish' && divergence.type === 'bullish') ||
         (direction === 'bearish' && divergence.type === 'bearish'))) {
      confidence += divergence.strength === 'strong' ? 0.25 : divergence.strength === 'medium' ? 0.15 : 0.1;
    }
    
    // Trend alignment
    if ((direction === 'bullish' && trend === 'up') ||
        (direction === 'bearish' && trend === 'down')) {
      confidence += 0.1;
    }
    
    return Math.min(0.95, confidence);
  }

  /**
   * Reset strategy state
   */
  reset() {
    super.reset();
    this.cci = null;
    this.previousCCI = null;
    this.typicalPrice = null;
    this.smaTypicalPrice = null;
    this.meanDeviation = null;
    this.typicalPriceHistory = [];
    this.cciHistory = [];
    this.priceHistory = [];
    this.lastSignalType = null;
    this.lastSignalTime = null;
    this.consecutiveAbove100 = 0;
    this.consecutiveBelow100 = 0;
    this.consecutiveAboveZero = 0;
    this.consecutiveBelowZero = 0;
    this.extremeReadings = { high: 0, low: 0 };
  }

  /**
   * Get current indicator values
   * @returns {Object} Current indicator values
   */
  getIndicatorValues() {
    return {
      cci: this.cci,
      previousCCI: this.previousCCI,
      typicalPrice: this.typicalPrice,
      consecutiveAbove100: this.consecutiveAbove100,
      consecutiveBelow100: this.consecutiveBelow100,
      consecutiveAboveZero: this.consecutiveAboveZero,
      consecutiveBelowZero: this.consecutiveBelowZero,
      extremeReadings: this.extremeReadings,
      position: this.position,
      entryPrice: this.entryPrice,
      lastSignalType: this.lastSignalType
    };
  }
}

// Named export for compatibility
export { CCIStrategy };

// CommonJS export for the babel/jest pipeline. Guarded so that loading this
// file as a native ES module (e.g. backtester's import()) does not crash.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CCIStrategy;
}