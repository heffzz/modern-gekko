/**
 * Bollinger Bands Strategy
 * 
 * Bollinger Bands consist of a middle line (SMA) and two outer bands that are
 * standard deviations away from the middle line. They expand and contract based
 * on market volatility.
 * 
 * Components:
 * - Middle Band: Simple Moving Average (typically 20 periods)
 * - Upper Band: Middle Band + (Standard Deviation * multiplier)
 * - Lower Band: Middle Band - (Standard Deviation * multiplier)
 * 
 * Trading signals:
 * - Buy: Price touches or breaks below lower band (oversold)
 * - Sell: Price touches or breaks above upper band (overbought)
 * - Additional signals from band squeezes, %B indicator, and bandwidth
 */

import BaseStrategy from './BaseStrategy.js';

export default class BollingerBandsStrategy extends BaseStrategy {
  constructor() {
    super();
    
    this.name = 'Bollinger Bands Strategy';
    this.description = 'Bollinger Bands strategy with multiple signal modes and volatility analysis';
    this.author = 'Gekko Team';
    this.version = '1.0.0';
    this.category = 'Volatility';
    
    // Bollinger Bands state
    this.middleBand = null; // SMA
    this.upperBand = null;
    this.lowerBand = null;
    this.bandwidth = null;
    this.percentB = null;
    this.standardDeviation = null;
    
    // Previous values for crossover detection
    this.previousMiddleBand = null;
    this.previousUpperBand = null;
    this.previousLowerBand = null;
    this.previousPercentB = null;
    this.previousBandwidth = null;
    
    // Historical data for calculations
    this.priceHistory = [];
    this.bandwidthHistory = [];
    this.percentBHistory = [];
    
    // Signal state
    this.lastSignalType = null;
    this.lastSignalTime = null;
    this.bandSqueeze = false;
    this.previousBandSqueeze = false;
    this.touchCount = { upper: 0, lower: 0 };
    this.walkingTheBands = { upper: 0, lower: 0 };
    
    this.initializeParameters();
  }

  initializeParameters() {
    super.initializeParameters();
    
    // Bollinger Bands calculation parameters
    this.defineParameter('period', {
      label: 'Period',
      description: 'Period for middle band (SMA) calculation',
      type: 'number',
      default: 20,
      min: 5,
      max: 50,
      step: 1,
      category: 'Bollinger Bands Settings'
    });
    
    this.defineParameter('standardDeviations', {
      label: 'Standard Deviations',
      description: 'Number of standard deviations for band calculation',
      type: 'number',
      default: 2.0,
      min: 1.0,
      max: 3.0,
      step: 0.1,
      category: 'Bollinger Bands Settings'
    });
    
    // Trading mode
    this.defineParameter('tradingMode', {
      label: 'Trading Mode',
      description: 'Strategy approach for signal generation',
      type: 'select',
      default: 'mean_reversion',
      options: [
        { value: 'mean_reversion', label: 'Mean Reversion (band touches)' },
        { value: 'breakout', label: 'Breakout (band breaks)' },
        { value: 'squeeze', label: 'Squeeze Breakout' },
        { value: 'percent_b', label: '%B Oscillator' },
        { value: 'walking_bands', label: 'Walking the Bands' },
        { value: 'hybrid', label: 'Hybrid (multiple signals)' }
      ],
      category: 'Strategy Mode'
    });
    
    // %B thresholds
    this.defineParameter('percentBOverbought', {
      label: '%B Overbought Level',
      description: '%B level considered overbought (0-1)',
      type: 'number',
      default: 0.8,
      min: 0.6,
      max: 1.0,
      step: 0.05,
      category: '%B Settings'
    });
    
    this.defineParameter('percentBOversold', {
      label: '%B Oversold Level',
      description: '%B level considered oversold (0-1)',
      type: 'number',
      default: 0.2,
      min: 0.0,
      max: 0.4,
      step: 0.05,
      category: '%B Settings',
      validation: (value) => {
        if (value >= this.parameters.percentBOverbought) {
          return '%B oversold level must be less than overbought level';
        }
        return true;
      }
    });
    
    // Squeeze detection
    this.defineParameter('squeezeThreshold', {
      label: 'Squeeze Threshold',
      description: 'Bandwidth threshold for squeeze detection (lower = tighter)',
      type: 'number',
      default: 0.1,
      min: 0.05,
      max: 0.3,
      step: 0.01,
      category: 'Squeeze Settings'
    });
    
    this.defineParameter('squeezePeriod', {
      label: 'Squeeze Period',
      description: 'Minimum periods for squeeze confirmation',
      type: 'number',
      default: 6,
      min: 3,
      max: 15,
      step: 1,
      category: 'Squeeze Settings'
    });
    
    // Band touch settings
    this.defineParameter('touchSensitivity', {
      label: 'Band Touch Sensitivity',
      description: 'How close to band constitutes a "touch" (0-1)',
      type: 'number',
      default: 0.02,
      min: 0.001,
      max: 0.1,
      step: 0.005,
      category: 'Band Touch Settings'
    });
    
    this.defineParameter('maxTouchCount', {
      label: 'Max Touch Count',
      description: 'Maximum consecutive touches before signal strength decreases',
      type: 'number',
      default: 3,
      min: 1,
      max: 10,
      step: 1,
      category: 'Band Touch Settings'
    });
    
    // Walking the bands settings
    this.defineParameter('walkingThreshold', {
      label: 'Walking Threshold',
      description: 'Minimum periods outside band for "walking" signal',
      type: 'number',
      default: 3,
      min: 2,
      max: 10,
      step: 1,
      category: 'Walking Bands Settings'
    });
    
    // Signal confirmation
    this.defineParameter('requireVolumeConfirmation', {
      label: 'Require Volume Confirmation',
      description: 'Require above-average volume for signals',
      type: 'boolean',
      default: false,
      category: 'Signal Confirmation'
    });
    
    this.defineParameter('volumePeriod', {
      label: 'Volume Period',
      description: 'Period for volume average calculation',
      type: 'number',
      default: 20,
      min: 10,
      max: 50,
      step: 5,
      category: 'Signal Confirmation'
    });
    
    this.defineParameter('requireMomentumConfirmation', {
      label: 'Require Momentum Confirmation',
      description: 'Require price momentum in signal direction',
      type: 'boolean',
      default: true,
      category: 'Signal Confirmation'
    });
    
    // Advanced features
    this.defineParameter('adaptiveBands', {
      label: 'Adaptive Bands',
      description: 'Adjust standard deviation based on volatility regime',
      type: 'boolean',
      default: false,
      category: 'Advanced Features'
    });
    
    this.defineParameter('volatilityRegimePeriod', {
      label: 'Volatility Regime Period',
      description: 'Period for volatility regime calculation',
      type: 'number',
      default: 50,
      min: 20,
      max: 100,
      step: 10,
      category: 'Advanced Features'
    });
    
    this.defineParameter('trendFilter', {
      label: 'Trend Filter',
      description: 'Filter signals based on trend direction',
      type: 'select',
      default: 'off',
      options: [
        { value: 'off', label: 'Disabled' },
        { value: 'middle_band', label: 'Middle Band Trend' },
        { value: 'ema', label: 'EMA Trend Filter' },
        { value: 'price_position', label: 'Price Position Filter' }
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
    
    this.defineParameter('signalCooldown', {
      label: 'Signal Cooldown (bars)',
      description: 'Minimum bars between signals to reduce noise',
      type: 'number',
      default: 5,
      min: 0,
      max: 20,
      step: 1,
      category: 'Signal Confirmation'
    });
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
   * Calculate Standard Deviation
   * @param {Array} values - Values array
   * @param {number} period - Period
   * @param {number} mean - Mean value
   * @returns {number|null} Standard deviation
   */
  calculateStandardDeviation(values, period, mean) {
    if (values.length < period) {
      return null;
    }
    
    const slice = values.slice(-period);
    const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
    return Math.sqrt(variance);
  }

  /**
   * Calculate Bollinger Bands
   * @param {Array} prices - Price array
   * @param {number} period - Period
   * @param {number} stdDev - Standard deviation multiplier
   * @returns {Object|null} Bollinger Bands values
   */
  calculateBollingerBands(prices, period, stdDev) {
    if (prices.length < period) {
      return null;
    }
    
    const middleBand = this.calculateSMA(prices, period);
    if (middleBand === null) {
      return null;
    }
    
    const standardDeviation = this.calculateStandardDeviation(prices, period, middleBand);
    if (standardDeviation === null) {
      return null;
    }
    
    // Adaptive bands adjustment
    let adjustedStdDev = stdDev;
    if (this.parameters.adaptiveBands) {
      adjustedStdDev = this.calculateAdaptiveStdDev(prices, stdDev);
    }
    
    const upperBand = middleBand + (standardDeviation * adjustedStdDev);
    const lowerBand = middleBand - (standardDeviation * adjustedStdDev);
    
    return {
      middleBand,
      upperBand,
      lowerBand,
      standardDeviation
    };
  }

  /**
   * Calculate adaptive standard deviation multiplier
   * @param {Array} prices - Price array
   * @param {number} baseStdDev - Base standard deviation multiplier
   * @returns {number} Adjusted standard deviation multiplier
   */
  calculateAdaptiveStdDev(prices, baseStdDev) {
    if (prices.length < this.parameters.volatilityRegimePeriod) {
      return baseStdDev;
    }
    
    // Calculate recent volatility
    const recentPrices = prices.slice(-this.parameters.volatilityRegimePeriod);
    const returns = [];
    
    for (let i = 1; i < recentPrices.length; i++) {
      returns.push((recentPrices[i] - recentPrices[i - 1]) / recentPrices[i - 1]);
    }
    
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance);
    
    // Adjust standard deviation based on volatility regime
    const volatilityFactor = Math.min(2, Math.max(0.5, volatility / 0.02));
    
    return baseStdDev * volatilityFactor;
  }

  /**
   * Calculate %B (Percent B)
   * @param {number} price - Current price
   * @param {number} upperBand - Upper band
   * @param {number} lowerBand - Lower band
   * @returns {number} %B value
   */
  calculatePercentB(price, upperBand, lowerBand) {
    if (upperBand === lowerBand) {
      return 0.5; // Neutral when bands are collapsed
    }
    
    return (price - lowerBand) / (upperBand - lowerBand);
  }

  /**
   * Calculate Bandwidth
   * @param {number} upperBand - Upper band
   * @param {number} lowerBand - Lower band
   * @param {number} middleBand - Middle band
   * @returns {number} Bandwidth value
   */
  calculateBandwidth(upperBand, lowerBand, middleBand) {
    if (middleBand === 0) {
      return 0;
    }
    
    return (upperBand - lowerBand) / middleBand;
  }

  /**
   * Detect band squeeze
   * @param {Array} bandwidthHistory - Bandwidth history
   * @returns {boolean} Whether squeeze is detected
   */
  detectBandSqueeze(bandwidthHistory) {
    if (bandwidthHistory.length < this.parameters.squeezePeriod) {
      return false;
    }
    
    const recentBandwidth = bandwidthHistory.slice(-this.parameters.squeezePeriod);
    const avgBandwidth = recentBandwidth.reduce((sum, bw) => sum + bw, 0) / recentBandwidth.length;
    
    return avgBandwidth < this.parameters.squeezeThreshold;
  }

  /**
   * Check band touch
   * @param {number} price - Current price
   * @param {number} band - Band level
   * @returns {boolean} Whether price touches band
   */
  checkBandTouch(price, band) {
    const distance = Math.abs(price - band) / band;
    return distance <= this.parameters.touchSensitivity;
  }

  /**
   * Check trend filter
   * @param {Array} prices - Price history
   * @param {number} currentPrice - Current price
   * @returns {string} Trend direction: 'up', 'down', 'sideways'
   */
  checkTrendFilter(prices, currentPrice) {
    if (this.parameters.trendFilter === 'off') {
      return 'sideways';
    }
    
    switch (this.parameters.trendFilter) {
      case 'middle_band': {
        return currentPrice > this.middleBand ? 'up' : currentPrice < this.middleBand ? 'down' : 'sideways';
      }
      
      case 'ema': {
        if (prices.length < this.parameters.trendPeriod) return 'sideways';
        const ema = this.calculateEMA(prices, this.parameters.trendPeriod);
        if (!ema) return 'sideways';
        const currentEMA = ema[ema.length - 1];
        return currentPrice > currentEMA * 1.005 ? 'up' : currentPrice < currentEMA * 0.995 ? 'down' : 'sideways';
      }
      
      case 'price_position': {
        if (this.percentB > 0.6) return 'up';
        if (this.percentB < 0.4) return 'down';
        return 'sideways';
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
   * Check volume confirmation
   * @param {Array} volumes - Volume history
   * @param {number} currentVolume - Current volume
   * @returns {boolean} Whether volume confirms signal
   */
  checkVolumeConfirmation(volumes, currentVolume) {
    if (!this.parameters.requireVolumeConfirmation || volumes.length < this.parameters.volumePeriod) {
      return true;
    }
    
    const avgVolume = this.calculateSMA(volumes, this.parameters.volumePeriod);
    return currentVolume > avgVolume * 1.2; // 20% above average
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
      this.parameters.volatilityRegimePeriod,
      this.parameters.volumePeriod,
      50
    );
    
    if (historicalCandles.length < requiredBars) {
      return null;
    }
    
    // Check risk management
    const riskSignal = this.checkRiskManagement(candle.close, candle.timestamp);
    if (riskSignal) {
      return riskSignal;
    }
    
    // Extract price and volume data
    const closePrices = historicalCandles.map(c => c.close);
    const volumes = historicalCandles.map(c => c.volume || 0);
    
    // Store previous values
    this.previousMiddleBand = this.middleBand;
    this.previousUpperBand = this.upperBand;
    this.previousLowerBand = this.lowerBand;
    this.previousPercentB = this.percentB;
    this.previousBandwidth = this.bandwidth;
    this.previousBandSqueeze = this.bandSqueeze;
    
    // Calculate Bollinger Bands
    const bands = this.calculateBollingerBands(closePrices, this.parameters.period, this.parameters.standardDeviations);
    if (!bands) {
      return null;
    }
    
    this.middleBand = bands.middleBand;
    this.upperBand = bands.upperBand;
    this.lowerBand = bands.lowerBand;
    this.standardDeviation = bands.standardDeviation;
    
    // Calculate %B and Bandwidth
    this.percentB = this.calculatePercentB(candle.close, this.upperBand, this.lowerBand);
    this.bandwidth = this.calculateBandwidth(this.upperBand, this.lowerBand, this.middleBand);
    
    // Update history
    this.priceHistory.push(candle.close);
    this.bandwidthHistory.push(this.bandwidth);
    this.percentBHistory.push(this.percentB);
    
    // Keep history manageable
    if (this.priceHistory.length > 100) {
      this.priceHistory = this.priceHistory.slice(-50);
      this.bandwidthHistory = this.bandwidthHistory.slice(-50);
      this.percentBHistory = this.percentBHistory.slice(-50);
    }
    
    // Detect band squeeze
    this.bandSqueeze = this.detectBandSqueeze(this.bandwidthHistory);
    
    // Update touch counters
    this.updateTouchCounters(candle.close);
    
    // Update walking the bands counters
    this.updateWalkingCounters(candle.close);
    
    // Check trend filter
    const trend = this.checkTrendFilter(this.priceHistory, candle.close);
    
    // Check volume confirmation
    const volumeConfirmed = this.checkVolumeConfirmation(volumes, candle.volume || 0);
    
    // Check signal cooldown
    if (this.lastSignalTime && 
        (candle.timestamp - this.lastSignalTime) < (this.parameters.signalCooldown * 60000)) {
      return null;
    }
    
    // Generate signals based on trading mode
    if (!this.position) {
      const signal = this.generateEntrySignal(candle, trend, volumeConfirmed);
      if (signal) {
        this.lastSignalTime = candle.timestamp;
        this.lastSignalType = signal.direction;
        return signal;
      }
    } else if (this.position === 'long') {
      const exitSignal = this.generateExitSignal(candle, trend, volumeConfirmed);
      if (exitSignal) {
        this.lastSignalTime = candle.timestamp;
        return exitSignal;
      }
    }
    
    return null;
  }

  /**
   * Update touch counters
   * @param {number} price - Current price
   */
  updateTouchCounters(price) {
    // Upper band touch
    if (this.checkBandTouch(price, this.upperBand)) {
      this.touchCount.upper++;
      this.touchCount.lower = 0;
    }
    // Lower band touch
    else if (this.checkBandTouch(price, this.lowerBand)) {
      this.touchCount.lower++;
      this.touchCount.upper = 0;
    }
    // No touch
    else {
      this.touchCount.upper = 0;
      this.touchCount.lower = 0;
    }
  }

  /**
   * Update walking the bands counters
   * @param {number} price - Current price
   */
  updateWalkingCounters(price) {
    // Walking upper band (price consistently above upper band)
    if (price > this.upperBand) {
      this.walkingTheBands.upper++;
      this.walkingTheBands.lower = 0;
    }
    // Walking lower band (price consistently below lower band)
    else if (price < this.lowerBand) {
      this.walkingTheBands.lower++;
      this.walkingTheBands.upper = 0;
    }
    // Inside bands
    else {
      this.walkingTheBands.upper = 0;
      this.walkingTheBands.lower = 0;
    }
  }

  /**
   * Generate entry signal based on trading mode
   * @param {Object} candle - Current candle
   * @param {string} trend - Trend direction
   * @param {boolean} volumeConfirmed - Volume confirmation
   * @returns {Object|null} Entry signal or null
   */
  generateEntrySignal(candle, trend, volumeConfirmed) {
    if (!volumeConfirmed) {
      return null;
    }
    
    switch (this.parameters.tradingMode) {
      case 'mean_reversion':
        return this.generateMeanReversionSignal(candle, trend);
      
      case 'breakout':
        return this.generateBreakoutSignal(candle, trend);
      
      case 'squeeze':
        return this.generateSqueezeSignal(candle, trend);
      
      case 'percent_b':
        return this.generatePercentBSignal(candle, trend);
      
      case 'walking_bands':
        return this.generateWalkingBandsSignal(candle, trend);
      
      case 'hybrid':
        return this.generateHybridSignal(candle, trend);
      
      default:
        return null;
    }
  }

  /**
   * Generate mean reversion signal
   * @param {Object} candle - Current candle
   * @param {string} trend - Trend direction
   * @returns {Object|null} Entry signal or null
   */
  generateMeanReversionSignal(candle, trend) {
    // Buy when price touches lower band and shows reversal
    if (this.touchCount.lower >= 1 && 
        candle.close > candle.open && // Bullish candle
        this.percentB < this.parameters.percentBOversold + 0.1) {
      
      // Check momentum confirmation
      if (this.parameters.requireMomentumConfirmation && 
          this.percentB <= this.previousPercentB) {
        return null;
      }
      
      // Avoid trading against strong downtrend
      if (trend === 'down' && this.parameters.trendFilter !== 'off') {
        return null;
      }
      
      const confidence = this.calculateSignalConfidence('bullish', trend);
      
      return this.createEntrySignal('long', candle.close, candle.timestamp, {
        reason: 'Bollinger Bands mean reversion',
        percentB: this.percentB,
        touchCount: this.touchCount.lower,
        bandwidth: this.bandwidth,
        trend,
        confidence
      });
    }
    
    return null;
  }

  /**
   * Generate breakout signal
   * @param {Object} candle - Current candle
   * @param {string} trend - Trend direction
   * @returns {Object|null} Entry signal or null
   */
  generateBreakoutSignal(candle, trend) {
    // Buy on upward breakout above upper band
    if (candle.close > this.upperBand && 
        (this.priceHistory[this.priceHistory.length - 2] || 0) <= this.previousUpperBand) {
      
      // Check momentum confirmation
      if (this.parameters.requireMomentumConfirmation && 
          candle.close <= candle.open) {
        return null;
      }
      
      // Require trend alignment
      if (trend === 'down' && this.parameters.trendFilter !== 'off') {
        return null;
      }
      
      const confidence = this.calculateSignalConfidence('bullish', trend);
      
      return this.createEntrySignal('long', candle.close, candle.timestamp, {
        reason: 'Bollinger Bands upward breakout',
        percentB: this.percentB,
        bandwidth: this.bandwidth,
        trend,
        confidence
      });
    }
    
    return null;
  }

  /**
   * Generate squeeze breakout signal
   * @param {Object} candle - Current candle
   * @param {string} trend - Trend direction
   * @returns {Object|null} Entry signal or null
   */
  generateSqueezeSignal(candle, trend) {
    // Buy on breakout after squeeze
    if (this.previousBandSqueeze && !this.bandSqueeze && 
        candle.close > this.middleBand && 
        this.percentB > 0.5) {
      
      // Check momentum confirmation
      if (this.parameters.requireMomentumConfirmation && 
          candle.close <= candle.open) {
        return null;
      }
      
      const confidence = this.calculateSignalConfidence('bullish', trend);
      
      return this.createEntrySignal('long', candle.close, candle.timestamp, {
        reason: 'Bollinger Bands squeeze breakout',
        percentB: this.percentB,
        bandwidth: this.bandwidth,
        previousSqueeze: this.previousBandSqueeze,
        confidence: Math.min(0.9, confidence + 0.15) // Boost confidence for squeeze breakout
      });
    }
    
    return null;
  }

  /**
   * Generate %B oscillator signal
   * @param {Object} candle - Current candle
   * @param {string} trend - Trend direction
   * @returns {Object|null} Entry signal or null
   */
  generatePercentBSignal(candle, trend) {
    // Buy when %B crosses above oversold level
    if (this.previousPercentB <= this.parameters.percentBOversold && 
        this.percentB > this.parameters.percentBOversold) {
      
      // Check momentum confirmation
      if (this.parameters.requireMomentumConfirmation && 
          this.percentB <= this.previousPercentB) {
        return null;
      }
      
      // Avoid trading against strong downtrend
      if (trend === 'down' && this.parameters.trendFilter !== 'off') {
        return null;
      }
      
      const confidence = this.calculateSignalConfidence('bullish', trend);
      
      return this.createEntrySignal('long', candle.close, candle.timestamp, {
        reason: 'Bollinger %B oversold recovery',
        percentB: this.percentB,
        previousPercentB: this.previousPercentB,
        confidence
      });
    }
    
    return null;
  }

  /**
   * Generate walking the bands signal
   * @param {Object} candle - Current candle
   * @param {string} trend - Trend direction
   * @returns {Object|null} Entry signal or null
   */
  generateWalkingBandsSignal(candle, trend) {
    // Buy when price starts walking the upper band (strong uptrend)
    if (this.walkingTheBands.upper >= this.parameters.walkingThreshold && 
        candle.close > candle.open) {
      
      // Require trend alignment
      if (trend !== 'up' && this.parameters.trendFilter !== 'off') {
        return null;
      }
      
      const confidence = this.calculateSignalConfidence('bullish', trend);
      
      return this.createEntrySignal('long', candle.close, candle.timestamp, {
        reason: 'Bollinger Bands walking upper band',
        percentB: this.percentB,
        walkingCount: this.walkingTheBands.upper,
        confidence
      });
    }
    
    return null;
  }

  /**
   * Generate hybrid signal (combines multiple approaches)
   * @param {Object} candle - Current candle
   * @param {string} trend - Trend direction
   * @returns {Object|null} Entry signal or null
   */
  generateHybridSignal(candle, trend) {
    const signals = [
      this.generateMeanReversionSignal(candle, trend),
      this.generateSqueezeSignal(candle, trend),
      this.generatePercentBSignal(candle, trend)
    ].filter(signal => signal !== null);
    
    // Require at least 2 signals for hybrid approach
    if (signals.length >= 2) {
      const bestSignal = signals[0]; // Take the first valid signal
      bestSignal.metadata.confidence = Math.min(0.95, bestSignal.metadata.confidence + 0.1);
      bestSignal.metadata.reason = 'Bollinger Bands hybrid signal';
      bestSignal.metadata.signalCount = signals.length;
      return bestSignal;
    }
    
    return null;
  }

  /**
   * Generate exit signal
   * @param {Object} candle - Current candle
   * @param {string} trend - Trend direction
   * @param {boolean} volumeConfirmed - Volume confirmation
   * @returns {Object|null} Exit signal or null
   */
  generateExitSignal(candle, trend, volumeConfirmed) {
    // Exit when price touches upper band (mean reversion)
    if (this.parameters.tradingMode === 'mean_reversion' &&
        this.touchCount.upper >= 1 && 
        this.percentB >= this.parameters.percentBOverbought) {
      
      return this.createExitSignal('upper_band_touch', candle.close, candle.timestamp, {
        reason: 'Bollinger upper band touch',
        percentB: this.percentB,
        touchCount: this.touchCount.upper
      });
    }
    
    // Exit on %B overbought
    if (this.previousPercentB >= this.parameters.percentBOverbought && 
        this.percentB < this.parameters.percentBOverbought) {
      
      return this.createExitSignal('percent_b_overbought', candle.close, candle.timestamp, {
        reason: 'Bollinger %B overbought decline',
        percentB: this.percentB,
        previousPercentB: this.previousPercentB
      });
    }
    
    // Exit on middle band cross down
    if (candle.close < this.middleBand && 
        (this.priceHistory[this.priceHistory.length - 2] || 0) >= this.previousMiddleBand) {
      
      return this.createExitSignal('middle_band_cross', candle.close, candle.timestamp, {
        reason: 'Bollinger middle band cross down',
        percentB: this.percentB
      });
    }
    
    // Exit on band squeeze formation (volatility contraction)
    if (!this.previousBandSqueeze && this.bandSqueeze) {
      return this.createExitSignal('squeeze_formation', candle.close, candle.timestamp, {
        reason: 'Bollinger Bands squeeze formation',
        bandwidth: this.bandwidth
      });
    }
    
    return null;
  }

  /**
   * Calculate signal confidence
   * @param {string} direction - Signal direction
   * @param {string} trend - Trend direction
   * @returns {number} Confidence score (0-1)
   */
  calculateSignalConfidence(direction, trend) {
    let confidence = 0.5;
    
    // %B position bonus
    if (direction === 'bullish') {
      const extremity = Math.max(0, this.parameters.percentBOversold - this.percentB);
      confidence += Math.min(0.25, extremity * 2);
    }
    
    // Bandwidth bonus (wider bands = higher confidence)
    const bandwidthBonus = Math.min(0.2, this.bandwidth * 5);
    confidence += bandwidthBonus;
    
    // Touch count bonus (but diminishing returns)
    const touchBonus = Math.min(0.15, (this.touchCount.lower + this.touchCount.upper) * 0.05);
    confidence += touchBonus;
    
    // Squeeze breakout bonus
    if (this.previousBandSqueeze && !this.bandSqueeze) {
      confidence += 0.2;
    }
    
    // Walking the bands bonus
    if (this.walkingTheBands.upper > 0 || this.walkingTheBands.lower > 0) {
      confidence += 0.1;
    }
    
    // Trend alignment
    if ((direction === 'bullish' && trend === 'up') ||
        (direction === 'bearish' && trend === 'down')) {
      confidence += 0.1;
    }
    
    // Momentum confirmation
    if (this.parameters.requireMomentumConfirmation) {
      const momentum = this.percentB - this.previousPercentB;
      if ((direction === 'bullish' && momentum > 0) ||
          (direction === 'bearish' && momentum < 0)) {
        confidence += 0.1;
      }
    }
    
    return Math.min(0.95, confidence);
  }

  /**
   * Reset strategy state
   */
  reset() {
    super.reset();
    this.middleBand = null;
    this.upperBand = null;
    this.lowerBand = null;
    this.bandwidth = null;
    this.percentB = null;
    this.standardDeviation = null;
    this.previousMiddleBand = null;
    this.previousUpperBand = null;
    this.previousLowerBand = null;
    this.previousPercentB = null;
    this.previousBandwidth = null;
    this.priceHistory = [];
    this.bandwidthHistory = [];
    this.percentBHistory = [];
    this.lastSignalType = null;
    this.lastSignalTime = null;
    this.bandSqueeze = false;
    this.previousBandSqueeze = false;
    this.touchCount = { upper: 0, lower: 0 };
    this.walkingTheBands = { upper: 0, lower: 0 };
  }

  /**
   * Get current indicator values
   * @returns {Object} Current indicator values
   */
  getIndicatorValues() {
    return {
      middleBand: this.middleBand,
      upperBand: this.upperBand,
      lowerBand: this.lowerBand,
      percentB: this.percentB,
      bandwidth: this.bandwidth,
      bandSqueeze: this.bandSqueeze,
      touchCount: this.touchCount,
      walkingTheBands: this.walkingTheBands,
      position: this.position,
      entryPrice: this.entryPrice,
      lastSignalType: this.lastSignalType
    };
  }
}

// Named export for compatibility
export { BollingerBandsStrategy };

// CommonJS export for compatibility with tests
module.exports = BollingerBandsStrategy;