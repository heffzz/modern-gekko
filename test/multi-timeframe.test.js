describe('MultiTimeframeManager', () => {
  let MultiTimeframeManager, TimeframeConverter;
  let manager;
  let mockStrategy;
  let mockCandleSource;

  beforeAll(async() => {
    const module = await import('../src/engine/multiTimeframe.js');
    MultiTimeframeManager = module.MultiTimeframeManager;
    TimeframeConverter = module.TimeframeConverter;
  });

  beforeEach(() => {
    manager = new MultiTimeframeManager();

    mockStrategy = {
      name: 'TestStrategy',
      onCandle: jest.fn(),
      onMultiTimeframeUpdate: jest.fn()
    };

    mockCandleSource = {
      on: jest.fn(),
      emit: jest.fn()
    };
  });

  describe('Timeframe Registration', () => {
    test('should register timeframe successfully', () => {
      manager.addTimeframe('1h', mockCandleSource);

      expect(manager.timeframes.has('1h')).toBe(true);
      expect(mockCandleSource.on).toHaveBeenCalledWith('candle', expect.any(Function));
    });

    test('should subscribe strategy to timeframe', () => {
      manager.addTimeframe('1h', mockCandleSource);
      manager.subscribeStrategy('strategy1', ['1h'], mockStrategy.onCandle);

      expect(manager.strategies.has('strategy1')).toBe(true);
      expect(manager.timeframes.get('1h').subscribers.has('strategy1')).toBe(true);
    });

    test('should subscribe multiple strategies to same timeframe', () => {
      const strategy2 = { name: 'Strategy2', onCandle: jest.fn() };

      manager.addTimeframe('1h', mockCandleSource);
      manager.subscribeStrategy('strategy1', ['1h'], mockStrategy.onCandle);
      manager.subscribeStrategy('strategy2', ['1h'], strategy2.onCandle);

      expect(manager.strategies.size).toBe(2);
      expect(manager.timeframes.get('1h').subscribers.size).toBe(2);
    });

    test('should throw error when registering same timeframe twice', () => {
      manager.addTimeframe('1h', mockCandleSource);

      expect(() => {
        manager.addTimeframe('1h', mockCandleSource);
      }).toThrow('Timeframe 1h already exists');
    });
  });

  describe('Strategy Management', () => {
    test('should unsubscribe strategy from timeframe', () => {
      manager.addTimeframe('1h', mockCandleSource);
      manager.subscribeStrategy('strategy1', ['1h'], mockStrategy.onCandle);
      manager.unsubscribeStrategy('strategy1', '1h');

      expect(manager.timeframes.get('1h').subscribers.has('strategy1')).toBe(false);
    });

    test('should remove strategy completely', () => {
      manager.addTimeframe('1h', mockCandleSource);
      manager.subscribeStrategy('strategy1', ['1h'], mockStrategy.onCandle);
      manager.unsubscribeStrategy('strategy1');

      expect(manager.strategies.has('strategy1')).toBe(false);
    });
  });

  describe('Candle Processing', () => {
    test('should process candle for correct timeframe', () => {
      manager.addTimeframe('1m', mockCandleSource);
      manager.addTimeframe('5m', mockCandleSource);
      manager.subscribeStrategy('strategy1', ['1m', '5m'], mockStrategy.onCandle);

      const candle = {
        timestamp: new Date('2023-01-01T10:05:00Z'),
        open: 100,
        high: 105,
        low: 95,
        close: 102,
        volume: 1000,
        timeframe: '1m'
      };

      manager.processCandle(candle);

      // Should call strategy for 1m timeframe
      expect(mockStrategy.onCandle).toHaveBeenCalledWith(candle, '1m');
    });

    test('should aggregate candles for higher timeframes', () => {
      manager.addTimeframe('1m', mockCandleSource);
      manager.addTimeframe('5m', mockCandleSource);
      manager.subscribeStrategy('strategy1', ['1m', '5m'], mockStrategy.onCandle);

      // Add 5 one-minute candles
      for (let i = 0; i < 5; i++) {
        const candle = {
          timestamp: new Date(`2023-01-01T10:0${i}:00Z`),
          open: 100 + i,
          high: 105 + i,
          low: 95 + i,
          close: 102 + i,
          volume: 1000,
          timeframe: '1m'
        };

        manager.processCandle(candle);
      }

      // Should have called onCandle 5 times for 1m and 1 time for 5m
      expect(mockStrategy.onCandle).toHaveBeenCalledTimes(6);

      // Check if 5m candle was created correctly
      const calls = mockStrategy.onCandle.mock.calls;
      const fiveMinCall = calls.find(call => call[1] === '5m');
      expect(fiveMinCall).toBeDefined();

      const fiveMinCandle = fiveMinCall[0];
      expect(fiveMinCandle.open).toBe(100); // First candle's open
      expect(fiveMinCandle.close).toBe(106); // Last candle's close
      expect(fiveMinCandle.high).toBe(109); // Highest high
      expect(fiveMinCandle.low).toBe(95); // Lowest low
      expect(fiveMinCandle.volume).toBe(5000); // Sum of volumes
    });
  });

  describe('Timeframe Synchronization', () => {
    test('should synchronize strategies when all timeframes updated', () => {
      manager.addTimeframe('1m', mockCandleSource);
      manager.addTimeframe('5m', mockCandleSource);
      manager.addTimeframe('1h', mockCandleSource);
      manager.subscribeStrategy('strategy1', ['1m', '5m', '1h'], mockStrategy.onCandle);

      // Process enough candles to trigger all timeframes
      for (let i = 0; i < 60; i++) {
        const candle = {
          timestamp: new Date(`2023-01-01T10:${i.toString().padStart(2, '0')}:00Z`),
          open: 100,
          high: 105,
          low: 95,
          close: 102,
          volume: 1000,
          timeframe: '1m'
        };

        manager.processCandle(candle);
      }

      // Should have called onMultiTimeframeUpdate
      expect(mockStrategy.onMultiTimeframeUpdate).toHaveBeenCalled();

      const updateCall = mockStrategy.onMultiTimeframeUpdate.mock.calls[0];
      const timeframeData = updateCall[0];

      expect(timeframeData).toHaveProperty('1m');
      expect(timeframeData).toHaveProperty('5m');
      expect(timeframeData).toHaveProperty('1h');
    });
  });

  describe('Timeframe Validation', () => {
    test('should validate supported timeframes', () => {
      expect(() => manager.addTimeframe('1m', mockCandleSource)).not.toThrow();
      expect(() => manager.addTimeframe('5m', mockCandleSource)).not.toThrow();
      expect(() => manager.addTimeframe('15m', mockCandleSource)).not.toThrow();
      expect(() => manager.addTimeframe('1h', mockCandleSource)).not.toThrow();
      expect(() => manager.addTimeframe('4h', mockCandleSource)).not.toThrow();
      expect(() => manager.addTimeframe('1d', mockCandleSource)).not.toThrow();
    });

    test('should reject invalid timeframes', () => {
      expect(() => manager.addTimeframe('2m', mockCandleSource)).toThrow('Unsupported timeframe: 2m');
      expect(() => manager.addTimeframe('invalid', mockCandleSource)).toThrow('Unsupported timeframe: invalid');
    });
  });

  describe('Latest Candles', () => {
    test('should return latest candles for all timeframes', () => {
      manager.addTimeframe('1m', mockCandleSource);
      manager.addTimeframe('5m', mockCandleSource);
      manager.subscribeStrategy('strategy1', ['1m', '5m'], mockStrategy.onCandle);

      // Process some candles
      for (let i = 0; i < 10; i++) {
        const candle = {
          timestamp: new Date(`2023-01-01T10:0${i}:00Z`),
          open: 100 + i,
          high: 105 + i,
          low: 95 + i,
          close: 102 + i,
          volume: 1000,
          timeframe: '1m'
        };

        manager.processCandle(candle);
      }

      const latestCandles = manager.getLatestCandles();

      expect(latestCandles).toHaveProperty('1m');
      expect(latestCandles).toHaveProperty('5m');
      expect(latestCandles['1m'].close).toBe(111); // Last 1m candle
      expect(latestCandles['5m'].close).toBe(106); // Last complete 5m candle
    });
  });
});

describe('TimeframeConverter', () => {
  let TimeframeConverter;
  let converter;

  beforeAll(async() => {
    const module = await import('../src/engine/multiTimeframe.js');
    TimeframeConverter = module.TimeframeConverter;
  });

  beforeEach(() => {
    converter = new TimeframeConverter();
  });

  describe('Timeframe Parsing', () => {
    test('should parse timeframe strings correctly', () => {
      expect(converter.parseTimeframe('1m')).toEqual({ value: 1, unit: 'm', minutes: 1 });
      expect(converter.parseTimeframe('5m')).toEqual({ value: 5, unit: 'm', minutes: 5 });
      expect(converter.parseTimeframe('1h')).toEqual({ value: 1, unit: 'h', minutes: 60 });
      expect(converter.parseTimeframe('4h')).toEqual({ value: 4, unit: 'h', minutes: 240 });
      expect(converter.parseTimeframe('1d')).toEqual({ value: 1, unit: 'd', minutes: 1440 });
    });

    test('should throw error for invalid timeframes', () => {
      expect(() => converter.parseTimeframe('invalid')).toThrow('Invalid timeframe format: invalid');
      expect(() => converter.parseTimeframe('0m')).toThrow('Invalid timeframe format: 0m');
    });
  });

  describe('Timeframe Conversion', () => {
    test('should check if timeframe can be converted', () => {
      expect(converter.canConvert('1m', '5m')).toBe(true);
      expect(converter.canConvert('1m', '1h')).toBe(true);
      expect(converter.canConvert('5m', '1h')).toBe(true);
      expect(converter.canConvert('1h', '4h')).toBe(true);
      expect(converter.canConvert('1h', '1d')).toBe(true);

      expect(converter.canConvert('5m', '1m')).toBe(false); // Can't go to smaller timeframe
      expect(converter.canConvert('1m', '3m')).toBe(false); // 3m is not evenly divisible
      expect(converter.canConvert('5m', '7m')).toBe(false); // 7m is not evenly divisible
    });
  });

  describe('Candle Aggregation', () => {
    test('should aggregate 1m candles to 5m', () => {
      const candles = [
        { timestamp: new Date('2023-01-01T10:00:00Z'), open: 100, high: 105, low: 95, close: 102, volume: 1000 },
        { timestamp: new Date('2023-01-01T10:01:00Z'), open: 102, high: 107, low: 98, close: 104, volume: 1200 },
        { timestamp: new Date('2023-01-01T10:02:00Z'), open: 104, high: 109, low: 101, close: 106, volume: 1100 },
        { timestamp: new Date('2023-01-01T10:03:00Z'), open: 106, high: 111, low: 103, close: 108, volume: 1300 },
        { timestamp: new Date('2023-01-01T10:04:00Z'), open: 108, high: 113, low: 105, close: 110, volume: 1400 }
      ];

      const result = converter.convertCandles(candles, '1m', '5m');

      expect(result).toHaveLength(1);

      const aggregated = result[0];
      expect(aggregated.open).toBe(100); // First candle's open
      expect(aggregated.close).toBe(110); // Last candle's close
      expect(aggregated.high).toBe(113); // Highest high
      expect(aggregated.low).toBe(95); // Lowest low
      expect(aggregated.volume).toBe(6000); // Sum of volumes
      expect(aggregated.timestamp).toEqual(new Date('2023-01-01T10:00:00Z')); // Start of period
    });

    test('should aggregate 1m candles to 1h', () => {
      const candles = [];

      // Create 60 one-minute candles
      for (let i = 0; i < 60; i++) {
        candles.push({
          timestamp: new Date(`2023-01-01T10:${i.toString().padStart(2, '0')}:00Z`),
          open: 100 + i,
          high: 105 + i,
          low: 95 + i,
          close: 102 + i,
          volume: 1000
        });
      }

      const result = converter.convertCandles(candles, '1m', '1h');

      expect(result).toHaveLength(1);

      const aggregated = result[0];
      expect(aggregated.open).toBe(100); // First candle's open
      expect(aggregated.close).toBe(161); // Last candle's close
      expect(aggregated.high).toBe(164); // Highest high (105 + 59)
      expect(aggregated.low).toBe(95); // Lowest low
      expect(aggregated.volume).toBe(60000); // Sum of volumes
    });

    test('should handle partial periods', () => {
      const candles = [
        { timestamp: new Date('2023-01-01T10:00:00Z'), open: 100, high: 105, low: 95, close: 102, volume: 1000 },
        { timestamp: new Date('2023-01-01T10:01:00Z'), open: 102, high: 107, low: 98, close: 104, volume: 1200 },
        { timestamp: new Date('2023-01-01T10:02:00Z'), open: 104, high: 109, low: 101, close: 106, volume: 1100 }
      ];

      const result = converter.convertCandles(candles, '1m', '5m');

      // Should not create incomplete 5m candle
      expect(result).toHaveLength(0);
    });

    test('should handle multiple complete periods', () => {
      const candles = [];

      // Create 12 one-minute candles (2 complete 5m periods + 2 incomplete)
      for (let i = 0; i < 12; i++) {
        candles.push({
          timestamp: new Date(`2023-01-01T10:${i.toString().padStart(2, '0')}:00Z`),
          open: 100 + i,
          high: 105 + i,
          low: 95 + i,
          close: 102 + i,
          volume: 1000
        });
      }

      const result = converter.convertCandles(candles, '1m', '5m');

      expect(result).toHaveLength(2);

      // First 5m candle
      expect(result[0].open).toBe(100);
      expect(result[0].close).toBe(106);
      expect(result[0].timestamp).toEqual(new Date('2023-01-01T10:00:00Z'));

      // Second 5m candle
      expect(result[1].open).toBe(105);
      expect(result[1].close).toBe(111);
      expect(result[1].timestamp).toEqual(new Date('2023-01-01T10:05:00Z'));
    });
  });

  describe('Period Alignment', () => {
    test('should align timestamps to period boundaries', () => {
      const timestamp = new Date('2023-01-01T10:03:30Z');

      expect(converter.alignToPeriod(timestamp, 5)).toEqual(new Date('2023-01-01T10:00:00Z'));
      expect(converter.alignToPeriod(timestamp, 60)).toEqual(new Date('2023-01-01T10:00:00Z'));
      expect(converter.alignToPeriod(timestamp, 1440)).toEqual(new Date('2023-01-01T00:00:00Z'));
    });

    test('should handle edge cases in alignment', () => {
      const timestamp = new Date('2023-01-01T00:00:00Z');

      expect(converter.alignToPeriod(timestamp, 5)).toEqual(new Date('2023-01-01T00:00:00Z'));
      expect(converter.alignToPeriod(timestamp, 60)).toEqual(new Date('2023-01-01T00:00:00Z'));
      expect(converter.alignToPeriod(timestamp, 1440)).toEqual(new Date('2023-01-01T00:00:00Z'));
    });
  });

  describe('Timeframe Relationships', () => {
    test('should calculate conversion ratio correctly', () => {
      expect(converter.getConversionRatio('1m', '5m')).toBe(5);
      expect(converter.getConversionRatio('1m', '1h')).toBe(60);
      expect(converter.getConversionRatio('5m', '1h')).toBe(12);
      expect(converter.getConversionRatio('1h', '4h')).toBe(4);
      expect(converter.getConversionRatio('1h', '1d')).toBe(24);
    });

    test('should throw error for invalid conversions', () => {
      expect(() => converter.getConversionRatio('5m', '1m')).toThrow('Cannot convert from higher to lower timeframe');
      expect(() => converter.getConversionRatio('3m', '7m')).toThrow('Target timeframe is not evenly divisible by source timeframe');
    });
  });

  describe('Candle Validation', () => {
    test('should validate candle data', () => {
      const validCandle = {
        timestamp: new Date(),
        open: 100,
        high: 105,
        low: 95,
        close: 102,
        volume: 1000
      };

      expect(() => converter.validateCandle(validCandle)).not.toThrow();
    });

    test('should reject invalid candle data', () => {
      const invalidCandles = [
        { timestamp: 'invalid', open: 100, high: 105, low: 95, close: 102, volume: 1000 },
        { timestamp: new Date(), open: 'invalid', high: 105, low: 95, close: 102, volume: 1000 },
        { timestamp: new Date(), open: 100, high: 95, low: 105, close: 102, volume: 1000 }, // high < low
        { timestamp: new Date(), open: 100, high: 105, low: 95, close: 110, volume: 1000 }, // close > high
        { timestamp: new Date(), open: 100, high: 105, low: 95, close: 90, volume: 1000 } // close < low
      ];

      invalidCandles.forEach(candle => {
        expect(() => converter.validateCandle(candle)).toThrow();
      });
    });
  });
});
