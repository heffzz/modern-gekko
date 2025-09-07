import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

    res.json(strategies);
  } catch (error) {
    console.error('Error loading strategies:', error);
    res.status(500).json({ error: 'Failed to load strategies' });
  }
});

// Get specific strategy content
router.get('/:id', async(req, res) => {
  try {
    const { id } = req.params;
    const strategiesDir = path.join(__dirname, '..', '..', 'strategies');
    const filePath = path.join(strategiesDir, `${id}.js`);

    const content = await fs.readFile(filePath, 'utf-8');

    res.json({
      id,
      content,
      filename: `${id}.js`
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json({ error: 'Strategy not found' });
    } else {
      console.error('Error loading strategy:', error);
      res.status(500).json({ error: 'Failed to load strategy' });
    }
  }
});

// Save strategy
router.post('/:id', async(req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Strategy content is required' });
    }

    const strategiesDir = path.join(__dirname, '..', '..', 'strategies');
    const filePath = path.join(strategiesDir, `${id}.js`);

    await fs.writeFile(filePath, content, 'utf-8');

    res.json({
      message: 'Strategy saved successfully',
      id,
      filename: `${id}.js`
    });
  } catch (error) {
    console.error('Error saving strategy:', error);
    res.status(500).json({ error: 'Failed to save strategy' });
  }
});

export default router;
