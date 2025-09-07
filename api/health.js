import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get package.json for version info
const packageJsonPath = path.join(__dirname, '..', 'package.json');
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

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const healthCheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'production',
    version: packageInfo.version,
    name: packageInfo.name,
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
    },
    platform: process.platform,
    nodeVersion: process.version
  };

  res.status(200).json(healthCheck);
}
