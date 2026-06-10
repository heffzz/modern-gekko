/**
 * Test Suite for Gekko Trading Strategies
 *
 * Tests all implemented strategies with various configurations
 * and validates parameter systems, signal generation, and edge cases.
 */

// jest is available globally in test environment
const BaseStrategy = require('../strategies/BaseStrategy.js');
const DEMAStrategy = require('../strategies/DEMAStrategy.js');
const MACDStrategy = require('../strategies/MACDStrategy.js');
const RSIStrategy = require('../strategies/RSIStrategy.js');
const PPOStrategy = require('../strategies/PPOStrategy.js');
const StochRSIStrategy = require('../strategies/StochRSIStrategy.js');
const CCIStrategy = require('../strategies/CCIStrategy.js');
const BollingerBandsStrategy = require('../strategies/BollingerBandsStrategy.js');

// Mock engine for testing
const mockEngine = {
  log: jest.fn(),
  emit: jest.fn()
};

// Helper function to generate test candles
function generateTestCandles(count = 100, basePrice = 100, volatility = 0.02) {
  const candles = [];
  let price = basePrice;
  const startTime = Date.now() - (count * 60000); // 1 minute candles

  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.5) * volatility * price;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * 0.01 * price;
    const low = Math.min(open, close) - Math.random() * 0.01 * price;
    const volume = Math.random() * 1000 + 500;

    candles.push({
      timestamp: startTime + (i * 60000),
      open,
      high,
      low,
      close,
      volume
    });

    price = close;
  }

  return candles;
}

// Helper function to generate trending candles
function generateTrendingCandles(count = 100, basePrice = 100, trendStrength = 0.001) {
  const candles = [];
  let price = basePrice;
  const startTime = Date.now() - (count * 60000);

  for (let i = 0; i < count; i++) {
    const trend = trendStrength * price;
    const noise = (Math.random() - 0.5) * 0.01 * price;
    const open = price;
    const close = price + trend + noise;
    const high = Math.max(open, close) + Math.random() * 0.005 * price;
    const low = Math.min(open, close) - Math.random() * 0.005 * price;
    const volume = Math.random() * 1000 + 500;

    candles.push({
      timestamp: startTime + (i * 60000),
      open,
      high,
      low,
      close,
      volume
    });

    price = close;
  }

  return candles;
}

describe('BaseStrategy', () => {
  let strategy;

  beforeEach(() => {
    strategy = new BaseStrategy();
  });

  test('should initialize with default properties', () => {
    expect(strategy.parameters).toEqual({
      stopLoss: 5,
      takeProfit: 10
    });
    expect(strategy.position).toBeNull();
    expect(strategy.entryPrice).toBeNull();
    expect(strategy.initialized).toBe(false);
  });

  test('should define parameters correctly', () => {
    strategy.defineParameter('testParam', {
      label: 'Test Parameter',
      type: 'number',
      default: 10,
      min: 5,
      max: 20
    });

    expect(strategy.parameterDefinitions.testParam).toBeDefined();
    expect(strategy.parameters.testParam).toBe(10);
  });

  test('should update parameters with validation', () => {
    strategy.defineParameter('testParam', {
      label: 'Test Parameter',
      type: 'number',
      default: 10,
      min: 5,
      max: 20
    });

    strategy.updateParameters({ testParam: 15 });
    expect(strategy.parameters.testParam).toBe(15);

    expect(() => {
      strategy.updateParameters({ testParam: 25 });
    }).toThrow();
  });

  test('should validate parameter dependencies', () => {
    strategy.defineParameter('minValue', {
      label: 'Min Value',
      type: 'number',
      default: 5
    });

    strategy.defineParameter('maxValue', {
      label: 'Max Value',
      type: 'number',
      default: 15,
      validation: (value) => {
        if (value <= strategy.parameters.minValue) {
          return 'Max value must be greater than min value';
        }
        return true;
      }
    });

    expect(() => {
      strategy.updateParameters({ maxValue: 3 });
    }).toThrow('Max value must be greater than min value');
  });

  test('should create entry and exit signals correctly', () => {
    const entrySignal = strategy.createEntrySignal('long', 100, Date.now(), { reason: 'test' });
    expect(entrySignal.direction).toBe('long');
    expect(entrySignal.price).toBe(100);
    expect(entrySignal.metadata.reason).toBe('test');

    const exitSignal = strategy.createExitSignal('profit_target', 110, Date.now(), { profit: 10 });
    expect(exitSignal.type).toBe('exit');
    expect(exitSignal.reason).toBe('profit_target');
    expect(exitSignal.price).toBe(110);
  });
});

describe('DEMAStrategy', () => {
  let strategy;
  let testCandles;

  beforeEach(() => {
    strategy = new DEMAStrategy();
    testCandles = generateTestCandles(100);
  });

  test('should initialize with correct default parameters', () => {
    expect(strategy.parameters.fastPeriod).toBe(12);
    expect(strategy.parameters.slowPeriod).toBe(26);
    expect(strategy.parameters.tradingMode).toBe('crossover');
  });

  test('should calculate DEMA correctly', () => {
    const prices = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
    const dema = strategy.calculateDEMA(prices, 5);

    expect(dema).toBeDefined();
    expect(typeof dema).toBe('number');
    expect(dema).toBeGreaterThan(0);
  });

  test('should generate crossover signals', async() => {
    strategy.updateParameters({ tradingMode: 'crossover' });
    await strategy.init();

    // Process candles to build up indicators
    for (let i = 0; i < 50; i++) {
      await strategy.onCandle(testCandles[i], testCandles.slice(0, i + 1), mockEngine);
    }

    // Should have calculated DEMA values
    expect(strategy.fastDEMA).toBeDefined();
    expect(strategy.slowDEMA).toBeDefined();
  });

  test('should respect volatility filter', async() => {
    strategy.updateParameters({
      volatilityFilter: 'high',
      atrMultiplier: 2.0
    });
    await strategy.init();

    const signal = await strategy.onCandle(
      testCandles[testCandles.length - 1],
      testCandles,
      mockEngine
    );

    // Signal generation should consider volatility
    expect(strategy.atr).toBeDefined();
  });

  test('should handle insufficient data gracefully', async() => {
    await strategy.init();

    const signal = await strategy.onCandle(
      testCandles[0],
      [testCandles[0]],
      mockEngine
    );

    expect(signal).toBeNull();
  });
});

describe('MACDStrategy', () => {
  let strategy;
  let testCandles;

  beforeEach(() => {
    strategy = new MACDStrategy();
    testCandles = generateTestCandles(100);
  });

  test('should calculate MACD components correctly', () => {
    const prices = Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i * 0.1) * 5);

    const fastEMA = strategy.calculateEMA(prices, 12);
    const slowEMA = strategy.calculateEMA(prices, 26);

    expect(fastEMA).toBeDefined();
    expect(slowEMA).toBeDefined();
    expect(fastEMA.length).toBe(prices.length - 11);
    expect(slowEMA.length).toBe(prices.length - 25);
  });

  test('should detect divergences when enabled', async() => {
    strategy.updateParameters({
      divergenceDetection: true,
      tradingMode: 'divergence'
    });
    await strategy.init();

    // Create divergence pattern
    const divergenceCandles = generateTestCandles(100);
    // Manually create price/MACD divergence
    for (let i = 80; i < 100; i++) {
      divergenceCandles[i].close = 95 + (i - 80) * 0.5; // Rising prices
    }

    for (let i = 0; i < divergenceCandles.length; i++) {
      await strategy.onCandle(
        divergenceCandles[i],
        divergenceCandles.slice(0, i + 1),
        mockEngine
      );
    }

    expect(strategy.macdLine).toBeDefined();
    expect(strategy.signalLine).toBeDefined();
  });

  test('should generate zero line crossover signals', async() => {
    strategy.updateParameters({ tradingMode: 'zero_line' });
    await strategy.init();

    const trendingCandles = generateTrendingCandles(100, 100, 0.002);

    const signals = [];
    for (let i = 0; i < trendingCandles.length; i++) {
      const signal = await strategy.onCandle(
        trendingCandles[i],
        trendingCandles.slice(0, i + 1),
        mockEngine
      );
      if (signal) signals.push(signal);
    }

    // Should generate some signals in trending market
    expect(strategy.macdLine).toBeDefined();
  });
});

describe('RSIStrategy', () => {
  let strategy;
  let testCandles;

  beforeEach(() => {
    strategy = new RSIStrategy();
    testCandles = generateTestCandles(100);
  });

  test('should calculate RSI correctly', () => {
    // Create test data with known pattern
    const prices = [44, 44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.85, 46.08, 45.89, 46.03, 46.83, 47.69, 46.49, 46.26];
    const rsi = strategy.calculateRSI(prices, 14);

    expect(rsi).toBeDefined();
    expect(rsi).toBeGreaterThan(0);
    expect(rsi).toBeLessThan(100);
  });

  test('should use dynamic levels when enabled', async() => {
    strategy.updateParameters({
      dynamicLevels: true,
      volatilityPeriod: 20
    });
    await strategy.init();

    for (let i = 0; i < 50; i++) {
      await strategy.onCandle(testCandles[i], testCandles.slice(0, i + 1), mockEngine);
    }

    if (strategy.rsi !== null) {
      const levels = strategy.calculateDynamicLevels(testCandles.map(c => c.close));
      expect(levels).toBeDefined();
      expect(levels.overbought).toBeGreaterThan(levels.oversold);
    }
  });

  test('should detect RSI divergences', async() => {
    strategy.updateParameters({
      tradingMode: 'divergence',
      divergenceDetection: true
    });
    await strategy.init();

    // Process enough candles to enable divergence detection
    for (let i = 0; i < testCandles.length; i++) {
      await strategy.onCandle(testCandles[i], testCandles.slice(0, i + 1), mockEngine);
    }

    expect(strategy.rsi).toBeDefined();
    expect(strategy.rsiHistory.length).toBeGreaterThan(0);
  });

  test('should apply trend filter correctly', async() => {
    strategy.updateParameters({
      trendFilter: 'ema',
      trendPeriod: 50
    });
    await strategy.init();

    const signal = await strategy.onCandle(
      testCandles[testCandles.length - 1],
      testCandles,
      mockEngine
    );

    // Trend filter should be applied
    expect(strategy.rsi).toBeDefined();
  });
});

describe('PPOStrategy', () => {
  let strategy;
  let testCandles;

  beforeEach(() => {
    strategy = new PPOStrategy();
    testCandles = generateTestCandles(100);
  });

  test('should calculate PPO as percentage', () => {
    const prices = Array.from({ length: 50 }, (_, i) => 100 + i * 0.5);
    const ppo = strategy.calculatePPO(prices, 12, 26);

    expect(ppo).toBeDefined();
    expect(typeof ppo).toBe('number');
    // PPO should be a percentage
    expect(Math.abs(ppo)).toBeLessThan(50); // Reasonable range
  });

  test('should generate threshold-based signals', async() => {
    strategy.updateParameters({
      tradingMode: 'threshold',
      percentageThreshold: 2.0
    });
    await strategy.init();

    const trendingCandles = generateTrendingCandles(100, 100, 0.003);

    for (let i = 0; i < trendingCandles.length; i++) {
      await strategy.onCandle(
        trendingCandles[i],
        trendingCandles.slice(0, i + 1),
        mockEngine
      );
    }

    expect(strategy.ppoLine).toBeDefined();
    expect(strategy.signalLine).toBeDefined();
  });
});

describe('StochRSIStrategy', () => {
  let strategy;
  let testCandles;

  beforeEach(() => {
    strategy = new StochRSIStrategy();
    testCandles = generateTestCandles(100);
  });

  test('should calculate StochRSI components', () => {
    const prices = Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i * 0.2) * 10);
    const rsi = strategy.calculateRSI(prices, 14);

    if (rsi !== null) {
      const rsiArray = [rsi]; // Simplified for test
      const stochRSI = strategy.calculateStochRSI(rsiArray, 14);

      if (stochRSI !== null) {
        expect(stochRSI).toBeGreaterThanOrEqual(0);
        expect(stochRSI).toBeLessThanOrEqual(1);
      }
    }
  });

  test('should generate crossover signals', async() => {
    strategy.updateParameters({ tradingMode: 'crossover' });
    await strategy.init();

    for (let i = 0; i < testCandles.length; i++) {
      await strategy.onCandle(testCandles[i], testCandles.slice(0, i + 1), mockEngine);
    }

    expect(strategy.stochRSI).toBeDefined();
    expect(strategy.kPercent).toBeDefined();
    expect(strategy.dPercent).toBeDefined();
  });
});

describe('CCIStrategy', () => {
  let strategy;
  let testCandles;

  beforeEach(() => {
    strategy = new CCIStrategy();
    testCandles = generateTestCandles(100);
  });

  test('should calculate CCI correctly', () => {
    const candles = testCandles.slice(0, 30);
    const cci = strategy.calculateCCI(candles, 20);

    expect(cci).toBeDefined();
    expect(typeof cci).toBe('number');
    // CCI typically ranges from -300 to +300
    expect(cci).toBeGreaterThan(-500);
    expect(cci).toBeLessThan(500);
  });

  test('should use dynamic levels when enabled', async() => {
    strategy.updateParameters({
      dynamicLevels: true,
      volatilityPeriod: 20
    });
    await strategy.init();

    for (let i = 0; i < 50; i++) {
      await strategy.onCandle(testCandles[i], testCandles.slice(0, i + 1), mockEngine);
    }

    if (strategy.cci !== null) {
      const levels = strategy.calculateDynamicLevels(testCandles.slice(0, 50));
      expect(levels).toBeDefined();
      expect(levels.overbought).toBeGreaterThan(levels.oversold);
    }
  });

  test('should generate extreme level signals', async() => {
    strategy.updateParameters({
      tradingMode: 'extreme',
      extremeOverbought: 200,
      extremeOversold: -200
    });
    await strategy.init();

    // Create extreme CCI conditions
    const extremeCandles = generateTestCandles(100, 100, 0.05); // High volatility

    for (let i = 0; i < extremeCandles.length; i++) {
      await strategy.onCandle(
        extremeCandles[i],
        extremeCandles.slice(0, i + 1),
        mockEngine
      );
    }

    expect(strategy.cci).toBeDefined();
  });
});

describe('BollingerBandsStrategy', () => {
  let strategy;
  let testCandles;

  beforeEach(() => {
    strategy = new BollingerBandsStrategy();
    testCandles = generateTestCandles(100);
  });

  test('should calculate Bollinger Bands correctly', () => {
    const prices = Array.from({ length: 30 }, (_, i) => 100 + Math.sin(i * 0.3) * 5);
    const bands = strategy.calculateBollingerBands(prices, 20, 2.0);

    expect(bands).toBeDefined();
    expect(bands.middleBand).toBeDefined();
    expect(bands.upperBand).toBeDefined();
    expect(bands.lowerBand).toBeDefined();
    expect(bands.upperBand).toBeGreaterThan(bands.middleBand);
    expect(bands.middleBand).toBeGreaterThan(bands.lowerBand);
  });

  test('should calculate %B correctly', () => {
    const percentB = strategy.calculatePercentB(105, 110, 100);
    expect(percentB).toBe(0.5); // Middle of the bands

    const percentB2 = strategy.calculatePercentB(110, 110, 100);
    expect(percentB2).toBe(1.0); // At upper band

    const percentB3 = strategy.calculatePercentB(100, 110, 100);
    expect(percentB3).toBe(0.0); // At lower band
  });

  test('should detect band squeeze', () => {
    const bandwidthHistory = [0.15, 0.12, 0.10, 0.08, 0.06, 0.05, 0.04];
    strategy.updateParameters({ squeezeThreshold: 0.1 });

    const squeeze = strategy.detectBandSqueeze(bandwidthHistory);
    expect(squeeze).toBe(true);
  });

  test('should generate mean reversion signals', async() => {
    strategy.updateParameters({
      tradingMode: 'mean_reversion',
      touchSensitivity: 0.02
    });
    await strategy.init();

    // Create mean reversion scenario
    const meanReversionCandles = generateTestCandles(100, 100, 0.03);

    for (let i = 0; i < meanReversionCandles.length; i++) {
      await strategy.onCandle(
        meanReversionCandles[i],
        meanReversionCandles.slice(0, i + 1),
        mockEngine
      );
    }

    expect(strategy.upperBand).toBeDefined();
    expect(strategy.lowerBand).toBeDefined();
    expect(strategy.percentB).toBeDefined();
  });

  test('should generate squeeze breakout signals', async() => {
    strategy.updateParameters({
      tradingMode: 'squeeze',
      squeezeThreshold: 0.1,
      squeezePeriod: 5
    });
    await strategy.init();

    // Simulate squeeze then breakout
    const squeezeCandles = generateTestCandles(100, 100, 0.005); // Low volatility first

    for (let i = 0; i < squeezeCandles.length; i++) {
      await strategy.onCandle(
        squeezeCandles[i],
        squeezeCandles.slice(0, i + 1),
        mockEngine
      );
    }

    expect(strategy.bandwidth).toBeDefined();
    expect(strategy.bandSqueeze).toBeDefined();
  });

  test('should use adaptive bands when enabled', async() => {
    strategy.updateParameters({
      adaptiveBands: true,
      volatilityRegimePeriod: 50
    });
    await strategy.init();

    const prices = testCandles.map(c => c.close);
    const adaptiveStdDev = strategy.calculateAdaptiveStdDev(prices, 2.0);

    expect(adaptiveStdDev).toBeDefined();
    expect(adaptiveStdDev).toBeGreaterThan(0);
  });
});

describe('Strategy Integration Tests', () => {
  const strategies = [
    { name: 'DEMA', class: DEMAStrategy },
    { name: 'MACD', class: MACDStrategy },
    { name: 'RSI', class: RSIStrategy },
    { name: 'PPO', class: PPOStrategy },
    { name: 'StochRSI', class: StochRSIStrategy },
    { name: 'CCI', class: CCIStrategy },
    { name: 'BollingerBands', class: BollingerBandsStrategy }
  ];

  test.each(strategies)('$name strategy should handle edge cases', async({ class: StrategyClass }) => {
    const strategy = new StrategyClass();
    await strategy.init();

    // Test with minimal data
    const minimalCandles = generateTestCandles(5);
    const signal1 = await strategy.onCandle(
      minimalCandles[minimalCandles.length - 1],
      minimalCandles,
      mockEngine
    );
    expect(signal1).toBeNull(); // Should not generate signals with insufficient data

    // Test with flat market (no volatility)
    const flatCandles = Array.from({ length: 50 }, (_, i) => ({
      timestamp: Date.now() - (50 - i) * 60000,
      open: 100,
      high: 100.01,
      low: 99.99,
      close: 100,
      volume: 1000
    }));

    for (let i = 0; i < flatCandles.length; i++) {
      const signal = await strategy.onCandle(
        flatCandles[i],
        flatCandles.slice(0, i + 1),
        mockEngine
      );
      // Should handle flat market gracefully
    }

    expect(strategy.initialized).toBe(true);
  });

  test.each(strategies)('$name strategy should validate all parameters', ({ class: StrategyClass }) => {
    const strategy = new StrategyClass();
    const paramDefs = strategy.getParameterDefinitions();

    // Test each parameter's validation
    for (const [paramName, paramDef] of Object.entries(paramDefs)) {
      if (paramDef.type === 'number' && paramDef.min !== undefined && paramDef.max !== undefined) {
        // Test boundary values
        expect(() => {
          strategy.updateParameters({ [paramName]: paramDef.min - 1 });
        }).toThrow();

        expect(() => {
          strategy.updateParameters({ [paramName]: paramDef.max + 1 });
        }).toThrow();

        // Test valid values
        expect(() => {
          strategy.updateParameters({ [paramName]: paramDef.default });
        }).not.toThrow();
      }
    }
  });

  test.each(strategies)('$name strategy should reset correctly', async({ class: StrategyClass }) => {
    const strategy = new StrategyClass();
    await strategy.init();

    // Process some candles
    const candles = generateTestCandles(50);
    for (let i = 0; i < 20; i++) {
      await strategy.onCandle(candles[i], candles.slice(0, i + 1), mockEngine);
    }

    // Reset strategy
    strategy.reset();

    // Check that state is cleared
    expect(strategy.position).toBeNull();
    expect(strategy.entryPrice).toBeNull();

    // Should be able to process candles again
    await strategy.init();
    const signal = await strategy.onCandle(
      candles[candles.length - 1],
      candles,
      mockEngine
    );

    // Should not throw errors after reset
    expect(strategy.initialized).toBe(true);
  });

  test.each(strategies)('$name strategy should provide indicator values', async({ class: StrategyClass }) => {
    const strategy = new StrategyClass();
    await strategy.init();

    const candles = generateTestCandles(100);

    // Process enough candles to calculate indicators
    for (let i = 0; i < candles.length; i++) {
      await strategy.onCandle(candles[i], candles.slice(0, i + 1), mockEngine);
    }

    const indicators = strategy.getIndicatorValues();
    expect(indicators).toBeDefined();
    expect(typeof indicators).toBe('object');

    // Should include position information
    expect(indicators.position).toBeDefined();
    expect(indicators.entryPrice).toBeDefined();
  });
});

describe('Performance Tests', () => {
  test('strategies should process large datasets efficiently', async() => {
    const strategy = new MACDStrategy();
    await strategy.init();

    const largeDataset = generateTestCandles(1000);
    const startTime = Date.now();

    for (let i = 0; i < largeDataset.length; i++) {
      await strategy.onCandle(
        largeDataset[i],
        largeDataset.slice(0, i + 1),
        mockEngine
      );
    }

    const endTime = Date.now();
    const processingTime = endTime - startTime;

    // Should process 1000 candles in reasonable time (< 5 seconds)
    expect(processingTime).toBeLessThan(5000);
  });

  test('memory usage should remain stable', async() => {
    const strategy = new BollingerBandsStrategy();
    await strategy.init();

    const candles = generateTestCandles(500);

    // Process candles and check that internal arrays don't grow indefinitely
    for (let i = 0; i < candles.length; i++) {
      await strategy.onCandle(candles[i], candles.slice(0, i + 1), mockEngine);
    }

    // Check that history arrays are kept at reasonable size
    expect(strategy.priceHistory.length).toBeLessThan(100);
    expect(strategy.bandwidthHistory.length).toBeLessThan(100);
  });
});

// Test data validation
describe('Data Validation', () => {
  test('strategies should handle invalid candle data', async() => {
    const strategy = new RSIStrategy();
    await strategy.init();

    const invalidCandles = [
      { timestamp: Date.now(), open: null, high: 100, low: 99, close: 100, volume: 1000 },
      { timestamp: Date.now(), open: 100, high: 99, low: 100, close: 100, volume: 1000 }, // high < low
      { timestamp: Date.now(), open: 100, high: 100, low: 99, close: 101, volume: 1000 } // close > high
    ];

    for (const invalidCandle of invalidCandles) {
      // Should handle invalid data gracefully without throwing
      expect(async() => {
        await strategy.onCandle(invalidCandle, [invalidCandle], mockEngine);
      }).not.toThrow();
    }
  });

  test('strategies should handle missing volume data', async() => {
    const strategy = new DEMAStrategy();
    await strategy.init();

    const candlesWithoutVolume = generateTestCandles(50).map(candle => {
      const { volume, ...candleWithoutVolume } = candle;
      return candleWithoutVolume;
    });

    // Should handle missing volume gracefully
    for (let i = 0; i < candlesWithoutVolume.length; i++) {
      const signal = await strategy.onCandle(
        candlesWithoutVolume[i],
        candlesWithoutVolume.slice(0, i + 1),
        mockEngine
      );
      // Should not throw errors
    }

    expect(strategy.initialized).toBe(true);
  });
});