const { BasePlugin } = require('../pluginManager');
const https = require('https');

class DiscordPlugin extends BasePlugin {
  constructor(config = {}) {
    super(config);

    this.hooks = {
      notification: this.onNotification.bind(this),
      alert: this.onAlert.bind(this),
      tradeNotification: this.onTradeNotification.bind(this),
      performanceReport: this.onPerformanceReport.bind(this)
    };

    this.rateLimiter = {
      lastSent: 0,
      minInterval: 1000 // 1 second between messages
    };
  }

  async initialize() {
    await super.initialize();

    // Validate required configuration
    this.validateConfig(['webhookUrl']);

    // Test webhook
    try {
      await this.testWebhook();
      this.log('Discord plugin initialized successfully');
    } catch (error) {
      this.error('Failed to initialize Discord plugin', error);
      throw error;
    }
  }

  async testWebhook() {
    try {
      const testMessage = {
        content: '🤖 Trading Bot Discord Plugin Test',
        embeds: [{
          title: 'Connection Test',
          description: 'Discord webhook is working correctly!',
          color: 0x00ff00,
          timestamp: new Date().toISOString()
        }]
      };

      const response = await this.sendWebhook(testMessage);
      if (response.success) {
        this.log('Discord webhook test successful');
        return true;
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      throw new Error(`Discord webhook test failed: ${error.message}`);
    }
  }

  async onNotification(data) {
    if (!this.isEnabled()) return;

    const embed = this.formatNotificationEmbed(data);
    return await this.sendMessage({ embeds: [embed] });
  }

  async onAlert(data) {
    if (!this.isEnabled()) return;

    const embed = this.formatAlertEmbed(data);
    return await this.sendMessage({
      content: this.config.mentionRole ? `<@&${this.config.mentionRole}>` : undefined,
      embeds: [embed]
    });
  }

  async onTradeNotification(data) {
    if (!this.isEnabled()) return;

    const embed = this.formatTradeEmbed(data.trade);
    return await this.sendMessage({ embeds: [embed] });
  }

  async onPerformanceReport(data) {
    if (!this.isEnabled()) return;

    const embed = this.formatPerformanceEmbed(data.performance);
    return await this.sendMessage({ embeds: [embed] });
  }

  formatNotificationEmbed(data) {
    const color = this.getTypeColor(data.type);
    const emoji = this.getTypeEmoji(data.type);

    return {
      title: `${emoji} ${data.type.toUpperCase()} Notification`,
      description: '```json\n' + JSON.stringify(data.data, null, 2) + '\n```',
      color,
      timestamp: new Date(data.timestamp).toISOString(),
      footer: {
        text: 'Trading Bot Notification'
      }
    };
  }

  formatAlertEmbed(data) {
    const color = this.getLevelColor(data.level);
    const emoji = this.getLevelEmoji(data.level);

    return {
      title: `${emoji} ALERT - ${data.level.toUpperCase()}`,
      description: data.message,
      color,
      fields: data.data ? [{
        name: 'Additional Data',
        value: '```json\n' + JSON.stringify(data.data, null, 2) + '\n```',
        inline: false
      }] : [],
      timestamp: new Date(data.timestamp).toISOString(),
      footer: {
        text: 'Trading Bot Alert'
      }
    };
  }

  formatTradeEmbed(trade) {
    const sideColor = trade.side === 'buy' ? 0x28a745 : 0xdc3545;
    const sideEmoji = trade.side === 'buy' ? '🟢' : '🔴';
    const pnlEmoji = trade.pnl > 0 ? '💰' : trade.pnl < 0 ? '💸' : '➖';

    const fields = [
      {
        name: 'Symbol',
        value: trade.symbol,
        inline: true
      },
      {
        name: 'Side',
        value: trade.side.toUpperCase(),
        inline: true
      },
      {
        name: 'Quantity',
        value: trade.quantity.toString(),
        inline: true
      },
      {
        name: 'Price',
        value: `$${trade.price.toFixed(4)}`,
        inline: true
      },
      {
        name: 'Commission',
        value: `$${trade.commission.toFixed(2)}`,
        inline: true
      }
    ];

    if (trade.pnl !== undefined) {
      fields.push({
        name: 'P&L',
        value: `${pnlEmoji} $${trade.pnl.toFixed(2)}`,
        inline: true
      });
    }

    return {
      title: `${sideEmoji} Trade Executed`,
      color: sideColor,
      fields,
      timestamp: new Date(trade.timestamp).toISOString(),
      footer: {
        text: 'Trading Bot Execution'
      }
    };
  }

  formatPerformanceEmbed(performance) {
    const profitColor = performance.totalProfit > 0 ? 0x28a745 : 0xdc3545;
    const profitEmoji = performance.totalProfit > 0 ? '📈' : '📉';

    const fields = [
      {
        name: 'Total Trades',
        value: performance.totalTrades.toString(),
        inline: true
      },
      {
        name: 'Win Rate',
        value: `${performance.winRate?.toFixed(1) || 0}%`,
        inline: true
      },
      {
        name: 'Profit Factor',
        value: performance.profitFactor.toFixed(2),
        inline: true
      },
      {
        name: 'Total Profit',
        value: `$${performance.totalProfit.toFixed(2)}`,
        inline: true
      },
      {
        name: 'Total Loss',
        value: `$${performance.totalLoss.toFixed(2)}`,
        inline: true
      },
      {
        name: 'Max Drawdown',
        value: `${performance.maxDrawdownPercent.toFixed(1)}%`,
        inline: true
      }
    ];

    if (performance.roi !== undefined) {
      fields.push({
        name: 'ROI',
        value: `${performance.roi.toFixed(1)}%`,
        inline: true
      });
    }

    return {
      title: `${profitEmoji} Performance Report`,
      color: profitColor,
      fields,
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Trading Bot Performance'
      }
    };
  }

  getTypeColor(type) {
    const colors = {
      trade: 0x007bff,
      order: 0x6f42c1,
      position: 0x20c997,
      balance: 0xffc107,
      error: 0xdc3545,
      warning: 0xfd7e14,
      info: 0x17a2b8
    };

    return colors[type] || 0x6c757d;
  }

  getLevelColor(level) {
    const colors = {
      low: 0x17a2b8,
      medium: 0xffc107,
      high: 0xdc3545,
      critical: 0x721c24
    };

    return colors[level] || 0x6c757d;
  }

  getTypeEmoji(type) {
    const emojis = {
      trade: '💱',
      order: '📋',
      position: '📊',
      balance: '💰',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };

    return emojis[type] || '📢';
  }

  getLevelEmoji(level) {
    const emojis = {
      low: 'ℹ️',
      medium: '⚠️',
      high: '🚨',
      critical: '🔥'
    };

    return emojis[level] || '📢';
  }

  async sendMessage(payload) {
    try {
      // Rate limiting
      const now = Date.now();
      if (now - this.rateLimiter.lastSent < this.rateLimiter.minInterval) {
        await new Promise(resolve => setTimeout(resolve, this.rateLimiter.minInterval));
      }

      const response = await this.sendWebhook(payload);

      this.rateLimiter.lastSent = Date.now();

      if (response.success) {
        this.log('Discord message sent successfully');
        return { success: true };
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      this.error('Failed to send Discord message', error);
      return { success: false, error: error.message };
    }
  }

  async sendWebhook(payload) {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify(payload);
      const url = new URL(this.config.webhookUrl);

      const options = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          'User-Agent': 'TradingBot/1.0'
        }
      };

      const req = https.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ success: true, statusCode: res.statusCode });
          } else {
            resolve({
              success: false,
              error: `HTTP ${res.statusCode}: ${responseData}`,
              statusCode: res.statusCode
            });
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.setTimeout(10000); // 10 second timeout
      req.write(data);
      req.end();
    });
  }

  async sendFile(filePath, filename, content = '') {
    try {
      // Discord webhook file upload requires multipart/form-data
      // This is a simplified implementation
      const payload = {
        content,
        embeds: [{
          title: '📎 File Attachment',
          description: `File: ${filename}`,
          color: 0x007bff,
          timestamp: new Date().toISOString()
        }]
      };

      return await this.sendMessage(payload);
    } catch (error) {
      this.error('Failed to send file to Discord', error);
      return { success: false, error: error.message };
    }
  }

  getName() {
    return 'DiscordPlugin';
  }

  getVersion() {
    return '1.0.0';
  }

  getStatus() {
    return {
      ...super.getStatus(),
      webhookUrl: this.config.webhookUrl ? '***configured***' : 'not configured',
      mentionRole: this.config.mentionRole || 'not configured',
      lastSent: new Date(this.rateLimiter.lastSent).toISOString()
    };
  }
}

module.exports = DiscordPlugin;
