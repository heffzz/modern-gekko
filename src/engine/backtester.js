#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import path from 'path';
import { pathToFileURL } from 'url';
import fs from 'fs';
import CSVImporter from '../importers/csvImporter.js';
import { StrategyEngine } from './strategyEngine.js';
import { PortfolioSimulator } from './portfolioSimulator.js';



// CLI argument parsing
const argv = yargs(hideBin(process.argv))
  .option('data', {
    alias: 'd',
    type: 'string',
    description: 'Path to CSV data file',
    demandOption: true
  })
  .option('strategy', {
    alias: 's',
    type: 'string',
    description: 'Path to strategy file',
    demandOption: true
  })
  .option('start', {
    type: 'string',
    description: 'Start date (YYYY-MM-DD)',
    default: null
  })
  .option('end', {
    type: 'string',
    description: 'End date (YYYY-MM-DD)',
    default: null
  })
  .option('balance', {
    alias: 'b',
    type: 'number',
    description: 'Initial balance',
    default: 10000
  })
  .option('currency', {
    alias: 'c',
    type: 'string',
    description: 'Base currency',
    default: 'USD'
  })
  .option('asset', {
    alias: 'a',
    type: 'string',
    description: 'Trading asset',
    default: 'BTC'
  })
  .option('fee', {
    alias: 'f',
    type: 'number',
    description: 'Trading fee percentage',
    default: 0.1
  })
  .option('output', {
    alias: 'o',
    type: 'string',
    description: 'Output file for results (optional)'
  })
  .option('verbose', {
    alias: 'v',
    type: 'boolean',
    description: 'Verbose output',
    default: false
  })
  .help()
  .argv;

class Backtester {
  constructor(options = {}) {
    this.options = {
      initialBalance: 10000,
      currency: 'USD',
      asset: 'BTC',
      fee: 0.1,
      verbose: false,
      ...options
    };

    this.portfolio = new PortfolioSimulator({
      initialBalance: this.options.initialBalance,
      currency: this.options.currency,
      fee: this.options.fee
    });

    this.strategyEngine = new StrategyEngine();
    this.trades = [];
    this.equityCurve = [];
    this.candles = [];
  }

  async loadData(dataPath) {
    if (!fs.existsSync(dataPath)) {
      throw new Error(`Data file not found: ${dataPath}`);
    }

    // Load and parse data
    const importer = new CSVImporter();
    this.candles = await importer.importFromFile(dataPath);

    if (this.candles.length === 0) {
      throw new Error('No valid candles found in data file');
    }

    if (this.options.verbose) {
      console.error(`Loaded ${this.candles.length} candles`);
      console.error(`Date range: ${this.candles[0].timestamp} to ${this.candles[this.candles.length - 1].timestamp}`);
    }

    return this.candles;
  }

  async loadStrategy(strategyPath) {
    if (!fs.existsSync(strategyPath)) {
      throw new Error(`Strategy file not found: ${strategyPath}`);
    }

    // Import strategy module
    const resolvedPath = path.resolve(strategyPath);
    const strategyModule = await import(pathToFileURL(resolvedPath).href);
    const Strategy = strategyModule.default || strategyModule.Strategy;

    if (!Strategy) {
      throw new Error('Strategy file must export a default class or named Strategy class');
    }

    this.strategy = new Strategy();

    if (typeof this.strategy.onCandle !== 'function') {
      throw new Error('Strategy must implement onCandle method');
    }

    if (this.options.verbose) {
      console.error(`Loaded strategy: ${this.strategy.constructor.name}`);
    }

    return this.strategy;
  }

  filterDateRange(candles, startDate, endDate) {
    let filtered = candles;

    if (startDate) {
      const start = new Date(startDate).getTime();
      filtered = filtered.filter(candle => new Date(candle.timestamp).getTime() >= start);
    }

    if (endDate) {
      const end = new Date(endDate).getTime();
      filtered = filtered.filter(candle => new Date(candle.timestamp).getTime() <= end);
    }

    return filtered;
  }

  async run(dataPath, strategyPath, options = {}) {
    try {
      // Load data and strategy
      await this.loadData(dataPath);
      await this.loadStrategy(strategyPath);

      // Filter by date range if specified
      let candles = this.candles;
      if (options.startDate || options.endDate) {
        candles = this.filterDateRange(candles, options.startDate, options.endDate);
        if (this.options.verbose) {
          console.error(`Filtered to ${candles.length} candles`);
        }
      }

      if (candles.length === 0) {
        throw new Error('No candles in specified date range');
      }

      // Initialize strategy
      if (typeof this.strategy.init === 'function') {
        this.strategy.init({
          currency: this.options.currency,
          asset: this.options.asset
        });
      }

      // Run backtest
      for (let i = 0; i < candles.length; i++) {
        const candle = candles[i];
        const historicalCandles = candles.slice(0, i + 1);

        // Update strategy engine with current candle
        this.strategyEngine.updateCandle(candle, historicalCandles);

        // Get strategy advice
        const advice = await this.strategy.onCandle(candle, historicalCandles, this.strategyEngine);

        // Execute trades based on advice
        if (advice && advice.action) {
          const trade = this.executeTrade(advice, candle);
          if (trade) {
            this.trades.push(trade);
          }
        }

        // Record equity curve point
        const portfolioValue = this.portfolio.getTotalValue(candle.close);
        this.equityCurve.push({
          timestamp: candle.timestamp,
          value: portfolioValue,
          price: candle.close,
          balance: this.portfolio.balance,
          position: this.portfolio.position
        });
      }

      // Calculate final results
      const results = this.calculateResults();
      return results;

    } catch (error) {
      throw new Error(`Backtest failed: ${error.message}`);
    }
  }

  executeTrade(advice, candle) {
    const { action, amount, price } = advice;
    const tradePrice = price || candle.close;

    try {
      let trade = null;

      if (action === 'buy') {
        trade = this.portfolio.buy(amount || 'all', tradePrice, candle.timestamp);
      } else if (action === 'sell') {
        trade = this.portfolio.sell(amount || 'all', tradePrice, candle.timestamp);
      }

      if (trade && this.options.verbose) {
        console.error(`Trade executed: ${trade.action} ${trade.amount} at ${trade.price}`);
      }

      return trade;
    } catch (error) {
      if (this.options.verbose) {
        console.error(`Trade failed: ${error.message}`);
      }
      return null;
    }
  }

  calculateResults() {
    const finalValue = this.portfolio.getTotalValue(
      this.candles[this.candles.length - 1].close
    );

    const initialValue = this.options.initialBalance;
    const totalReturn = finalValue - initialValue;
    const roi = (totalReturn / initialValue) * 100;

    // Calculate max drawdown
    let maxValue = initialValue;
    let maxDrawdown = 0;

    for (const point of this.equityCurve) {
      if (point.value > maxValue) {
        maxValue = point.value;
      }
      const drawdown = ((maxValue - point.value) / maxValue) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    // Calculate win rate
    const profitableTrades = this.trades.filter(trade => trade.profit > 0);
    const winRate = this.trades.length > 0 ? (profitableTrades.length / this.trades.length) * 100 : 0;

    // Calculate Sharpe ratio (simplified)
    const returns = [];
    for (let i = 1; i < this.equityCurve.length; i++) {
      const prevValue = this.equityCurve[i - 1].value;
      const currentValue = this.equityCurve[i].value;
      returns.push((currentValue - prevValue) / prevValue);
    }

    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const returnStdDev = Math.sqrt(
      returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length
    );
    const sharpeRatio = returnStdDev > 0 ? avgReturn / returnStdDev : 0;

    return {
      summary: {
        initialBalance: initialValue,
        finalBalance: finalValue,
        totalReturn,
        roi,
        maxDrawdown,
        winRate,
        sharpeRatio: sharpeRatio * Math.sqrt(252), // Annualized
        totalTrades: this.trades.length,
        profitableTrades: profitableTrades.length,
        startDate: this.candles[0].timestamp,
        endDate: this.candles[this.candles.length - 1].timestamp
      },
      trades: this.trades,
      equityCurve: this.equityCurve,
      portfolio: {
        balance: this.portfolio.balance,
        position: this.portfolio.position,
        totalValue: finalValue
      }
    };
  }
}

// CLI execution
if (process.argv[1] && process.argv[1].endsWith('backtester.js')) {
  (async() => {
    try {
      console.error('Starting backtester...');
      const backtester = new Backtester({
        initialBalance: argv.balance,
        currency: argv.currency,
        asset: argv.asset,
        fee: argv.fee,
        verbose: argv.verbose
      });

      console.error('Running backtest...');
      const results = await backtester.run(argv.data, argv.strategy, {
        startDate: argv.start,
        endDate: argv.end
      });

      console.error('Generating output...');
      const output = JSON.stringify(results, null, 2);

      if (argv.output) {
        fs.writeFileSync(argv.output, output);
        if (argv.verbose) {
          console.error(`Results saved to ${argv.output}`);
        }
      }

      console.log(output);

    } catch (error) {
      console.error(`Error: ${error.message}`);
      console.error(error.stack);
      process.exit(1);
    }
  })();
}

export { Backtester };
