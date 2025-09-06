import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';
import { PortfolioManager } from './portfolioManager.js';
import fs from 'fs/promises';
import path from 'path';

class AdvancedBacktester extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = {
      initialBalance: 10000,
      commission: 0.001, // 0.1%
      slippage: 0.0005, // 0.05%
      spread: 0.0002, // 0.02%
      latency: 100, // 100ms execution delay
      marketImpact: 0.0001, // 0.01% market impact
      enableRealisticExecution: true,
      enableWalkForward: false,
      walkForwardPeriods: 12,
      walkForwardOptimizationRatio: 0.7,
      enableMonteCarlo: false,
      monteCarloRuns: 1000,
      ...config
    };

    this.portfolio = new PortfolioManager(this.config);
    this.marketData = [];
    this.strategy = null;
    this.results = null;
    this.isRunning = false;

    this.executionEngine = new RealisticExecutionEngine(this.config);
    this.walkForwardAnalyzer = new WalkForwardAnalyzer(this.config);
    this.monteCarloAnalyzer = new MonteCarloAnalyzer(this.config);
  }

  /**
   * Load market data
   */
  async loadData(dataSource) {
    try {
      if (typeof dataSource === 'string') {
        // Load from file
        const data = await fs.readFile(dataSource, 'utf8');
        this.marketData = JSON.parse(data);
      } else if (Array.isArray(dataSource)) {
        // Use provided array
        this.marketData = dataSource;
      } else {
        throw new Error('Invalid data source');
      }

      // Validate and sort data
      this.validateMarketData();
      this.marketData.sort((a, b) => a.timestamp - b.timestamp);

      logger.info(`Loaded ${this.marketData.length} candles`);
      return this;

    } catch (error) {
      logger.error('Error loading market data:', error);
      throw error;
    }
  }

  /**
   * Set trading strategy
   */
  setStrategy(strategy) {
    this.strategy = strategy;
    return this;
  }

  /**
   * Run backtest
   */
  async run() {
    if (this.isRunning) {
      throw new Error('Backtest is already running');
    }

    if (!this.strategy) {
      throw new Error('No strategy set');
    }

    if (!this.marketData.length) {
      throw new Error('No market data loaded');
    }

    try {
      this.isRunning = true;
      this.emit('backtestStarted');

      logger.info('Starting advanced backtest...');

      // Initialize strategy
      if (this.strategy.initialize) {
        await this.strategy.initialize(this.config);
      }

      // Run different analysis types
      if (this.config.enableWalkForward) {
        this.results = await this.runWalkForwardAnalysis();
      } else if (this.config.enableMonteCarlo) {
        this.results = await this.runMonteCarloAnalysis();
      } else {
        this.results = await this.runStandardBacktest();
      }

      // Generate comprehensive report
      this.results.report = this.generateReport();

      logger.info('Backtest completed successfully');
      this.emit('backtestCompleted', this.results);

      return this.results;

    } catch (error) {
      logger.error('Backtest failed:', error);
      this.emit('backtestError', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Run standard backtest
   */
  async runStandardBacktest() {
    const startTime = Date.now();
    const portfolio = new PortfolioManager(this.config);

    // Initialize indicators if strategy has them
    if (this.strategy.indicators) {
      Object.values(this.strategy.indicators).forEach(indicator => {
        if (indicator.reset) indicator.reset();
      });
    }

    for (let i = 0; i < this.marketData.length; i++) {
      const candle = this.marketData[i];

      // Update portfolio with current prices
      portfolio.updatePositionPrices({ [candle.symbol || 'DEFAULT']: candle.close });

      // Get strategy signal
      const signal = await this.getStrategySignal(candle, i);

      if (signal) {
        // Apply realistic execution
        const executedSignal = this.config.enableRealisticExecution
          ? await this.executionEngine.executeSignal(signal, candle, this.marketData.slice(0, i + 1))
          : signal;

        if (executedSignal) {
          if (executedSignal.action === 'buy' || executedSignal.action === 'sell') {
            await portfolio.openPosition(executedSignal);
          } else if (executedSignal.action === 'close') {
            if (executedSignal.positionId) {
              await portfolio.closePosition(executedSignal.positionId, executedSignal.price);
            } else {
              // Close all positions
              const openPositions = portfolio.getOpenPositions();
              for (const position of openPositions) {
                await portfolio.closePosition(position.id, candle.close);
              }
            }
          }
        }
      }

      // Emit progress
      if (i % 100 === 0) {
        this.emit('progress', {
          processed: i + 1,
          total: this.marketData.length,
          percentage: ((i + 1) / this.marketData.length) * 100
        });
      }
    }

    // Close all remaining positions
    const openPositions = portfolio.getOpenPositions();
    const lastCandle = this.marketData[this.marketData.length - 1];
    for (const position of openPositions) {
      await portfolio.closePosition(position.id, lastCandle.close, 'backtest_end');
    }

    const endTime = Date.now();

    return {
      type: 'standard',
      portfolio: portfolio.getPortfolioSummary(),
      trades: portfolio.getTrades(),
      performance: portfolio.getPerformanceMetrics(),
      duration: endTime - startTime,
      dataPoints: this.marketData.length
    };
  }

  /**
   * Run walk-forward analysis
   */
  async runWalkForwardAnalysis() {
    return await this.walkForwardAnalyzer.analyze(
      this.marketData,
      this.strategy,
      this.getStrategySignal.bind(this)
    );
  }

  /**
   * Run Monte Carlo analysis
   */
  async runMonteCarloAnalysis() {
    return await this.monteCarloAnalyzer.analyze(
      this.marketData,
      this.strategy,
      this.getStrategySignal.bind(this)
    );
  }

  /**
   * Get strategy signal
   */
  async getStrategySignal(candle, index) {
    try {
      const context = {
        candle,
        index,
        history: this.marketData.slice(0, index + 1),
        portfolio: this.portfolio.getPortfolioSummary()
      };

      if (this.strategy.onCandle) {
        return await this.strategy.onCandle(context);
      } else if (this.strategy.update) {
        return await this.strategy.update(candle);
      }

      return null;
    } catch (error) {
      logger.error('Error getting strategy signal:', error);
      return null;
    }
  }

  /**
   * Validate market data
   */
  validateMarketData() {
    if (!Array.isArray(this.marketData) || this.marketData.length === 0) {
      throw new Error('Market data must be a non-empty array');
    }

    const requiredFields = ['timestamp', 'open', 'high', 'low', 'close', 'volume'];

    for (let i = 0; i < this.marketData.length; i++) {
      const candle = this.marketData[i];

      for (const field of requiredFields) {
        if (!(field in candle)) {
          throw new Error(`Missing field '${field}' in candle at index ${i}`);
        }
      }

      // Validate OHLC relationships
      if (candle.high < candle.low) {
        throw new Error(`Invalid OHLC: high < low at index ${i}`);
      }

      if (candle.high < candle.open || candle.high < candle.close) {
        throw new Error(`Invalid OHLC: high < open/close at index ${i}`);
      }

      if (candle.low > candle.open || candle.low > candle.close) {
        throw new Error(`Invalid OHLC: low > open/close at index ${i}`);
      }
    }
  }

  /**
   * Generate comprehensive report
   */
  generateReport() {
    if (!this.results) {
      throw new Error('No results available');
    }

    const report = {
      summary: this.generateSummaryReport(),
      performance: this.generatePerformanceReport(),
      risk: this.generateRiskReport(),
      trades: this.generateTradeReport(),
      charts: this.generateChartData()
    };

    return report;
  }

  /**
   * Generate summary report
   */
  generateSummaryReport() {
    const { portfolio, performance } = this.results;

    return {
      initialBalance: this.config.initialBalance,
      finalBalance: portfolio.balance,
      finalEquity: portfolio.equity,
      totalReturn: portfolio.totalPnL,
      totalReturnPercent: ((portfolio.equity - this.config.initialBalance) / this.config.initialBalance) * 100,
      totalTrades: performance.totalTrades,
      winningTrades: performance.winningTrades,
      losingTrades: performance.losingTrades,
      winRate: performance.winRate,
      profitFactor: performance.profitFactor,
      maxDrawdown: performance.maxDrawdown,
      maxDrawdownPercent: performance.maxDrawdownPercent,
      sharpeRatio: this.calculateSharpeRatio(),
      sortinoRatio: this.calculateSortinoRatio(),
      calmarRatio: this.calculateCalmarRatio()
    };
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport() {
    const trades = this.results.trades;

    if (trades.length === 0) {
      return { message: 'No trades executed' };
    }

    const profits = trades.filter(t => t.pnl > 0).map(t => t.pnl);
    const losses = trades.filter(t => t.pnl < 0).map(t => t.pnl);

    return {
      averageWin: profits.length > 0 ? profits.reduce((a, b) => a + b, 0) / profits.length : 0,
      averageLoss: losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / losses.length : 0,
      largestWin: profits.length > 0 ? Math.max(...profits) : 0,
      largestLoss: losses.length > 0 ? Math.min(...losses) : 0,
      averageTradeDuration: this.calculateAverageTradeDuration(trades),
      consecutiveWins: this.calculateConsecutiveWins(trades),
      consecutiveLosses: this.calculateConsecutiveLosses(trades),
      monthlyReturns: this.calculateMonthlyReturns(trades),
      yearlyReturns: this.calculateYearlyReturns(trades)
    };
  }

  /**
   * Generate risk report
   */
  generateRiskReport() {
    const { performance } = this.results;

    return {
      maxDrawdown: performance.maxDrawdown,
      maxDrawdownPercent: performance.maxDrawdownPercent,
      valueAtRisk: this.calculateVaR(),
      conditionalVaR: this.calculateCVaR(),
      beta: this.calculateBeta(),
      volatility: this.calculateVolatility(),
      downsideDeviation: this.calculateDownsideDeviation()
    };
  }

  /**
   * Generate trade report
   */
  generateTradeReport() {
    const trades = this.results.trades;

    return {
      totalTrades: trades.length,
      tradesBySymbol: this.groupTradesBySymbol(trades),
      tradesByStrategy: this.groupTradesByStrategy(trades),
      tradesByMonth: this.groupTradesByMonth(trades),
      holdingPeriodAnalysis: this.analyzeHoldingPeriods(trades)
    };
  }

  /**
   * Generate chart data
   */
  generateChartData() {
    return {
      equityCurve: this.results.performance.equityHistory,
      drawdownCurve: this.calculateDrawdownCurve(),
      monthlyReturns: this.calculateMonthlyReturnsChart(),
      tradeDistribution: this.calculateTradeDistribution()
    };
  }

  /**
   * Calculate Sharpe ratio
   */
  calculateSharpeRatio(riskFreeRate = 0.02) {
    const returns = this.calculateDailyReturns();
    if (returns.length === 0) return 0;

    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const stdDev = this.calculateStandardDeviation(returns);

    return stdDev > 0 ? (avgReturn - riskFreeRate / 252) / stdDev : 0;
  }

  /**
   * Calculate Sortino ratio
   */
  calculateSortinoRatio(targetReturn = 0) {
    const returns = this.calculateDailyReturns();
    if (returns.length === 0) return 0;

    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const downsideReturns = returns.filter(r => r < targetReturn);

    if (downsideReturns.length === 0) return Infinity;

    const downsideDeviation = Math.sqrt(
      downsideReturns.reduce((sum, r) => sum + Math.pow(r - targetReturn, 2), 0) / downsideReturns.length
    );

    return downsideDeviation > 0 ? (avgReturn - targetReturn) / downsideDeviation : 0;
  }

  /**
   * Calculate Calmar ratio
   */
  calculateCalmarRatio() {
    const totalReturn = ((this.results.portfolio.equity - this.config.initialBalance) / this.config.initialBalance);
    const maxDrawdownPercent = this.results.performance.maxDrawdownPercent / 100;

    return maxDrawdownPercent > 0 ? totalReturn / maxDrawdownPercent : 0;
  }

  /**
   * Calculate daily returns
   */
  calculateDailyReturns() {
    const equityHistory = this.results.performance.equityHistory;
    const returns = [];

    for (let i = 1; i < equityHistory.length; i++) {
      const prevEquity = equityHistory[i - 1].equity;
      const currentEquity = equityHistory[i].equity;
      const dailyReturn = (currentEquity - prevEquity) / prevEquity;
      returns.push(dailyReturn);
    }

    return returns;
  }

  /**
   * Calculate standard deviation
   */
  calculateStandardDeviation(values) {
    if (values.length === 0) return 0;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;

    return Math.sqrt(variance);
  }

  /**
   * Calculate Value at Risk (VaR)
   */
  calculateVaR(confidence = 0.05) {
    const returns = this.calculateDailyReturns();
    if (returns.length === 0) return 0;

    const sortedReturns = returns.sort((a, b) => a - b);
    const index = Math.floor(confidence * sortedReturns.length);

    return sortedReturns[index] || 0;
  }

  /**
   * Calculate Conditional Value at Risk (CVaR)
   */
  calculateCVaR(confidence = 0.05) {
    const returns = this.calculateDailyReturns();
    if (returns.length === 0) return 0;

    const sortedReturns = returns.sort((a, b) => a - b);
    const cutoffIndex = Math.floor(confidence * sortedReturns.length);
    const tailReturns = sortedReturns.slice(0, cutoffIndex);

    return tailReturns.length > 0 ? tailReturns.reduce((a, b) => a + b, 0) / tailReturns.length : 0;
  }

  /**
   * Calculate other metrics...
   */
  calculateBeta() {
    // Simplified beta calculation (would need market benchmark)
    return 1.0;
  }

  calculateVolatility() {
    const returns = this.calculateDailyReturns();
    return this.calculateStandardDeviation(returns) * Math.sqrt(252); // Annualized
  }

  calculateDownsideDeviation() {
    const returns = this.calculateDailyReturns();
    const negativeReturns = returns.filter(r => r < 0);
    return this.calculateStandardDeviation(negativeReturns);
  }

  calculateAverageTradeDuration(trades) {
    if (trades.length === 0) return 0;
    const totalDuration = trades.reduce((sum, trade) => sum + trade.duration, 0);
    return totalDuration / trades.length;
  }

  calculateConsecutiveWins(trades) {
    let maxConsecutive = 0;
    let current = 0;

    for (const trade of trades) {
      if (trade.pnl > 0) {
        current++;
        maxConsecutive = Math.max(maxConsecutive, current);
      } else {
        current = 0;
      }
    }

    return maxConsecutive;
  }

  calculateConsecutiveLosses(trades) {
    let maxConsecutive = 0;
    let current = 0;

    for (const trade of trades) {
      if (trade.pnl < 0) {
        current++;
        maxConsecutive = Math.max(maxConsecutive, current);
      } else {
        current = 0;
      }
    }

    return maxConsecutive;
  }

  calculateMonthlyReturns(trades) {
    const monthlyReturns = new Map();

    for (const trade of trades) {
      const month = new Date(trade.exitTime).toISOString().slice(0, 7);
      if (!monthlyReturns.has(month)) {
        monthlyReturns.set(month, 0);
      }
      monthlyReturns.set(month, monthlyReturns.get(month) + trade.pnl);
    }

    return Object.fromEntries(monthlyReturns);
  }

  calculateYearlyReturns(trades) {
    const yearlyReturns = new Map();

    for (const trade of trades) {
      const year = new Date(trade.exitTime).getFullYear().toString();
      if (!yearlyReturns.has(year)) {
        yearlyReturns.set(year, 0);
      }
      yearlyReturns.set(year, yearlyReturns.get(year) + trade.pnl);
    }

    return Object.fromEntries(yearlyReturns);
  }

  groupTradesBySymbol(trades) {
    const grouped = new Map();

    for (const trade of trades) {
      if (!grouped.has(trade.symbol)) {
        grouped.set(trade.symbol, []);
      }
      grouped.get(trade.symbol).push(trade);
    }

    return Object.fromEntries(grouped);
  }

  groupTradesByStrategy(trades) {
    const grouped = new Map();

    for (const trade of trades) {
      const strategy = trade.strategy || 'default';
      if (!grouped.has(strategy)) {
        grouped.set(strategy, []);
      }
      grouped.get(strategy).push(trade);
    }

    return Object.fromEntries(grouped);
  }

  groupTradesByMonth(trades) {
    const grouped = new Map();

    for (const trade of trades) {
      const month = new Date(trade.exitTime).toISOString().slice(0, 7);
      if (!grouped.has(month)) {
        grouped.set(month, []);
      }
      grouped.get(month).push(trade);
    }

    return Object.fromEntries(grouped);
  }

  analyzeHoldingPeriods(trades) {
    if (trades.length === 0) return {};

    const durations = trades.map(t => t.duration);
    durations.sort((a, b) => a - b);

    return {
      min: durations[0],
      max: durations[durations.length - 1],
      median: durations[Math.floor(durations.length / 2)],
      average: durations.reduce((a, b) => a + b, 0) / durations.length,
      percentiles: {
        p25: durations[Math.floor(durations.length * 0.25)],
        p75: durations[Math.floor(durations.length * 0.75)],
        p90: durations[Math.floor(durations.length * 0.90)]
      }
    };
  }

  calculateDrawdownCurve() {
    const equityHistory = this.results.performance.equityHistory;
    const drawdowns = [];
    let peak = equityHistory[0]?.equity || this.config.initialBalance;

    for (const point of equityHistory) {
      if (point.equity > peak) {
        peak = point.equity;
      }

      const drawdown = (peak - point.equity) / peak * 100;
      drawdowns.push({
        timestamp: point.timestamp,
        drawdown
      });
    }

    return drawdowns;
  }

  calculateMonthlyReturnsChart() {
    const monthlyReturns = this.calculateMonthlyReturns(this.results.trades);
    return Object.entries(monthlyReturns).map(([month, returns]) => ({
      month,
      returns,
      returnsPercent: (returns / this.config.initialBalance) * 100
    }));
  }

  calculateTradeDistribution() {
    const trades = this.results.trades;
    const bins = 20;
    const profits = trades.map(t => t.pnl);

    if (profits.length === 0) return [];

    const min = Math.min(...profits);
    const max = Math.max(...profits);
    const binSize = (max - min) / bins;

    const distribution = [];
    for (let i = 0; i < bins; i++) {
      const binStart = min + i * binSize;
      const binEnd = binStart + binSize;
      const count = profits.filter(p => p >= binStart && p < binEnd).length;

      distribution.push({
        range: `${binStart.toFixed(2)} to ${binEnd.toFixed(2)}`,
        count,
        percentage: (count / profits.length) * 100
      });
    }

    return distribution;
  }

  /**
   * Export results to file
   */
  async exportResults(filePath) {
    if (!this.results) {
      throw new Error('No results to export');
    }

    try {
      await fs.writeFile(filePath, JSON.stringify(this.results, null, 2));
      logger.info(`Results exported to ${filePath}`);
    } catch (error) {
      logger.error('Error exporting results:', error);
      throw error;
    }
  }
}

/**
 * Realistic execution engine
 */
class RealisticExecutionEngine {
  constructor(config) {
    this.config = config;
  }

  async executeSignal(signal, currentCandle, history) {
    // Apply latency delay
    if (this.config.latency > 0) {
      await new Promise(resolve => setTimeout(resolve, this.config.latency));
    }

    // Calculate realistic execution price
    const executionPrice = this.calculateExecutionPrice(signal, currentCandle);

    return {
      ...signal,
      price: executionPrice,
      originalPrice: signal.price,
      slippage: Math.abs(executionPrice - signal.price),
      executionTime: Date.now()
    };
  }

  calculateExecutionPrice(signal, candle) {
    let price = signal.price;

    // Apply spread
    if (signal.side === 'buy') {
      price += price * this.config.spread / 2;
    } else {
      price -= price * this.config.spread / 2;
    }

    // Apply slippage
    const slippageAmount = price * this.config.slippage;
    if (signal.side === 'buy') {
      price += slippageAmount;
    } else {
      price -= slippageAmount;
    }

    // Apply market impact
    const marketImpact = price * this.config.marketImpact;
    if (signal.side === 'buy') {
      price += marketImpact;
    } else {
      price -= marketImpact;
    }

    // Ensure price is within candle range
    price = Math.max(candle.low, Math.min(candle.high, price));

    return price;
  }
}

/**
 * Walk-forward analyzer
 */
class WalkForwardAnalyzer {
  constructor(config) {
    this.config = config;
  }

  async analyze(marketData, strategy, getSignalFn) {
    const periods = this.config.walkForwardPeriods;
    const optimizationRatio = this.config.walkForwardOptimizationRatio;

    const periodSize = Math.floor(marketData.length / periods);
    const optimizationSize = Math.floor(periodSize * optimizationRatio);
    const testSize = periodSize - optimizationSize;

    const results = [];

    for (let i = 0; i < periods; i++) {
      const startIndex = i * periodSize;
      const optimizationEnd = startIndex + optimizationSize;
      const testEnd = Math.min(startIndex + periodSize, marketData.length);

      const optimizationData = marketData.slice(startIndex, optimizationEnd);
      const testData = marketData.slice(optimizationEnd, testEnd);

      // Run optimization on optimization period
      const optimizedParams = await this.optimizeStrategy(strategy, optimizationData, getSignalFn);

      // Test on out-of-sample period
      const testResults = await this.testStrategy(strategy, testData, getSignalFn, optimizedParams);

      results.push({
        period: i + 1,
        optimizationPeriod: { start: startIndex, end: optimizationEnd },
        testPeriod: { start: optimizationEnd, end: testEnd },
        optimizedParams,
        testResults
      });
    }

    return {
      type: 'walk-forward',
      periods: results,
      summary: this.summarizeWalkForward(results)
    };
  }

  async optimizeStrategy(strategy, data, getSignalFn) {
    // Simplified optimization - in practice, this would use genetic algorithms or grid search
    return strategy.defaultParams || {};
  }

  async testStrategy(strategy, data, getSignalFn, params) {
    // Apply parameters to strategy
    if (strategy.setParams) {
      strategy.setParams(params);
    }

    // Run backtest on test data
    const backtester = new AdvancedBacktester(this.config);
    await backtester.loadData(data);
    backtester.setStrategy(strategy);

    return await backtester.runStandardBacktest();
  }

  summarizeWalkForward(results) {
    const testResults = results.map(r => r.testResults);

    return {
      totalPeriods: results.length,
      averageReturn: testResults.reduce((sum, r) => sum + r.portfolio.totalPnL, 0) / testResults.length,
      consistency: this.calculateConsistency(testResults),
      bestPeriod: this.findBestPeriod(results),
      worstPeriod: this.findWorstPeriod(results)
    };
  }

  calculateConsistency(results) {
    const returns = results.map(r => r.portfolio.totalPnL);
    const positiveReturns = returns.filter(r => r > 0).length;
    return positiveReturns / returns.length;
  }

  findBestPeriod(results) {
    return results.reduce((best, current) =>
      current.testResults.portfolio.totalPnL > best.testResults.portfolio.totalPnL ? current : best
    );
  }

  findWorstPeriod(results) {
    return results.reduce((worst, current) =>
      current.testResults.portfolio.totalPnL < worst.testResults.portfolio.totalPnL ? current : worst
    );
  }
}

/**
 * Monte Carlo analyzer
 */
class MonteCarloAnalyzer {
  constructor(config) {
    this.config = config;
  }

  async analyze(marketData, strategy, getSignalFn) {
    const runs = this.config.monteCarloRuns;
    const results = [];

    for (let i = 0; i < runs; i++) {
      // Randomize market data order (bootstrap)
      const randomizedData = this.bootstrapData(marketData);

      // Run backtest
      const backtester = new AdvancedBacktester(this.config);
      await backtester.loadData(randomizedData);
      backtester.setStrategy(strategy);

      const result = await backtester.runStandardBacktest();
      results.push(result);
    }

    return {
      type: 'monte-carlo',
      runs: results,
      summary: this.summarizeMonteCarlo(results)
    };
  }

  bootstrapData(data) {
    const bootstrapped = [];
    for (let i = 0; i < data.length; i++) {
      const randomIndex = Math.floor(Math.random() * data.length);
      bootstrapped.push({ ...data[randomIndex] });
    }
    return bootstrapped;
  }

  summarizeMonteCarlo(results) {
    const returns = results.map(r => r.portfolio.totalPnL);
    returns.sort((a, b) => a - b);

    return {
      totalRuns: results.length,
      averageReturn: returns.reduce((a, b) => a + b, 0) / returns.length,
      medianReturn: returns[Math.floor(returns.length / 2)],
      standardDeviation: this.calculateStandardDeviation(returns),
      percentiles: {
        p5: returns[Math.floor(returns.length * 0.05)],
        p25: returns[Math.floor(returns.length * 0.25)],
        p75: returns[Math.floor(returns.length * 0.75)],
        p95: returns[Math.floor(returns.length * 0.95)]
      },
      probabilityOfProfit: returns.filter(r => r > 0).length / returns.length
    };
  }

  calculateStandardDeviation(values) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }
}

export {
  AdvancedBacktester,
  RealisticExecutionEngine,
  WalkForwardAnalyzer,
  MonteCarloAnalyzer
};
