const { BasePlugin } = require('../pluginManager');
const https = require('https');

class TelegramPlugin extends BasePlugin {
  constructor(config = {}) {
    super(config);

    this.hooks = {
      notification: this.onNotification.bind(this),
      alert: this.onAlert.bind(this),
      tradeNotification: this.onTradeNotification.bind(this),
      performanceReport: this.onPerformanceReport.bind(this)
    };

    this.apiUrl = 'https://api.telegram.org';
    this.rateLimiter = {
      lastSent: 0,
      minInterval: 1000 // 1 second between messages
    };
  }

  async initialize() {
    await super.initialize();

    // Validate required configuration
    this.validateConfig(['botToken', 'chatId']);

    // Test connection
    try {
      await this.testConnection();
      this.log('Telegram plugin initialized successfully');
    } catch (error) {
      this.error('Failed to initialize Telegram plugin', error);
      throw error;
    }
  }

  async testConnection() {
    try {
      const response = await this.makeRequest('getMe');
      if (response.ok) {
        this.log(`Connected to Telegram bot: ${response.result.username}`);
        return true;
      } else {
        throw new Error(response.description);
      }
    } catch (error) {
      throw new Error(`Telegram connection test failed: ${error.message}`);
    }
  }

  async onNotification(data) {
    if (!this.isEnabled()) return;

    const message = this.formatNotificationMessage(data);
    return await this.sendMessage(message);
  }

  async onAlert(data) {
    if (!this.isEnabled()) return;

    const message = this.formatAlertMessage(data);
    return await this.sendMessage(message, { priority: data.level });
  }

  async onTradeNotification(data) {
    if (!this.isEnabled()) return;

    const message = this.formatTradeMessage(data.trade);
    return await this.sendMessage(message);
  }

  async onPerformanceReport(data) {
    if (!this.isEnabled()) return;

    const message = this.formatPerformanceMessage(data.performance);
    return await this.sendMessage(message);
  }

  formatNotificationMessage(data) {
    const emoji = this.getTypeEmoji(data.type);
    return `${emoji} *${data.type.toUpperCase()}*\n\n${JSON.stringify(data.data, null, 2)}`;
  }

  formatAlertMessage(data) {
    const emoji = this.getLevelEmoji(data.level);
    return `${emoji} *ALERT - ${data.level.toUpperCase()}*\n\n${data.message}\n\n_${new Date(data.timestamp).toLocaleString()}_`;
  }

  formatTradeMessage(trade) {
    const emoji = trade.side === 'buy' ? '🟢' : '🔴';
    const pnlEmoji = trade.pnl > 0 ? '💰' : trade.pnl < 0 ? '💸' : '➖';

    let message = `${emoji} *TRADE EXECUTED*\n\n`;
    message += `*Symbol:* ${trade.symbol}\n`;
    message += `*Side:* ${trade.side.toUpperCase()}\n`;
    message += `*Quantity:* ${trade.quantity}\n`;
    message += `*Price:* $${trade.price.toFixed(4)}\n`;
    message += `*Commission:* $${trade.commission.toFixed(2)}\n`;

    if (trade.pnl !== undefined) {
      message += `*P&L:* ${pnlEmoji} $${trade.pnl.toFixed(2)}\n`;
    }

    message += `\n_${new Date(trade.timestamp).toLocaleString()}_`;

    return message;
  }

  formatPerformanceMessage(performance) {
    const profitEmoji = performance.totalProfit > 0 ? '📈' : '📉';

    let message = `${profitEmoji} *PERFORMANCE REPORT*\n\n`;
    message += `*Total Trades:* ${performance.totalTrades}\n`;
    message += `*Win Rate:* ${performance.winRate?.toFixed(1) || 0}%\n`;
    message += `*Total Profit:* $${performance.totalProfit.toFixed(2)}\n`;
    message += `*Total Loss:* $${performance.totalLoss.toFixed(2)}\n`;
    message += `*Profit Factor:* ${performance.profitFactor.toFixed(2)}\n`;
    message += `*Max Drawdown:* ${performance.maxDrawdownPercent.toFixed(1)}%\n`;

    if (performance.roi !== undefined) {
      message += `*ROI:* ${performance.roi.toFixed(1)}%\n`;
    }

    return message;
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

  async sendMessage(text, options = {}) {
    try {
      // Rate limiting
      const now = Date.now();
      if (now - this.rateLimiter.lastSent < this.rateLimiter.minInterval) {
        await new Promise(resolve => setTimeout(resolve, this.rateLimiter.minInterval));
      }

      const payload = {
        chat_id: this.config.chatId,
        text,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
        ...options
      };

      const response = await this.makeRequest('sendMessage', payload);

      this.rateLimiter.lastSent = Date.now();

      if (response.ok) {
        this.log('Message sent successfully');
        return { success: true, messageId: response.result.message_id };
      } else {
        throw new Error(response.description);
      }
    } catch (error) {
      this.error('Failed to send message', error);
      return { success: false, error: error.message };
    }
  }

  async sendPhoto(photoPath, caption = '', options = {}) {
    try {
      const payload = {
        chat_id: this.config.chatId,
        photo: photoPath,
        caption,
        parse_mode: 'Markdown',
        ...options
      };

      const response = await this.makeRequest('sendPhoto', payload);

      if (response.ok) {
        this.log('Photo sent successfully');
        return { success: true, messageId: response.result.message_id };
      } else {
        throw new Error(response.description);
      }
    } catch (error) {
      this.error('Failed to send photo', error);
      return { success: false, error: error.message };
    }
  }

  async sendDocument(documentPath, caption = '', options = {}) {
    try {
      const payload = {
        chat_id: this.config.chatId,
        document: documentPath,
        caption,
        parse_mode: 'Markdown',
        ...options
      };

      const response = await this.makeRequest('sendDocument', payload);

      if (response.ok) {
        this.log('Document sent successfully');
        return { success: true, messageId: response.result.message_id };
      } else {
        throw new Error(response.description);
      }
    } catch (error) {
      this.error('Failed to send document', error);
      return { success: false, error: error.message };
    }
  }

  async makeRequest(method, payload = {}) {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify(payload);

      const options = {
        hostname: 'api.telegram.org',
        port: 443,
        path: `/bot${this.config.botToken}/${method}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      };

      const req = https.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(responseData);
            resolve(response);
          } catch (error) {
            reject(new Error(`Invalid JSON response: ${responseData}`));
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

  getName() {
    return 'TelegramPlugin';
  }

  getVersion() {
    return '1.0.0';
  }

  getStatus() {
    return {
      ...super.getStatus(),
      botToken: this.config.botToken ? '***configured***' : 'not configured',
      chatId: this.config.chatId || 'not configured',
      lastSent: new Date(this.rateLimiter.lastSent).toISOString()
    };
  }
}

module.exports = TelegramPlugin;
