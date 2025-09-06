import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';
import { AdvancedBacktester } from './advancedBacktester.js';

class StrategyOptimizer extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = {
      populationSize: 50,
      generations: 100,
      mutationRate: 0.1,
      crossoverRate: 0.8,
      elitismRate: 0.1,
      fitnessFunction: 'sharpe', // 'profit', 'sharpe', 'calmar', 'custom'
      convergenceThreshold: 0.001,
      maxStagnantGenerations: 20,
      parallelEvaluations: 4,
      ...config
    };

    this.population = [];
    this.bestIndividual = null;
    this.generationHistory = [];
    this.isRunning = false;

    this.geneticAlgorithm = new GeneticAlgorithm(this.config);
    this.gridSearchOptimizer = new GridSearchOptimizer(this.config);
    this.bayesianOptimizer = new BayesianOptimizer(this.config);
  }

  /**
   * Optimize strategy parameters
   */
  async optimize(strategy, marketData, parameterSpace, method = 'genetic') {
    if (this.isRunning) {
      throw new Error('Optimization is already running');
    }

    try {
      this.isRunning = true;
      this.emit('optimizationStarted');

      logger.info(`Starting ${method} optimization...`);

      let result;
      switch (method) {
      case 'genetic':
        result = await this.runGeneticOptimization(strategy, marketData, parameterSpace);
        break;
      case 'grid':
        result = await this.runGridSearch(strategy, marketData, parameterSpace);
        break;
      case 'bayesian':
        result = await this.runBayesianOptimization(strategy, marketData, parameterSpace);
        break;
      case 'random':
        result = await this.runRandomSearch(strategy, marketData, parameterSpace);
        break;
      default:
        throw new Error(`Unknown optimization method: ${method}`);
      }

      logger.info('Optimization completed successfully');
      this.emit('optimizationCompleted', result);

      return result;

    } catch (error) {
      logger.error('Optimization failed:', error);
      this.emit('optimizationError', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Run genetic algorithm optimization
   */
  async runGeneticOptimization(strategy, marketData, parameterSpace) {
    return await this.geneticAlgorithm.optimize(
      strategy,
      marketData,
      parameterSpace,
      this.evaluateIndividual.bind(this)
    );
  }

  /**
   * Run grid search optimization
   */
  async runGridSearch(strategy, marketData, parameterSpace) {
    return await this.gridSearchOptimizer.optimize(
      strategy,
      marketData,
      parameterSpace,
      this.evaluateIndividual.bind(this)
    );
  }

  /**
   * Run Bayesian optimization
   */
  async runBayesianOptimization(strategy, marketData, parameterSpace) {
    return await this.bayesianOptimizer.optimize(
      strategy,
      marketData,
      parameterSpace,
      this.evaluateIndividual.bind(this)
    );
  }

  /**
   * Run random search optimization
   */
  async runRandomSearch(strategy, marketData, parameterSpace, iterations = 1000) {
    const results = [];

    for (let i = 0; i < iterations; i++) {
      const parameters = this.generateRandomParameters(parameterSpace);
      const fitness = await this.evaluateIndividual(strategy, marketData, parameters);

      results.push({
        parameters,
        fitness,
        iteration: i + 1
      });

      this.emit('evaluationCompleted', {
        iteration: i + 1,
        total: iterations,
        parameters,
        fitness
      });
    }

    // Find best result
    const bestResult = results.reduce((best, current) =>
      current.fitness > best.fitness ? current : best
    );

    return {
      method: 'random',
      bestParameters: bestResult.parameters,
      bestFitness: bestResult.fitness,
      iterations,
      allResults: results,
      convergenceHistory: results.map(r => r.fitness)
    };
  }

  /**
   * Evaluate individual (parameter set)
   */
  async evaluateIndividual(strategy, marketData, parameters) {
    try {
      // Create strategy copy with parameters
      const strategyInstance = this.createStrategyInstance(strategy, parameters);

      // Run backtest
      const backtester = new AdvancedBacktester({
        initialBalance: 10000,
        commission: 0.001,
        slippage: 0.0005
      });

      await backtester.loadData(marketData);
      backtester.setStrategy(strategyInstance);

      const results = await backtester.run();

      // Calculate fitness based on configured function
      const fitness = this.calculateFitness(results);

      return fitness;

    } catch (error) {
      logger.error('Error evaluating individual:', error);
      return -Infinity; // Penalize invalid parameter sets
    }
  }

  /**
   * Create strategy instance with parameters
   */
  createStrategyInstance(strategy, parameters) {
    // Clone strategy
    const strategyInstance = Object.create(Object.getPrototypeOf(strategy));
    Object.assign(strategyInstance, strategy);

    // Apply parameters
    if (strategyInstance.setParameters) {
      strategyInstance.setParameters(parameters);
    } else {
      // Direct parameter assignment
      Object.assign(strategyInstance, parameters);
    }

    // Reset indicators if present
    if (strategyInstance.indicators) {
      Object.values(strategyInstance.indicators).forEach(indicator => {
        if (indicator.reset) indicator.reset();
      });
    }

    return strategyInstance;
  }

  /**
   * Calculate fitness score
   */
  calculateFitness(results) {
    const { portfolio, performance } = results;

    switch (this.config.fitnessFunction) {
    case 'profit':
      return portfolio.totalPnL;

    case 'sharpe':
      return this.calculateSharpeRatio(results);

    case 'calmar':
      return this.calculateCalmarRatio(results);

    case 'sortino':
      return this.calculateSortinoRatio(results);

    case 'profit_factor':
      return performance.profitFactor;

    case 'win_rate':
      return performance.winRate;

    case 'custom':
      return this.calculateCustomFitness(results);

    default:
      return portfolio.totalPnL;
    }
  }

  /**
   * Calculate Sharpe ratio
   */
  calculateSharpeRatio(results, riskFreeRate = 0.02) {
    const returns = this.calculateReturns(results.performance.equityHistory);
    if (returns.length === 0) return 0;

    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const stdDev = this.calculateStandardDeviation(returns);

    return stdDev > 0 ? (avgReturn - riskFreeRate / 252) / stdDev : 0;
  }

  /**
   * Calculate Calmar ratio
   */
  calculateCalmarRatio(results) {
    const totalReturn = results.portfolio.totalPnL / results.portfolio.balance;
    const maxDrawdownPercent = results.performance.maxDrawdownPercent / 100;

    return maxDrawdownPercent > 0 ? totalReturn / maxDrawdownPercent : 0;
  }

  /**
   * Calculate Sortino ratio
   */
  calculateSortinoRatio(results, targetReturn = 0) {
    const returns = this.calculateReturns(results.performance.equityHistory);
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
   * Calculate custom fitness function
   */
  calculateCustomFitness(results) {
    const { portfolio, performance } = results;

    // Multi-objective fitness combining profit, drawdown, and win rate
    const profitScore = portfolio.totalPnL / 10000; // Normalize by initial balance
    const drawdownPenalty = performance.maxDrawdownPercent / 100;
    const winRateBonus = performance.winRate / 100;
    const tradeCountPenalty = performance.totalTrades < 10 ? 0.5 : 1; // Penalize too few trades

    return (profitScore + winRateBonus - drawdownPenalty) * tradeCountPenalty;
  }

  /**
   * Calculate returns from equity history
   */
  calculateReturns(equityHistory) {
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
   * Generate random parameters
   */
  generateRandomParameters(parameterSpace) {
    const parameters = {};

    for (const [name, space] of Object.entries(parameterSpace)) {
      if (space.type === 'integer') {
        parameters[name] = Math.floor(Math.random() * (space.max - space.min + 1)) + space.min;
      } else if (space.type === 'float') {
        parameters[name] = Math.random() * (space.max - space.min) + space.min;
      } else if (space.type === 'choice') {
        parameters[name] = space.choices[Math.floor(Math.random() * space.choices.length)];
      } else if (space.type === 'boolean') {
        parameters[name] = Math.random() < 0.5;
      }
    }

    return parameters;
  }

  /**
   * Stop optimization
   */
  stop() {
    if (this.isRunning) {
      this.isRunning = false;
      this.emit('optimizationStopped');
      logger.info('Optimization stopped by user');
    }
  }
}

/**
 * Genetic Algorithm implementation
 */
class GeneticAlgorithm {
  constructor(config) {
    this.config = config;
  }

  async optimize(strategy, marketData, parameterSpace, evaluationFn) {
    // Initialize population
    let population = this.initializePopulation(parameterSpace);

    const generationHistory = [];
    let bestIndividual = null;
    let stagnantGenerations = 0;

    for (let generation = 0; generation < this.config.generations; generation++) {
      // Evaluate population
      const evaluatedPopulation = await this.evaluatePopulation(
        population, strategy, marketData, evaluationFn
      );

      // Sort by fitness
      evaluatedPopulation.sort((a, b) => b.fitness - a.fitness);

      // Track best individual
      const currentBest = evaluatedPopulation[0];
      if (!bestIndividual || currentBest.fitness > bestIndividual.fitness) {
        bestIndividual = { ...currentBest };
        stagnantGenerations = 0;
      } else {
        stagnantGenerations++;
      }

      // Record generation statistics
      const stats = this.calculateGenerationStats(evaluatedPopulation);
      generationHistory.push({
        generation,
        bestFitness: currentBest.fitness,
        averageFitness: stats.average,
        worstFitness: stats.worst,
        diversity: stats.diversity
      });

      // Check convergence
      if (this.checkConvergence(generationHistory) ||
          stagnantGenerations >= this.config.maxStagnantGenerations) {
        logger.info(`Optimization converged at generation ${generation}`);
        break;
      }

      // Create next generation
      population = this.createNextGeneration(evaluatedPopulation, parameterSpace);

      // Emit progress
      this.emit('generationCompleted', {
        generation,
        bestFitness: currentBest.fitness,
        averageFitness: stats.average,
        bestParameters: currentBest.parameters
      });
    }

    return {
      method: 'genetic',
      bestParameters: bestIndividual.parameters,
      bestFitness: bestIndividual.fitness,
      generations: generationHistory.length,
      convergenceHistory: generationHistory,
      finalPopulation: population
    };
  }

  initializePopulation(parameterSpace) {
    const population = [];

    for (let i = 0; i < this.config.populationSize; i++) {
      const individual = {};

      for (const [name, space] of Object.entries(parameterSpace)) {
        if (space.type === 'integer') {
          individual[name] = Math.floor(Math.random() * (space.max - space.min + 1)) + space.min;
        } else if (space.type === 'float') {
          individual[name] = Math.random() * (space.max - space.min) + space.min;
        } else if (space.type === 'choice') {
          individual[name] = space.choices[Math.floor(Math.random() * space.choices.length)];
        } else if (space.type === 'boolean') {
          individual[name] = Math.random() < 0.5;
        }
      }

      population.push({ parameters: individual, fitness: null });
    }

    return population;
  }

  async evaluatePopulation(population, strategy, marketData, evaluationFn) {
    const evaluatedPopulation = [];

    // Evaluate in batches for parallel processing
    const batchSize = this.config.parallelEvaluations;

    for (let i = 0; i < population.length; i += batchSize) {
      const batch = population.slice(i, i + batchSize);

      const batchPromises = batch.map(async(individual) => {
        const fitness = await evaluationFn(strategy, marketData, individual.parameters);
        return { ...individual, fitness };
      });

      const evaluatedBatch = await Promise.all(batchPromises);
      evaluatedPopulation.push(...evaluatedBatch);
    }

    return evaluatedPopulation;
  }

  createNextGeneration(population, parameterSpace) {
    const nextGeneration = [];
    const eliteCount = Math.floor(population.length * this.config.elitismRate);

    // Elitism: keep best individuals
    for (let i = 0; i < eliteCount; i++) {
      nextGeneration.push({ ...population[i] });
    }

    // Generate offspring
    while (nextGeneration.length < this.config.populationSize) {
      // Selection
      const parent1 = this.tournamentSelection(population);
      const parent2 = this.tournamentSelection(population);

      // Crossover
      let offspring1, offspring2;
      if (Math.random() < this.config.crossoverRate) {
        [offspring1, offspring2] = this.crossover(parent1, parent2, parameterSpace);
      } else {
        offspring1 = { ...parent1 };
        offspring2 = { ...parent2 };
      }

      // Mutation
      if (Math.random() < this.config.mutationRate) {
        this.mutate(offspring1, parameterSpace);
      }
      if (Math.random() < this.config.mutationRate) {
        this.mutate(offspring2, parameterSpace);
      }

      nextGeneration.push(offspring1);
      if (nextGeneration.length < this.config.populationSize) {
        nextGeneration.push(offspring2);
      }
    }

    return nextGeneration;
  }

  tournamentSelection(population, tournamentSize = 3) {
    const tournament = [];

    for (let i = 0; i < tournamentSize; i++) {
      const randomIndex = Math.floor(Math.random() * population.length);
      tournament.push(population[randomIndex]);
    }

    return tournament.reduce((best, current) =>
      current.fitness > best.fitness ? current : best
    );
  }

  crossover(parent1, parent2, parameterSpace) {
    const offspring1 = { parameters: {}, fitness: null };
    const offspring2 = { parameters: {}, fitness: null };

    for (const [name, space] of Object.entries(parameterSpace)) {
      if (Math.random() < 0.5) {
        offspring1.parameters[name] = parent1.parameters[name];
        offspring2.parameters[name] = parent2.parameters[name];
      } else {
        offspring1.parameters[name] = parent2.parameters[name];
        offspring2.parameters[name] = parent1.parameters[name];
      }
    }

    return [offspring1, offspring2];
  }

  mutate(individual, parameterSpace) {
    for (const [name, space] of Object.entries(parameterSpace)) {
      if (Math.random() < 0.1) { // 10% chance to mutate each parameter
        if (space.type === 'integer') {
          individual.parameters[name] = Math.floor(Math.random() * (space.max - space.min + 1)) + space.min;
        } else if (space.type === 'float') {
          individual.parameters[name] = Math.random() * (space.max - space.min) + space.min;
        } else if (space.type === 'choice') {
          individual.parameters[name] = space.choices[Math.floor(Math.random() * space.choices.length)];
        } else if (space.type === 'boolean') {
          individual.parameters[name] = !individual.parameters[name];
        }
      }
    }
  }

  calculateGenerationStats(population) {
    const fitnesses = population.map(ind => ind.fitness);

    return {
      best: Math.max(...fitnesses),
      worst: Math.min(...fitnesses),
      average: fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length,
      diversity: this.calculateDiversity(population)
    };
  }

  calculateDiversity(population) {
    // Simplified diversity calculation
    const parameterNames = Object.keys(population[0].parameters);
    let totalVariance = 0;

    for (const paramName of parameterNames) {
      const values = population.map(ind => ind.parameters[paramName]);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
      totalVariance += variance;
    }

    return totalVariance / parameterNames.length;
  }

  checkConvergence(history) {
    if (history.length < 10) return false;

    const recent = history.slice(-10);
    const improvement = recent[recent.length - 1].bestFitness - recent[0].bestFitness;

    return Math.abs(improvement) < this.config.convergenceThreshold;
  }
}

/**
 * Grid Search Optimizer
 */
class GridSearchOptimizer {
  constructor(config) {
    this.config = config;
  }

  async optimize(strategy, marketData, parameterSpace, evaluationFn) {
    const parameterCombinations = this.generateParameterGrid(parameterSpace);
    const results = [];

    logger.info(`Grid search: evaluating ${parameterCombinations.length} combinations`);

    for (let i = 0; i < parameterCombinations.length; i++) {
      const parameters = parameterCombinations[i];
      const fitness = await evaluationFn(strategy, marketData, parameters);

      results.push({
        parameters,
        fitness,
        combination: i + 1
      });

      // Emit progress
      if (i % 10 === 0) {
        this.emit('evaluationProgress', {
          completed: i + 1,
          total: parameterCombinations.length,
          percentage: ((i + 1) / parameterCombinations.length) * 100
        });
      }
    }

    // Find best result
    const bestResult = results.reduce((best, current) =>
      current.fitness > best.fitness ? current : best
    );

    return {
      method: 'grid',
      bestParameters: bestResult.parameters,
      bestFitness: bestResult.fitness,
      totalCombinations: parameterCombinations.length,
      allResults: results,
      convergenceHistory: results.map(r => r.fitness)
    };
  }

  generateParameterGrid(parameterSpace) {
    const parameterNames = Object.keys(parameterSpace);
    const parameterValues = [];

    // Generate value arrays for each parameter
    for (const [name, space] of Object.entries(parameterSpace)) {
      const values = [];

      if (space.type === 'integer') {
        const step = space.step || 1;
        for (let val = space.min; val <= space.max; val += step) {
          values.push(val);
        }
      } else if (space.type === 'float') {
        const step = space.step || (space.max - space.min) / 10;
        for (let val = space.min; val <= space.max; val += step) {
          values.push(val);
        }
      } else if (space.type === 'choice') {
        values.push(...space.choices);
      } else if (space.type === 'boolean') {
        values.push(true, false);
      }

      parameterValues.push(values);
    }

    // Generate all combinations
    return this.cartesianProduct(parameterValues).map(combination => {
      const parameters = {};
      for (let i = 0; i < parameterNames.length; i++) {
        parameters[parameterNames[i]] = combination[i];
      }
      return parameters;
    });
  }

  cartesianProduct(arrays) {
    return arrays.reduce((acc, curr) => {
      const result = [];
      acc.forEach(a => {
        curr.forEach(c => {
          result.push([...a, c]);
        });
      });
      return result;
    }, [[]]);
  }
}

/**
 * Bayesian Optimizer (simplified implementation)
 */
class BayesianOptimizer {
  constructor(config) {
    this.config = config;
    this.observations = [];
  }

  async optimize(strategy, marketData, parameterSpace, evaluationFn) {
    const maxIterations = this.config.bayesianIterations || 100;
    const results = [];

    // Initial random sampling
    const initialSamples = Math.min(10, maxIterations / 4);

    for (let i = 0; i < initialSamples; i++) {
      const parameters = this.generateRandomParameters(parameterSpace);
      const fitness = await evaluationFn(strategy, marketData, parameters);

      this.observations.push({ parameters, fitness });
      results.push({ parameters, fitness, iteration: i + 1, type: 'random' });
    }

    // Bayesian optimization iterations
    for (let i = initialSamples; i < maxIterations; i++) {
      const parameters = this.acquireNext(parameterSpace);
      const fitness = await evaluationFn(strategy, marketData, parameters);

      this.observations.push({ parameters, fitness });
      results.push({ parameters, fitness, iteration: i + 1, type: 'bayesian' });
    }

    // Find best result
    const bestResult = results.reduce((best, current) =>
      current.fitness > best.fitness ? current : best
    );

    return {
      method: 'bayesian',
      bestParameters: bestResult.parameters,
      bestFitness: bestResult.fitness,
      iterations: maxIterations,
      allResults: results,
      convergenceHistory: results.map(r => r.fitness)
    };
  }

  acquireNext(parameterSpace) {
    // Simplified acquisition function (Expected Improvement)
    // In practice, this would use Gaussian Process regression

    const candidates = [];
    const numCandidates = 1000;

    for (let i = 0; i < numCandidates; i++) {
      const parameters = this.generateRandomParameters(parameterSpace);
      const expectedImprovement = this.calculateExpectedImprovement(parameters);
      candidates.push({ parameters, expectedImprovement });
    }

    // Select candidate with highest expected improvement
    const bestCandidate = candidates.reduce((best, current) =>
      current.expectedImprovement > best.expectedImprovement ? current : best
    );

    return bestCandidate.parameters;
  }

  calculateExpectedImprovement(parameters) {
    // Simplified EI calculation
    // Find nearest observations and estimate improvement

    if (this.observations.length === 0) return Math.random();

    const distances = this.observations.map(obs =>
      this.calculateParameterDistance(parameters, obs.parameters)
    );

    const nearestIndex = distances.indexOf(Math.min(...distances));
    const nearestFitness = this.observations[nearestIndex].fitness;
    const bestFitness = Math.max(...this.observations.map(obs => obs.fitness));

    // Simple heuristic for expected improvement
    const improvement = Math.max(0, nearestFitness - bestFitness + Math.random() * 0.1);
    return improvement;
  }

  calculateParameterDistance(params1, params2) {
    let distance = 0;

    for (const key of Object.keys(params1)) {
      const diff = params1[key] - params2[key];
      distance += diff * diff;
    }

    return Math.sqrt(distance);
  }

  generateRandomParameters(parameterSpace) {
    const parameters = {};

    for (const [name, space] of Object.entries(parameterSpace)) {
      if (space.type === 'integer') {
        parameters[name] = Math.floor(Math.random() * (space.max - space.min + 1)) + space.min;
      } else if (space.type === 'float') {
        parameters[name] = Math.random() * (space.max - space.min) + space.min;
      } else if (space.type === 'choice') {
        parameters[name] = space.choices[Math.floor(Math.random() * space.choices.length)];
      } else if (space.type === 'boolean') {
        parameters[name] = Math.random() < 0.5;
      }
    }

    return parameters;
  }
}

export {
  StrategyOptimizer,
  GeneticAlgorithm,
  GridSearchOptimizer,
  BayesianOptimizer
};
