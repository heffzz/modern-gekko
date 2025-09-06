import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';

class MultiTimeframeManager extends EventEmitter {
  constructor(config = {}) {
    super();

    this.timeframes = new Map();
    this.syncedCandles = new Map();
    this.strategies = new Map();
    this.config = {
      maxCandleHistory: 1000,
      syncTolerance: 5000, // 5 seconds tolerance for sync
      ...config
    };

    this.isRunning = false;
    this.lastSync = null;
  }

  /**
   * Add a timeframe to monitor
   */
  addTimeframe(timeframe, candleSource) {
    if (this.timeframes.has(timeframe)) {
      throw new Error(`Timeframe ${timeframe} already exists`);
    }

    const timeframeData = {
      timeframe,
      candleSource,
      candles: [],
      lastCandle: null,
      subscribers: new Set()
    };

    this.timeframes.set(timeframe, timeframeData);
    this.syncedCandles.set(timeframe, []);

    // Subscribe to candle updates
    candleSource.on('candle', (candle) => {
      this.onCandleUpdate(timeframe, candle);
    });

    logger.info(`Added timeframe: ${timeframe}`);
    return this;
  }

  /**
   * Remove a timeframe
   */
  removeTimeframe(timeframe) {
    if (!this.timeframes.has(timeframe)) {
      throw new Error(`Timeframe ${timeframe} does not exist`);
    }

    const timeframeData = this.timeframes.get(timeframe);

    // Unsubscribe strategies
    timeframeData.subscribers.forEach(strategyId => {
      this.unsubscribeStrategy(strategyId, timeframe);
    });

    this.timeframes.delete(timeframe);
    this.syncedCandles.delete(timeframe);

    logger.info(`Removed timeframe: ${timeframe}`);
    return this;
  }

  /**
   * Subscribe a strategy to specific timeframes
   */
  subscribeStrategy(strategyId, timeframes, callback) {
    if (!Array.isArray(timeframes)) {
      timeframes = [timeframes];
    }

    const strategyData = {
      id: strategyId,
      timeframes: new Set(timeframes),
      callback,
      lastUpdate: new Map()
    };

    this.strategies.set(strategyId, strategyData);

    // Add strategy to timeframe subscribers
    timeframes.forEach(timeframe => {
      if (!this.timeframes.has(timeframe)) {
        throw new Error(`Timeframe ${timeframe} not available`);
      }

      this.timeframes.get(timeframe).subscribers.add(strategyId);
      strategyData.lastUpdate.set(timeframe, null);
    });

    logger.info(`Strategy ${strategyId} subscribed to timeframes: ${timeframes.join(', ')}`);
    return this;
  }

  /**
   * Unsubscribe a strategy from a timeframe
   */
  unsubscribeStrategy(strategyId, timeframe = null) {
    const strategyData = this.strategies.get(strategyId);
    if (!strategyData) return this;

    if (timeframe) {
      // Unsubscribe from specific timeframe
      strategyData.timeframes.delete(timeframe);
      strategyData.lastUpdate.delete(timeframe);

      if (this.timeframes.has(timeframe)) {
        this.timeframes.get(timeframe).subscribers.delete(strategyId);
      }
    } else {
      // Unsubscribe from all timeframes
      strategyData.timeframes.forEach(tf => {
        if (this.timeframes.has(tf)) {
          this.timeframes.get(tf).subscribers.delete(strategyId);
        }
      });

      this.strategies.delete(strategyId);
    }

    logger.info(`Strategy ${strategyId} unsubscribed from ${timeframe || 'all timeframes'}`);
    return this;
  }

  /**
   * Handle new candle update
   */
  onCandleUpdate(timeframe, candle) {
    const timeframeData = this.timeframes.get(timeframe);
    if (!timeframeData) return;

    // Add candle to history
    timeframeData.candles.push(candle);
    timeframeData.lastCandle = candle;

    // Maintain history limit
    if (timeframeData.candles.length > this.config.maxCandleHistory) {
      timeframeData.candles.shift();
    }

    // Update synced candles
    this.updateSyncedCandles(timeframe, candle);

    // Notify subscribed strategies
    this.notifyStrategies(timeframe, candle);

    // Emit global event
    this.emit('candleUpdate', {
      timeframe,
      candle,
      syncedCandles: this.getSyncedCandles()
    });
  }

  /**
   * Update synced candles for cross-timeframe analysis
   */
  updateSyncedCandles(updatedTimeframe, newCandle) {
    const syncedData = this.syncedCandles.get(updatedTimeframe);
    syncedData.push(newCandle);

    // Maintain history limit
    if (syncedData.length > this.config.maxCandleHistory) {
      syncedData.shift();
    }

    // Check if we need to sync across timeframes
    this.performTimeframeSync(newCandle.timestamp);
  }

  /**
   * Perform synchronization across timeframes
   */
  performTimeframeSync(timestamp) {
    const syncPoint = {
      timestamp,
      candles: new Map()
    };

    // Get the latest candle from each timeframe at sync point
    this.timeframes.forEach((data, timeframe) => {
      const latestCandle = this.getLatestCandleAt(timeframe, timestamp);
      if (latestCandle) {
        syncPoint.candles.set(timeframe, latestCandle);
      }
    });

    // Only sync if we have candles from all timeframes
    if (syncPoint.candles.size === this.timeframes.size) {
      this.lastSync = syncPoint;
      this.emit('timeframeSync', syncPoint);
    }
  }

  /**
   * Get latest candle at specific timestamp
   */
  getLatestCandleAt(timeframe, timestamp) {
    const timeframeData = this.timeframes.get(timeframe);
    if (!timeframeData) return null;

    // Find the most recent candle before or at the timestamp
    for (let i = timeframeData.candles.length - 1; i >= 0; i--) {
      const candle = timeframeData.candles[i];
      if (candle.timestamp <= timestamp) {
        return candle;
      }
    }

    return null;
  }

  /**
   * Notify strategies of candle updates
   */
  notifyStrategies(timeframe, candle) {
    const timeframeData = this.timeframes.get(timeframe);

    timeframeData.subscribers.forEach(strategyId => {
      const strategyData = this.strategies.get(strategyId);
      if (!strategyData) return;

      try {
        // Prepare multi-timeframe data for strategy
        const multiTimeframeData = this.prepareStrategyData(strategyId, timeframe, candle);

        // Call strategy callback
        strategyData.callback(multiTimeframeData);

        // Update last update timestamp
        strategyData.lastUpdate.set(timeframe, candle.timestamp);

      } catch (error) {
        logger.error(`Error notifying strategy ${strategyId}:`, error);
        this.emit('strategyError', { strategyId, error, timeframe, candle });
      }
    });
  }

  /**
   * Prepare multi-timeframe data for strategy
   */
  prepareStrategyData(strategyId, updatedTimeframe, newCandle) {
    const strategyData = this.strategies.get(strategyId);
    const data = {
      updatedTimeframe,
      newCandle,
      timeframes: new Map(),
      syncedData: this.lastSync
    };

    // Add data for each subscribed timeframe
    strategyData.timeframes.forEach(timeframe => {
      const timeframeData = this.timeframes.get(timeframe);
      if (timeframeData) {
        data.timeframes.set(timeframe, {
          current: timeframeData.lastCandle,
          history: [...timeframeData.candles],
          lastUpdate: strategyData.lastUpdate.get(timeframe)
        });
      }
    });

    return data;
  }

  /**
   * Get candles for specific timeframe
   */
  getCandles(timeframe, limit = null) {
    const timeframeData = this.timeframes.get(timeframe);
    if (!timeframeData) return [];

    const candles = timeframeData.candles;
    return limit ? candles.slice(-limit) : [...candles];
  }

  /**
   * Get latest candle for timeframe
   */
  getLatestCandle(timeframe) {
    const timeframeData = this.timeframes.get(timeframe);
    return timeframeData ? timeframeData.lastCandle : null;
  }

  /**
   * Get synced candles across all timeframes
   */
  getSyncedCandles() {
    const synced = new Map();
    this.syncedCandles.forEach((candles, timeframe) => {
      synced.set(timeframe, [...candles]);
    });
    return synced;
  }

  /**
   * Get timeframe alignment info
   */
  getTimeframeAlignment() {
    const alignment = {
      timeframes: [],
      lastSync: this.lastSync,
      syncStatus: new Map()
    };

    this.timeframes.forEach((data, timeframe) => {
      alignment.timeframes.push(timeframe);

      const status = {
        hasData: data.candles.length > 0,
        lastCandle: data.lastCandle,
        candleCount: data.candles.length,
        subscribers: data.subscribers.size
      };

      alignment.syncStatus.set(timeframe, status);
    });

    return alignment;
  }

  /**
   * Process a single candle for a specific timeframe
   */
  processCandle(candle, timeframe = '1m') {
    if (!this.timeframes.has(timeframe)) {
      throw new Error(`Timeframe ${timeframe} is not configured`);
    }

    this.onCandleUpdate(timeframe, candle);
    return this;
  }

  /**
   * Start the multi-timeframe manager
   */
  start() {
    if (this.isRunning) {
      logger.warn('MultiTimeframeManager is already running');
      return this;
    }

    this.isRunning = true;
    logger.info('MultiTimeframeManager started');
    this.emit('started');

    return this;
  }

  /**
   * Stop the multi-timeframe manager
   */
  stop() {
    if (!this.isRunning) {
      logger.warn('MultiTimeframeManager is not running');
      return this;
    }

    this.isRunning = false;

    // Clear all data
    this.timeframes.clear();
    this.syncedCandles.clear();
    this.strategies.clear();
    this.lastSync = null;

    logger.info('MultiTimeframeManager stopped');
    this.emit('stopped');

    return this;
  }

  /**
   * Get manager status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      timeframeCount: this.timeframes.size,
      strategyCount: this.strategies.size,
      lastSync: this.lastSync,
      config: this.config,
      alignment: this.getTimeframeAlignment()
    };
  }
}

/**
 * Utility class for timeframe conversion
 */
class TimeframeConverter {
  static TIMEFRAME_MINUTES = {
    '1m': 1,
    '3m': 3,
    '5m': 5,
    '15m': 15,
    '30m': 30,
    '1h': 60,
    '2h': 120,
    '4h': 240,
    '6h': 360,
    '8h': 480,
    '12h': 720,
    '1d': 1440,
    '3d': 4320,
    '1w': 10080,
    '1M': 43200
  };

  /**
   * Convert timeframe to minutes
   */
  static toMinutes(timeframe) {
    return this.TIMEFRAME_MINUTES[timeframe] || null;
  }

  /**
   * Check if timeframe is valid
   */
  static isValid(timeframe) {
    return timeframe in this.TIMEFRAME_MINUTES;
  }

  /**
   * Get higher timeframe
   */
  static getHigherTimeframe(timeframe) {
    const minutes = this.toMinutes(timeframe);
    if (!minutes) return null;

    const timeframes = Object.entries(this.TIMEFRAME_MINUTES)
      .sort(([,a], [,b]) => a - b);

    const currentIndex = timeframes.findIndex(([,mins]) => mins === minutes);
    if (currentIndex === -1 || currentIndex === timeframes.length - 1) {
      return null;
    }

    return timeframes[currentIndex + 1][0];
  }

  /**
   * Get lower timeframe
   */
  static getLowerTimeframe(timeframe) {
    const minutes = this.toMinutes(timeframe);
    if (!minutes) return null;

    const timeframes = Object.entries(this.TIMEFRAME_MINUTES)
      .sort(([,a], [,b]) => a - b);

    const currentIndex = timeframes.findIndex(([,mins]) => mins === minutes);
    if (currentIndex <= 0) {
      return null;
    }

    return timeframes[currentIndex - 1][0];
  }

  /**
   * Calculate candle alignment
   */
  static calculateAlignment(lowerTimeframe, higherTimeframe) {
    const lowerMinutes = this.toMinutes(lowerTimeframe);
    const higherMinutes = this.toMinutes(higherTimeframe);

    if (!lowerMinutes || !higherMinutes) {
      return null;
    }

    if (higherMinutes % lowerMinutes !== 0) {
      return null; // Not aligned
    }

    return {
      ratio: higherMinutes / lowerMinutes,
      lowerTimeframe,
      higherTimeframe,
      candlesPerHigher: higherMinutes / lowerMinutes
    };
  }

  /**
   * Aggregate candles to higher timeframe
   */
  static aggregateCandles(candles, fromTimeframe, toTimeframe) {
    const alignment = this.calculateAlignment(fromTimeframe, toTimeframe);
    if (!alignment) {
      throw new Error(`Cannot aggregate from ${fromTimeframe} to ${toTimeframe}`);
    }

    const aggregated = [];
    const candlesPerGroup = alignment.candlesPerHigher;

    for (let i = 0; i < candles.length; i += candlesPerGroup) {
      const group = candles.slice(i, i + candlesPerGroup);
      if (group.length === candlesPerGroup) {
        aggregated.push(this.aggregateCandleGroup(group));
      }
    }

    return aggregated;
  }

  /**
   * Aggregate a group of candles into one
   */
  static aggregateCandleGroup(candles) {
    if (candles.length === 0) return null;

    const first = candles[0];
    const last = candles[candles.length - 1];

    return {
      timestamp: first.timestamp,
      open: first.open,
      high: Math.max(...candles.map(c => c.high)),
      low: Math.min(...candles.map(c => c.low)),
      close: last.close,
      volume: candles.reduce((sum, c) => sum + c.volume, 0)
    };
  }

  // Instance methods for compatibility with tests
  parseTimeframe(timeframe) {
    const match = timeframe.match(/^(\d+)([mhd])$/);
    if (!match) {
      throw new Error(`Invalid timeframe format: ${timeframe}`);
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    if (value <= 0) {
      throw new Error(`Invalid timeframe format: ${timeframe}`);
    }

    let minutes;
    switch (unit) {
    case 'm': minutes = value; break;
    case 'h': minutes = value * 60; break;
    case 'd': minutes = value * 1440; break;
    default: throw new Error(`Invalid timeframe format: ${timeframe}`);
    }

    return { value, unit, minutes };
  }

  getConversionRatio(fromTimeframe, toTimeframe) {
    const fromParsed = this.parseTimeframe(fromTimeframe);
    const toParsed = this.parseTimeframe(toTimeframe);

    if (!fromParsed || !toParsed) {
      throw new Error('Invalid timeframe');
    }

    const fromMinutes = fromParsed.minutes;
    const toMinutes = toParsed.minutes;

    if (fromMinutes > toMinutes) {
      throw new Error('Cannot convert from higher to lower timeframe');
    }

    if (toMinutes % fromMinutes !== 0) {
      throw new Error('Target timeframe is not evenly divisible by source timeframe');
    }

    return toMinutes / fromMinutes;
  }

  alignToPeriod(timestamp, periodMinutes) {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const aligned = new Date(date);

    if (periodMinutes >= 1440) {
      // For daily or longer periods, align to start of day
      aligned.setUTCHours(0, 0, 0, 0);
    } else if (periodMinutes >= 60) {
      // For hourly periods, align to start of hour
      aligned.setUTCMinutes(0, 0, 0);
    } else {
      // For minute periods, align to the period
      const minutes = date.getUTCMinutes();
      const alignedMinutes = Math.floor(minutes / periodMinutes) * periodMinutes;
      aligned.setUTCMinutes(alignedMinutes, 0, 0);
    }

    return aligned;
  }

  validateCandle(candle) {
    if (!candle || typeof candle !== 'object') {
      throw new Error('Invalid candle: must be an object');
    }

    const required = ['timestamp', 'open', 'high', 'low', 'close', 'volume'];
    for (const field of required) {
      if (!(field in candle)) {
        throw new Error(`Invalid candle: missing ${field}`);
      }
      if (field === 'timestamp') {
        const timestamp = candle[field];
        if (timestamp instanceof Date) {
          // Date object is valid
        } else if (!Number.isInteger(timestamp) || timestamp <= 0) {
          throw new Error(`Invalid candle: ${field} must be a positive integer or Date object`);
        }
      } else {
        if (typeof candle[field] !== 'number' || candle[field] < 0) {
          throw new Error(`Invalid candle: ${field} must be a non-negative number`);
        }
      }
    }

    if (candle.high < candle.low) {
      throw new Error('Invalid candle: high must be >= low');
    }

    if (candle.open < candle.low || candle.open > candle.high) {
      throw new Error('Invalid candle: open must be between low and high');
    }

    if (candle.close < candle.low || candle.close > candle.high) {
      throw new Error('Invalid candle: close must be between low and high');
    }

    return true;
  }

  convertCandles(candles, fromTimeframe, toTimeframe) {
    const ratio = this.getConversionRatio(fromTimeframe, toTimeframe);
    const result = [];

    for (let i = 0; i < candles.length; i += ratio) {
      const group = candles.slice(i, i + ratio);
      if (group.length === ratio) {
        const aggregated = TimeframeConverter.aggregateCandleGroup(group);
        result.push(aggregated);
      }
    }

    return result;
  }

  canConvert(fromTimeframe, toTimeframe) {
    try {
      const fromParsed = this.parseTimeframe(fromTimeframe);
      const toParsed = this.parseTimeframe(toTimeframe);

      if (!fromParsed || !toParsed) {
        return false;
      }

      const fromMinutes = fromParsed.minutes;
      const toMinutes = toParsed.minutes;

      // Can only convert from lower to higher timeframe
      if (fromMinutes >= toMinutes) {
        return false;
      }

      // Target timeframe must be evenly divisible by source timeframe
      return toMinutes % fromMinutes === 0;
    } catch (error) {
      return false;
    }
  }
}

export {
  MultiTimeframeManager,
  TimeframeConverter
};
