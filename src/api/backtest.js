import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import winston from 'winston';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { Backtester } from '../engine/backtester.js';
import csvImporter from '../importers/csvImporter.js';
import { info, error, warn } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Configure additional logger for backtest
const backtestLogger = winston.createLogger({
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
        return res.status(400).json({ 
          success: false,
          error: 'CSV file is required' 
        });
      }

      if (!strategy) {
        return res.status(400).json({ 
          success: false,
          error: 'Strategy is required' 
        });
      }

    const csvFilePath = req.file.path;
    const strategyPath = path.join(__dirname, '..', '..', 'strategies', `${strategy}.js`);

    // Check if strategy file exists
    if (!fs.existsSync(strategyPath)) {
      // Clean up uploaded file
      fs.unlinkSync(csvFilePath);
      return res.status(400).json({ 
        success: false,
        error: `Strategy '${strategy}' not found` 
      });
    }

    backtestLogger.info('Starting backtest', {
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

    const cwd = path.join(__dirname, '..', '..');
    const fullCommand = `node "${backtesterPath}" ${args.join(' ')}`;
    
    backtestLogger.info('Executing command', { command: fullCommand, cwd });

    try {
      const result = execSync(fullCommand, {
        cwd,
        encoding: 'utf8',
        maxBuffer: 1024 * 1024 // 1MB buffer
      });
      
      backtestLogger.info('Command executed successfully', { outputLength: result.length });
      
      // Clean up uploaded file
      try {
        fs.unlinkSync(csvFilePath);
      } catch (error) {
        backtestLogger.warn('Failed to clean up uploaded file:', error.message);
      }

      try {
        // Find the JSON part (starts with { and ends with })
        const jsonStart = result.indexOf('{');
        const jsonEnd = result.lastIndexOf('}') + 1;
        
        if (jsonStart === -1 || jsonEnd === 0) {
          throw new Error('No JSON found in output');
        }
        
        const jsonString = result.substring(jsonStart, jsonEnd);
        const parsedResult = JSON.parse(jsonString);
        backtestLogger.info('Backtest completed successfully');
        res.json({
          success: true,
          data: {
            ...parsedResult,
            metadata: {
              strategy,
              csvFile: req.file.originalname,
              startDate,
              endDate,
              initialBalance,
              timestamp: new Date().toISOString()
            }
          }
        });
      } catch (parseError) {
         backtestLogger.error('Failed to parse backtest result:', parseError.message);
        backtestLogger.error(`Raw output length: ${result.length}`);
        backtestLogger.error(`Raw output first 500 chars: ${result.substring(0, 500)}`);
        backtestLogger.error(`Raw output last 500 chars: ${result.substring(Math.max(0, result.length - 500))}`);
         res.status(500).json({ 
           success: false, 
           error: 'Failed to parse backtest result',
           parseError: parseError.message,
           rawOutput: result.substring(0, 1000) // Limit output size
         });
      }
    } catch (execError) {
      backtestLogger.error('Command execution failed', { error: execError.message });
      
      // Clean up uploaded file
      try {
        fs.unlinkSync(csvFilePath);
      } catch (error) {
        backtestLogger.warn('Failed to clean up uploaded file:', error.message);
      }
      
      res.status(500).json({
        success: false,
        error: 'Backtest execution failed',
        details: execError.message
      });
    }



  } catch (error) {
    backtestLogger.error('Backtest API error:', error.message);
    res.status(500).json({
      success: false,
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
      return res.json({ 
        success: true,
        data: [] 
      });
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

    res.json({ 
      success: true,
      data: files 
    });
  } catch (error) {
    backtestLogger.error('Failed to list strategies:', error.message);
    res.status(500).json({
      success: false,
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
