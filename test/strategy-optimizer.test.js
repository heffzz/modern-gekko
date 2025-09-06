import { StrategyOptimizer, GeneticAlgorithm } from '../src/engine/strategyOptimizer.js';
import { AdvancedBacktester } from '../src/engine/advancedBacktester.js';

describe('StrategyOptimizer', () => {
  let optimizer;
  let mockStrategy;
  let mockMarketData;
  let parameterSpace;
  
  beforeEach(() => {
    optimizer = new StrategyOptimizer({
      populationSize: 10,
      generations: 5,
      mutationRate: 0.1,
      crossoverRate: 0.8
    });
    
    mockStrategy = {
      name: 'TestStrategy',
      parameters: {},
      setParameters: jest.fn(),
      indicators: {
        sma: { reset: jest.fn() }
      }
    };
    
    mockMarketData = [
      { timestamp: new Date('2023-01-01'), open: 100, high: 105, low: 95, close: 102, volume: 1000 },
      { timestamp: new Date('2023-01-02'), open: 102, high: 108, low: 100, close: 106, volume: 1200 },
      { timestamp: new Date('2023-01-03'), open: 106, high: 110, low: 104, close: 108, volume: 1100 }
    ];
    
    parameterSpace = {
      smaPeriod: { type: 'integer', min: 5, max: 50 },
      threshold: { type: 'float', min: 0.01, max: 0.1 },
      useStopLoss: { type: 'boolean' },
      strategy: { type: 'choice', choices: ['aggressive', 'conservative'] }
    };
  });
  
  describe('Parameter Generation', () => {
    test('should generate random parameters within bounds', () => {
      const parameters = optimizer.generateRandomParameters(parameterSpace);
      
      expect(parameters.smaPeriod).toBeGreaterThanOrEqual(5);
      expect(parameters.smaPeriod).toBeLessThanOrEqual(50);
      expect(Number.isInteger(parameters.smaPeriod)).toBe(true);
      
      expect(parameters.threshold).toBeGreaterThanOrEqual(0.01);
      expect(parameters.threshold).toBeLessThanOrEqual(0.1);
      
      expect(typeof parameters.useStopLoss).toBe('boolean');
      expect(['aggressive', 'conservative']).toContain(parameters.strategy);
    });
    
    test('should generate different parameter sets', () => {
      const params1 = optimizer.generateRandomParameters(parameterSpace);
      const params2 = optimizer.generateRandomParameters(parameterSpace);
      
      // Very unlikely to be identical
      expect(JSON.stringify(params1)).not.toBe(JSON.stringify(params2));
    });
  });
  
  describe('Strategy Instance Creation', () => {
    test('should create strategy instance with parameters', () => {
      const parameters = { smaPeriod: 20, threshold: 0.05 };
      const instance = optimizer.createStrategyInstance(mockStrategy, parameters);
      
      expect(mockStrategy.setParameters).toHaveBeenCalledWith(parameters);
      expect(mockStrategy.indicators.sma.reset).toHaveBeenCalled();
    });
  });
  
  describe('Fitness Calculation', () => {
    test('should calculate profit fitness', () => {
      optimizer.config.fitnessFunction = 'profit';
      
      const results = {
        portfolio: { totalPnL: 1500 },
        performance: { winRate: 0.6, profitFactor: 1.8 }
      };
      
      const fitness = optimizer.calculateFitness(results);
      expect(fitness).toBe(1500);
    });
    
    test('should calculate Sharpe ratio fitness', () => {
      optimizer.config.fitnessFunction = 'sharpe';
      
      const results = {
        portfolio: { totalPnL: 1000 },
        performance: {
          equityHistory: [
            { equity: 10000 },
            { equity: 10100 },
            { equity: 10200 },
            { equity: 10150 },
            { equity: 10300 }
          ]
        }
      };
      
      const fitness = optimizer.calculateFitness(results);
      expect(typeof fitness).toBe('number');
      expect(fitness).not.toBeNaN();
    });
    
    test('should calculate custom fitness', () => {
      optimizer.config.fitnessFunction = 'custom';
      
      const results = {
        portfolio: { totalPnL: 1000 },
        performance: {
          maxDrawdownPercent: 10,
          winRate: 60,
          totalTrades: 20
        }
      };
      
      const fitness = optimizer.calculateFitness(results);
      expect(typeof fitness).toBe('number');
      expect(fitness).toBeGreaterThan(0);
    });
  });
  
  describe('Random Search Optimization', () => {
    test('should run random search optimization', async () => {
      // Mock the evaluateIndividual method
      optimizer.evaluateIndividual = jest.fn()
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(150)
        .mockResolvedValueOnce(120)
        .mockResolvedValueOnce(180)
        .mockResolvedValueOnce(90);
      
      const result = await optimizer.runRandomSearch(
        mockStrategy,
        mockMarketData,
        parameterSpace,
        5
      );
      
      expect(result.method).toBe('random');
      expect(result.iterations).toBe(5);
      expect(result.bestFitness).toBe(180);
      expect(result.allResults).toHaveLength(5);
      expect(optimizer.evaluateIndividual).toHaveBeenCalledTimes(5);
    });
  });
  
  describe('Returns Calculation', () => {
    test('should calculate returns from equity history', () => {
      const equityHistory = [
        { equity: 10000 },
        { equity: 10100 },
        { equity: 10200 },
        { equity: 10150 },
        { equity: 10300 }
      ];
      
      const returns = optimizer.calculateReturns(equityHistory);
      
      expect(returns).toHaveLength(4);
      expect(returns[0]).toBeCloseTo(0.01); // (10100 - 10000) / 10000
      expect(returns[1]).toBeCloseTo(0.0099); // (10200 - 10100) / 10100
      expect(returns[2]).toBeCloseTo(-0.0049); // (10150 - 10200) / 10200
      expect(returns[3]).toBeCloseTo(0.0148); // (10300 - 10150) / 10150
    });
    
    test('should handle empty equity history', () => {
      const returns = optimizer.calculateReturns([]);
      expect(returns).toHaveLength(0);
    });
  });
  
  describe('Standard Deviation Calculation', () => {
    test('should calculate standard deviation', () => {
      const values = [1, 2, 3, 4, 5];
      const stdDev = optimizer.calculateStandardDeviation(values);
      
      expect(stdDev).toBeCloseTo(1.414, 2);
    });
    
    test('should handle empty array', () => {
      const stdDev = optimizer.calculateStandardDeviation([]);
      expect(stdDev).toBe(0);
    });
  });
  
  describe('Optimization Control', () => {
    test('should prevent multiple simultaneous optimizations', async () => {
      optimizer.isRunning = true;
      
      await expect(optimizer.optimize(
        mockStrategy,
        mockMarketData,
        parameterSpace
      )).rejects.toThrow('Optimization is already running');
    });
    
    test('should stop optimization', () => {
      optimizer.isRunning = true;
      optimizer.stop();
      
      expect(optimizer.isRunning).toBe(false);
    });
  });
});

describe('GeneticAlgorithm', () => {
  let ga;
  let parameterSpace;
  
  beforeEach(() => {
    ga = new GeneticAlgorithm({
      populationSize: 10,
      generations: 5,
      mutationRate: 0.1,
      crossoverRate: 0.8,
      elitismRate: 0.2
    });
    
    parameterSpace = {
      param1: { type: 'integer', min: 1, max: 10 },
      param2: { type: 'float', min: 0.1, max: 1.0 }
    };
  });
  
  describe('Population Initialization', () => {
    test('should initialize population with correct size', () => {
      const population = ga.initializePopulation(parameterSpace);
      
      expect(population).toHaveLength(10);
      
      population.forEach(individual => {
        expect(individual).toHaveProperty('parameters');
        expect(individual).toHaveProperty('fitness', null);
        expect(individual.parameters).toHaveProperty('param1');
        expect(individual.parameters).toHaveProperty('param2');
      });
    });
    
    test('should generate parameters within bounds', () => {
      const population = ga.initializePopulation(parameterSpace);
      
      population.forEach(individual => {
        expect(individual.parameters.param1).toBeGreaterThanOrEqual(1);
        expect(individual.parameters.param1).toBeLessThanOrEqual(10);
        expect(Number.isInteger(individual.parameters.param1)).toBe(true);
        
        expect(individual.parameters.param2).toBeGreaterThanOrEqual(0.1);
        expect(individual.parameters.param2).toBeLessThanOrEqual(1.0);
      });
    });
  });
  
  describe('Tournament Selection', () => {
    test('should select individual with highest fitness', () => {
      const population = [
        { parameters: {}, fitness: 100 },
        { parameters: {}, fitness: 200 },
        { parameters: {}, fitness: 150 }
      ];
      
      const selected = ga.tournamentSelection(population, 3);
      expect(selected.fitness).toBe(200);
    });
  });
  
  describe('Crossover', () => {
    test('should create offspring from parents', () => {
      const parent1 = {
        parameters: { param1: 5, param2: 0.5 },
        fitness: 100
      };
      
      const parent2 = {
        parameters: { param1: 8, param2: 0.8 },
        fitness: 120
      };
      
      const [offspring1, offspring2] = ga.crossover(parent1, parent2, parameterSpace);
      
      expect(offspring1).toHaveProperty('parameters');
      expect(offspring1).toHaveProperty('fitness', null);
      expect(offspring2).toHaveProperty('parameters');
      expect(offspring2).toHaveProperty('fitness', null);
      
      // Offspring should have parameters from both parents
      const allValues = [5, 8, 0.5, 0.8];
      expect(allValues).toContain(offspring1.parameters.param1);
      expect(allValues).toContain(offspring1.parameters.param2);
      expect(allValues).toContain(offspring2.parameters.param1);
      expect(allValues).toContain(offspring2.parameters.param2);
    });
  });
  
  describe('Mutation', () => {
    test('should mutate individual parameters', () => {
      const individual = {
        parameters: { param1: 5, param2: 0.5 },
        fitness: 100
      };
      
      const originalParams = { ...individual.parameters };
      
      // Mock Math.random to ensure mutation occurs
      const originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(0.05); // Less than 0.1 mutation rate
      
      ga.mutate(individual, parameterSpace);
      
      // Parameters should be within bounds
      expect(individual.parameters.param1).toBeGreaterThanOrEqual(1);
      expect(individual.parameters.param1).toBeLessThanOrEqual(10);
      expect(individual.parameters.param2).toBeGreaterThanOrEqual(0.1);
      expect(individual.parameters.param2).toBeLessThanOrEqual(1.0);
      
      Math.random = originalRandom;
    });
  });
  
  describe('Generation Statistics', () => {
    test('should calculate generation statistics', () => {
      const population = [
        { fitness: 100 },
        { fitness: 200 },
        { fitness: 150 },
        { fitness: 180 },
        { fitness: 120 }
      ];
      
      const stats = ga.calculateGenerationStats(population);
      
      expect(stats.best).toBe(200);
      expect(stats.worst).toBe(100);
      expect(stats.average).toBe(150);
      expect(typeof stats.diversity).toBe('number');
    });
  });
  
  describe('Convergence Check', () => {
    test('should detect convergence', () => {
      const history = Array(15).fill(null).map((_, i) => ({
        generation: i,
        bestFitness: 100 + i * 0.0001 // Very small improvement
      }));
      
      const converged = ga.checkConvergence(history);
      expect(converged).toBe(true);
    });
    
    test('should not detect convergence with significant improvement', () => {
      const history = Array(15).fill(null).map((_, i) => ({
        generation: i,
        bestFitness: 100 + i * 10 // Significant improvement
      }));
      
      const converged = ga.checkConvergence(history);
      expect(converged).toBe(false);
    });
    
    test('should not detect convergence with insufficient history', () => {
      const history = [
        { generation: 0, bestFitness: 100 },
        { generation: 1, bestFitness: 100 }
      ];
      
      const converged = ga.checkConvergence(history);
      expect(converged).toBe(false);
    });
  });
});