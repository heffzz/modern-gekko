import { PaperTradingEngine } from './src/engine/paperTrading.js';

const mockConfig = {
  initialBalance: 10000,
  commission: 0.001,
  slippage: 0.0005,
  maxSlippage: 0.01,
  currency: 'USD'
};

console.log('Creating engine with config:', mockConfig);
const engine = new PaperTradingEngine(mockConfig);

console.log('Engine created');
console.log('engine.config:', engine.config);
console.log('engine.initialBalance:', engine.initialBalance);
console.log('engine.portfolio:', engine.portfolio);
console.log('engine.portfolio.cash:', engine.portfolio.cash);