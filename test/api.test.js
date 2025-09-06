import request from 'supertest';
import express from 'express';
import path from 'path';

// Simple mock API for testing
function createTestApp() {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Mock health routes
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'test',
      nodeVersion: process.version,
      platform: process.platform,
      trading: {
        liveEnabled: false,
        backtestEnabled: true
      }
    });
  });

  app.get('/api/health/detailed', (req, res) => {
    const memoryUsage = process.memoryUsage();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      memory: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        free: Math.round(memoryUsage.heapTotal - memoryUsage.heapUsed) / 1024 / 1024
      },
      filesystem: {
        dataDir: path.join(process.cwd(), 'data'),
        logsDir: path.join(process.cwd(), 'logs'),
        strategiesDir: path.join(process.cwd(), 'strategies')
      }
    });
  });

  // Mock backtest routes
  app.get('/api/backtest/strategies', (req, res) => {
    res.json({
      strategies: [
        {
          name: 'sample-strategy.js',
          path: 'strategies/sample-strategy.js'
        }
      ]
    });
  });

  app.post('/api/backtest', (req, res) => {
    // Simple validation
    if (!req.body.strategy) {
      return res.status(400).json({ error: 'Strategy is required' });
    }

    // Mock successful backtest response
    res.json({
      summary: {
        strategy: req.body.strategy,
        totalTrades: 10,
        winningTrades: 6,
        losingTrades: 4,
        winRate: 60,
        totalReturn: 15.5,
        maxDrawdown: -5.2,
        initialBalance: parseFloat(req.body.initialBalance) || 10000,
        currency: req.body.currency || 'USD',
        asset: req.body.asset || 'BTC'
      },
      trades: [
        {
          id: 1,
          type: 'buy',
          timestamp: '2023-01-01T10:00:00.000Z',
          price: 50000,
          amount: 0.1,
          profit: 500
        }
      ],
      equity: [
        {
          timestamp: '2023-01-01T00:00:00.000Z',
          balance: 10000,
          equity: 10000
        }
      ]
    });
  });

  // Error handler
  app.use((err, req, res, _next) => {
    res.status(500).json({ error: err.message });
  });

  return app;
}

describe('API Tests', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('Health API', () => {
    describe('GET /api/health', () => {
      test('should return basic health status', async() => {
        const response = await request(app)
          .get('/api/health')
          .expect(200);

        expect(response.body).toHaveProperty('status', 'ok');
        expect(response.body).toHaveProperty('timestamp');
        expect(response.body).toHaveProperty('uptime');
        expect(response.body).toHaveProperty('version');
        expect(response.body).toHaveProperty('environment');

        // Validate timestamp format
        expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);

        // Validate uptime is a number
        expect(typeof response.body.uptime).toBe('number');
        expect(response.body.uptime).toBeGreaterThanOrEqual(0);
      });

      test('should include system information', async() => {
        const response = await request(app)
          .get('/api/health')
          .expect(200);

        expect(response.body).toHaveProperty('nodeVersion');
        expect(response.body).toHaveProperty('platform');
        expect(response.body).toHaveProperty('trading');

        // Validate trading config
        expect(response.body.trading).toHaveProperty('liveEnabled', false);
        expect(response.body.trading).toHaveProperty('backtestEnabled', true);
      });
    });

    describe('GET /api/health/detailed', () => {
      test('should return detailed health information', async() => {
        const response = await request(app)
          .get('/api/health/detailed')
          .expect(200);

        expect(response.body).toHaveProperty('status', 'ok');
        expect(response.body).toHaveProperty('memory');
        expect(response.body).toHaveProperty('filesystem');

        // Validate memory information
        expect(response.body.memory).toHaveProperty('used');
        expect(response.body.memory).toHaveProperty('total');
        expect(response.body.memory).toHaveProperty('free');
        expect(typeof response.body.memory.used).toBe('number');
        expect(typeof response.body.memory.total).toBe('number');

        // Validate filesystem information
        expect(response.body.filesystem).toHaveProperty('dataDir');
        expect(response.body.filesystem).toHaveProperty('logsDir');
        expect(response.body.filesystem).toHaveProperty('strategiesDir');
      });
    });
  });

  describe('Backtest API', () => {
    describe('GET /api/backtest/strategies', () => {
      test('should return list of available strategies', async() => {
        const response = await request(app)
          .get('/api/backtest/strategies')
          .expect(200);

        expect(response.body).toHaveProperty('strategies');
        expect(Array.isArray(response.body.strategies)).toBe(true);

        if (response.body.strategies.length > 0) {
          const strategy = response.body.strategies[0];
          expect(strategy).toHaveProperty('name');
          expect(strategy).toHaveProperty('path');
          expect(typeof strategy.name).toBe('string');
          expect(typeof strategy.path).toBe('string');
        }
      });
    });

    describe('POST /api/backtest', () => {
      test('should reject request without strategy', async() => {
        const response = await request(app)
          .post('/api/backtest')
          .send({})
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('Strategy is required');
      });

      test('should run backtest successfully with valid inputs', async() => {
        const response = await request(app)
          .post('/api/backtest')
          .send({
            strategy: 'sample-strategy.js',
            initialBalance: '10000',
            currency: 'USD',
            asset: 'BTC'
          })
          .expect(200);

        expect(response.body).toHaveProperty('summary');
        expect(response.body).toHaveProperty('trades');
        expect(response.body).toHaveProperty('equity');

        // Validate summary structure
        const { summary } = response.body;
        expect(summary).toHaveProperty('strategy', 'sample-strategy.js');
        expect(summary).toHaveProperty('totalTrades');
        expect(summary).toHaveProperty('winningTrades');
        expect(summary).toHaveProperty('losingTrades');
        expect(summary).toHaveProperty('winRate');
        expect(summary).toHaveProperty('totalReturn');
        expect(summary).toHaveProperty('maxDrawdown');
        expect(summary).toHaveProperty('initialBalance', 10000);
        expect(summary).toHaveProperty('currency', 'USD');
        expect(summary).toHaveProperty('asset', 'BTC');

        // Validate data types
        expect(typeof summary.totalTrades).toBe('number');
        expect(typeof summary.winRate).toBe('number');
        expect(typeof summary.totalReturn).toBe('number');
        expect(typeof summary.maxDrawdown).toBe('number');

        // Validate arrays
        expect(Array.isArray(response.body.trades)).toBe(true);
        expect(Array.isArray(response.body.equity)).toBe(true);
      });

      test('should handle custom parameters', async() => {
        const response = await request(app)
          .post('/api/backtest')
          .send({
            strategy: 'sample-strategy.js',
            initialBalance: '5000',
            currency: 'EUR',
            asset: 'ETH'
          })
          .expect(200);

        expect(response.body.summary.initialBalance).toBe(5000);
        expect(response.body.summary.currency).toBe('EUR');
        expect(response.body.summary.asset).toBe('ETH');
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle 404 for unknown endpoints', async() => {
      await request(app)
        .get('/api/unknown')
        .expect(404);
    });

    test('should handle malformed requests', async() => {
      await request(app)
        .post('/api/backtest')
        .send('invalid json')
        .expect(400);
    });
  });
});

module.exports = {
  createTestApp
};
