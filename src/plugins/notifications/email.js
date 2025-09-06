const { BasePlugin } = require('../pluginManager');
const nodemailer = require('nodemailer');

class EmailPlugin extends BasePlugin {
  constructor(config = {}) {
    super(config);

    this.hooks = {
      notification: this.onNotification.bind(this),
      alert: this.onAlert.bind(this),
      tradeNotification: this.onTradeNotification.bind(this),
      performanceReport: this.onPerformanceReport.bind(this)
    };

    this.transporter = null;
    this.rateLimiter = {
      lastSent: 0,
      minInterval: 5000 // 5 seconds between emails
    };
  }

  async initialize() {
    await super.initialize();

    // Validate required configuration
    this.validateConfig(['smtp', 'from', 'to']);

    // Create transporter
    try {
      this.transporter = nodemailer.createTransporter({
        host: this.config.smtp.host,
        port: this.config.smtp.port || 587,
        secure: this.config.smtp.secure || false,
        auth: {
          user: this.config.smtp.user,
          pass: this.config.smtp.password
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      // Test connection
      await this.testConnection();
      this.log('Email plugin initialized successfully');
    } catch (error) {
      this.error('Failed to initialize Email plugin', error);
      throw error;
    }
  }

  async testConnection() {
    try {
      await this.transporter.verify();
      this.log('SMTP connection verified');
      return true;
    } catch (error) {
      throw new Error(`SMTP connection test failed: ${error.message}`);
    }
  }

  async onNotification(data) {
    if (!this.isEnabled()) return;

    const subject = `Trading Bot Notification - ${data.type.toUpperCase()}`;
    const html = this.formatNotificationHtml(data);

    return await this.sendEmail(subject, html);
  }

  async onAlert(data) {
    if (!this.isEnabled()) return;

    const subject = `🚨 Trading Bot Alert - ${data.level.toUpperCase()}`;
    const html = this.formatAlertHtml(data);

    return await this.sendEmail(subject, html, { priority: 'high' });
  }

  async onTradeNotification(data) {
    if (!this.isEnabled()) return;

    const trade = data.trade;
    const subject = `💱 Trade Executed - ${trade.symbol} ${trade.side.toUpperCase()}`;
    const html = this.formatTradeHtml(trade);

    return await this.sendEmail(subject, html);
  }

  async onPerformanceReport(data) {
    if (!this.isEnabled()) return;

    const subject = '📊 Trading Performance Report';
    const html = this.formatPerformanceHtml(data.performance);

    return await this.sendEmail(subject, html);
  }

  formatNotificationHtml(data) {
    return `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { background-color: #f0f0f0; padding: 15px; border-radius: 5px; }
            .content { margin: 20px 0; }
            .data { background-color: #f9f9f9; padding: 10px; border-radius: 3px; font-family: monospace; }
            .timestamp { color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>Trading Bot Notification</h2>
            <p><strong>Type:</strong> ${data.type.toUpperCase()}</p>
          </div>
          
          <div class="content">
            <h3>Details:</h3>
            <div class="data">
              <pre>${JSON.stringify(data.data, null, 2)}</pre>
            </div>
          </div>
          
          <div class="timestamp">
            <p>Timestamp: ${new Date(data.timestamp).toLocaleString()}</p>
          </div>
        </body>
      </html>
    `;
  }

  formatAlertHtml(data) {
    const levelColors = {
      low: '#17a2b8',
      medium: '#ffc107',
      high: '#dc3545',
      critical: '#721c24'
    };

    const color = levelColors[data.level] || '#6c757d';

    return `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .alert { border-left: 5px solid ${color}; padding: 15px; background-color: #f8f9fa; }
            .alert-header { color: ${color}; font-weight: bold; font-size: 18px; }
            .message { margin: 15px 0; font-size: 16px; }
            .timestamp { color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="alert">
            <div class="alert-header">
              🚨 ALERT - ${data.level.toUpperCase()}
            </div>
            
            <div class="message">
              ${data.message}
            </div>
            
            ${data.data ? `
              <div>
                <h4>Additional Data:</h4>
                <pre style="background-color: #e9ecef; padding: 10px; border-radius: 3px;">${JSON.stringify(data.data, null, 2)}</pre>
              </div>
            ` : ''}
            
            <div class="timestamp">
              <p>Timestamp: ${new Date(data.timestamp).toLocaleString()}</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  formatTradeHtml(trade) {
    const sideColor = trade.side === 'buy' ? '#28a745' : '#dc3545';
    const pnlColor = trade.pnl > 0 ? '#28a745' : trade.pnl < 0 ? '#dc3545' : '#6c757d';

    return `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .trade-card { border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; }
            .trade-header { background-color: ${sideColor}; color: white; padding: 10px; border-radius: 5px; text-align: center; }
            .trade-details { margin: 15px 0; }
            .detail-row { display: flex; justify-content: space-between; margin: 8px 0; }
            .detail-label { font-weight: bold; }
            .pnl { color: ${pnlColor}; font-weight: bold; }
            .timestamp { color: #666; font-size: 12px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="trade-card">
            <div class="trade-header">
              <h2>💱 TRADE EXECUTED</h2>
            </div>
            
            <div class="trade-details">
              <div class="detail-row">
                <span class="detail-label">Symbol:</span>
                <span>${trade.symbol}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Side:</span>
                <span style="color: ${sideColor}; font-weight: bold;">${trade.side.toUpperCase()}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Quantity:</span>
                <span>${trade.quantity}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Price:</span>
                <span>$${trade.price.toFixed(4)}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Commission:</span>
                <span>$${trade.commission.toFixed(2)}</span>
              </div>
              ${trade.pnl !== undefined ? `
                <div class="detail-row">
                  <span class="detail-label">P&L:</span>
                  <span class="pnl">$${trade.pnl.toFixed(2)}</span>
                </div>
              ` : ''}
            </div>
            
            <div class="timestamp">
              <p>Executed: ${new Date(trade.timestamp).toLocaleString()}</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  formatPerformanceHtml(performance) {
    const profitColor = performance.totalProfit > 0 ? '#28a745' : '#dc3545';

    return `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .performance-card { border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; }
            .performance-header { background-color: #007bff; color: white; padding: 15px; border-radius: 5px; text-align: center; }
            .metrics-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
            .metric { background-color: #f8f9fa; padding: 15px; border-radius: 5px; text-align: center; }
            .metric-value { font-size: 24px; font-weight: bold; margin: 5px 0; }
            .metric-label { color: #6c757d; font-size: 14px; }
            .profit { color: ${profitColor}; }
            .timestamp { color: #666; font-size: 12px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="performance-card">
            <div class="performance-header">
              <h2>📊 PERFORMANCE REPORT</h2>
            </div>
            
            <div class="metrics-grid">
              <div class="metric">
                <div class="metric-value">${performance.totalTrades}</div>
                <div class="metric-label">Total Trades</div>
              </div>
              
              <div class="metric">
                <div class="metric-value">${performance.winRate?.toFixed(1) || 0}%</div>
                <div class="metric-label">Win Rate</div>
              </div>
              
              <div class="metric">
                <div class="metric-value profit">$${performance.totalProfit.toFixed(2)}</div>
                <div class="metric-label">Total Profit</div>
              </div>
              
              <div class="metric">
                <div class="metric-value" style="color: #dc3545;">$${performance.totalLoss.toFixed(2)}</div>
                <div class="metric-label">Total Loss</div>
              </div>
              
              <div class="metric">
                <div class="metric-value">${performance.profitFactor.toFixed(2)}</div>
                <div class="metric-label">Profit Factor</div>
              </div>
              
              <div class="metric">
                <div class="metric-value" style="color: #dc3545;">${performance.maxDrawdownPercent.toFixed(1)}%</div>
                <div class="metric-label">Max Drawdown</div>
              </div>
              
              ${performance.roi !== undefined ? `
                <div class="metric">
                  <div class="metric-value profit">${performance.roi.toFixed(1)}%</div>
                  <div class="metric-label">ROI</div>
                </div>
              ` : ''}
            </div>
            
            <div class="timestamp">
              <p>Generated: ${new Date().toLocaleString()}</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  async sendEmail(subject, html, options = {}) {
    try {
      // Rate limiting
      const now = Date.now();
      if (now - this.rateLimiter.lastSent < this.rateLimiter.minInterval) {
        await new Promise(resolve => setTimeout(resolve, this.rateLimiter.minInterval));
      }

      const mailOptions = {
        from: this.config.from,
        to: Array.isArray(this.config.to) ? this.config.to.join(', ') : this.config.to,
        subject,
        html,
        priority: options.priority || 'normal',
        ...options
      };

      const result = await this.transporter.sendMail(mailOptions);

      this.rateLimiter.lastSent = Date.now();

      this.log(`Email sent successfully: ${result.messageId}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      this.error('Failed to send email', error);
      return { success: false, error: error.message };
    }
  }

  async sendEmailWithAttachment(subject, html, attachments, options = {}) {
    try {
      const mailOptions = {
        from: this.config.from,
        to: Array.isArray(this.config.to) ? this.config.to.join(', ') : this.config.to,
        subject,
        html,
        attachments,
        ...options
      };

      const result = await this.transporter.sendMail(mailOptions);

      this.log(`Email with attachment sent successfully: ${result.messageId}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      this.error('Failed to send email with attachment', error);
      return { success: false, error: error.message };
    }
  }

  getName() {
    return 'EmailPlugin';
  }

  getVersion() {
    return '1.0.0';
  }

  getStatus() {
    return {
      ...super.getStatus(),
      smtp: {
        host: this.config.smtp?.host || 'not configured',
        port: this.config.smtp?.port || 'not configured',
        user: this.config.smtp?.user || 'not configured'
      },
      from: this.config.from || 'not configured',
      to: this.config.to || 'not configured',
      lastSent: new Date(this.rateLimiter.lastSent).toISOString()
    };
  }

  async cleanup() {
    if (this.transporter) {
      this.transporter.close();
      this.transporter = null;
    }
    await super.cleanup();
  }
}

module.exports = EmailPlugin;
