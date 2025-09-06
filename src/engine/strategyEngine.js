import { SMA } from '../indicators/SMA.js';
import { EMA } from '../indicators/EMA.js';
import { RSI } from '../indicators/RSI.js';

export class StrategyEngine {
  constructor() {
    this.currentCandle = null;
    this.historicalCandles = [];
    this.cache = new Map();
  }

  /**
   * Update the engine with a new candle
   * @param {Object} candle - Current candle data
   * @param {Array} historicalCandles - All historical candles up to current
   */
  updateCandle(candle, historicalCandles) {
    this.currentCandle = candle;
    this.historicalCandles = historicalCandles;

    // Clear cache for new candle
    this.cache.clear();
  }

  /**
   * Get current candle
   * @returns {Object} Current candle
   */
  getCurrentCandle() {
    return this.currentCandle;
  }

  /**
   * Get historical candles
   * @param {number} count - Number of candles to return (optional)
   * @returns {Array} Historical candles
   */
  getHistoricalCandles(count = null) {
    if (count === null) {
      return this.historicalCandles;
    }
    return this.historicalCandles.slice(-count);
  }

  /**
   * Get closing prices from historical candles
   * @param {number} count - Number of prices to return (optional)
   * @returns {Array} Array of closing prices
   */
  getClosePrices(count = null) {
    const candles = this.getHistoricalCandles(count);
    return candles.map(candle => candle.close);
  }

  /**
   * Get high prices from historical candles
   * @param {number} count - Number of prices to return (optional)
   * @returns {Array} Array of high prices
   */
  getHighPrices(count = null) {
    const candles = this.getHistoricalCandles(count);
    return candles.map(candle => candle.high);
  }

  /**
   * Get low prices from historical candles
   * @param {number} count - Number of prices to return (optional)
   * @returns {Array} Array of low prices
   */
  getLowPrices(count = null) {
    const candles = this.getHistoricalCandles(count);
    return candles.map(candle => candle.low);
  }

  /**
   * Get volumes from historical candles
   * @param {number} count - Number of volumes to return (optional)
   * @returns {Array} Array of volumes
   */
  getVolumes(count = null) {
    const candles = this.getHistoricalCandles(count);
    return candles.map(candle => candle.volume || 0);
  }

  /**
   * Calculate Simple Moving Average
   * @param {number} period - SMA period
   * @param {string} priceType - Price type ('close', 'high', 'low', 'open')
   * @returns {number|null} SMA value or null if insufficient data
   */
  sma(period, priceType = 'close') {
    const cacheKey = `sma_${period}_${priceType}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    let prices;
    switch (priceType) {
    case 'high':
      prices = this.getHighPrices();
      break;
    case 'low':
      prices = this.getLowPrices();
      break;
    case 'open':
      prices = this.historicalCandles.map(c => c.open);
      break;
    default:
      prices = this.getClosePrices();
    }

    const result = SMA.calculateLast(prices, period);
    this.cache.set(cacheKey, result);
    return result;
  }

  /**
   * Calculate Exponential Moving Average
   * @param {number} period - EMA period
   * @param {string} priceType - Price type ('close', 'high', 'low', 'open')
   * @returns {number|null} EMA value or null if insufficient data
   */
  ema(period, priceType = 'close') {
    const cacheKey = `ema_${period}_${priceType}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    let prices;
    switch (priceType) {
    case 'high':
      prices = this.getHighPrices();
      break;
    case 'low':
      prices = this.getLowPrices();
      break;
    case 'open':
      prices = this.historicalCandles.map(c => c.open);
      break;
    default:
      prices = this.getClosePrices();
    }

    const result = EMA.calculateLast(prices, period);
    this.cache.set(cacheKey, result);
    return result;
  }

  /**
   * Calculate Relative Strength Index
   * @param {number} period - RSI period (default 14)
   * @returns {number|null} RSI value or null if insufficient data
   */
  rsi(period = 14) {
    const cacheKey = `rsi_${period}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const prices = this.getClosePrices();
    const result = RSI.calculateLast(prices, period);
    this.cache.set(cacheKey, result);
    return result;
  }

  /**
   * Check if current price is above a moving average
   * @param {string} type - MA type ('sma' or 'ema')
   * @param {number} period - MA period
   * @param {string} priceType - Price type to compare
   * @returns {boolean} True if price is above MA
   */
  isPriceAboveMA(type, period, priceType = 'close') {
    if (!this.currentCandle) return false;

    const ma = type === 'ema' ? this.ema(period, priceType) : this.sma(period, priceType);
    if (ma === null) return false;

    const currentPrice = this.currentCandle[priceType];
    return currentPrice > ma;
  }

  /**
   * Check if current price is below a moving average
   * @param {string} type - MA type ('sma' or 'ema')
   * @param {number} period - MA period
   * @param {string} priceType - Price type to compare
   * @returns {boolean} True if price is below MA
   */
  isPriceBelowMA(type, period, priceType = 'close') {
    if (!this.currentCandle) return false;

    const ma = type === 'ema' ? this.ema(period, priceType) : this.sma(period, priceType);
    if (ma === null) return false;

    const currentPrice = this.currentCandle[priceType];
    return currentPrice < ma;
  }

  /**
   * Check for moving average crossover (fast MA crosses above slow MA)
   * @param {string} type - MA type ('sma' or 'ema')
   * @param {number} fastPeriod - Fast MA period
   * @param {number} slowPeriod - Slow MA period
   * @returns {boolean} True if bullish crossover occurred
   */
  isBullishCrossover(type, fastPeriod, slowPeriod) {
    if (this.historicalCandles.length < 2) return false;

    // Current values
    const currentFast = type === 'ema' ? this.ema(fastPeriod) : this.sma(fastPeriod);
    const currentSlow = type === 'ema' ? this.ema(slowPeriod) : this.sma(slowPeriod);

    if (currentFast === null || currentSlow === null) return false;

    // Previous values (simulate previous candle state)
    const prevCandles = this.historicalCandles.slice(0, -1);
    const prevPrices = prevCandles.map(c => c.close);

    const prevFast = type === 'ema'
      ? EMA.calculateLast(prevPrices, fastPeriod)
      : SMA.calculateLast(prevPrices, fastPeriod);
    const prevSlow = type === 'ema'
      ? EMA.calculateLast(prevPrices, slowPeriod)
      : SMA.calculateLast(prevPrices, slowPeriod);

    if (prevFast === null || prevSlow === null) return false;

    // Check for crossover: fast was below slow, now fast is above slow
    return prevFast <= prevSlow && currentFast > currentSlow;
  }

  /**
   * Check for moving average crossunder (fast MA crosses below slow MA)
   * @param {string} type - MA type ('sma' or 'ema')
   * @param {number} fastPeriod - Fast MA period
   * @param {number} slowPeriod - Slow MA period
   * @returns {boolean} True if bearish crossover occurred
   */
  isBearishCrossover(type, fastPeriod, slowPeriod) {
    if (this.historicalCandles.length < 2) return false;

    // Current values
    const currentFast = type === 'ema' ? this.ema(fastPeriod) : this.sma(fastPeriod);
    const currentSlow = type === 'ema' ? this.ema(slowPeriod) : this.sma(slowPeriod);

    if (currentFast === null || currentSlow === null) return false;

    // Previous values
    const prevCandles = this.historicalCandles.slice(0, -1);
    const prevPrices = prevCandles.map(c => c.close);

    const prevFast = type === 'ema'
      ? EMA.calculateLast(prevPrices, fastPeriod)
      : SMA.calculateLast(prevPrices, fastPeriod);
    const prevSlow = type === 'ema'
      ? EMA.calculateLast(prevPrices, slowPeriod)
      : SMA.calculateLast(prevPrices, slowPeriod);

    if (prevFast === null || prevSlow === null) return false;

    // Check for crossunder: fast was above slow, now fast is below slow
    return prevFast >= prevSlow && currentFast < currentSlow;
  }

  /**
   * Check if RSI indicates oversold condition
   * @param {number} period - RSI period
   * @param {number} threshold - Oversold threshold (default 30)
   * @returns {boolean} True if oversold
   */
  isOversold(period = 14, threshold = 30) {
    const rsi = this.rsi(period);
    return rsi !== null && rsi < threshold;
  }

  /**
   * Check if RSI indicates overbought condition
   * @param {number} period - RSI period
   * @param {number} threshold - Overbought threshold (default 70)
   * @returns {boolean} True if overbought
   */
  isOverbought(period = 14, threshold = 70) {
    const rsi = this.rsi(period);
    return rsi !== null && rsi > threshold;
  }

  /**
   * Get percentage change from previous candle
   * @param {string} priceType - Price type to compare
   * @returns {number|null} Percentage change or null if insufficient data
   */
  getPercentageChange(priceType = 'close') {
    if (this.historicalCandles.length < 2) return null;

    const current = this.currentCandle[priceType];
    const previous = this.historicalCandles[this.historicalCandles.length - 2][priceType];

    return ((current - previous) / previous) * 100;
  }

  /**
   * Get price change from N periods ago
   * @param {number} periods - Number of periods to look back
   * @param {string} priceType - Price type to compare
   * @returns {number|null} Price change or null if insufficient data
   */
  getPriceChange(periods = 1, priceType = 'close') {
    if (this.historicalCandles.length <= periods) return null;

    const current = this.currentCandle[priceType];
    const previous = this.historicalCandles[this.historicalCandles.length - 1 - periods][priceType];

    return current - previous;
  }

  /**
   * Reset the engine state
   */
  reset() {
    this.currentCandle = null;
    this.historicalCandles = [];
    this.cache.clear();
  }
}
