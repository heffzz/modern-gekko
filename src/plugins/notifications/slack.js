const { BasePlugin } = require('../pluginManager');
const https = require('https');

class SlackPlugin extends BasePlugin {
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
      this.log('Slack plugin initialized successfully');
    } catch (error) {
      this.error('Failed to initialize Slack plugin', error);
      throw error;
    }
  }
  
  async testWebhook() {
    try {
      const testMessage = {
        text: '🤖 Trading Bot Slack Plugin Test',
        attachments: [{
          color: 'good',
          title: 'Connection Test',
          text: 'Slack webhook is working correctly!',
          ts: Math.floor(Date.now() / 1000)
        }]
      };
      
      const response = await this.sendWebhook(testMessage);
      if (response.success) {
        this.log('Slack webhook test successful');
        return true;
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      throw new Error(`Slack webhook test failed: ${error.message}`);
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
    return await this.sendMessage(message);
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
    const color = this.getTypeColor(data.type);
    
    return {
      text: `${emoji} Trading Bot Notification`,
      attachments: [{
        color,
        title: `${data.type.toUpperCase()} Notification`,
        fields: [
          {
            title: 'Type',
            value: data.type,
            short: true
          },
          {
            title: 'Timestamp',
            value: new Date(data.timestamp).toLocaleString(),
            short: true
          },
          {
            title: 'Details',
            value: '```' + JSON.stringify(data.data, null, 2) + '```',
            short: false
          }
        ],
        ts: Math.floor(new Date(data.timestamp).getTime() / 1000)
      }]
    };
  }
  
  formatAlertMessage(data) {
    const emoji = this.getLevelEmoji(data.level);
    const color = this.getLevelColor(data.level);
    
    const fields = [
      {
        title: 'Level',
        value: data.level.toUpperCase(),
        short: true
      },
      {
        title: 'Timestamp',
        value: new Date(data.timestamp).toLocaleString(),
        short: true
      },
      {
        title: 'Message',
        value: data.message,
        short: false
      }
    ];
    
    if (data.data) {
      fields.push({
        title: 'Additional Data',
        value: '```' + JSON.stringify(data.data, null, 2) + '```',
        short: false
      });
    }
    
    return {
      text: `${emoji} TRADING BOT ALERT`,
      channel: this.config.alertChannel || this.config.channel,
      attachments: [{
        color,
        title: `🚨 ALERT - ${data.level.toUpperCase()}`,
        fields,
        ts: Math.floor(new Date(data.timestamp).getTime() / 1000)
      }]
    };
  }
  
  formatTradeMessage(trade) {
    const sideEmoji = trade.side === 'buy' ? '🟢' : '🔴';
    const sideColor = trade.side === 'buy' ? 'good' : 'danger';
    const pnlEmoji = trade.pnl > 0 ? '💰' : trade.pnl < 0 ? '💸' : '➖';
    
    const fields = [
      {
        title: 'Symbol',
        value: trade.symbol,
        short: true
      },
      {
        title: 'Side',
        value: trade.side.toUpperCase(),
        short: true
      },
      {
        title: 'Quantity',
        value: trade.quantity.toString(),
        short: true
      },
      {
        title: 'Price',
        value: `$${trade.price.toFixed(4)}`,
        short: true
      },
      {
        title: 'Commission',
        value: `$${trade.commission.toFixed(2)}`,
        short: true
      },
      {
        title: 'Timestamp',
        value: new Date(trade.timestamp).toLocaleString(),
        short: true
      }
    ];
    
    if (trade.pnl !== undefined) {
      fields.push({
        title: 'P&L',
        value: `${pnlEmoji} $${trade.pnl.toFixed(2)}`,
        short: true
      });
    }
    
    return {
      text: `${sideEmoji} Trade Executed`,
      attachments: [{
        color: sideColor,
        title: `💱 TRADE EXECUTED - ${trade.symbol}`,
        fields,
        ts: Math.floor(new Date(trade.timestamp).getTime() / 1000)
      }]
    };
  }
  
  formatPerformanceMessage(performance) {
    const profitEmoji = performance.totalProfit > 0 ? '📈' : '📉';
    const profitColor = performance.totalProfit > 0 ? 'good' : 'danger';
    
    const fields = [
      {
        title: 'Total Trades',
        value: performance.totalTrades.toString(),
        short: true
      },
      {
        title: 'Win Rate',
        value: `${performance.winRate?.toFixed(1) || 0}%`,
        short: true
      },
      {
        title: 'Total Profit',
        value: `$${performance.totalProfit.toFixed(2)}`,
        short: true
      },
      {
        title: 'Total Loss',
        value: `$${performance.totalLoss.toFixed(2)}`,
        short: true
      },
      {
        title: 'Profit Factor',
        value: performance.profitFactor.toFixed(2),
        short: true
      },
      {
        title: 'Max Drawdown',
        value: `${performance.maxDrawdownPercent.toFixed(1)}%`,
        short: true
      }
    ];
    
    if (performance.roi !== undefined) {
      fields.push({
        title: 'ROI',
        value: `${performance.roi.toFixed(1)}%`,
        short: true
      });
    }
    
    fields.push({
      title: 'Report Generated',
      value: new Date().toLocaleString(),
      short: true
    });
    
    return {
      text: `${profitEmoji} Performance Report`,
      attachments: [{
        color: profitColor,
        title: '📊 TRADING PERFORMANCE REPORT',
        fields,
        ts: Math.floor(Date.now() / 1000)
      }]
    };
  }
  
  getTypeColor(type) {
    const colors = {
      trade: '#007bff',
      order: '#6f42c1',
      position: '#20c997',
      balance: '#ffc107',
      error: 'danger',
      warning: 'warning',
      info: '#17a2b8'
    };
    
    return colors[type] || '#6c757d';
  }
  
  getLevelColor(level) {
    const colors = {
      low: '#17a2b8',
      medium: 'warning',
      high: 'danger',
      critical: '#721c24'
    };
    
    return colors[level] || '#6c757d';
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
      
      // Add default channel if specified
      if (this.config.channel && !payload.channel) {
        payload.channel = this.config.channel;
      }
      
      // Add username if specified
      if (this.config.username) {
        payload.username = this.config.username;
      }
      
      // Add icon if specified
      if (this.config.iconEmoji) {
        payload.icon_emoji = this.config.iconEmoji;
      } else if (this.config.iconUrl) {
        payload.icon_url = this.config.iconUrl;
      }
      
      const response = await this.sendWebhook(payload);
      
      this.rateLimiter.lastSent = Date.now();
      
      if (response.success) {
        this.log('Slack message sent successfully');
        return { success: true };
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      this.error('Failed to send Slack message', error);
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
  
  async sendFile(filePath, filename, initialComment = '') {
    try {
      // Slack file upload requires different API endpoint and token
      // This is a simplified implementation using webhook
      const payload = {
        text: initialComment,
        attachments: [{
          color: '#007bff',
          title: '📎 File Attachment',
          text: `File: ${filename}`,
          ts: Math.floor(Date.now() / 1000)
        }]
      };
      
      return await this.sendMessage(payload);
    } catch (error) {
      this.error('Failed to send file to Slack', error);
      return { success: false, error: error.message };
    }
  }
  
  async sendChart(chartData, title = 'Trading Chart') {
    try {
      // Simplified chart representation
      const payload = {
        text: `📊 ${title}`,
        attachments: [{
          color: '#007bff',
          title: title,
          text: 'Chart data available',
          fields: [
            {
              title: 'Data Points',
              value: chartData.length?.toString() || 'N/A',
              short: true
            },
            {
              title: 'Generated',
              value: new Date().toLocaleString(),
              short: true
            }
          ],
          ts: Math.floor(Date.now() / 1000)
        }]
      };
      
      return await this.sendMessage(payload);
    } catch (error) {
      this.error('Failed to send chart to Slack', error);
      return { success: false, error: error.message };
    }
  }
  
  getName() {
    return 'SlackPlugin';
  }
  
  getVersion() {
    return '1.0.0';
  }
  
  getStatus() {
    return {
      ...super.getStatus(),
      webhookUrl: this.config.webhookUrl ? '***configured***' : 'not configured',
      channel: this.config.channel || 'default',
      username: this.config.username || 'TradingBot',
      lastSent: new Date(this.rateLimiter.lastSent).toISOString()
    };
  }
}

module.exports = SlackPlugin;