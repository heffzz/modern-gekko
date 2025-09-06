import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import winston from 'winston';
import { createServer } from 'http';
import { Server } from 'socket.io';
import healthRouter from './api/health.js';
import backtestRouter from './api/backtest.js';
import indicatorsRouter from './api/indicators.js';
import strategiesRouter from './api/strategies.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'modern-gekko' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:5173'],
    methods: ['GET', 'POST']
  }
});
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// API routes
app.use('/api/health', healthRouter);
app.use('/api/backtest', backtestRouter);
app.use('/api/indicators', indicatorsRouter);
app.use('/api/strategies', strategiesRouter);

// Serve static files from web build in production
if (process.env.NODE_ENV === 'production') {
  const webDistPath = path.join(__dirname, '..', 'web', 'dist');
  app.use(express.static(webDistPath));

  // Serve index.html for all non-API routes (SPA support)
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(webDistPath, 'index.html'));
    } else {
      res.status(404).json({ error: 'API endpoint not found' });
    }
  });
} else {
  // Development mode - just serve a simple message
  app.get('/', (req, res) => {
    res.json({
      message: 'Modern Gekko API Server',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      endpoints: {
        health: '/api/health',
        backtest: '/api/backtest'
      },
      frontend: 'Run `npm run dev` to start the frontend development server'
    });
  });
}

// Error handling middleware
app.use((err, req, res, _next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });

  // Handle backtest progress updates
  socket.on('subscribe-backtest', (backtestId) => {
    socket.join(`backtest-${backtestId}`);
  });
});

// Make io available to routes
app.set('io', io);

// Start server
server.listen(PORT, () => {
  logger.info(`Modern Gekko server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Live trading: ${process.env.LIVE === 'true' ? 'ENABLED' : 'DISABLED'}`);
});

export default app;
