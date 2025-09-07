/**
 * Bollinger Bands
 * Bande di volatilità basate su media mobile e deviazione standard
 * Utili per identificare livelli di ipercomprato/ipervenduto
 */

class BollingerBands {
  constructor(period = 20, stdDev = 2) {
    this.period = period;
    this.stdDev = stdDev;
    this.prices = [];
    this.smaValues = [];
  }

  update(candle) {
    const price = candle.close;
    this.prices.push(price);

    if (this.prices.length < this.period) {
      return null;
    }

    // Keep only the last 'period' prices
    if (this.prices.length > this.period) {
      this.prices = this.prices.slice(-this.period);
    }

    // Calculate Simple Moving Average
    const sma = this.prices.reduce((sum, price) => sum + price, 0) / this.period;
    this.smaValues.push(sma);

    // Calculate Standard Deviation
    const variance = this.prices.reduce((sum, price) => {
      return sum + Math.pow(price - sma, 2);
    }, 0) / this.period;

    const standardDeviation = Math.sqrt(variance);

    // Calculate Bollinger Bands
    const upperBand = sma + (this.stdDev * standardDeviation);
    const lowerBand = sma - (this.stdDev * standardDeviation);
    const bandwidth = ((upperBand - lowerBand) / sma) * 100;
    const percentB = ((price - lowerBand) / (upperBand - lowerBand)) * 100;

    return {
      upperBand: parseFloat(upperBand.toFixed(4)),
      middleBand: parseFloat(sma.toFixed(4)), // SMA
      lowerBand: parseFloat(lowerBand.toFixed(4)),
      bandwidth: parseFloat(bandwidth.toFixed(2)),
      percentB: parseFloat(percentB.toFixed(2)),
      price: parseFloat(price.toFixed(4))
    };
  }

  getResult() {
    if (this.prices.length < this.period) {
      return null;
    }

    const price = this.prices[this.prices.length - 1];
    const sma = this.prices.reduce((sum, price) => sum + price, 0) / this.period;

    const variance = this.prices.reduce((sum, price) => {
      return sum + Math.pow(price - sma, 2);
    }, 0) / this.period;

    const standardDeviation = Math.sqrt(variance);
    const upperBand = sma + (this.stdDev * standardDeviation);
    const lowerBand = sma - (this.stdDev * standardDeviation);
    const bandwidth = ((upperBand - lowerBand) / sma) * 100;
    const percentB = ((price - lowerBand) / (upperBand - lowerBand)) * 100;

    return {
      upper: parseFloat(upperBand.toFixed(4)),
      middle: parseFloat(sma.toFixed(4)),
      lower: parseFloat(lowerBand.toFixed(4)),
      bandwidth: parseFloat(bandwidth.toFixed(2)),
      percentB: parseFloat(percentB.toFixed(2)),
      price: parseFloat(price.toFixed(4))
    };
  }

  // Interpretazione del segnale
  getSignal() {
    const result = this.getResult();
    if (!result) return null;

    const { price, upper, lower, percentB, bandwidth } = result;

    let signal = 'neutral';
    let strength = 'weak';
    let reason = '';

    // Bollinger Squeeze (bassa volatilità)
    if (bandwidth < 10) {
      signal = 'squeeze';
      reason = 'Low volatility - potential breakout coming';
    }
    // Bollinger Band Expansion (alta volatilità)
    else if (bandwidth > 20) {
      signal = 'expansion';
      reason = 'High volatility - trend continuation or reversal';
    }
    // Price touching bands
    else if (percentB >= 100) {
      signal = 'overbought';
      strength = percentB > 110 ? 'strong' : 'medium';
      reason = 'Price above upper band - potential sell signal';
    }
    else if (percentB <= 0) {
      signal = 'oversold';
      strength = percentB < -10 ? 'strong' : 'medium';
      reason = 'Price below lower band - potential buy signal';
    }
    // %B levels
    else if (percentB > 80) {
      signal = 'approaching_overbought';
      reason = 'Price approaching upper band';
    }
    else if (percentB < 20) {
      signal = 'approaching_oversold';
      reason = 'Price approaching lower band';
    }

    return {
      signal,
      strength,
      reason,
      percentB,
      bandwidth,
      position: this.getBandPosition(percentB)
    };
  }

  // Determina la posizione del prezzo rispetto alle bande
  getBandPosition(percentB) {
    if (percentB > 100) return 'above_upper';
    if (percentB > 80) return 'near_upper';
    if (percentB > 50) return 'upper_half';
    if (percentB > 20) return 'lower_half';
    if (percentB > 0) return 'near_lower';
    return 'below_lower';
  }

  // Calcola Bollinger Band Width per identificare squeeze
  getBandwidthSignal() {
    const result = this.getResult();
    if (!result) return null;

    const { bandwidth } = result;

    if (bandwidth < 5) {
      return { type: 'extreme_squeeze', bandwidth };
    } else if (bandwidth < 10) {
      return { type: 'squeeze', bandwidth };
    } else if (bandwidth > 25) {
      return { type: 'extreme_expansion', bandwidth };
    } else if (bandwidth > 15) {
      return { type: 'expansion', bandwidth };
    }

    return { type: 'normal', bandwidth };
  }

  // Strategia Bollinger Band Bounce
  getBounceSignal() {
    const result = this.getResult();
    if (!result) return null;

    const { percentB, bandwidth } = result;

    // Bounce strategy works best in low volatility environments
    if (bandwidth > 20) {
      return { signal: 'no_trade', reason: 'High volatility - bounce strategy not recommended' };
    }

    if (percentB <= 0) {
      return { signal: 'buy', reason: 'Price at or below lower band - bounce expected', confidence: 'medium' };
    }

    if (percentB >= 100) {
      return { signal: 'sell', reason: 'Price at or above upper band - bounce expected', confidence: 'medium' };
    }

    return { signal: 'hold', reason: 'Price within normal range' };
  }

  // Strategia Bollinger Band Breakout
  getBreakoutSignal() {
    const result = this.getResult();
    if (!result) return null;

    const { percentB, bandwidth } = result;
    const bandwidthSignal = this.getBandwidthSignal();

    // Breakout strategy works best after squeeze
    if (bandwidthSignal.type === 'squeeze' || bandwidthSignal.type === 'extreme_squeeze') {
      if (percentB > 100) {
        return { signal: 'buy_breakout', reason: 'Upward breakout after squeeze', confidence: 'high' };
      }
      if (percentB < 0) {
        return { signal: 'sell_breakout', reason: 'Downward breakout after squeeze', confidence: 'high' };
      }
    }

    return { signal: 'wait', reason: 'No clear breakout signal' };
  }

  // Metodo generale per ottenere segnali
  getSignal(currentPrice) {
    const result = this.getResult();
    if (!result) return null;

    const { price, upper, lower, percentB, bandwidth } = result;
    const bandwidthSignal = this.getBandwidthSignal();

    let signal = 'neutral';
    if (price > upper) {
      signal = 'sell';
    } else if (price < lower) {
      signal = 'buy';
    }

    return {
      signal,
      position: percentB > 80 ? 'overbought' : percentB < 20 ? 'oversold' : 'neutral',
      squeeze: bandwidthSignal.type === 'squeeze' || bandwidthSignal.type === 'extreme_squeeze',
      expansion: bandwidthSignal.type === 'expansion' || bandwidthSignal.type === 'extreme_expansion',
      percentB,
      bandwidth
    };
  }
}

export default BollingerBands;
