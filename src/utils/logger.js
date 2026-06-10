import winston from 'winston';
import path from 'path';

// Create logs directory if it doesn't exist
import fs from 'fs';
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Define console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'gekko-trading-bot' },
  transports: [
    // Write all logs with level 'error' and below to error.log
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Write all logs with level 'info' and below to combined.log
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ],
  // Handle exceptions
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log')
    })
  ],
  // Handle rejections
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log')
    })
  ]
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// Add console transport for test environment with minimal output
if (process.env.NODE_ENV === 'test') {
  logger.clear(); // Remove all transports for test
  logger.add(new winston.transports.Console({
    level: 'error', // Only show errors in test
    format: winston.format.simple()
  }));
}

// Create child loggers for different modules
const createModuleLogger = (module) => {
  return logger.child({ module });
};

// Export logger and utilities
export { logger, createModuleLogger };

// Convenience methods
const info = (message, meta = {}) => logger.info(message, meta);
const error = (message, meta = {}) => logger.error(message, meta);
const warn = (message, meta = {}) => logger.warn(message, meta);
const debug = (message, meta = {}) => logger.debug(message, meta);

// These can be used for specific logging contexts

const trade = (message, tradeData = {}) => {
  logger.info(message, { context: 'trade', ...tradeData });
};

const strategy = (message, strategyData = {}) => {
  logger.info(message, { context: 'strategy', ...strategyData });
};

const backtest = (message, backtestData = {}) => {
  logger.info(message, { context: 'backtest', ...backtestData });
};

const performance = (message, performanceData = {}) => {
  logger.info(message, { context: 'performance', ...performanceData });
};

const api = (message, apiData = {}) => {
  logger.info(message, { context: 'api', ...apiData });
};

const exchange = (message, exchangeData = {}) => {
  logger.info(message, { context: 'exchange', ...exchangeData });
};

export { trade, strategy, backtest, performance, api, exchange, info, error, warn, debug };
