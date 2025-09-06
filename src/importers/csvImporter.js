/**
 * CSV Importer for Historical Market Data
 *
 * This module handles importing and parsing CSV files containing
 * historical market data (OHLCV - Open, High, Low, Close, Volume).
 */

import fs from 'fs/promises';
import path from 'path';

export default class CSVImporter {
  constructor(options = {}) {
    this.options = {
      // CSV parsing options
      delimiter: options.delimiter || ',',
      hasHeader: options.hasHeader !== false, // Default to true
      skipEmptyLines: options.skipEmptyLines !== false,

      // Data validation
      validateData: options.validateData !== false,

      // Column mapping (0-based indices or column names)
      columns: options.columns || {
        timestamp: 0,
        open: 1,
        high: 2,
        low: 3,
        close: 4,
        volume: 5
      },

      // Date parsing
      dateFormat: options.dateFormat || 'auto', // 'auto', 'timestamp', 'iso', 'custom'
      customDateParser: options.customDateParser || null,

      // Data transformation
      transformers: options.transformers || {}
    };

    this.stats = {
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      errors: []
    };
  }

  /**
   * Import data from CSV file
   * @param {string} filePath - Path to CSV file
   * @returns {Promise<Array>} Array of candle data
   */
  async importFromFile(filePath) {
    try {
      const absolutePath = path.resolve(filePath);
      const content = await fs.readFile(absolutePath, 'utf-8');
      return this.parseCSV(content);
    } catch (error) {
      throw new Error(`Failed to read CSV file: ${error.message}`);
    }
  }

  /**
   * Import data from CSV string
   * @param {string} csvContent - CSV content as string
   * @returns {Array} Array of candle data
   */
  parseCSV(csvContent) {
    if (typeof csvContent !== 'string') {
      throw new Error('CSV content must be a string');
    }

    // Reset stats
    this.stats = {
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      errors: []
    };

    const lines = csvContent.split('\n');
    const candles = [];

    let startIndex = 0;
    let headers = null;

    // Handle header row
    if (this.options.hasHeader && lines.length > 0) {
      headers = this.parseLine(lines[0]);
      startIndex = 1;
    }

    // Process data rows
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip empty lines
      if (!line && this.options.skipEmptyLines) {
        continue;
      }

      this.stats.totalRows++;

      try {
        const candle = this.parseRow(line, headers, i + 1);
        if (candle) {
          candles.push(candle);
          this.stats.validRows++;
        }
      } catch (error) {
        this.stats.invalidRows++;
        this.stats.errors.push({
          row: i + 1,
          line,
          error: error.message
        });

        // Continue processing other rows
        continue;
      }
    }

    // Validate and sort data
    if (this.options.validateData) {
      this.validateCandles(candles);
    }

    // Sort by timestamp
    candles.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    return candles;
  }

  /**
   * Parse a single CSV line
   * @param {string} line - CSV line
   * @returns {Array} Array of values
   */
  parseLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === this.options.delimiter && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    values.push(current.trim());
    return values;
  }

  /**
   * Parse a single data row
   * @param {string} line - CSV line
   * @param {Array} headers - Header names (if available)
   * @param {number} rowNumber - Row number for error reporting
   * @returns {Object|null} Candle object or null
   */
  parseRow(line, headers, rowNumber) {
    if (!line.trim()) {
      return null;
    }

    const values = this.parseLine(line);

    if (values.length === 0) {
      return null;
    }

    const candle = {};

    // Extract values based on column mapping
    for (const [field, columnIndex] of Object.entries(this.options.columns)) {
      let value;

      if (typeof columnIndex === 'number') {
        // Index-based mapping
        value = values[columnIndex];
      } else if (typeof columnIndex === 'string' && headers) {
        // Name-based mapping
        const index = headers.indexOf(columnIndex);
        if (index === -1) {
          throw new Error(`Column '${columnIndex}' not found in headers`);
        }
        value = values[index];
      } else {
        throw new Error(`Invalid column mapping for field '${field}'`);
      }

      if (value === undefined || value === '') {
        throw new Error(`Missing value for field '${field}'`);
      }

      // Parse and transform value
      candle[field] = this.parseValue(field, value, rowNumber);
    }

    // Apply custom transformers
    for (const [field, transformer] of Object.entries(this.options.transformers)) {
      if (typeof transformer === 'function' && candle[field] !== undefined) {
        candle[field] = transformer(candle[field], candle, rowNumber);
      }
    }

    return candle;
  }

  /**
   * Parse and convert a field value
   * @param {string} field - Field name
   * @param {string} value - Raw value
   * @param {number} rowNumber - Row number for error reporting
   * @returns {*} Parsed value
   */
  parseValue(field, value, rowNumber) {
    if (field === 'timestamp') {
      return this.parseTimestamp(value, rowNumber);
    }

    // Parse numeric fields
    if (['open', 'high', 'low', 'close', 'volume'].includes(field)) {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) {
        throw new Error(`Invalid numeric value for ${field}: '${value}'`);
      }
      return numValue;
    }

    return value;
  }

  /**
   * Parse timestamp value
   * @param {string} value - Timestamp value
   * @param {number} rowNumber - Row number for error reporting
   * @returns {string} ISO timestamp string
   */
  parseTimestamp(value, _rowNumber) {
    let date;

    if (this.options.customDateParser) {
      date = this.options.customDateParser(value);
    } else {
      switch (this.options.dateFormat) {
      case 'timestamp': {
        // Unix timestamp (seconds or milliseconds)
        const timestamp = parseInt(value);
        if (isNaN(timestamp)) {
          throw new Error(`Invalid timestamp: '${value}'`);
        }
        // Detect if timestamp is in seconds or milliseconds
        date = new Date(timestamp < 1e10 ? timestamp * 1000 : timestamp);
        break;
      }

      case 'iso':
        date = new Date(value);
        break;

      case 'auto':
      default:
        // Try to auto-detect format
        if (/^\d+$/.test(value)) {
          // Looks like a timestamp
          const timestamp = parseInt(value);
          date = new Date(timestamp < 1e10 ? timestamp * 1000 : timestamp);
        } else {
          // Try parsing as date string
          date = new Date(value);
        }
        break;
      }
    }

    if (!date || isNaN(date.getTime())) {
      throw new Error(`Invalid date/timestamp: '${value}'`);
    }

    return date.toISOString();
  }

  /**
   * Validate candle data
   * @param {Array} candles - Array of candles
   */
  validateCandles(candles) {
    for (let i = 0; i < candles.length; i++) {
      const candle = candles[i];

      // Validate OHLC relationships
      if (candle.high < candle.low) {
        throw new Error(`Invalid OHLC data at index ${i}: high (${candle.high}) < low (${candle.low})`);
      }

      if (candle.high < candle.open || candle.high < candle.close) {
        throw new Error(`Invalid OHLC data at index ${i}: high (${candle.high}) < open/close`);
      }

      if (candle.low > candle.open || candle.low > candle.close) {
        throw new Error(`Invalid OHLC data at index ${i}: low (${candle.low}) > open/close`);
      }

      // Validate positive values
      if (candle.open <= 0 || candle.high <= 0 || candle.low <= 0 || candle.close <= 0) {
        throw new Error(`Invalid OHLC data at index ${i}: prices must be positive`);
      }

      if (candle.volume < 0) {
        throw new Error(`Invalid volume at index ${i}: volume must be non-negative`);
      }
    }
  }

  /**
   * Get import statistics
   * @returns {Object} Import statistics
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Export candles to CSV format
   * @param {Array} candles - Array of candle data
   * @param {Object} options - Export options
   * @returns {string} CSV content
   */
  static exportToCSV(candles, options = {}) {
    const opts = {
      includeHeader: options.includeHeader !== false,
      delimiter: options.delimiter || ',',
      dateFormat: options.dateFormat || 'iso', // 'iso', 'timestamp'
      precision: options.precision || 8
    };

    const lines = [];

    // Add header
    if (opts.includeHeader) {
      lines.push('timestamp,open,high,low,close,volume');
    }

    // Add data rows
    for (const candle of candles) {
      const timestamp = opts.dateFormat === 'timestamp'
        ? Math.floor(new Date(candle.timestamp).getTime() / 1000)
        : candle.timestamp;

      const row = [
        timestamp,
        candle.open.toFixed(opts.precision),
        candle.high.toFixed(opts.precision),
        candle.low.toFixed(opts.precision),
        candle.close.toFixed(opts.precision),
        candle.volume.toFixed(opts.precision)
      ].join(opts.delimiter);

      lines.push(row);
    }

    return lines.join('\n');
  }

  /**
   * Create sample CSV data for testing
   * @param {number} count - Number of candles to generate
   * @param {Object} options - Generation options
   * @returns {string} Sample CSV content
   */
  static generateSampleCSV(count = 100, options = {}) {
    const opts = {
      startPrice: options.startPrice || 50000,
      volatility: options.volatility || 0.02,
      trend: options.trend || 0,
      startDate: options.startDate || new Date('2023-01-01'),
      interval: options.interval || 3600000, // 1 hour in ms
      includeHeader: options.includeHeader !== false
    };

    const candles = [];
    let currentPrice = opts.startPrice;
    let currentDate = new Date(opts.startDate);

    for (let i = 0; i < count; i++) {
      // Generate price movement
      const change = (Math.random() - 0.5) * opts.volatility + opts.trend;
      const newPrice = currentPrice * (1 + change);

      // Generate OHLC
      const open = currentPrice;
      const close = newPrice;
      const high = Math.max(open, close) * (1 + Math.random() * 0.01);
      const low = Math.min(open, close) * (1 - Math.random() * 0.01);
      const volume = Math.random() * 1000 + 100;

      candles.push({
        timestamp: currentDate.toISOString(),
        open,
        high,
        low,
        close,
        volume
      });

      currentPrice = newPrice;
      currentDate = new Date(currentDate.getTime() + opts.interval);
    }

    return CSVImporter.exportToCSV(candles, { includeHeader: opts.includeHeader });
  }
}

// Named export for compatibility
export { CSVImporter };
