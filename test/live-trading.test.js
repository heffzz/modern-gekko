import { LiveTradingEngine } from '../src/engine/liveTrading.js';
import MockExchange from '../src/exchanges/mock.js';

describe('LiveTradingEngine', () => {
  let engine;
  let mockExchange;

  beforeEach(() => {
    mockExchange = new MockExchange();
    engine = new LiveTradingEngine(mockExchange, {
      maxPositions: 3,
      maxRiskPerTrade: 0.02,
      maxTotalRisk: 0.10,
      confirmationRequired: false // Disable for testing
    });
  });

  afterEach(async() => {
    try {
      if (engine.isLive) {
        await engine.stop();
      }

      // Force cleanup of any remaining intervals
      if (engine.heartbeatInterval) {
        clearInterval(engine.heartbeatInterval);
        engine.heartbeatInterval = null;
      }

      // Disconnect exchange
      if (mockExchange && mockExchange.connected) {
        await mockExchange.disconnect();
      }

      // Reset engine state
      engine.isLive = false;
      engine.emergencyStop = false;
      engine.isConfirmed = false;
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Initialization', () => {
    test('should initialize with correct configuration', () => {
      expect(engine.config.maxPositions).toBe(3);
      expect(engine.config.maxRiskPerTrade).toBe(0.02);
      expect(engine.config.maxTotalRisk).toBe(0.10);
      expect(engine.isLive).toBe(false);
      expect(engine.emergencyStop).toBe(false);
    });

    test('should initialize portfolio correctly', async() => {
      // Mock exchange responses
      mockExchange.balance = 10000;
      mockExchange.positions = [];
      mockExchange.openOrders = [];

      await engine.initialize();

      expect(engine.portfolio.balance).toBe(10000);
      expect(engine.portfolio.initialBalance).toBe(10000);
      expect(engine.portfolio.positions.size).toBe(0);
      expect(engine.portfolio.orders.size).toBe(0);
    });

    test('should load existing positions and orders', async() => {
      const mockPositions = [
        { symbol: 'BTC/USD', quantity: 0.1, avgPrice: 50000 },
        { symbol: 'ETH/USD', quantity: 1.0, avgPrice: 3000 }
      ];

      const mockOrders = [
        { id: 'order1', symbol: 'BTC/USD', side: 'buy', quantity: 0.05, type: 'limit', price: 49000 }
      ];

      mockExchange.balance = 5000;
      mockExchange.positions = mockPositions;
      mockExchange.openOrders = mockOrders;

      await engine.initialize();

      expect(engine.portfolio.positions.size).toBe(2);
      expect(engine.portfolio.orders.size).toBe(1);
      expect(engine.portfolio.positions.get('BTC/USD').quantity).toBe(0.1);
    });
  });

  describe('Live Trading Confirmation', () => {
    test('should require confirmation for live trading', async() => {
      const engineWithConfirmation = new LiveTradingEngine(mockExchange, {
        confirmationRequired: true
      });

      await expect(engineWithConfirmation.start()).rejects.toThrow('Live trading must be confirmed');
    });

    test('should allow trading after confirmation', async() => {
      // Set environment variable for confirmation
      process.env.LIVE_TRADING_CONFIRMED = 'true';

      const engineWithConfirmation = new LiveTradingEngine(mockExchange, {
        confirmationRequired: true
      });

      mockExchange.balance = 10000;
      mockExchange.positions = [];
      mockExchange.openOrders = [];

      await engineWithConfirmation.confirmLiveTrading();
      expect(engineWithConfirmation.isConfirmed).toBe(true);

      await engineWithConfirmation.start();
      expect(engineWithConfirmation.isLive).toBe(true);

      await engineWithConfirmation.stop();

      // Clean up
      delete process.env.LIVE_TRADING_CONFIRMED;
    });
  });

  describe('Order Management', () => {
    beforeEach(async() => {
      mockExchange.balance = 10000;
      mockExchange.positions = [];
      mockExchange.openOrders = [];

      await mockExchange.connect();
      engine.isConfirmed = true;
      await engine.start();
    });

    test('should place market order successfully', async() => {
      const orderParams = {
        symbol: 'BTC/USD',
        side: 'buy',
        quantity: 0.1,
        type: 'market',
        stopLoss: 48000
      };

      const order = await engine.placeOrder(orderParams);

      expect(order).toBeDefined();
      expect(order.symbol).toBe('BTC/USD');
      expect(order.side).toBe('buy');
      expect(order.quantity).toBe(0.1);
      expect(order.type).toBe('market');
      expect(order.status).toBe('pending');
    });

    test('should place limit order successfully', async() => {
      const orderParams = {
        symbol: 'BTC/USD',
        side: 'buy',
        quantity: 0.1,
        type: 'limit',
        price: 49000,
        stopLoss: 48000
      };

      const order = await engine.placeOrder(orderParams);

      expect(order).toBeDefined();
      expect(order.price).toBe(49000);
      expect(order.type).toBe('limit');
    });

    test('should reject invalid orders', async() => {
      const invalidOrder = {
        symbol: 'BTC/USD',
        side: 'buy'
        // Missing quantity and type
      };

      await expect(engine.placeOrder(invalidOrder)).rejects.toThrow();
    });

    test('should cancel order successfully', async() => {
      const orderParams = {
        symbol: 'BTC/USD',
        side: 'buy',
        quantity: 0.1,
        type: 'limit',
        price: 49000,
        stopLoss: 48000
      };

      const order = await engine.placeOrder(orderParams);
      const cancelledOrder = await engine.cancelOrder(order.id);

      expect(cancelledOrder.status).toBe('cancelled');
    });
  });

  describe('Risk Management', () => {
    beforeEach(async() => {
      mockExchange.balance = 10000;
      mockExchange.positions = [];
      mockExchange.openOrders = [];

      await mockExchange.connect();
      engine.isConfirmed = true;
      await engine.start();
    });

    test('should enforce maximum position limit', async() => {
      // Place maximum allowed positions
      for (let i = 0; i < engine.config.maxPositions; i++) {
        const orderParams = {
          symbol: `SYMBOL${i}/USD`,
          side: 'buy',
          quantity: 0.1,
          type: 'market',
          stopLoss: 48000
        };

        await engine.placeOrder(orderParams);

        // Simulate order execution
        engine.portfolio.positions.set(`SYMBOL${i}/USD`, {
          quantity: 0.1,
          avgPrice: 50000
        });
      }

      // Try to place one more order
      const extraOrder = {
        symbol: 'EXTRA/USD',
        side: 'buy',
        quantity: 0.1,
        type: 'market'
      };

      await expect(engine.placeOrder(extraOrder)).rejects.toThrow('Maximum positions limit reached');
    });

    test('should enforce risk per trade limit', async() => {
      const largeOrder = {
        symbol: 'BTC/USD',
        side: 'buy',
        quantity: 10, // Very large quantity
        type: 'market',
        price: 50000, // Add estimated price for market order
        stopLoss: 48000
      };

      await expect(engine.placeOrder(largeOrder)).rejects.toThrow();
    });

    test('should trigger emergency stop on excessive losses', async() => {
      // Simulate large loss
      engine.portfolio.balance = 1000; // 90% loss from 10000
      engine.checkEmergencyConditions();

      expect(engine.emergencyStop).toBe(true);
    });

    test('should prevent trading when emergency stop is active', async() => {
      engine.emergencyStop = true;

      const orderParams = {
        symbol: 'BTC/USD',
        side: 'buy',
        quantity: 0.1,
        type: 'market',
        stopLoss: 48000
      };

      await expect(engine.placeOrder(orderParams)).rejects.toThrow('Emergency stop is active');
    });
  });

  describe('Portfolio Management', () => {
    beforeEach(async() => {
      mockExchange.balance = 10000;
      mockExchange.positions = [];
      mockExchange.openOrders = [];

      await mockExchange.connect();
      engine.isConfirmed = true;
      await engine.start();
    });

    test('should calculate portfolio value correctly', () => {
      engine.portfolio.balance = 5000;
      engine.portfolio.positions.set('BTC/USD', {
        quantity: 0.1,
        avgPrice: 50000
      });

      // Mock current price
      engine.setMarketPrice('BTC/USD', 55000);

      const portfolioValue = engine.calculatePortfolioValue();
      const expectedValue = 5000 + (0.1 * 55000); // Cash + position value

      expect(portfolioValue).toBe(expectedValue);
    });

    test('should calculate unrealized PnL correctly', () => {
      engine.portfolio.positions.set('BTC/USD', {
        quantity: 0.1,
        avgPrice: 50000
      });

      engine.setMarketPrice('BTC/USD', 55000);

      const unrealizedPnL = engine.calculateUnrealizedPnL();
      const expectedPnL = 0.1 * (55000 - 50000); // Quantity * (current - average)

      expect(unrealizedPnL).toBe(expectedPnL);
    });

    test('should track performance metrics', () => {
      const initialBalance = engine.portfolio.balance;

      // Simulate some trades
      engine.portfolio.trades.push(
        { pnl: 100, timestamp: new Date() },
        { pnl: -50, timestamp: new Date() },
        { pnl: 200, timestamp: new Date() }
      );

      const performance = engine.getPerformanceMetrics();

      expect(performance.totalTrades).toBe(3);
      expect(performance.totalPnL).toBe(250);
      expect(performance.winRate).toBe(2 / 3); // 2 winning trades out of 3
    });
  });

  describe('Market Data', () => {
    test('should handle market price updates', () => {
      const symbol = 'BTC/USD';
      const price = 50000;

      engine.setMarketPrice(symbol, price);

      expect(engine.getMarketPrice(symbol)).toBe(price);
    });

    test('should emit price update events', (done) => {
      const symbol = 'BTC/USD';
      const price = 50000;

      engine.on('priceUpdate', (data) => {
        expect(data.symbol).toBe(symbol);
        expect(data.price).toBe(price);
        done();
      });

      engine.setMarketPrice(symbol, price);
    });
  });

  describe('Safety Mechanisms', () => {
    beforeEach(async() => {
      mockExchange.balance = 10000;
      mockExchange.positions = [];
      mockExchange.openOrders = [];

      await mockExchange.connect();
      engine.isConfirmed = true;
      await engine.start();
    });

    test('should maintain heartbeat when active', (done) => {
      expect(engine.heartbeatInterval).toBeDefined();

      setTimeout(() => {
        const timeSinceLastHeartbeat = Date.now() - engine.lastHeartbeat.getTime();
        expect(timeSinceLastHeartbeat).toBeLessThan(2000); // Should be recent
        done();
      }, 1100);
    });

    test('should stop heartbeat when stopped', async() => {
      await engine.stop();
      expect(engine.heartbeatInterval).toBeNull();
    });

    test('should cancel all orders when stopping', async() => {
      // Place some orders
      await engine.placeOrder({
        symbol: 'BTC/USD',
        side: 'buy',
        quantity: 0.1,
        type: 'limit',
        price: 49000,
        stopLoss: 48000
      });

      await engine.placeOrder({
        symbol: 'ETH/USD',
        side: 'buy',
        quantity: 1.0,
        type: 'limit',
        price: 2900,
        stopLoss: 2800
      });

      await engine.stop();

      // Check that all orders were cancelled
      const pendingOrders = Array.from(engine.portfolio.orders.values())
        .filter(order => order.status === 'pending');

      expect(pendingOrders.length).toBe(0);
    });
  });
});
