/**
 * Williams %R
 * Oscillatore momentum simile al Stochastic ma con scala invertita
 * %R = (Highest High - Close) / (Highest High - Lowest Low) * -100
 * Valori tra 0 e -20 indicano ipercomprato, tra -80 e -100 ipervenduto
 */

class WilliamsR {
  constructor(period = 14) {
    this.period = period;
    this.candles = [];
    this.wrValues = [];
  }

  update(candle) {
    const { high, low, close } = candle;
    this.candles.push({ high, low, close });

    // Keep only necessary candles for performance
    if (this.candles.length > this.period + 50) {
      this.candles = this.candles.slice(-this.period - 25);
    }

    if (this.candles.length < this.period) {
      return null;
    }

    // Calculate Williams %R
    const recentCandles = this.candles.slice(-this.period);
    const highestHigh = Math.max(...recentCandles.map(c => c.high));
    const lowestLow = Math.min(...recentCandles.map(c => c.low));
    
    const wr = ((highestHigh - close) / (highestHigh - lowestLow)) * -100;
    this.wrValues.push(wr);

    // Keep only recent values for performance
    if (this.wrValues.length > 1000) {
      this.wrValues = this.wrValues.slice(-500);
    }

    return parseFloat(wr.toFixed(2));
  }

  getResult() {
    if (this.wrValues.length === 0) {
      return null;
    }
    return parseFloat(this.wrValues[this.wrValues.length - 1].toFixed(2));
  }

  // Get multiple Williams %R values
  getValues(count = 5) {
    if (this.wrValues.length < count) {
      return this.wrValues.map(val => parseFloat(val.toFixed(2)));
    }
    return this.wrValues.slice(-count).map(val => parseFloat(val.toFixed(2)));
  }

  // Interpretazione del segnale Williams %R
  getSignal() {
    const wr = this.getResult();
    if (wr === null) return null;

    let signal = 'neutral';
    let strength = 'weak';
    let reason = '';

    if (wr > -20) {
      signal = 'overbought';
      strength = wr > -10 ? 'very_strong' : 'strong';
      reason = `Williams %R at ${wr} - overbought condition, potential sell signal`;
    } else if (wr < -80) {
      signal = 'oversold';
      strength = wr < -90 ? 'very_strong' : 'strong';
      reason = `Williams %R at ${wr} - oversold condition, potential buy signal`;
    } else if (wr > -40) {
      signal = 'bullish';
      strength = 'medium';
      reason = `Williams %R at ${wr} - bullish territory`;
    } else if (wr < -60) {
      signal = 'bearish';
      strength = 'medium';
      reason = `Williams %R at ${wr} - bearish territory`;
    }

    return {
      signal,
      strength,
      reason,
      value: wr,
      zone: this.getWilliamsRZone(wr)
    };
  }

  // Determina la zona Williams %R
  getWilliamsRZone(wr) {
    if (wr > -20) return 'overbought';
    if (wr > -40) return 'bullish';
    if (wr > -60) return 'neutral';
    if (wr > -80) return 'bearish';
    return 'oversold';
  }

  // Trend analysis
  getTrend(lookback = 3) {
    const values = this.getValues(lookback + 1);
    if (values.length < 2) return null;

    const current = values[values.length - 1];
    const previous = values[values.length - 2];
    
    let trend = 'sideways';
    let strength = 'weak';
    
    const change = current - previous;
    const absChange = Math.abs(change);

    if (change > 0) {
      trend = 'uptrend';
      if (absChange > 10) strength = 'strong';
      else if (absChange > 5) strength = 'medium';
    } else if (change < 0) {
      trend = 'downtrend';
      if (absChange > 10) strength = 'strong';
      else if (absChange > 5) strength = 'medium';
    }

    // Check consistency
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

  // Overbought/Oversold reversal signals
  getReversalSignal() {
    const wr = this.getResult();
    const trend = this.getTrend();
    
    if (!wr || !trend) return null;

    // Bullish reversal from oversold
    if (wr < -80 && trend.trend === 'uptrend') {
      return {
        type: 'bullish_reversal',
        signal: 'buy',
        reason: 'Williams %R turning up from oversold territory',
        confidence: wr < -90 ? 'high' : 'medium',
        entry: 'on_break_above_-80'
      };
    }

    // Bearish reversal from overbought
    if (wr > -20 && trend.trend === 'downtrend') {
      return {
        type: 'bearish_reversal',
        signal: 'sell',
        reason: 'Williams %R turning down from overbought territory',
        confidence: wr > -10 ? 'high' : 'medium',
        entry: 'on_break_below_-20'
      };
    }

    return { type: 'no_reversal', signal: 'wait' };
  }

  // Failure swings (divergence patterns)
  getFailureSwing(prices, lookback = 5) {
    if (this.wrValues.length < lookback * 2 || prices.length < lookback * 2) {
      return null;
    }

    const recentPrices = prices.slice(-lookback);
    const recentWR = this.wrValues.slice(-lookback);
    const previousPrices = prices.slice(-lookback * 2, -lookback);
    const previousWR = this.wrValues.slice(-lookback * 2, -lookback);

    const recentHighPrice = Math.max(...recentPrices);
    const recentLowPrice = Math.min(...recentPrices);
    const recentHighWR = Math.max(...recentWR);
    const recentLowWR = Math.min(...recentWR);

    const previousHighPrice = Math.max(...previousPrices);
    const previousLowPrice = Math.min(...previousPrices);
    const previousHighWR = Math.max(...previousWR);
    const previousLowWR = Math.min(...previousWR);

    // Bullish Failure Swing
    if (recentLowPrice < previousLowPrice && recentLowWR > previousLowWR && recentLowWR < -80) {
      return {
        type: 'bullish_failure_swing',
        signal: 'buy',
        reason: 'Price lower low, Williams %R higher low in oversold - bullish divergence',
        confidence: 'high'
      };
    }

    // Bearish Failure Swing
    if (recentHighPrice > previousHighPrice && recentHighWR < previousHighWR && recentHighWR > -20) {
      return {
        type: 'bearish_failure_swing',
        signal: 'sell',
        reason: 'Price higher high, Williams %R lower high in overbought - bearish divergence',
        confidence: 'high'
      };
    }

    return { type: 'no_failure_swing', signal: 'hold' };
  }

  // Zone crossing signals
  getZoneCrossingSignal() {
    if (this.wrValues.length < 2) return null;

    const current = this.wrValues[this.wrValues.length - 1];
    const previous = this.wrValues[this.wrValues.length - 2];

    // Crossing above -80 (exit oversold)
    if (previous <= -80 && current > -80) {
      return {
        type: 'exit_oversold',
        signal: 'buy',
        reason: 'Williams %R crossed above -80 - exit oversold zone',
        confidence: 'medium'
      };
    }

    // Crossing below -20 (exit overbought)
    if (previous >= -20 && current < -20) {
      return {
        type: 'exit_overbought',
        signal: 'sell',
        reason: 'Williams %R crossed below -20 - exit overbought zone',
        confidence: 'medium'
      };
    }

    // Crossing below -80 (enter oversold)
    if (previous > -80 && current <= -80) {
      return {
        type: 'enter_oversold',
        signal: 'watch_for_reversal',
        reason: 'Williams %R entered oversold zone - watch for reversal',
        confidence: 'low'
      };
    }

    // Crossing above -20 (enter overbought)
    if (previous < -20 && current >= -20) {
      return {
        type: 'enter_overbought',
        signal: 'watch_for_reversal',
        reason: 'Williams %R entered overbought zone - watch for reversal',
        confidence: 'low'
      };
    }

    return { type: 'no_crossing', signal: 'hold' };
  }

  // Multiple timeframe confirmation
  getMultiTimeframeSignal(higherTimeframeWR) {
    const currentSignal = this.getSignal();
    if (!currentSignal || !higherTimeframeWR) return null;

    const htfSignal = higherTimeframeWR.getSignal();
    if (!htfSignal) return null;

    // Check alignment
    const aligned = (
      (currentSignal.signal === 'oversold' && htfSignal.signal === 'oversold') ||
      (currentSignal.signal === 'overbought' && htfSignal.signal === 'overbought') ||
      (currentSignal.signal === 'bullish' && (htfSignal.signal === 'bullish' || htfSignal.signal === 'oversold')) ||
      (currentSignal.signal === 'bearish' && (htfSignal.signal === 'bearish' || htfSignal.signal === 'overbought'))
    );

    if (aligned) {
      return {
        signal: currentSignal.signal,
        strength: 'very_strong',
        reason: `Multi-timeframe Williams %R alignment: ${currentSignal.signal}`,
        confidence: 'very_high'
      };
    }

    return {
      signal: 'conflicted',
      reason: 'Williams %R timeframes not aligned - wait for confirmation',
      confidence: 'low'
    };
  }

  // Comprehensive trading signals
  getTradingSignals(prices) {
    const signal = this.getSignal();
    const reversal = this.getReversalSignal();
    const zoneCrossing = this.getZoneCrossingSignal();
    const failureSwing = prices ? this.getFailureSwing(prices) : null;

    if (!signal) return null;

    const signals = {
      primary: signal,
      reversal: reversal || { type: 'no_reversal', signal: 'wait' },
      zoneCrossing: zoneCrossing || { type: 'no_crossing', signal: 'hold' },
      failureSwing: failureSwing || { type: 'no_failure_swing', signal: 'hold' }
    };

    // Determine overall recommendation
    let recommendation = 'hold';
    let confidence = 'low';
    let reasons = [];

    if (failureSwing && failureSwing.confidence === 'high') {
      recommendation = failureSwing.signal;
      confidence = 'high';
      reasons.push(failureSwing.reason);
    } else if (reversal && reversal.confidence === 'high') {
      recommendation = reversal.signal;
      confidence = 'high';
      reasons.push(reversal.reason);
    } else if (zoneCrossing && zoneCrossing.confidence === 'medium') {
      recommendation = zoneCrossing.signal;
      confidence = 'medium';
      reasons.push(zoneCrossing.reason);
    } else if (signal.strength === 'very_strong' || signal.strength === 'strong') {
      recommendation = signal.signal === 'overbought' ? 'sell' : 
                    signal.signal === 'oversold' ? 'buy' : 'hold';
      confidence = 'medium';
      reasons.push(signal.reason);
    }

    return {
      recommendation,
      confidence,
      reasons,
      signals
    };
  }
}

module.exports = WilliamsR;