import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Strategy ids map directly to filenames on disk, so only allow a safe
// character set. This blocks path-traversal (e.g. ../../etc) and prevents
// writing arbitrary files outside the strategies directory.
const VALID_STRATEGY_ID = /^[a-zA-Z0-9_-]+$/;

// Windows reserved device names resolve to special files regardless of
// extension, so reject them even though they match the id character set.
const RESERVED_DEVICE_NAME = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

function isValidStrategyId(id) {
  return VALID_STRATEGY_ID.test(id) && !RESERVED_DEVICE_NAME.test(id);
}

function resolveStrategyPath(id) {
  const strategiesDir = path.join(__dirname, '..', '..', 'strategies');
  const filePath = path.join(strategiesDir, `${id}.js`);
  const resolved = path.resolve(filePath);
  if (resolved !== path.resolve(strategiesDir, `${id}.js`) ||
      !resolved.startsWith(path.resolve(strategiesDir) + path.sep)) {
    return null;
  }
  return resolved;
}

// Get all available strategies
router.get('/', async(req, res) => {
  try {
    const strategiesDir = path.join(__dirname, '..', '..', 'strategies');
    const files = await fs.readdir(strategiesDir);

    const strategies = [];

    for (const file of files) {
      if (file.endsWith('.js')) {
        const filePath = path.join(strategiesDir, file);
        const content = await fs.readFile(filePath, 'utf-8');

        // Extract strategy name and description from comments
        const nameMatch = content.match(/\/\*\*[\s\S]*?@name\s+([^\n]+)/i);
        const descMatch = content.match(/\/\*\*[\s\S]*?@description\s+([^\n]+)/i);

        strategies.push({
          id: file.replace('.js', ''),
          name: nameMatch ? nameMatch[1].trim() : file.replace('.js', ''),
          description: descMatch ? descMatch[1].trim() : 'No description available',
          filename: file,
          path: filePath
        });
      }
    }

    res.json({
      success: true,
      data: strategies
    });
  } catch (error) {
    console.error('Error loading strategies:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to load strategies' 
    });
  }
});

// Get specific strategy content
router.get('/:id', async(req, res) => {
  try {
    const { id } = req.params;

    if (!isValidStrategyId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid strategy id'
      });
    }

    const filePath = resolveStrategyPath(id);
    if (!filePath) {
      return res.status(400).json({
        success: false,
        error: 'Invalid strategy path'
      });
    }

    const content = await fs.readFile(filePath, 'utf-8');

    res.json({
      success: true,
      data: {
        id,
        content,
        filename: `${id}.js`
      }
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json({ 
        success: false,
        error: 'Strategy not found' 
      });
    } else {
      console.error('Error loading strategy:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to load strategy' 
      });
    }
  }
});

// Save strategy
router.post('/:id', async(req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!isValidStrategyId(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid strategy id'
      });
    }

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Strategy content is required'
      });
    }

    const filePath = resolveStrategyPath(id);
    if (!filePath) {
      return res.status(400).json({
        success: false,
        error: 'Invalid strategy path'
      });
    }

    await fs.writeFile(filePath, content, 'utf-8');

    res.json({
      success: true,
      data: {
        message: 'Strategy saved successfully',
        id,
        filename: `${id}.js`
      }
    });
  } catch (error) {
    console.error('Error saving strategy:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to save strategy' 
    });
  }
});

export default router;
