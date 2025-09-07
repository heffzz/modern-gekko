/**
 * Average Directional Index (ADX)
 * Misura la forza del trend, non la direzione
 * Valori sopra 25 indicano trend forte, sotto 20 trend debole
 */

class ADX {
  constructor(period = 14) {
    this.period = period;
    this.prices = [];
    this.trueRanges = [];
    this.plusDMs = [];
    this.minusDMs = [];
    this.smoothedTR = null;
    this.smoothedPlusDM = null;
    this.smoothedMinusDM = null;
    this.adxValues = [];
    this.dxValues = [];
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

    // Calculate Directional Movement
    const upMove = current.high - previous.high;
    const downMove = previous.low - current.low;

    const plusDM = (upMove > downMove && upMove > 0) ? upMove : 0;
    const minusDM = (downMove > upMove && downMove > 0) ? downMove : 0;

    this.plusDMs.push(plusDM);
    this.minusDMs.push(minusDM);

    if (this.trueRanges.length < this.period) {
      return null;
    }

    // Calculate smoothed values
    if (this.smoothedTR === null) {
      // First calculation - simple average
      this.smoothedTR = this.trueRanges.slice(-this.period).reduce((a, b) => a + b, 0);
      this.smoothedPlusDM = this.plusDMs.slice(-this.period).reduce((a, b) => a + b, 0);
      this.smoothedMinusDM = this.minusDMs.slice(-this.period).reduce((a, b) => a + b, 0);
    } else {
      // Subsequent calculations - Wilder's smoothing
      this.smoothedTR = this.smoothedTR - (this.smoothedTR / this.period) + trueRange;
      this.smoothedPlusDM = this.smoothedPlusDM - (this.smoothedPlusDM / this.period) + plusDM;
      this.smoothedMinusDM = this.smoothedMinusDM - (this.smoothedMinusDM / this.period) + minusDM;
    }

    // Calculate Directional Indicators
    const plusDI = (this.smoothedPlusDM / this.smoothedTR) * 100;
    const minusDI = (this.smoothedMinusDM / this.smoothedTR) * 100;

    // Calculate DX
    const dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100;
    this.dxValues.push(dx);

    if (this.dxValues.length < this.period) {
      return {
        adx: null,
        plusDI,
        minusDI,
        dx
      };
    }

    // Calculate ADX
    let adx;
    if (this.adxValues.length === 0) {
      // First ADX calculation - simple average of DX values
      adx = this.dxValues.slice(-this.period).reduce((a, b) => a + b, 0) / this.period;
    } else {
      // Subsequent ADX calculations - Wilder's smoothing
      const previousADX = this.adxValues[this.adxValues.length - 1];
      adx = (previousADX * (this.period - 1) + dx) / this.period;
    }

    this.adxValues.push(adx);

    return {
      adx: parseFloat(adx.toFixed(2)),
      plusDI: parseFloat(plusDI.toFixed(2)),
      minusDI: parseFloat(minusDI.toFixed(2)),
      dx: parseFloat(dx.toFixed(2))
    };
  }

  getResult() {
    if (this.adxValues.length === 0) {
      return null;
    }

    const latest = this.adxValues[this.adxValues.length - 1];
    return parseFloat(latest.toFixed(2));
  }

  // Metodo per ottenere tutti i valori
  getFullResult() {
    if (this.adxValues.length === 0) {
      return null;
    }

    const latest = this.adxValues[this.adxValues.length - 1];
    const plusDI = this.smoothedPlusDM / this.smoothedTR * 100;
    const minusDI = this.smoothedMinusDM / this.smoothedTR * 100;
    const dx = this.dxValues[this.dxValues.length - 1];

    return {
      adx: parseFloat(latest.toFixed(2)),
      plusDI: parseFloat(plusDI.toFixed(2)),
      minusDI: parseFloat(minusDI.toFixed(2)),
      dx: parseFloat(dx.toFixed(2))
    };
  }

  // Interpretazione del segnale
  getSignal() {
    const result = this.getFullResult();
    if (!result) return null;

    const { adx, plusDI, minusDI } = result;

    if (adx > 25) {
      if (plusDI > minusDI) {
        return { trend: 'strong_uptrend', strength: adx };
      } else {
        return { trend: 'strong_downtrend', strength: adx };
      }
    } else if (adx < 20) {
      return { trend: 'sideways', strength: adx };
    } else {
      return { trend: 'weak_trend', strength: adx };
    }
  }

  // Metodo per ottenere la forza del trend
  getTrendStrength() {
    const result = this.getResult();
    if (!result) return 'weak';

    const { adx } = result;

    if (adx > 50) {
      return 'very_strong';
    } else if (adx > 25) {
      return 'strong';
    } else if (adx > 20) {
      return 'moderate';
    } else {
      return 'weak';
    }
  }
}

export default ADX;
