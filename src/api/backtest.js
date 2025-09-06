import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import winston from 'winston';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', '..', 'temp');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// POST /api/backtest - Run backtest with uploaded CSV
router.post('/', upload.single('csvFile'), async(req, res) => {
  try {
    const { strategy, startDate, endDate, initialBalance } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'CSV file is required' });
    }

    if (!strategy) {
      return res.status(400).json({ error: 'Strategy is required' });
    }

    const csvFilePath = req.file.path;
    const strategyPath = path.join(__dirname, '..', '..', 'strategies', `${strategy}.js`);

    // Check if strategy file exists
    if (!fs.existsSync(strategyPath)) {
      // Clean up uploaded file
      fs.unlinkSync(csvFilePath);
      return res.status(400).json({ error: `Strategy '${strategy}' not found` });
    }

    logger.info('Starting backtest', {
      csvFile: req.file.originalname,
      strategy,
      startDate,
      endDate,
      initialBalance
    });

    // Run backtester CLI
    const backtesterPath = path.join(__dirname, '..', 'engine', 'backtester.js');
    const args = ['--data', csvFilePath, '--strategy', strategyPath];

    if (startDate) args.push('--start', startDate);
    if (endDate) args.push('--end', endDate);
    if (initialBalance) args.push('--balance', initialBalance);

    const backtestProcess = spawn('node', [backtesterPath, ...args], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    backtestProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    backtestProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    backtestProcess.on('close', (code) => {
      // Clean up uploaded file
      try {
        fs.unlinkSync(csvFilePath);
      } catch (error) {
        logger.warn('Failed to clean up uploaded file:', error.message);
      }

      if (code === 0) {
        try {
          const result = JSON.parse(stdout);
          logger.info('Backtest completed successfully');
          res.json({
            success: true,
            result,
            metadata: {
              strategy,
              csvFile: req.file.originalname,
              startDate,
              endDate,
              initialBalance,
              timestamp: new Date().toISOString()
            }
          });
        } catch (parseError) {
          logger.error('Failed to parse backtest result:', parseError.message);
          res.status(500).json({
            error: 'Failed to parse backtest result',
            stdout,
            stderr
          });
        }
      } else {
        logger.error('Backtest failed', { code, stderr });
        res.status(500).json({
          error: 'Backtest execution failed',
          code,
          stderr,
          stdout
        });
      }
    });

    backtestProcess.on('error', (error) => {
      logger.error('Failed to start backtest process:', error.message);

      // Clean up uploaded file
      try {
        fs.unlinkSync(csvFilePath);
      } catch (cleanupError) {
        logger.warn('Failed to clean up uploaded file:', cleanupError.message);
      }

      res.status(500).json({
        error: 'Failed to start backtest process',
        message: error.message
      });
    });

  } catch (error) {
    logger.error('Backtest API error:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// GET /api/backtest/strategies - List available strategies
router.get('/strategies', (req, res) => {
  try {
    const strategiesDir = path.join(__dirname, '..', '..', 'strategies');

    if (!fs.existsSync(strategiesDir)) {
      return res.json({ strategies: [] });
    }

    const files = fs.readdirSync(strategiesDir)
      .filter(file => file.endsWith('.js'))
      .map(file => {
        const name = path.basename(file, '.js');
        const filePath = path.join(strategiesDir, file);
        const stats = fs.statSync(filePath);

        return {
          name,
          filename: file,
          modified: stats.mtime.toISOString(),
          size: stats.size
        };
      });

    res.json({ strategies: files });
  } catch (error) {
    logger.error('Failed to list strategies:', error.message);
    res.status(500).json({
      error: 'Failed to list strategies',
      message: error.message
    });
  }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
  }

  if (error.message === 'Only CSV files are allowed') {
    return res.status(400).json({ error: error.message });
  }

  next(error);
});

export default router;
