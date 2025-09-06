/**
 * Ichimoku Kinko Hyo (Ichimoku Cloud)
 * Sistema completo di analisi tecnica giapponese
 * Componenti: Tenkan-sen, Kijun-sen, Senkou Span A, Senkou Span B, Chikou Span
 */

class Ichimoku {
  constructor(tenkanPeriod = 9, kijunPeriod = 26, senkouPeriod = 52) {
    this.tenkanPeriod = tenkanPeriod;
    this.kijunPeriod = kijunPeriod;
    this.senkouPeriod = senkouPeriod;

    this.candles = [];
    this.tenkanValues = [];
    this.kijunValues = [];
    this.senkouSpanA = [];
    this.senkouSpanB = [];
    this.chikouSpan = [];
  }

  update(candle) {
    const { high, low, close } = candle;
    this.candles.push({ high, low, close });

    // Keep only necessary candles for performance
    const maxPeriod = Math.max(this.tenkanPeriod, this.kijunPeriod, this.senkouPeriod);
    if (this.candles.length > maxPeriod + 100) {
      this.candles = this.candles.slice(-maxPeriod - 50);
    }

    const result = this.calculate();
    return result;
  }

  calculate() {
    const candleCount = this.candles.length;

    // Tenkan-sen (Conversion Line)
    let tenkan = null;
    if (candleCount >= this.tenkanPeriod) {
      const recentCandles = this.candles.slice(-this.tenkanPeriod);
      const highestHigh = Math.max(...recentCandles.map(c => c.high));
      const lowestLow = Math.min(...recentCandles.map(c => c.low));
      tenkan = (highestHigh + lowestLow) / 2;
      this.tenkanValues.push(tenkan);
    }

    // Kijun-sen (Base Line)
    let kijun = null;
    if (candleCount >= this.kijunPeriod) {
      const recentCandles = this.candles.slice(-this.kijunPeriod);
      const highestHigh = Math.max(...recentCandles.map(c => c.high));
      const lowestLow = Math.min(...recentCandles.map(c => c.low));
      kijun = (highestHigh + lowestLow) / 2;
      this.kijunValues.push(kijun);
    }

    // Senkou Span A (Leading Span A) - projected 26 periods ahead
    let senkouA = null;
    if (tenkan !== null && kijun !== null) {
      senkouA = (tenkan + kijun) / 2;
      this.senkouSpanA.push(senkouA);
    }

    // Senkou Span B (Leading Span B) - projected 26 periods ahead
    let senkouB = null;
    if (candleCount >= this.senkouPeriod) {
      const recentCandles = this.candles.slice(-this.senkouPeriod);
      const highestHigh = Math.max(...recentCandles.map(c => c.high));
      const lowestLow = Math.min(...recentCandles.map(c => c.low));
      senkouB = (highestHigh + lowestLow) / 2;
      this.senkouSpanB.push(senkouB);
    }

    // Chikou Span (Lagging Span) - current close plotted 26 periods back
    const currentClose = this.candles[candleCount - 1].close;
    this.chikouSpan.push(currentClose);

    // Keep arrays manageable
    const maxLength = 1000;
    if (this.tenkanValues.length > maxLength) {
      this.tenkanValues = this.tenkanValues.slice(-500);
      this.kijunValues = this.kijunValues.slice(-500);
      this.senkouSpanA = this.senkouSpanA.slice(-500);
      this.senkouSpanB = this.senkouSpanB.slice(-500);
      this.chikouSpan = this.chikouSpan.slice(-500);
    }

    return {
      tenkanSen: tenkan ? parseFloat(tenkan.toFixed(4)) : null,
      kijunSen: kijun ? parseFloat(kijun.toFixed(4)) : null,
      senkouSpanA: senkouA ? parseFloat(senkouA.toFixed(4)) : null,
      senkouSpanB: senkouB ? parseFloat(senkouB.toFixed(4)) : null,
      chikouSpan: parseFloat(currentClose.toFixed(4)),
      cloudTop: senkouA && senkouB ? parseFloat(Math.max(senkouA, senkouB).toFixed(4)) : null,
      cloudBottom: senkouA && senkouB ? parseFloat(Math.min(senkouA, senkouB).toFixed(4)) : null
    };
  }

  getResult() {
    return this.calculate();
  }

  // Get cloud color (bullish or bearish)
  getCloudColor() {
    const result = this.getResult();
    if (!result.senkouSpanA || !result.senkouSpanB) return null;

    if (result.senkouSpanA > result.senkouSpanB) {
      return 'bullish'; // Green cloud
    } else {
      return 'bearish'; // Red cloud
    }
  }

  // Price position relative to cloud
  getPriceCloudPosition(currentPrice) {
    const result = this.getResult();
    if (!result.cloudTop || !result.cloudBottom || !currentPrice) return null;

    if (currentPrice > result.cloudTop) {
      return 'above_cloud';
    } else if (currentPrice < result.cloudBottom) {
      return 'below_cloud';
    } else {
      return 'inside_cloud';
    }
  }

  // Tenkan-Kijun cross signals
  getTenkanKijunCross() {
    if (this.tenkanValues.length < 2 || this.kijunValues.length < 2) {
      return null;
    }

    const currentTenkan = this.tenkanValues[this.tenkanValues.length - 1];
    const previousTenkan = this.tenkanValues[this.tenkanValues.length - 2];
    const currentKijun = this.kijunValues[this.kijunValues.length - 1];
    const previousKijun = this.kijunValues[this.kijunValues.length - 2];

    // Bullish cross (Tenkan crosses above Kijun)
    if (previousTenkan <= previousKijun && currentTenkan > currentKijun) {
      return {
        type: 'bullish_cross',
        signal: 'buy',
        reason: 'Tenkan-sen crossed above Kijun-sen - bullish signal',
        confidence: 'medium'
      };
    }

    // Bearish cross (Tenkan crosses below Kijun)
    if (previousTenkan >= previousKijun && currentTenkan < currentKijun) {
      return {
        type: 'bearish_cross',
        signal: 'sell',
        reason: 'Tenkan-sen crossed below Kijun-sen - bearish signal',
        confidence: 'medium'
      };
    }

    return { type: 'no_cross', signal: 'hold' };
  }

  // Kijun-sen trend analysis
  getKijunTrend() {
    if (this.kijunValues.length < 3) return null;

    const current = this.kijunValues[this.kijunValues.length - 1];
    const previous = this.kijunValues[this.kijunValues.length - 2];
    const beforePrevious = this.kijunValues[this.kijunValues.length - 3];

    if (current > previous && previous > beforePrevious) {
      return { trend: 'uptrend', strength: 'strong' };
    } else if (current < previous && previous < beforePrevious) {
      return { trend: 'downtrend', strength: 'strong' };
    } else if (current > previous) {
      return { trend: 'uptrend', strength: 'weak' };
    } else if (current < previous) {
      return { trend: 'downtrend', strength: 'weak' };
    }

    return { trend: 'sideways', strength: 'neutral' };
  }

  // Chikou Span analysis
  getChikouSignal() {
    if (this.chikouSpan.length < this.kijunPeriod + 1 || this.candles.length < this.kijunPeriod + 1) {
      return null;
    }

    // Compare current Chikou with price 26 periods ago
    const currentChikou = this.chikouSpan[this.chikouSpan.length - 1];
    const priceIndex = this.candles.length - this.kijunPeriod - 1;

    if (priceIndex < 0) return null;

    const pastPrice = this.candles[priceIndex].close;

    if (currentChikou > pastPrice) {
      return {
        signal: 'bullish',
        reason: 'Chikou Span above price 26 periods ago - bullish momentum',
        strength: 'medium'
      };
    } else if (currentChikou < pastPrice) {
      return {
        signal: 'bearish',
        reason: 'Chikou Span below price 26 periods ago - bearish momentum',
        strength: 'medium'
      };
    }

    return { signal: 'neutral', reason: 'Chikou Span neutral' };
  }

  // Comprehensive Ichimoku signal
  getIchimokuSignal(currentPrice) {
    const result = this.getResult();
    if (!result.tenkanSen || !result.kijunSen || !currentPrice) return null;

    const cloudPosition = this.getPriceCloudPosition(currentPrice);
    const cloudColor = this.getCloudColor();
    const tenkanKijunCross = this.getTenkanKijunCross();
    const kijunTrend = this.getKijunTrend();
    const chikouSignal = this.getChikouSignal();

    let signal = 'neutral';
    let strength = 'weak';
    let confidence = 'low';
    const reasons = [];

    // Strong bullish signals
    if (cloudPosition === 'above_cloud' && cloudColor === 'bullish') {
      signal = 'bullish';
      strength = 'strong';
      confidence = 'high';
      reasons.push('Price above bullish cloud');

      if (currentPrice > result.tenkanSen && currentPrice > result.kijunSen) {
        reasons.push('Price above both Tenkan and Kijun');
        strength = 'very_strong';
      }

      if (tenkanKijunCross && tenkanKijunCross.type === 'bullish_cross') {
        reasons.push('Bullish Tenkan-Kijun cross');
        confidence = 'very_high';
      }

      if (chikouSignal && chikouSignal.signal === 'bullish') {
        reasons.push('Bullish Chikou Span');
      }
    }
    // Strong bearish signals
    else if (cloudPosition === 'below_cloud' && cloudColor === 'bearish') {
      signal = 'bearish';
      strength = 'strong';
      confidence = 'high';
      reasons.push('Price below bearish cloud');

      if (currentPrice < result.tenkanSen && currentPrice < result.kijunSen) {
        reasons.push('Price below both Tenkan and Kijun');
        strength = 'very_strong';
      }

      if (tenkanKijunCross && tenkanKijunCross.type === 'bearish_cross') {
        reasons.push('Bearish Tenkan-Kijun cross');
        confidence = 'very_high';
      }

      if (chikouSignal && chikouSignal.signal === 'bearish') {
        reasons.push('Bearish Chikou Span');
      }
    }
    // Mixed or neutral signals
    else {
      if (cloudPosition === 'inside_cloud') {
        signal = 'neutral';
        reasons.push('Price inside cloud - wait for breakout');
      } else if (tenkanKijunCross) {
        signal = tenkanKijunCross.signal;
        strength = 'medium';
        confidence = 'medium';
        reasons.push(tenkanKijunCross.reason);
      }
    }

    return {
      signal,
      strength,
      confidence,
      reasons,
      components: {
        cloudPosition,
        cloudColor,
        tenkanKijunCross,
        kijunTrend,
        chikouSignal
      },
      levels: {
        tenkanSen: result.tenkanSen,
        kijunSen: result.kijunSen,
        cloudTop: result.cloudTop,
        cloudBottom: result.cloudBottom
      }
    };
  }

  // Support and resistance levels
  getSupportResistance(currentPrice) {
    const result = this.getResult();
    if (!result.tenkanSen || !result.kijunSen || !currentPrice) return null;

    const levels = [];
    const cloudPosition = this.getPriceCloudPosition(currentPrice);

    // Tenkan-sen as support/resistance
    if (currentPrice > result.tenkanSen) {
      levels.push({
        level: result.tenkanSen,
        type: 'support',
        name: 'Tenkan-sen',
        strength: 'medium'
      });
    } else {
      levels.push({
        level: result.tenkanSen,
        type: 'resistance',
        name: 'Tenkan-sen',
        strength: 'medium'
      });
    }

    // Kijun-sen as support/resistance
    if (currentPrice > result.kijunSen) {
      levels.push({
        level: result.kijunSen,
        type: 'support',
        name: 'Kijun-sen',
        strength: 'strong'
      });
    } else {
      levels.push({
        level: result.kijunSen,
        type: 'resistance',
        name: 'Kijun-sen',
        strength: 'strong'
      });
    }

    // Cloud as support/resistance
    if (cloudPosition === 'above_cloud') {
      levels.push({
        level: result.cloudTop,
        type: 'support',
        name: 'Cloud Top',
        strength: 'very_strong'
      });
    } else if (cloudPosition === 'below_cloud') {
      levels.push({
        level: result.cloudBottom,
        type: 'resistance',
        name: 'Cloud Bottom',
        strength: 'very_strong'
      });
    }

    return levels.sort((a, b) => Math.abs(a.level - currentPrice) - Math.abs(b.level - currentPrice));
  }

  // Entry and exit strategies
  getEntryExitSignals(currentPrice) {
    const ichimokuSignal = this.getIchimokuSignal(currentPrice);
    if (!ichimokuSignal) return null;

    const supportResistance = this.getSupportResistance(currentPrice);

    let entry = null;
    let stopLoss = null;
    let takeProfit = null;

    if (ichimokuSignal.confidence === 'high' || ichimokuSignal.confidence === 'very_high') {
      if (ichimokuSignal.signal === 'bullish') {
        entry = {
          type: 'buy',
          price: currentPrice,
          reason: ichimokuSignal.reasons.join(', ')
        };

        // Stop loss below cloud or Kijun-sen
        const supportLevels = supportResistance.filter(level => level.type === 'support');
        if (supportLevels.length > 0) {
          stopLoss = supportLevels[0].level * 0.98; // 2% below support
        }

        // Take profit at next resistance or 2:1 risk/reward
        if (stopLoss) {
          const riskDistance = currentPrice - stopLoss;
          takeProfit = currentPrice + (riskDistance * 2);
        }
      } else if (ichimokuSignal.signal === 'bearish') {
        entry = {
          type: 'sell',
          price: currentPrice,
          reason: ichimokuSignal.reasons.join(', ')
        };

        // Stop loss above cloud or Kijun-sen
        const resistanceLevels = supportResistance.filter(level => level.type === 'resistance');
        if (resistanceLevels.length > 0) {
          stopLoss = resistanceLevels[0].level * 1.02; // 2% above resistance
        }

        // Take profit at next support or 2:1 risk/reward
        if (stopLoss) {
          const riskDistance = stopLoss - currentPrice;
          takeProfit = currentPrice - (riskDistance * 2);
        }
      }
    }

    return {
      entry,
      stopLoss: stopLoss ? parseFloat(stopLoss.toFixed(4)) : null,
      takeProfit: takeProfit ? parseFloat(takeProfit.toFixed(4)) : null,
      riskReward: entry && stopLoss && takeProfit ?
        parseFloat((Math.abs(takeProfit - currentPrice) / Math.abs(stopLoss - currentPrice)).toFixed(2)) : null,
      confidence: ichimokuSignal.confidence
    };
  }
}

module.exports = Ichimoku;
