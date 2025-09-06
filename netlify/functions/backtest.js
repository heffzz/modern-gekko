const { Backtester } = require('../../src/engine/backtester');
const { StrategyEngine } = require('../../src/engine/strategyEngine');
const { PortfolioSimulator } = require('../../src/engine/portfolioSimulator');

exports.handler = async (event, context) => {
  try {
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
        },
        body: ''
      };
    }

    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

    const { candles, strategy, config = {} } = JSON.parse(event.body);

    if (!candles || !Array.isArray(candles) || candles.length === 0) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Invalid candles data' })
      };
    }

    // Initialize backtester
    const backtester = new Backtester({
      initialBalance: config.initialBalance || 10000,
      feePercentage: config.feePercentage || 0.1,
      ...config
    });

    // Run backtest
    const result = await backtester.run(candles, strategy);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: JSON.stringify(result)
    };
  } catch (error) {
    console.error('Backtest error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Backtest failed',
        message: error.message
      })
    };
  }
};