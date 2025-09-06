/**
 * Parabolic SAR (Stop and Reverse)
 * Indicatore di trend following che fornisce punti di stop loss dinamici
 * SAR = SAR_prev + AF * (EP - SAR_prev)
 * AF = Acceleration Factor, EP = Extreme Point
 */

class ParabolicSAR {
  constructor(step = 0.02, max = 0.2) {
    this.step = step; // Initial acceleration factor
    this.max = max;   // Maximum acceleration factor

    this.candles = [];
    this.sarValues = [];
    this.trends = []; // 1 for uptrend, -1 for downtrend

    // Current state
    this.currentSAR = null;
    this.currentTrend = null;
    this.currentAF = this.step;
    this.currentEP = null; // Extreme Point
    this.isInitialized = false;
  }

  update(candle) {
    const { high, low, close } = candle;
    this.candles.push({ high, low, close });

    if (this.candles.length < 2) {
      return null;
    }

    if (!this.isInitialized) {
      // Initialize with first two candles
      const prev = this.candles[0];
      const curr = this.candles[1];

      if (curr.close > prev.close) {
        // Start with uptrend
        this.currentTrend = 1;
        this.currentSAR = prev.low;
        this.currentEP = curr.high;
      } else {
        // Start with downtrend
        this.currentTrend = -1;
        this.currentSAR = prev.high;
        this.currentEP = curr.low;
      }

      this.currentAF = this.step;
      this.isInitialized = true;

      this.sarValues.push(this.currentSAR);
      this.trends.push(this.currentTrend);

      return {
        sar: parseFloat(this.currentSAR.toFixed(4)),
        trend: this.currentTrend,
        af: this.currentAF,
        ep: parseFloat(this.currentEP.toFixed(4))
      };
    }

    const prevSAR = this.currentSAR;
    const prevTrend = this.currentTrend;
    const prevAF = this.currentAF;
    const prevEP = this.currentEP;

    // Calculate new SAR
    let newSAR = prevSAR + prevAF * (prevEP - prevSAR);
    let newTrend = prevTrend;
    let newAF = prevAF;
    let newEP = prevEP;

    if (prevTrend === 1) {
      // Uptrend
      // Check for trend reversal
      if (low <= newSAR) {
        // Trend reversal to downtrend
        newTrend = -1;
        newSAR = prevEP; // SAR becomes the previous EP
        newEP = low;
        newAF = this.step;
      } else {
        // Continue uptrend
        // Adjust SAR to not exceed previous two lows
        const prevLow = this.candles[this.candles.length - 2].low;
        const prevPrevLow = this.candles.length > 2 ? this.candles[this.candles.length - 3].low : prevLow;
        newSAR = Math.min(newSAR, prevLow, prevPrevLow);

        // Update EP and AF
        if (high > prevEP) {
          newEP = high;
          newAF = Math.min(prevAF + this.step, this.max);
        }
      }
    } else {
      // Downtrend
      // Check for trend reversal
      if (high >= newSAR) {
        // Trend reversal to uptrend
        newTrend = 1;
        newSAR = prevEP; // SAR becomes the previous EP
        newEP = high;
        newAF = this.step;
      } else {
        // Continue downtrend
        // Adjust SAR to not exceed previous two highs
        const prevHigh = this.candles[this.candles.length - 2].high;
        const prevPrevHigh = this.candles.length > 2 ? this.candles[this.candles.length - 3].high : prevHigh;
        newSAR = Math.max(newSAR, prevHigh, prevPrevHigh);

        // Update EP and AF
        if (low < prevEP) {
          newEP = low;
          newAF = Math.min(prevAF + this.step, this.max);
        }
      }
    }

    // Update current state
    this.currentSAR = newSAR;
    this.currentTrend = newTrend;
    this.currentAF = newAF;
    this.currentEP = newEP;

    this.sarValues.push(newSAR);
    this.trends.push(newTrend);

    // Keep only recent values for performance
    if (this.sarValues.length > 1000) {
      this.sarValues = this.sarValues.slice(-500);
      this.trends = this.trends.slice(-500);
    }

    return {
      sar: parseFloat(newSAR.toFixed(4)),
      trend: newTrend,
      af: parseFloat(newAF.toFixed(4)),
      ep: parseFloat(newEP.toFixed(4)),
      reversal: newTrend !== prevTrend
    };
  }

  getResult() {
    if (!this.isInitialized) {
      return null;
    }

    return {
      sar: parseFloat(this.currentSAR.toFixed(4)),
      trend: this.currentTrend,
      af: parseFloat(this.currentAF.toFixed(4)),
      ep: parseFloat(this.currentEP.toFixed(4))
    };
  }

  // Get trend direction
  getTrendDirection() {
    if (!this.isInitialized) return null;

    return this.currentTrend === 1 ? 'uptrend' : 'downtrend';
  }

  // Check for trend reversal
  getTrendReversal() {
    if (this.trends.length < 2) return null;

    const current = this.trends[this.trends.length - 1];
    const previous = this.trends[this.trends.length - 2];

    if (current !== previous) {
      return {
        type: current === 1 ? 'bullish_reversal' : 'bearish_reversal',
        from: previous === 1 ? 'uptrend' : 'downtrend',
        to: current === 1 ? 'uptrend' : 'downtrend',
        sarLevel: this.currentSAR
      };
    }

    return null;
  }

  // Generate trading signals
  getSignal(currentPrice) {
    const result = this.getResult();
    if (!result || !currentPrice) return null;

    const { sar, trend } = result;
    const reversal = this.getTrendReversal();

    let signal = 'hold';
    let strength = 'medium';
    let reason = '';
    let stopLoss = null;
    let entry = null;

    if (reversal) {
      if (reversal.type === 'bullish_reversal') {
        signal = 'buy';
        strength = 'strong';
        reason = 'Parabolic SAR bullish reversal - trend changed to uptrend';
        entry = currentPrice;
        stopLoss = sar;
      } else {
        signal = 'sell';
        strength = 'strong';
        reason = 'Parabolic SAR bearish reversal - trend changed to downtrend';
        entry = currentPrice;
        stopLoss = sar;
      }
    } else {
      // Trend continuation signals
      if (trend === 1 && currentPrice > sar) {
        signal = 'hold_long';
        reason = 'Price above SAR in uptrend - continue holding long';
        stopLoss = sar;
      } else if (trend === -1 && currentPrice < sar) {
        signal = 'hold_short';
        reason = 'Price below SAR in downtrend - continue holding short';
        stopLoss = sar;
      } else {
        signal = 'exit';
        strength = 'strong';
        reason = 'Price crossed SAR - exit current position';
      }
    }

    return {
      signal,
      strength,
      reason,
      entry,
      stopLoss: stopLoss ? parseFloat(stopLoss.toFixed(4)) : null,
      trend: trend === 1 ? 'uptrend' : 'downtrend',
      reversal: reversal !== null
    };
  }

  // Calculate stop loss distance
  getStopLossDistance(currentPrice) {
    const result = this.getResult();
    if (!result || !currentPrice) return null;

    const distance = Math.abs(currentPrice - result.sar);
    const distancePercent = (distance / currentPrice) * 100;

    return {
      absolute: parseFloat(distance.toFixed(4)),
      percent: parseFloat(distancePercent.toFixed(2)),
      sarLevel: result.sar
    };
  }

  // Trend strength analysis
  getTrendStrength() {
    if (this.trends.length < 10) return null;

    const recentTrends = this.trends.slice(-10);
    const currentTrend = this.currentTrend;

    // Count consecutive periods in same trend
    let consecutiveCount = 0;
    for (let i = recentTrends.length - 1; i >= 0; i--) {
      if (recentTrends[i] === currentTrend) {
        consecutiveCount++;
      } else {
        break;
      }
    }

    let strength = 'weak';
    if (consecutiveCount >= 8) {
      strength = 'very_strong';
    } else if (consecutiveCount >= 5) {
      strength = 'strong';
    } else if (consecutiveCount >= 3) {
      strength = 'medium';
    }

    return {
      strength,
      consecutivePeriods: consecutiveCount,
      trend: currentTrend === 1 ? 'uptrend' : 'downtrend',
      accelerationFactor: this.currentAF
    };
  }

  // Position sizing based on SAR distance
  calculatePositionSize(accountBalance, riskPercent, currentPrice) {
    const stopDistance = this.getStopLossDistance(currentPrice);
    if (!stopDistance) return null;

    const riskAmount = accountBalance * (riskPercent / 100);
    const positionSize = riskAmount / stopDistance.absolute;

    return {
      positionSize: parseFloat(positionSize.toFixed(6)),
      riskAmount: parseFloat(riskAmount.toFixed(2)),
      stopDistance: stopDistance.absolute,
      stopPercent: stopDistance.percent,
      maxLoss: parseFloat(riskAmount.toFixed(2))
    };
  }

  // Trailing stop strategy
  getTrailingStopSignal(currentPrice, entryPrice, direction) {
    const result = this.getResult();
    if (!result || !currentPrice || !entryPrice) return null;

    const { sar, trend } = result;
    const currentProfit = direction === 'long' ?
      currentPrice - entryPrice : entryPrice - currentPrice;
    const profitPercent = (currentProfit / entryPrice) * 100;

    let action = 'hold';
    const newStopLoss = sar;
    let reason = '';

    if (direction === 'long') {
      if (trend === 1) {
        // Uptrend continues - trail stop up
        action = 'trail_stop';
        reason = `Trail stop to SAR level ${sar} in uptrend`;
      } else {
        // Trend reversed - exit
        action = 'exit';
        reason = 'SAR trend reversal - exit long position';
      }
    } else {
      if (trend === -1) {
        // Downtrend continues - trail stop down
        action = 'trail_stop';
        reason = `Trail stop to SAR level ${sar} in downtrend`;
      } else {
        // Trend reversed - exit
        action = 'exit';
        reason = 'SAR trend reversal - exit short position';
      }
    }

    return {
      action,
      newStopLoss: parseFloat(newStopLoss.toFixed(4)),
      currentProfit: parseFloat(currentProfit.toFixed(4)),
      profitPercent: parseFloat(profitPercent.toFixed(2)),
      reason
    };
  }

  // Multiple timeframe SAR analysis
  getMultiTimeframeSignal(higherTimeframeSAR) {
    const currentSignal = this.getSignal();
    if (!currentSignal || !higherTimeframeSAR) return null;

    const htfSignal = higherTimeframeSAR.getSignal();
    if (!htfSignal) return null;

    const currentTrend = this.getTrendDirection();
    const htfTrend = higherTimeframeSAR.getTrendDirection();

    // Check alignment
    const aligned = currentTrend === htfTrend;

    if (aligned) {
      return {
        signal: currentSignal.signal,
        strength: 'very_strong',
        reason: `Multi-timeframe SAR alignment: ${currentTrend}`,
        confidence: 'very_high',
        timeframes: {
          current: currentTrend,
          higher: htfTrend
        }
      };
    }

    return {
      signal: 'conflicted',
      reason: 'SAR timeframes not aligned - wait for confirmation',
      confidence: 'low',
      timeframes: {
        current: currentTrend,
        higher: htfTrend
      }
    };
  }
}

module.exports = ParabolicSAR;
