/**
 * Double Exponential Moving Average (DEMA)
 * Riduce il lag della EMA tradizionale applicando una doppia smoothing
 * Formula: DEMA = 2 * EMA - EMA(EMA)
 */

class DEMA {
  constructor(period = 21) {
    this.period = period;
    this.alpha = 2 / (period + 1);
    this.ema1 = null; // First EMA
    this.ema2 = null; // EMA of EMA
    this.demaValues = [];
    this.isInitialized = false;
  }

  update(candle) {
    const price = candle.close;

    // Calculate first EMA
    if (this.ema1 === null) {
      this.ema1 = price;
    } else {
      this.ema1 = (price * this.alpha) + (this.ema1 * (1 - this.alpha));
    }

    // Calculate EMA of EMA
    if (this.ema2 === null) {
      this.ema2 = this.ema1;
    } else {
      this.ema2 = (this.ema1 * this.alpha) + (this.ema2 * (1 - this.alpha));
    }

    // Calculate DEMA: 2 * EMA1 - EMA2
    const dema = (2 * this.ema1) - this.ema2;
    this.demaValues.push(dema);

    // Keep only recent values for performance
    if (this.demaValues.length > 1000) {
      this.demaValues = this.demaValues.slice(-500);
    }

    return parseFloat(dema.toFixed(4));
  }

  getResult() {
    if (this.demaValues.length === 0) {
      return null;
    }
    return parseFloat(this.demaValues[this.demaValues.length - 1].toFixed(4));
  }

  // Get multiple DEMA values for trend analysis
  getValues(count = 5) {
    if (this.demaValues.length < count) {
      return this.demaValues.map(val => parseFloat(val.toFixed(4)));
    }
    return this.demaValues.slice(-count).map(val => parseFloat(val.toFixed(4)));
  }

  // Trend analysis
  getTrend(lookback = 3) {
    const values = this.getValues(lookback + 1);
    if (values.length < 2) return null;

    const current = values[values.length - 1];
    const previous = values[values.length - 2];

    let trend = 'sideways';
    let strength = 'weak';

    const change = ((current - previous) / previous) * 100;
    const absChange = Math.abs(change);

    if (change > 0) {
      trend = 'uptrend';
      if (absChange > 1) strength = 'strong';
      else if (absChange > 0.5) strength = 'medium';
    } else if (change < 0) {
      trend = 'downtrend';
      if (absChange > 1) strength = 'strong';
      else if (absChange > 0.5) strength = 'medium';
    }

    // Check if trend is consistent
    let consistent = true;
    if (values.length >= lookback + 1) {
      for (let i = values.length - lookback; i < values.length - 1; i++) {
        const currentChange = values[i + 1] - values[i];
        if ((trend === 'uptrend' && currentChange <= 0) ||
            (trend === 'downtrend' && currentChange >= 0)) {
          consistent = false;
          break;
        }
      }
    }

    return {
      trend,
      strength,
      consistent,
      change: parseFloat(change.toFixed(2)),
      current,
      previous
    };
  }

  // Signal generation
  getSignal(currentPrice) {
    const dema = this.getResult();
    if (!dema || !currentPrice) return null;

    const trend = this.getTrend();
    if (!trend) return null;

    let signal = 'neutral';
    let strength = 'weak';
    let reason = '';

    // Price vs DEMA position
    const priceAboveDEMA = currentPrice > dema;
    const priceBelowDEMA = currentPrice < dema;
    const priceDistance = ((currentPrice - dema) / dema) * 100;

    if (priceAboveDEMA && trend.trend === 'uptrend') {
      signal = 'bullish';
      strength = trend.consistent ? 'strong' : 'medium';
      reason = `Price above rising DEMA (${priceDistance.toFixed(2)}% above)`;
    } else if (priceBelowDEMA && trend.trend === 'downtrend') {
      signal = 'bearish';
      strength = trend.consistent ? 'strong' : 'medium';
      reason = `Price below falling DEMA (${Math.abs(priceDistance).toFixed(2)}% below)`;
    } else if (priceAboveDEMA && trend.trend === 'downtrend') {
      signal = 'potential_reversal_up';
      reason = 'Price above DEMA but DEMA still falling - potential reversal';
    } else if (priceBelowDEMA && trend.trend === 'uptrend') {
      signal = 'potential_reversal_down';
      reason = 'Price below DEMA but DEMA still rising - potential reversal';
    }

    return {
      signal,
      strength,
      reason,
      priceDistance: parseFloat(priceDistance.toFixed(2)),
      demaValue: dema,
      trend: trend.trend
    };
  }

  // Crossover signals
  getCrossoverSignal(currentPrice, previousPrice) {
    const currentDEMA = this.getResult();
    const previousDEMA = this.demaValues.length > 1 ?
      this.demaValues[this.demaValues.length - 2] : null;

    if (!currentDEMA || !previousDEMA || !currentPrice || !previousPrice) {
      return null;
    }

    // Price crossing DEMA
    const currentAbove = currentPrice > currentDEMA;
    const previousAbove = previousPrice > previousDEMA;

    if (!previousAbove && currentAbove) {
      return {
        type: 'price_cross_above',
        signal: 'buy',
        reason: 'Price crossed above DEMA - bullish signal',
        confidence: 'medium'
      };
    }

    if (previousAbove && !currentAbove) {
      return {
        type: 'price_cross_below',
        signal: 'sell',
        reason: 'Price crossed below DEMA - bearish signal',
        confidence: 'medium'
      };
    }

    return { type: 'no_cross', signal: 'hold' };
  }

  // Support and Resistance levels
  getSupportResistance() {
    const dema = this.getResult();
    if (!dema) return null;

    const trend = this.getTrend();
    if (!trend) return null;

    if (trend.trend === 'uptrend') {
      return {
        support: parseFloat(dema.toFixed(4)),
        resistance: null,
        type: 'dynamic_support',
        reason: 'DEMA acting as dynamic support in uptrend'
      };
    } else if (trend.trend === 'downtrend') {
      return {
        support: null,
        resistance: parseFloat(dema.toFixed(4)),
        type: 'dynamic_resistance',
        reason: 'DEMA acting as dynamic resistance in downtrend'
      };
    }

    return {
      support: parseFloat(dema.toFixed(4)),
      resistance: parseFloat(dema.toFixed(4)),
      type: 'pivot',
      reason: 'DEMA acting as pivot level in sideways market'
    };
  }

  // Entry and exit signals
  getEntryExitSignals(currentPrice, riskTolerance = 'medium') {
    const signal = this.getSignal(currentPrice);
    const supportResistance = this.getSupportResistance();

    if (!signal || !supportResistance) return null;

    const riskMultipliers = {
      low: 0.5,
      medium: 1.0,
      high: 1.5
    };

    const multiplier = riskMultipliers[riskTolerance] || 1.0;
    const dema = this.getResult();
    const distancePercent = Math.abs(((currentPrice - dema) / dema) * 100);

    let entry = null;
    let stopLoss = null;
    let takeProfit = null;

    if (signal.signal === 'bullish' && signal.strength !== 'weak') {
      entry = {
        type: 'buy',
        price: currentPrice,
        reason: signal.reason
      };
      stopLoss = parseFloat((dema * (1 - 0.02 * multiplier)).toFixed(4));
      takeProfit = parseFloat((currentPrice * (1 + 0.04 * multiplier)).toFixed(4));
    } else if (signal.signal === 'bearish' && signal.strength !== 'weak') {
      entry = {
        type: 'sell',
        price: currentPrice,
        reason: signal.reason
      };
      stopLoss = parseFloat((dema * (1 + 0.02 * multiplier)).toFixed(4));
      takeProfit = parseFloat((currentPrice * (1 - 0.04 * multiplier)).toFixed(4));
    }

    return {
      entry,
      stopLoss,
      takeProfit,
      riskReward: entry ? parseFloat((Math.abs(takeProfit - currentPrice) / Math.abs(stopLoss - currentPrice)).toFixed(2)) : null
    };
  }
}

module.exports = DEMA;
