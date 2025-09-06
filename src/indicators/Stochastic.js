/**
 * Stochastic Oscillator
 * Oscillatore momentum che confronta il prezzo di chiusura con il range high-low
 * %K = (Close - Lowest Low) / (Highest High - Lowest Low) * 100
 * %D = SMA of %K
 */

class Stochastic {
  constructor(kPeriod = 14, dPeriod = 3, smooth = 3) {
    this.kPeriod = kPeriod;
    this.dPeriod = dPeriod;
    this.smooth = smooth;
    this.candles = [];
    this.kValues = [];
    this.dValues = [];
    this.smoothedKValues = [];
  }

  update(candle) {
    const { high, low, close } = candle;
    this.candles.push({ high, low, close });

    // Keep only necessary candles for performance
    if (this.candles.length > this.kPeriod + this.smooth + this.dPeriod) {
      this.candles = this.candles.slice(-this.kPeriod - this.smooth - this.dPeriod);
    }

    if (this.candles.length < this.kPeriod) {
      return null;
    }

    // Calculate %K
    const recentCandles = this.candles.slice(-this.kPeriod);
    const highestHigh = Math.max(...recentCandles.map(c => c.high));
    const lowestLow = Math.min(...recentCandles.map(c => c.low));

    const kValue = ((close - lowestLow) / (highestHigh - lowestLow)) * 100;
    this.kValues.push(kValue);

    // Smooth %K if smooth period > 1
    let smoothedK;
    if (this.smooth === 1) {
      smoothedK = kValue;
      this.smoothedKValues.push(smoothedK);
    } else {
      if (this.kValues.length >= this.smooth) {
        smoothedK = this.kValues.slice(-this.smooth).reduce((a, b) => a + b, 0) / this.smooth;
        this.smoothedKValues.push(smoothedK);
      } else {
        return null;
      }
    }

    // Calculate %D (SMA of smoothed %K)
    let dValue = null;
    if (this.smoothedKValues.length >= this.dPeriod) {
      dValue = this.smoothedKValues.slice(-this.dPeriod).reduce((a, b) => a + b, 0) / this.dPeriod;
      this.dValues.push(dValue);
    }

    return {
      k: parseFloat(smoothedK.toFixed(2)),
      d: dValue ? parseFloat(dValue.toFixed(2)) : null,
      raw_k: parseFloat(kValue.toFixed(2))
    };
  }

  getResult() {
    if (this.smoothedKValues.length === 0) {
      return null;
    }

    const k = this.smoothedKValues[this.smoothedKValues.length - 1];
    const d = this.dValues.length > 0 ? this.dValues[this.dValues.length - 1] : null;
    const rawK = this.kValues[this.kValues.length - 1];

    return {
      k: parseFloat(k.toFixed(2)),
      d: d ? parseFloat(d.toFixed(2)) : null,
      raw_k: parseFloat(rawK.toFixed(2))
    };
  }

  // Interpretazione del segnale Stochastic
  getSignal() {
    const result = this.getResult();
    if (!result || result.d === null) return null;

    const { k, d } = result;
    let signal = 'neutral';
    let strength = 'weak';
    let reason = '';

    // Overbought/Oversold levels
    if (k > 80 && d > 80) {
      signal = 'overbought';
      strength = (k > 90 && d > 90) ? 'strong' : 'medium';
      reason = `Both %K (${k}) and %D (${d}) above 80 - overbought condition`;
    } else if (k < 20 && d < 20) {
      signal = 'oversold';
      strength = (k < 10 && d < 10) ? 'strong' : 'medium';
      reason = `Both %K (${k}) and %D (${d}) below 20 - oversold condition`;
    } else if (k > 80) {
      signal = 'approaching_overbought';
      reason = `%K (${k}) above 80 but %D (${d}) not confirmed`;
    } else if (k < 20) {
      signal = 'approaching_oversold';
      reason = `%K (${k}) below 20 but %D (${d}) not confirmed`;
    }

    return {
      signal,
      strength,
      reason,
      k,
      d,
      zone: this.getStochasticZone(k, d)
    };
  }

  // Determina la zona Stochastic
  getStochasticZone(k, d) {
    const avgValue = (k + d) / 2;

    if (avgValue > 80) return 'overbought';
    if (avgValue > 60) return 'bullish';
    if (avgValue > 40) return 'neutral';
    if (avgValue > 20) return 'bearish';
    return 'oversold';
  }

  // Crossover signals
  getCrossoverSignal() {
    if (this.smoothedKValues.length < 2 || this.dValues.length < 2) {
      return null;
    }

    const currentK = this.smoothedKValues[this.smoothedKValues.length - 1];
    const previousK = this.smoothedKValues[this.smoothedKValues.length - 2];
    const currentD = this.dValues[this.dValues.length - 1];
    const previousD = this.dValues[this.dValues.length - 2];

    // %K crossing above %D
    if (previousK <= previousD && currentK > currentD) {
      const zone = this.getStochasticZone(currentK, currentD);
      let confidence = 'medium';

      if (zone === 'oversold') {
        confidence = 'high';
      } else if (zone === 'overbought') {
        confidence = 'low';
      }

      return {
        type: 'bullish_crossover',
        signal: 'buy',
        reason: `%K (${currentK.toFixed(2)}) crossed above %D (${currentD.toFixed(2)})`,
        confidence,
        zone
      };
    }

    // %K crossing below %D
    if (previousK >= previousD && currentK < currentD) {
      const zone = this.getStochasticZone(currentK, currentD);
      let confidence = 'medium';

      if (zone === 'overbought') {
        confidence = 'high';
      } else if (zone === 'oversold') {
        confidence = 'low';
      }

      return {
        type: 'bearish_crossover',
        signal: 'sell',
        reason: `%K (${currentK.toFixed(2)}) crossed below %D (${currentD.toFixed(2)})`,
        confidence,
        zone
      };
    }

    return { type: 'no_crossover', signal: 'hold' };
  }

  // Divergence analysis
  getDivergence(prices, lookback = 5) {
    if (this.smoothedKValues.length < lookback * 2 || prices.length < lookback * 2) {
      return null;
    }

    const recentPrices = prices.slice(-lookback);
    const recentStoch = this.smoothedKValues.slice(-lookback);
    const previousPrices = prices.slice(-lookback * 2, -lookback);
    const previousStoch = this.smoothedKValues.slice(-lookback * 2, -lookback);

    const recentHighPrice = Math.max(...recentPrices);
    const recentLowPrice = Math.min(...recentPrices);
    const recentHighStoch = Math.max(...recentStoch);
    const recentLowStoch = Math.min(...recentStoch);

    const previousHighPrice = Math.max(...previousPrices);
    const previousLowPrice = Math.min(...previousPrices);
    const previousHighStoch = Math.max(...previousStoch);
    const previousLowStoch = Math.min(...previousStoch);

    // Bullish Divergence
    if (recentLowPrice < previousLowPrice && recentLowStoch > previousLowStoch) {
      return {
        type: 'bullish_divergence',
        signal: 'buy',
        reason: 'Price lower low, Stochastic higher low - bullish divergence',
        confidence: 'high'
      };
    }

    // Bearish Divergence
    if (recentHighPrice > previousHighPrice && recentHighStoch < previousHighStoch) {
      return {
        type: 'bearish_divergence',
        signal: 'sell',
        reason: 'Price higher high, Stochastic lower high - bearish divergence',
        confidence: 'high'
      };
    }

    return { type: 'no_divergence', signal: 'hold' };
  }

  // Overbought/Oversold reversal signals
  getReversalSignal() {
    const result = this.getResult();
    if (!result || result.d === null) return null;

    const { k, d } = result;
    const crossover = this.getCrossoverSignal();

    // Bullish reversal from oversold
    if (k < 20 && d < 20 && crossover && crossover.type === 'bullish_crossover') {
      return {
        type: 'bullish_reversal',
        signal: 'buy',
        reason: 'Bullish crossover in oversold territory - strong buy signal',
        confidence: 'high',
        entry: 'immediate',
        stopLoss: 'below_recent_low'
      };
    }

    // Bearish reversal from overbought
    if (k > 80 && d > 80 && crossover && crossover.type === 'bearish_crossover') {
      return {
        type: 'bearish_reversal',
        signal: 'sell',
        reason: 'Bearish crossover in overbought territory - strong sell signal',
        confidence: 'high',
        entry: 'immediate',
        stopLoss: 'above_recent_high'
      };
    }

    return { type: 'no_reversal', signal: 'wait' };
  }

  // Multiple timeframe analysis
  getMultiTimeframeSignal(higherTimeframeStoch) {
    const currentSignal = this.getSignal();
    if (!currentSignal || !higherTimeframeStoch) return null;

    const htfSignal = higherTimeframeStoch.getSignal();
    if (!htfSignal) return null;

    // Alignment check
    const aligned = (
      (currentSignal.signal === 'oversold' && htfSignal.signal === 'oversold') ||
      (currentSignal.signal === 'overbought' && htfSignal.signal === 'overbought')
    );

    if (aligned) {
      return {
        signal: currentSignal.signal,
        strength: 'very_strong',
        reason: `Multi-timeframe alignment: ${currentSignal.signal}`,
        confidence: 'very_high'
      };
    }

    return {
      signal: 'conflicted',
      reason: 'Timeframes not aligned - wait for confirmation',
      confidence: 'low'
    };
  }

  // Trading strategy signals
  getTradingSignals() {
    const signal = this.getSignal();
    const crossover = this.getCrossoverSignal();
    const reversal = this.getReversalSignal();

    if (!signal) return null;

    const signals = {
      primary: signal,
      crossover: crossover || { type: 'no_crossover', signal: 'hold' },
      reversal: reversal || { type: 'no_reversal', signal: 'wait' }
    };

    // Determine overall recommendation
    let recommendation = 'hold';
    let confidence = 'low';
    const reasons = [];

    if (reversal && reversal.confidence === 'high') {
      recommendation = reversal.signal;
      confidence = 'high';
      reasons.push(reversal.reason);
    } else if (crossover && crossover.confidence === 'high') {
      recommendation = crossover.signal;
      confidence = 'medium';
      reasons.push(crossover.reason);
    } else if (signal.strength === 'strong') {
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

module.exports = Stochastic;
