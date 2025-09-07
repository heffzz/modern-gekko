import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get available indicators
router.get('/', async(req, res) => {
  try {
    const indicatorsPath = path.join(__dirname, '..', 'indicators');
    const files = await fs.readdir(indicatorsPath);

    const indicators = [];

    for (const file of files) {
      if (file.endsWith('.js') && file !== 'index.js') {
        try {
          const indicatorPath = path.join(indicatorsPath, file);
          const { default: indicator } = await import(`file://${indicatorPath}`);

          if (indicator && indicator.name) {
            indicators.push({
              id: indicator.name.toLowerCase().replace(/\s+/g, '_'),
              name: indicator.name,
              description: indicator.description || `${indicator.name} technical indicator`,
              category: indicator.category || 'trend',
              parameters: indicator.parameters || {},
              tags: indicator.tags || [indicator.category || 'trend'],
              version: indicator.version || '1.0.0',
              author: indicator.author || 'Modern Gekko',
              created: new Date().toISOString(),
              updated: new Date().toISOString()
            });
          }
        } catch (error) {
          console.warn(`Failed to load indicator ${file}:`, error.message);
        }
      }
    }

    res.json({
      success: true,
      data: indicators,
      count: indicators.length
    });
  } catch (error) {
    console.error('Failed to load indicators:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load indicators',
      message: error.message
    });
  }
});

// Get specific indicator details
router.get('/:name', async(req, res) => {
  try {
    const { name } = req.params;
    const indicatorsPath = path.join(__dirname, '..', 'indicators');

    // Try to find the indicator file
    const files = await fs.readdir(indicatorsPath);
    const indicatorFile = files.find(file =>
      file.toLowerCase().replace('.js', '') === name.toLowerCase() ||
      file.toLowerCase().replace('.js', '').replace(/[^a-z0-9]/g, '') === name.toLowerCase().replace(/[^a-z0-9]/g, '')
    );

    if (!indicatorFile) {
      return res.status(404).json({
        success: false,
        error: 'Indicator not found',
        message: `Indicator '${name}' not found`
      });
    }

    const indicatorPath = path.join(indicatorsPath, indicatorFile);
    const { default: indicator } = await import(`file://${indicatorPath}`);

    if (!indicator || !indicator.name) {
      return res.status(404).json({
        success: false,
        error: 'Invalid indicator',
        message: `Indicator '${name}' is not properly configured`
      });
    }

    res.json({
      success: true,
      data: {
        id: indicator.name.toLowerCase().replace(/\s+/g, '_'),
        name: indicator.name,
        description: indicator.description || `${indicator.name} technical indicator`,
        category: indicator.category || 'trend',
        parameters: indicator.parameters || {},
        tags: indicator.tags || [indicator.category || 'trend'],
        version: indicator.version || '1.0.0',
        author: indicator.author || 'Modern Gekko',
        created: new Date().toISOString(),
        updated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error(`Failed to load indicator ${req.params.name}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to load indicator',
      message: error.message
    });
  }
});

// Generate indicator preview
router.post('/:name/preview', async(req, res) => {
  try {
    const { name } = req.params;
    const { parameters = {}, data = [] } = req.body;

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid data',
        message: 'Data array is required and must not be empty'
      });
    }

    const indicatorsPath = path.join(__dirname, '..', 'indicators');
    const files = await fs.readdir(indicatorsPath);
    const indicatorFile = files.find(file =>
      file.toLowerCase().replace('.js', '') === name.toLowerCase() ||
      file.toLowerCase().replace('.js', '').replace(/[^a-z0-9]/g, '') === name.toLowerCase().replace(/[^a-z0-9]/g, '')
    );

    if (!indicatorFile) {
      return res.status(404).json({
        success: false,
        error: 'Indicator not found',
        message: `Indicator '${name}' not found`
      });
    }

    const indicatorPath = path.join(indicatorsPath, indicatorFile);
    const { default: indicator } = await import(`file://${indicatorPath}`);

    if (!indicator || !indicator.calculate) {
      return res.status(404).json({
        success: false,
        error: 'Invalid indicator',
        message: `Indicator '${name}' does not have a calculate function`
      });
    }

    // Calculate indicator values
    const result = indicator.calculate(data, parameters);

    res.json({
      success: true,
      data: {
        indicator: indicator.name,
        parameters,
        input: data,
        output: result,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error(`Failed to generate preview for ${req.params.name}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate preview',
      message: error.message
    });
  }
});

export default router;
