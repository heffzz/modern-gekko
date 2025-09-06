/**
 * Commodity Channel Index (CCI)
 * Oscillatore che misura la deviazione del prezzo dalla sua media statistica
 * Valori sopra +100 indicano ipercomprato, sotto -100 ipervenduto
 */

class CCI {
  constructor(period = 20) {
    this.period = period;
    this.typicalPrices = [];
    this.smaValues = [];
  }

  update(candle) {
    const { high, low, close } = candle;

    // Calculate Typical Price (HLC/3)
    const typicalPrice = (high + low + close) / 3;
    this.typicalPrices.push(typicalPrice);

    if (this.typicalPrices.length < this.period) {
      return null;
    }

    // Keep only the last 'period' prices
    if (this.typicalPrices.length > this.period) {
      this.typicalPrices = this.typicalPrices.slice(-this.period);
    }

    // Calculate Simple Moving Average of Typical Price
    const sma = this.typicalPrices.reduce((sum, price) => sum + price, 0) / this.period;
    this.smaValues.push(sma);

    // Calculate Mean Deviation
    const meanDeviation = this.typicalPrices.reduce((sum, price) => {
      return sum + Math.abs(price - sma);
    }, 0) / this.period;

    // Calculate CCI
    const cci = (typicalPrice - sma) / (0.015 * meanDeviation);

    return parseFloat(cci.toFixed(2));
  }

  getResult() {
    if (this.typicalPrices.length < this.period) {
      return null;
    }

    const currentTypicalPrice = this.typicalPrices[this.typicalPrices.length - 1];
    const sma = this.typicalPrices.reduce((sum, price) => sum + price, 0) / this.period;

    const meanDeviation = this.typicalPrices.reduce((sum, price) => {
      return sum + Math.abs(price - sma);
    }, 0) / this.period;

    const cci = (currentTypicalPrice - sma) / (0.015 * meanDeviation);
    return parseFloat(cci.toFixed(2));
  }

  // Interpretazione del segnale CCI
  getSignal() {
    const cci = this.getResult();
    if (cci === null) return null;

    let signal = 'neutral';
    let strength = 'weak';
    let reason = '';

    if (cci > 200) {
      signal = 'extremely_overbought';
      strength = 'very_strong';
      reason = 'CCI above +200 - extremely overbought, strong sell signal';
    } else if (cci > 100) {
      signal = 'overbought';
      strength = cci > 150 ? 'strong' : 'medium';
      reason = 'CCI above +100 - overbought condition, potential sell signal';
    } else if (cci < -200) {
      signal = 'extremely_oversold';
      strength = 'very_strong';
      reason = 'CCI below -200 - extremely oversold, strong buy signal';
    } else if (cci < -100) {
      signal = 'oversold';
      strength = cci < -150 ? 'strong' : 'medium';
      reason = 'CCI below -100 - oversold condition, potential buy signal';
    } else if (cci > 50) {
      signal = 'bullish';
      reason = 'CCI above +50 - bullish momentum';
    } else if (cci < -50) {
      signal = 'bearish';
      reason = 'CCI below -50 - bearish momentum';
    }

    return {
      signal,
      strength,
      reason,
      value: cci,
      zone: this.getCCIZone(cci)
    };
  }

  // Determina la zona CCI
  getCCIZone(cci) {
    if (cci > 200) return 'extreme_overbought';
    if (cci > 100) return 'overbought';
    if (cci > 50) return 'bullish';
    if (cci > -50) return 'neutral';
    if (cci > -100) return 'bearish';
    if (cci > -200) return 'oversold';
    return 'extreme_oversold';
  }

  // Strategia CCI Zero Line Cross
  getZeroLineCrossSignal(previousCCI) {
    const currentCCI = this.getResult();
    if (currentCCI === null || previousCCI === undefined) return null;

    if (previousCCI <= 0 && currentCCI > 0) {
      return {
        signal: 'buy',
        type: 'zero_line_cross_up',
        reason: 'CCI crossed above zero line - bullish signal',
        confidence: 'medium'
      };
    }

    if (previousCCI >= 0 && currentCCI < 0) {
      return {
        signal: 'sell',
        type: 'zero_line_cross_down',
        reason: 'CCI crossed below zero line - bearish signal',
        confidence: 'medium'
      };
    }

    return { signal: 'hold', type: 'no_cross' };
  }

  // Strategia CCI Overbought/Oversold
  getOverboughtOversoldSignal() {
    const cci = this.getResult();
    if (cci === null) return null;

    if (cci > 100) {
      return {
        signal: 'sell',
        type: 'overbought',
        reason: 'CCI in overbought territory - potential reversal',
        confidence: cci > 150 ? 'high' : 'medium',
        exitLevel: 100
      };
    }

    if (cci < -100) {
      return {
        signal: 'buy',
        type: 'oversold',
        reason: 'CCI in oversold territory - potential reversal',
        confidence: cci < -150 ? 'high' : 'medium',
        exitLevel: -100
      };
    }

    return { signal: 'hold', type: 'neutral' };
  }

  // Divergenza CCI
  getDivergence(prices, cciValues, lookback = 5) {
    if (cciValues.length < lookback * 2 || prices.length < lookback * 2) {
      return null;
    }

    const recentPrices = prices.slice(-lookback);
    const recentCCI = cciValues.slice(-lookback);
    const previousPrices = prices.slice(-lookback * 2, -lookback);
    const previousCCI = cciValues.slice(-lookback * 2, -lookback);

    const recentHighPrice = Math.max(...recentPrices);
    const recentLowPrice = Math.min(...recentPrices);
    const recentHighCCI = Math.max(...recentCCI);
    const recentLowCCI = Math.min(...recentCCI);

    const previousHighPrice = Math.max(...previousPrices);
    const previousLowPrice = Math.min(...previousPrices);
    const previousHighCCI = Math.max(...previousCCI);
    const previousLowCCI = Math.min(...previousCCI);

    // Bullish Divergence: Price makes lower low, CCI makes higher low
    if (recentLowPrice < previousLowPrice && recentLowCCI > previousLowCCI) {
      return {
        type: 'bullish_divergence',
        signal: 'buy',
        reason: 'Price lower low, CCI higher low - bullish divergence',
        confidence: 'high'
      };
    }

    // Bearish Divergence: Price makes higher high, CCI makes lower high
    if (recentHighPrice > previousHighPrice && recentHighCCI < previousHighCCI) {
      return {
        type: 'bearish_divergence',
        signal: 'sell',
        reason: 'Price higher high, CCI lower high - bearish divergence',
        confidence: 'high'
      };
    }

    return { type: 'no_divergence', signal: 'hold' };
  }

  // Trend following con CCI
  getTrendSignal() {
    const cci = this.getResult();
    if (cci === null) return null;

    if (cci > 100) {
      return {
        trend: 'strong_uptrend',
        signal: 'hold_long',
        reason: 'CCI above +100 - strong uptrend continues',
        stopLoss: 'exit_when_cci_below_100'
      };
    }

    if (cci < -100) {
      return {
        trend: 'strong_downtrend',
        signal: 'hold_short',
        reason: 'CCI below -100 - strong downtrend continues',
        stopLoss: 'exit_when_cci_above_minus_100'
      };
    }

    return {
      trend: 'sideways',
      signal: 'wait',
      reason: 'CCI between -100 and +100 - no clear trend'
    };
  }
}

module.exports = CCI;
