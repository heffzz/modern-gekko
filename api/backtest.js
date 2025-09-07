import { Backtester } from '../src/engine/backtester.js';
import { CSVImporter } from '../src/importers/csvImporter.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { csvData, strategy, config } = req.body;

    if (!csvData || !strategy) {
      return res.status(400).json({ 
        error: 'Missing required fields: csvData and strategy' 
      });
    }

    // Parse CSV data
    const importer = new CSVImporter();
    const candles = importer.parseCSVString(csvData);

    if (!candles || candles.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid or empty CSV data' 
      });
    }

    // Create strategy function from string
    let strategyFn;
    try {
      // Simple strategy evaluation (security risk in production)
      strategyFn = new Function('candles', 'indicators', strategy);
    } catch (error) {
      return res.status(400).json({ 
        error: 'Invalid strategy code: ' + error.message 
      });
    }

    // Run backtest
    const backtester = new Backtester();
    const result = await backtester.run({
      candles,
      strategy: strategyFn,
      initialBalance: config?.initialBalance || 10000,
      commission: config?.commission || 0.001
    });

    res.status(200).json({
      success: true,
      result: {
        trades: result.trades,
        summary: {
          totalTrades: result.trades.length,
          profitableTrades: result.trades.filter(t => t.profit > 0).length,
          totalProfit: result.trades.reduce((sum, t) => sum + t.profit, 0),
          maxDrawdown: result.maxDrawdown || 0,
          roi: result.roi || 0
        },
        equity: result.equity || []
      }
    });

  } catch (error) {
    console.error('Backtest error:', error);
    res.status(500).json({ 
      error: 'Internal server error: ' + error.message 
    });
  }
}
