import { ADX, ATR, BollingerBands, CCI, DEMA, Stochastic, WilliamsR, ParabolicSAR, Ichimoku } from '../src/indicators/index.js';

describe('Advanced Indicators Tests', () => {
  const sampleCandles = [
    { high: 45, low: 40, close: 42, volume: 1000 },
    { high: 47, low: 42, close: 45, volume: 1200 },
    { high: 46, low: 43, close: 44, volume: 1100 },
    { high: 48, low: 44, close: 47, volume: 1300 },
    { high: 50, low: 46, close: 49, volume: 1400 },
    { high: 52, low: 48, close: 51, volume: 1500 },
    { high: 51, low: 47, close: 48, volume: 1200 },
    { high: 49, low: 45, close: 46, volume: 1000 },
    { high: 47, low: 43, close: 45, volume: 900 },
    { high: 46, low: 42, close: 44, volume: 800 },
    { high: 48, low: 44, close: 47, volume: 1100 },
    { high: 50, low: 46, close: 49, volume: 1300 },
    { high: 52, low: 48, close: 51, volume: 1400 },
    { high: 54, low: 50, close: 53, volume: 1600 },
    { high: 53, low: 49, close: 50, volume: 1200 }
  ];

  describe('ADX Indicator', () => {
    test('should calculate ADX values correctly', () => {
      const adx = new ADX(14);
      
      sampleCandles.forEach(candle => {
        adx.update(candle);
      });
      
      const result = adx.getResult();
      expect(result).toHaveProperty('adx');
      expect(result).toHaveProperty('pdi');
      expect(result).toHaveProperty('mdi');
      expect(typeof result.adx).toBe('number');
      expect(result.adx).toBeGreaterThanOrEqual(0);
      expect(result.adx).toBeLessThanOrEqual(100);
    });

    test('should detect trend strength', () => {
      const adx = new ADX(14);
      
      sampleCandles.forEach(candle => {
        adx.update(candle);
      });
      
      const strength = adx.getTrendStrength();
      expect(['weak', 'moderate', 'strong', 'very_strong']).toContain(strength);
    });
  });

  describe('ATR Indicator', () => {
    test('should calculate ATR values correctly', () => {
      const atr = new ATR(14);
      
      sampleCandles.forEach(candle => {
        atr.update(candle);
      });
      
      const result = atr.getResult();
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
    });

    test('should calculate position size', () => {
      const atr = new ATR(14);
      
      sampleCandles.forEach(candle => {
        atr.update(candle);
      });
      
      const positionSize = atr.calculatePositionSize(10000, 0.02, 50);
      expect(typeof positionSize).toBe('number');
      expect(positionSize).toBeGreaterThan(0);
    });
  });

  describe('Bollinger Bands Indicator', () => {
    test('should calculate Bollinger Bands correctly', () => {
      const bb = new BollingerBands(20, 2);
      
      sampleCandles.forEach(candle => {
        bb.update(candle.close);
      });
      
      const result = bb.getResult();
      expect(result).toHaveProperty('upper');
      expect(result).toHaveProperty('middle');
      expect(result).toHaveProperty('lower');
      expect(result.upper).toBeGreaterThan(result.middle);
      expect(result.middle).toBeGreaterThan(result.lower);
    });

    test('should detect squeeze conditions', () => {
      const bb = new BollingerBands(20, 2);
      
      sampleCandles.forEach(candle => {
        bb.update(candle.close);
      });
      
      const signal = bb.getSignal(50);
      expect(signal).toHaveProperty('position');
      expect(signal).toHaveProperty('squeeze');
      expect(signal).toHaveProperty('expansion');
    });
  });

  describe('CCI Indicator', () => {
    test('should calculate CCI values correctly', () => {
      const cci = new CCI(20);
      
      sampleCandles.forEach(candle => {
        cci.update(candle);
      });
      
      const result = cci.getResult();
      expect(typeof result).toBe('number');
    });

    test('should detect overbought/oversold conditions', () => {
      const cci = new CCI(20);
      
      sampleCandles.forEach(candle => {
        cci.update(candle);
      });
      
      const signal = cci.getSignal();
      expect(signal).toHaveProperty('zone');
      expect(signal).toHaveProperty('momentum');
    });
  });

  describe('DEMA Indicator', () => {
    test('should calculate DEMA values correctly', () => {
      const dema = new DEMA(14);
      
      sampleCandles.forEach(candle => {
        dema.update(candle.close);
      });
      
      const result = dema.getResult();
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
    });

    test('should generate trend signals', () => {
      const dema = new DEMA(14);
      
      sampleCandles.forEach(candle => {
        dema.update(candle.close);
      });
      
      const signal = dema.getSignal(50);
      expect(signal).toHaveProperty('trend');
      expect(signal).toHaveProperty('crossover');
    });
  });

  describe('Stochastic Indicator', () => {
    test('should calculate Stochastic values correctly', () => {
      const stoch = new Stochastic(14, 3, 3);
      
      sampleCandles.forEach(candle => {
        stoch.update(candle);
      });
      
      const result = stoch.getResult();
      expect(result).toHaveProperty('k');
      expect(result).toHaveProperty('d');
      expect(result.k).toBeGreaterThanOrEqual(0);
      expect(result.k).toBeLessThanOrEqual(100);
      expect(result.d).toBeGreaterThanOrEqual(0);
      expect(result.d).toBeLessThanOrEqual(100);
    });

    test('should detect overbought/oversold conditions', () => {
      const stoch = new Stochastic(14, 3, 3);
      
      sampleCandles.forEach(candle => {
        stoch.update(candle);
      });
      
      const signal = stoch.getSignal();
      expect(signal).toHaveProperty('overbought');
      expect(signal).toHaveProperty('oversold');
      expect(signal).toHaveProperty('crossover');
    });
  });

  describe('Williams %R Indicator', () => {
    test('should calculate Williams %R values correctly', () => {
      const wr = new WilliamsR(14);
      
      sampleCandles.forEach(candle => {
        wr.update(candle);
      });
      
      const result = wr.getResult();
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(-100);
      expect(result).toBeLessThanOrEqual(0);
    });

    test('should detect reversal signals', () => {
      const wr = new WilliamsR(14);
      
      sampleCandles.forEach(candle => {
        wr.update(candle);
      });
      
      const signal = wr.getSignal();
      expect(signal).toHaveProperty('overbought');
      expect(signal).toHaveProperty('oversold');
      expect(signal).toHaveProperty('trend');
    });
  });

  describe('Parabolic SAR Indicator', () => {
    test('should calculate Parabolic SAR values correctly', () => {
      const psar = new ParabolicSAR(0.02, 0.2);
      
      sampleCandles.forEach(candle => {
        psar.update(candle);
      });
      
      const result = psar.getResult();
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
    });

    test('should detect trend reversals', () => {
      const psar = new ParabolicSAR(0.02, 0.2);
      
      sampleCandles.forEach(candle => {
        psar.update(candle);
      });
      
      const signal = psar.getSignal(50);
      expect(signal).toHaveProperty('trend');
      expect(signal).toHaveProperty('reversal');
      expect(signal).toHaveProperty('stopLoss');
    });
  });

  describe('Ichimoku Indicator', () => {
    test('should calculate Ichimoku components correctly', () => {
      const ichimoku = new Ichimoku(9, 26, 52);
      
      sampleCandles.forEach(candle => {
        ichimoku.update(candle);
      });
      
      const result = ichimoku.getResult();
      expect(result).toHaveProperty('tenkanSen');
      expect(result).toHaveProperty('kijunSen');
      expect(result).toHaveProperty('senkouSpanA');
      expect(result).toHaveProperty('senkouSpanB');
      expect(result).toHaveProperty('chikouSpan');
    });

    test('should analyze cloud conditions', () => {
      const ichimoku = new Ichimoku(9, 26, 52);
      
      sampleCandles.forEach(candle => {
        ichimoku.update(candle);
      });
      
      const cloudAnalysis = ichimoku.getCloudAnalysis(50);
      expect(cloudAnalysis).toHaveProperty('color');
      expect(cloudAnalysis).toHaveProperty('position');
      expect(cloudAnalysis).toHaveProperty('thickness');
    });

    test('should generate comprehensive signals', () => {
      const ichimoku = new Ichimoku(9, 26, 52);
      
      sampleCandles.forEach(candle => {
        ichimoku.update(candle);
      });
      
      const signal = ichimoku.getComplexSignal(50);
      expect(signal).toHaveProperty('strength');
      expect(signal).toHaveProperty('trend');
      expect(signal).toHaveProperty('signals');
    });
  });
});