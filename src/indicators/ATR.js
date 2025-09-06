/**
 * Average True Range (ATR)
 * Misura la volatilità del mercato
 * Valori alti indicano alta volatilità, valori bassi bassa volatilità
 */

class ATR {
  constructor(period = 14) {
    this.period = period;
    this.prices = [];
    this.trueRanges = [];
    this.atrValues = [];
  }

  update(candle) {
    const { high, low, close } = candle;
    this.prices.push({ high, low, close });

    if (this.prices.length < 2) {
      return null;
    }

    const current = this.prices[this.prices.length - 1];
    const previous = this.prices[this.prices.length - 2];

    // Calculate True Range
    const tr1 = current.high - current.low;
    const tr2 = Math.abs(current.high - previous.close);
    const tr3 = Math.abs(current.low - previous.close);
    const trueRange = Math.max(tr1, tr2, tr3);

    this.trueRanges.push(trueRange);

    if (this.trueRanges.length < this.period) {
      return null;
    }

    let atr;
    if (this.atrValues.length === 0) {
      // First ATR calculation - simple average
      atr = this.trueRanges.slice(-this.period).reduce((a, b) => a + b, 0) / this.period;
    } else {
      // Subsequent ATR calculations - Wilder's smoothing
      const previousATR = this.atrValues[this.atrValues.length - 1];
      atr = (previousATR * (this.period - 1) + trueRange) / this.period;
    }

    this.atrValues.push(atr);
    return parseFloat(atr.toFixed(4));
  }

  getResult() {
    if (this.atrValues.length === 0) {
      return null;
    }
    return parseFloat(this.atrValues[this.atrValues.length - 1].toFixed(4));
  }

  // Calcola ATR come percentuale del prezzo
  getATRPercent(currentPrice) {
    const atr = this.getResult();
    if (!atr || !currentPrice) return null;

    return parseFloat(((atr / currentPrice) * 100).toFixed(2));
  }

  // Interpretazione della volatilità
  getVolatilityLevel(currentPrice) {
    const atrPercent = this.getATRPercent(currentPrice);
    if (!atrPercent) return null;

    if (atrPercent > 3) {
      return { level: 'very_high', percent: atrPercent };
    } else if (atrPercent > 2) {
      return { level: 'high', percent: atrPercent };
    } else if (atrPercent > 1) {
      return { level: 'medium', percent: atrPercent };
    } else {
      return { level: 'low', percent: atrPercent };
    }
  }

  // Calcola stop loss basato su ATR
  calculateStopLoss(entryPrice, direction = 'long', multiplier = 2) {
    const atr = this.getResult();
    if (!atr) return null;

    if (direction === 'long') {
      return parseFloat((entryPrice - (atr * multiplier)).toFixed(4));
    } else {
      return parseFloat((entryPrice + (atr * multiplier)).toFixed(4));
    }
  }

  // Calcola take profit basato su ATR
  calculateTakeProfit(entryPrice, direction = 'long', multiplier = 3) {
    const atr = this.getResult();
    if (!atr) return null;

    if (direction === 'long') {
      return parseFloat((entryPrice + (atr * multiplier)).toFixed(4));
    } else {
      return parseFloat((entryPrice - (atr * multiplier)).toFixed(4));
    }
  }

  // Calcola position size basato su ATR e risk
  calculatePositionSize(accountBalance, riskPercent, entryPrice, direction = 'long', stopMultiplier = 2) {
    const atr = this.getResult();
    if (!atr) return null;

    const riskAmount = accountBalance * (riskPercent / 100);
    const stopDistance = atr * stopMultiplier;
    const positionSize = riskAmount / stopDistance;

    return {
      positionSize: parseFloat(positionSize.toFixed(6)),
      riskAmount: parseFloat(riskAmount.toFixed(2)),
      stopDistance: parseFloat(stopDistance.toFixed(4)),
      stopPrice: this.calculateStopLoss(entryPrice, direction, stopMultiplier)
    };
  }
}

module.exports = ATR;
