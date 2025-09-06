import { PaperTradingEngine } from '../src/engine/paperTrading.js';

describe('PaperTradingEngine', () => {
  let engine;
  let mockConfig;

  beforeEach(() => {
    mockConfig = {
      initialBalance: 10000,
      commission: 0.001,
      slippage: 0.0005,
      maxSlippage: 0.01,
      currency: 'USD'
    };

    engine = new PaperTradingEngine(mockConfig);
  });

  describe('Initialization', () => {
    test('should initialize with correct balance and settings', () => {
      expect(engine.portfolio.cash).toBe(10000);
      expect(engine.portfolio.totalValue).toBe(10000);
      expect(engine.config.commission).toBe(0.001);
      expect(engine.config.slippage).toBe(0.0005);
    });

    test('should have empty positions initially', () => {
      expect(engine.portfolio.positions.size).toBe(0);
      expect(engine.portfolio.totalPnL).toBe(0);
    });
  });

  describe('Market Orders', () => {
    test('should execute buy market order successfully', async() => {
      const order = {
        type: 'market',
        side: 'buy',
        symbol: 'BTC/USD',
        amount: 0.1,
        price: 50000
      };

      const result = await engine.executeOrder(order);

      expect(result.status).toBe('filled');
      expect(result.executedAmount).toBe(0.1);
      expect(result.executedPrice).toBeGreaterThan(50000); // Due to slippage

      // Check portfolio
      expect(engine.portfolio.positions.has('BTC/USD')).toBe(true);
      expect(engine.portfolio.positions.get('BTC/USD').amount).toBe(0.1);
      expect(engine.portfolio.cash).toBeLessThan(10000);
    });

    test('should execute sell market order successfully', async() => {
      // First buy some BTC
      await engine.executeOrder({
        type: 'market',
        side: 'buy',
        symbol: 'BTC/USD',
        amount: 0.1,
        price: 50000
      });

      // Then sell it
      const sellOrder = {
        type: 'market',
        side: 'sell',
        symbol: 'BTC/USD',
        amount: 0.05,
        price: 51000
      };

      const result = await engine.executeOrder(sellOrder);

      expect(result.status).toBe('filled');
      expect(result.executedAmount).toBe(0.05);
      expect(engine.portfolio.positions.get('BTC/USD').amount).toBe(0.05);
    });

    test('should reject sell order with insufficient position', async() => {
      const order = {
        type: 'market',
        side: 'sell',
        symbol: 'BTC/USD',
        amount: 0.1,
        price: 50000
      };

      const result = await engine.executeOrder(order);

      expect(result.status).toBe('rejected');
      expect(result.reason).toContain('Insufficient position');
    });

    test('should reject buy order with insufficient funds', async() => {
      const order = {
        type: 'market',
        side: 'buy',
        symbol: 'BTC/USD',
        amount: 1, // Too expensive
        price: 50000
      };

      const result = await engine.executeOrder(order);

      expect(result.status).toBe('rejected');
      expect(result.reason).toContain('Insufficient funds');
    });
  });

  describe('Limit Orders', () => {
    test('should place limit buy order', async() => {
      const order = {
        type: 'limit',
        side: 'buy',
        symbol: 'BTC/USD',
        amount: 0.1,
        price: 49000
      };

      const result = await engine.executeOrder(order);

      expect(result.status).toBe('pending');
      expect(engine.pendingOrders).toHaveLength(1);
      expect(engine.pendingOrders[0].price).toBe(49000);
    });

    test('should execute limit order when price is met', async() => {
      // Place limit buy order
      await engine.executeOrder({
        type: 'limit',
        side: 'buy',
        symbol: 'BTC/USD',
        amount: 0.1,
        price: 49000
      });

      // Update market price to trigger order
      await engine.updateMarketPrice('BTC/USD', 48500);

      expect(engine.pendingOrders).toHaveLength(0);
      expect(engine.portfolio.positions.has('BTC/USD')).toBe(true);
      expect(engine.portfolio.positions.get('BTC/USD').amount).toBe(0.1);
    });

    test('should not execute limit order when price is not met', async() => {
      // Place limit buy order
      await engine.executeOrder({
        type: 'limit',
        side: 'buy',
        symbol: 'BTC/USD',
        amount: 0.1,
        price: 49000
      });

      // Update market price but not enough to trigger
      await engine.updateMarketPrice('BTC/USD', 49500);

      expect(engine.pendingOrders).toHaveLength(1);
      expect(engine.portfolio.positions.has('BTC/USD')).toBe(false);
    });
  });

  describe('Stop Orders', () => {
    test('should place stop loss order', async() => {
      // First buy some BTC
      await engine.executeOrder({
        type: 'market',
        side: 'buy',
        symbol: 'BTC/USD',
        amount: 0.1,
        price: 50000
      });

      // Place stop loss
      const stopOrder = {
        type: 'stop',
        side: 'sell',
        symbol: 'BTC/USD',
        amount: 0.1,
        stopPrice: 48000
      };

      const result = await engine.executeOrder(stopOrder);

      expect(result.status).toBe('pending');
      expect(engine.pendingOrders).toHaveLength(1);
      expect(engine.pendingOrders[0].stopPrice).toBe(48000);
    });

    test('should trigger stop loss when price drops', async() => {
      // Buy BTC
      await engine.executeOrder({
        type: 'market',
        side: 'buy',
        symbol: 'BTC/USD',
        amount: 0.1,
        price: 50000
      });

      // Place stop loss
      await engine.executeOrder({
        type: 'stop',
        side: 'sell',
        symbol: 'BTC/USD',
        amount: 0.1,
        stopPrice: 48000
      });

      // Price drops to trigger stop
      await engine.updateMarketPrice('BTC/USD', 47500);

      expect(engine.pendingOrders).toHaveLength(0);
      expect(engine.portfolio.positions.has('BTC/USD')).toBe(false);
    });
  });

  describe('Portfolio Management', () => {
    test('should update portfolio value correctly', async() => {
      // Buy BTC
      await engine.executeOrder({
        type: 'market',
        side: 'buy',
        symbol: 'BTC/USD',
        amount: 0.1,
        price: 50000
      });

      const initialValue = engine.portfolio.totalValue;

      // Price increases
      await engine.updateMarketPrice('BTC/USD', 55000);
      engine.updatePortfolioValue();

      expect(engine.portfolio.totalValue).toBeGreaterThan(initialValue);
      expect(engine.portfolio.totalPnL).toBeGreaterThan(0);
    });

    test('should calculate unrealized PnL correctly', () => {
      engine.portfolio.positions.set('BTC/USD', {
        amount: 0.1,
        averagePrice: 50000,
        side: 'long'
      });

      engine.marketPrices['BTC/USD'] = 55000;

      const unrealizedPnL = engine.calculateUnrealizedPnL('BTC/USD');
      expect(unrealizedPnL).toBe(500); // (55000 - 50000) * 0.1
    });

    test('should track equity history', async() => {
      const initialEquity = engine.portfolio.totalValue;

      // Buy BTC
      await engine.executeOrder({
        type: 'market',
        side: 'buy',
        symbol: 'BTC/USD',
        amount: 0.1,
        price: 50000
      });

      expect(engine.equityHistory).toHaveLength(2); // Initial + after trade
      expect(engine.equityHistory[0].equity).toBe(initialEquity);
    });
  });

  describe('Performance Metrics', () => {
    test('should calculate max drawdown', () => {
      engine.equityHistory = [
        { timestamp: new Date(), equity: 10000 },
        { timestamp: new Date(), equity: 11000 },
        { timestamp: new Date(), equity: 9500 },
        { timestamp: new Date(), equity: 12000 },
        { timestamp: new Date(), equity: 8000 }
      ];

      const maxDrawdown = engine.calculateMaxDrawdown();
      expect(maxDrawdown.percent).toBeCloseTo(33.33, 1); // (12000 - 8000) / 12000 * 100
      expect(maxDrawdown.amount).toBe(4000);
    });

    test('should calculate win rate', () => {
      engine.tradeHistory = [
        { pnl: 100, status: 'closed' },
        { pnl: -50, status: 'closed' },
        { pnl: 200, status: 'closed' },
        { pnl: -30, status: 'closed' },
        { pnl: 150, status: 'closed' }
      ];

      const winRate = engine.calculateWinRate();
      expect(winRate).toBe(60); // 3 wins out of 5 trades
    });

    test('should calculate ROI', () => {
      engine.portfolio.totalValue = 12000;
      engine.config.initialBalance = 10000;

      const roi = engine.calculateROI();
      expect(roi).toBe(20); // (12000 - 10000) / 10000 * 100
    });
  });

  describe('Risk Management', () => {
    test('should set stop loss correctly', async() => {
      engine.start();

      // Buy BTC
      await engine.executeOrder({
        type: 'market',
        side: 'buy',
        symbol: 'BTC/USD',
        amount: 0.1,
        price: 50000
      });

      // Set stop loss at 5% below entry
      await engine.setStopLoss('BTC/USD', 0.05);

      expect(engine.pendingOrders).toHaveLength(1);
      expect(engine.pendingOrders[0].type).toBe('stop');
      expect(engine.pendingOrders[0].stopPrice).toBeCloseTo(47500, -1); // 50000 * 0.95
    });

    test('should set take profit correctly', async() => {
      engine.start();

      // Buy BTC
      await engine.executeOrder({
        type: 'market',
        side: 'buy',
        symbol: 'BTC/USD',
        amount: 0.1,
        price: 50000
      });

      // Set take profit at 10% above entry
      await engine.setTakeProfit('BTC/USD', 0.10);

      expect(engine.pendingOrders).toHaveLength(1);
      expect(engine.pendingOrders[0].type).toBe('limit');
      expect(engine.pendingOrders[0].price).toBeCloseTo(55000, -1); // 50000 * 1.10
    });

    test('should calculate position size based on risk', () => {
      // Start engine and add market data first
      engine.start();
      engine.updateMarketData('BTC/USD', {
        timestamp: Date.now(),
        open: 50000,
        high: 51000,
        low: 49000,
        close: 50000,
        volume: 1000
      });

      const expectedRisk = engine.portfolio.totalValue * 0.02; // $200
      const positionSize = engine.calculatePositionSize('BTC/USD', expectedRisk, 47500);

      const priceRisk = 50000 - 47500; // $2500 per BTC
      const expectedSize = expectedRisk / priceRisk; // 0.08 BTC

      expect(positionSize).toBeCloseTo(expectedSize, 4);
    });
  });

  describe('Order Management', () => {
    test('should cancel pending order', async() => {
      engine.start();
      // Add market data
      engine.updateMarketData('BTC/USD', {
        timestamp: Date.now(),
        open: 50000,
        high: 51000,
        low: 49000,
        close: 50000,
        volume: 1000
      });
      // Place limit order
      const result = await engine.placeOrder({
        type: 'limit',
        side: 'buy',
        symbol: 'BTC/USD',
        quantity: 0.1,
        price: 49000,
        stopLoss: 48000
      });

      expect(engine.pendingOrders).toHaveLength(1);

      // Cancel order
      const cancelled = await engine.cancelOrder(result);

      expect(cancelled).toBe(true);
      expect(engine.pendingOrders).toHaveLength(0);
    });

    test('should get order status', async() => {
      engine.start();
      // Add market data
      engine.updateMarketData('BTC/USD', {
        timestamp: Date.now(),
        open: 50000,
        high: 51000,
        low: 49000,
        close: 50000,
        volume: 1000
      });
      const result = await engine.placeOrder({
        type: 'limit',
        side: 'buy',
        symbol: 'BTC/USD',
        quantity: 0.1,
        price: 49000,
        stopLoss: 48000
      });

      const status = engine.getOrderStatus(result);

      expect(status.status).toBe('pending');
      expect(status.symbol).toBe('BTC/USD');
      expect(status.amount).toBe(0.1);
    });
  });

  describe('Commission and Slippage', () => {
    test('should apply commission correctly', () => {
      const cost = engine.calculateCommission(50000, 0.1);
      const expectedCommission = 50000 * 0.1 * 0.001; // $5

      expect(cost).toBe(expectedCommission);
    });

    test('should apply slippage correctly', () => {
      const slippedPrice = engine.applySlippage(50000, 'buy', 0.1);

      // Buy orders should have positive slippage (higher price)
      expect(slippedPrice).toBeGreaterThan(50000);
      expect(slippedPrice).toBeLessThanOrEqual(50000 * 1.01); // Max slippage
    });

    test('should apply different slippage for sell orders', () => {
      const slippedPrice = engine.applySlippage(50000, 'sell', 0.1);

      // Sell orders should have negative slippage (lower price)
      expect(slippedPrice).toBeLessThan(50000);
      expect(slippedPrice).toBeGreaterThanOrEqual(50000 * 0.99); // Max slippage
    });
  });

  describe('Portfolio Reset', () => {
    test('should reset portfolio to initial state', async() => {
      // Make some trades
      await engine.executeOrder({
        type: 'market',
        side: 'buy',
        symbol: 'BTC/USD',
        amount: 0.1,
        price: 50000
      });

      // Reset
      engine.reset();

      expect(engine.portfolio.cash).toBe(10000);
      expect(engine.portfolio.totalValue).toBe(10000);
      expect(engine.portfolio.positions.size).toBe(0);
      expect(engine.tradeHistory).toHaveLength(0);
      expect(engine.equityHistory).toHaveLength(1);
      expect(engine.pendingOrders).toHaveLength(0);
    });
  });
});
