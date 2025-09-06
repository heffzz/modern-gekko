import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get package.json for version info
const packageJsonPath = path.join(__dirname, '..', '..', 'package.json');
let packageInfo = { version: '1.0.0', name: 'modern-gekko' };

try {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  packageInfo = {
    name: packageJson.name,
    version: packageJson.version
  };
} catch (error) {
  // Use defaults if package.json can't be read
}

// Health check endpoint
router.get('/', (req, res) => {
  const healthCheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: packageInfo.version,
    name: packageInfo.name,
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100,
      external: Math.round(process.memoryUsage().external / 1024 / 1024 * 100) / 100
    },
    system: {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      pid: process.pid
    },
    trading: {
      liveMode: process.env.LIVE === 'true',
      defaultCurrency: process.env.DEFAULT_CURRENCY || 'USD',
      defaultAsset: process.env.DEFAULT_ASSET || 'BTC'
    }
  };

  res.json(healthCheck);
});

// Detailed health check with dependencies
router.get('/detailed', async(req, res) => {
  const checks = {
    server: 'ok',
    filesystem: 'ok',
    memory: 'ok'
  };

  let overallStatus = 'ok';

  // Check filesystem access
  try {
    const logsDir = path.join(__dirname, '..', '..', 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    fs.accessSync(logsDir, fs.constants.W_OK);
  } catch (error) {
    checks.filesystem = 'error';
    overallStatus = 'degraded';
  }

  // Check memory usage
  const memoryUsage = process.memoryUsage();
  const memoryUsedMB = memoryUsage.heapUsed / 1024 / 1024;
  if (memoryUsedMB > 500) { // Alert if using more than 500MB
    checks.memory = 'warning';
    if (overallStatus === 'ok') overallStatus = 'warning';
  }

  const detailedHealth = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    checks,
    metrics: {
      uptime: process.uptime(),
      memory: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100,
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100,
        external: Math.round(memoryUsage.external / 1024 / 1024 * 100) / 100,
        rss: Math.round(memoryUsage.rss / 1024 / 1024 * 100) / 100
      },
      cpu: {
        usage: process.cpuUsage()
      },
      nodeVersion: process.version,
      platform: process.platform,
      environment: process.env.NODE_ENV || 'development'
    }
  };

  res.json(detailedHealth);
});

export default router;
