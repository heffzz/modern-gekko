import { PluginManager, BasePlugin } from '../src/plugins/pluginManager.js';
import TelegramPlugin from '../src/plugins/notifications/telegram.js';
import EmailPlugin from '../src/plugins/notifications/email.js';
import DiscordPlugin from '../src/plugins/notifications/discord.js';
import SlackPlugin from '../src/plugins/notifications/slack.js';

// Mock external dependencies
jest.mock('node-fetch');
jest.mock('nodemailer');

import fetch from 'node-fetch';
import nodemailer from 'nodemailer';

describe('PluginManager', () => {
  let pluginManager;

  beforeEach(() => {
    pluginManager = new PluginManager();
  });

  describe('Plugin Registration', () => {
    test('should register plugin successfully', () => {
      const mockPlugin = {
        name: 'test-plugin',
        initialize: jest.fn(),
        destroy: jest.fn()
      };

      pluginManager.registerPlugin('test', mockPlugin);

      expect(pluginManager.plugins.has('test')).toBe(true);
      expect(pluginManager.plugins.get('test')).toBe(mockPlugin);
    });

    test('should throw error when registering plugin with same name', () => {
      const mockPlugin = { name: 'test-plugin' };

      pluginManager.registerPlugin('test', mockPlugin);

      expect(() => {
        pluginManager.registerPlugin('test', mockPlugin);
      }).toThrow('Plugin test is already registered');
    });
  });

  describe('Plugin Loading', () => {
    test('should load plugin with config', async() => {
      const mockPlugin = {
        name: 'test-plugin',
        initialize: jest.fn().mockResolvedValue(true),
        destroy: jest.fn()
      };

      const config = { apiKey: 'test-key' };

      pluginManager.registerPlugin('test', mockPlugin);
      const result = await pluginManager.loadPlugin('test', config);

      expect(result).toBe(true);
      expect(mockPlugin.initialize).toHaveBeenCalledWith(config);
      expect(pluginManager.loadedPlugins.has('test')).toBe(true);
    });

    test('should handle plugin initialization failure', async() => {
      const mockPlugin = {
        name: 'test-plugin',
        initialize: jest.fn().mockRejectedValue(new Error('Init failed')),
        destroy: jest.fn()
      };

      pluginManager.registerPlugin('test', mockPlugin);

      await expect(pluginManager.loadPlugin('test', {})).rejects.toThrow('Init failed');
      expect(pluginManager.loadedPlugins.has('test')).toBe(false);
    });

    test('should throw error when loading non-existent plugin', async() => {
      await expect(pluginManager.loadPlugin('non-existent', {})).rejects.toThrow('Plugin non-existent not found');
    });
  });

  describe('Plugin Unloading', () => {
    test('should unload plugin successfully', async() => {
      const mockPlugin = {
        name: 'test-plugin',
        initialize: jest.fn().mockResolvedValue(true),
        destroy: jest.fn().mockResolvedValue(true)
      };

      pluginManager.registerPlugin('test', mockPlugin);
      await pluginManager.loadPlugin('test', {});

      const result = await pluginManager.unloadPlugin('test');

      expect(result).toBe(true);
      expect(mockPlugin.destroy).toHaveBeenCalled();
      expect(pluginManager.loadedPlugins.has('test')).toBe(false);
    });

    test('should handle plugin destruction failure', async() => {
      const mockPlugin = {
        name: 'test-plugin',
        initialize: jest.fn().mockResolvedValue(true),
        destroy: jest.fn().mockRejectedValue(new Error('Destroy failed'))
      };

      pluginManager.registerPlugin('test', mockPlugin);
      await pluginManager.loadPlugin('test', {});

      await expect(pluginManager.unloadPlugin('test')).rejects.toThrow('Destroy failed');
    });
  });

  describe('Hook System', () => {
    test('should register and execute hooks', async() => {
      const mockPlugin = {
        name: 'test-plugin',
        initialize: jest.fn().mockResolvedValue(true),
        onTradeExecuted: jest.fn(),
        destroy: jest.fn()
      };

      pluginManager.registerPlugin('test', mockPlugin);
      await pluginManager.loadPlugin('test', {});

      const tradeData = { symbol: 'BTC/USD', amount: 0.1 };
      await pluginManager.executeHook('onTradeExecuted', tradeData);

      expect(mockPlugin.onTradeExecuted).toHaveBeenCalledWith(tradeData);
    });

    test('should handle hook execution errors gracefully', async() => {
      const mockPlugin = {
        name: 'test-plugin',
        initialize: jest.fn().mockResolvedValue(true),
        onTradeExecuted: jest.fn().mockRejectedValue(new Error('Hook failed')),
        destroy: jest.fn()
      };

      pluginManager.registerPlugin('test', mockPlugin);
      await pluginManager.loadPlugin('test', {});

      // Should not throw, just log error
      await expect(pluginManager.executeHook('onTradeExecuted', {})).resolves.not.toThrow();
    });
  });

  describe('Notification System', () => {
    test('should send notifications to all loaded plugins', async() => {
      const mockPlugin1 = {
        name: 'plugin1',
        initialize: jest.fn().mockResolvedValue(true),
        sendNotification: jest.fn().mockResolvedValue(true),
        destroy: jest.fn()
      };

      const mockPlugin2 = {
        name: 'plugin2',
        initialize: jest.fn().mockResolvedValue(true),
        sendNotification: jest.fn().mockResolvedValue(true),
        destroy: jest.fn()
      };

      pluginManager.registerPlugin('plugin1', mockPlugin1);
      pluginManager.registerPlugin('plugin2', mockPlugin2);
      await pluginManager.loadPlugin('plugin1', {});
      await pluginManager.loadPlugin('plugin2', {});

      const message = 'Test notification';
      await pluginManager.sendNotification(message, 'info');

      expect(mockPlugin1.sendNotification).toHaveBeenCalledWith(message, 'info');
      expect(mockPlugin2.sendNotification).toHaveBeenCalledWith(message, 'info');
    });
  });
});

describe('BasePlugin', () => {
  let plugin;

  beforeEach(() => {
    plugin = new BasePlugin('test-plugin');
  });

  describe('Rate Limiting', () => {
    test('should allow messages within rate limit', () => {
      plugin.config.rateLimitPerMinute = 10;

      expect(plugin.checkRateLimit()).toBe(true);
      expect(plugin.messageCount).toBe(1);
    });

    test('should block messages exceeding rate limit', () => {
      plugin.config.rateLimitPerMinute = 2;
      plugin.messageCount = 2;
      plugin.lastResetTime = Date.now();

      expect(plugin.checkRateLimit()).toBe(false);
    });

    test('should reset rate limit after time window', () => {
      plugin.config.rateLimitPerMinute = 2;
      plugin.messageCount = 2;
      plugin.lastResetTime = Date.now() - 61000; // 61 seconds ago

      expect(plugin.checkRateLimit()).toBe(true);
      expect(plugin.messageCount).toBe(1);
    });
  });

  describe('Message Formatting', () => {
    test('should format trade notification', () => {
      const trade = {
        symbol: 'BTC/USD',
        side: 'buy',
        amount: 0.1,
        price: 50000,
        pnl: 100
      };

      const message = plugin.formatTradeMessage(trade);

      expect(message).toContain('BTC/USD');
      expect(message).toContain('buy');
      expect(message).toContain('0.1');
      expect(message).toContain('50000');
      expect(message).toContain('100');
    });

    test('should format performance report', () => {
      const performance = {
        totalPnL: 1500,
        winRate: 65,
        totalTrades: 20,
        maxDrawdown: 5.2
      };

      const message = plugin.formatPerformanceMessage(performance);

      expect(message).toContain('1500');
      expect(message).toContain('65');
      expect(message).toContain('20');
      expect(message).toContain('5.2');
    });
  });
});

describe('TelegramPlugin', () => {
  let plugin;

  beforeEach(() => {
    plugin = new TelegramPlugin();
    fetch.mockClear();
  });

  describe('Initialization', () => {
    test('should initialize with valid config', async() => {
      const config = {
        botToken: 'test-token',
        chatId: 'test-chat'
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true, result: { username: 'testbot' } })
      });

      const result = await plugin.initialize(config);

      expect(result).toBe(true);
      expect(plugin.config.botToken).toBe('test-token');
      expect(plugin.config.chatId).toBe('test-chat');
    });

    test('should fail initialization with invalid token', async() => {
      const config = {
        botToken: 'invalid-token',
        chatId: 'test-chat'
      };

      fetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ ok: false, description: 'Unauthorized' })
      });

      await expect(plugin.initialize(config)).rejects.toThrow('Failed to connect to Telegram');
    });
  });

  describe('Message Sending', () => {
    beforeEach(async() => {
      const config = {
        botToken: 'test-token',
        chatId: 'test-chat'
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true, result: { username: 'testbot' } })
      });

      await plugin.initialize(config);
      fetch.mockClear();
    });

    test('should send text message successfully', async() => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true, result: { message_id: 123 } })
      });

      const result = await plugin.sendMessage('Test message');

      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('sendMessage'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('Test message')
        })
      );
    });

    test('should handle message sending failure', async() => {
      fetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ ok: false, description: 'Bad Request' })
      });

      const result = await plugin.sendMessage('Test message');

      expect(result).toBe(false);
    });
  });
});

describe('EmailPlugin', () => {
  let plugin;
  let mockTransporter;

  beforeEach(() => {
    plugin = new EmailPlugin();
    mockTransporter = {
      sendMail: jest.fn(),
      verify: jest.fn()
    };
    nodemailer.createTransporter = jest.fn().mockReturnValue(mockTransporter);
  });

  describe('Initialization', () => {
    test('should initialize with SMTP config', async() => {
      const config = {
        smtp: {
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: {
            user: 'test@gmail.com',
            pass: 'password'
          }
        },
        from: 'test@gmail.com',
        to: 'recipient@gmail.com'
      };

      mockTransporter.verify.mockResolvedValue(true);

      const result = await plugin.initialize(config);

      expect(result).toBe(true);
      expect(plugin.config.from).toBe('test@gmail.com');
      expect(plugin.config.to).toBe('recipient@gmail.com');
    });

    test('should fail initialization with invalid SMTP config', async() => {
      const config = {
        smtp: { host: 'invalid.smtp.com' },
        from: 'test@gmail.com',
        to: 'recipient@gmail.com'
      };

      mockTransporter.verify.mockRejectedValue(new Error('Connection failed'));

      await expect(plugin.initialize(config)).rejects.toThrow('Failed to connect to SMTP server');
    });
  });

  describe('Email Sending', () => {
    beforeEach(async() => {
      const config = {
        smtp: { host: 'smtp.gmail.com' },
        from: 'test@gmail.com',
        to: 'recipient@gmail.com'
      };

      mockTransporter.verify.mockResolvedValue(true);
      await plugin.initialize(config);
    });

    test('should send email successfully', async() => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-id' });

      const result = await plugin.sendEmail('Test Subject', 'Test message');

      expect(result).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'test@gmail.com',
        to: 'recipient@gmail.com',
        subject: 'Test Subject',
        html: expect.stringContaining('Test message')
      });
    });

    test('should handle email sending failure', async() => {
      mockTransporter.sendMail.mockRejectedValue(new Error('Send failed'));

      const result = await plugin.sendEmail('Test Subject', 'Test message');

      expect(result).toBe(false);
    });
  });
});

describe('DiscordPlugin', () => {
  let plugin;

  beforeEach(() => {
    plugin = new DiscordPlugin();
    fetch.mockClear();
  });

  describe('Initialization', () => {
    test('should initialize with webhook URL', async() => {
      const config = {
        webhookUrl: 'https://discord.com/api/webhooks/test'
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'test-webhook' })
      });

      const result = await plugin.initialize(config);

      expect(result).toBe(true);
      expect(plugin.config.webhookUrl).toBe('https://discord.com/api/webhooks/test');
    });

    test('should fail initialization with invalid webhook', async() => {
      const config = {
        webhookUrl: 'https://discord.com/api/webhooks/invalid'
      };

      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      await expect(plugin.initialize(config)).rejects.toThrow('Invalid Discord webhook URL');
    });
  });

  describe('Message Sending', () => {
    beforeEach(async() => {
      const config = {
        webhookUrl: 'https://discord.com/api/webhooks/test'
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'test-webhook' })
      });

      await plugin.initialize(config);
      fetch.mockClear();
    });

    test('should send Discord message successfully', async() => {
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 204
      });

      const result = await plugin.sendDiscordMessage('Test message', 'info');

      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        'https://discord.com/api/webhooks/test',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('Test message')
        })
      );
    });
  });
});

describe('SlackPlugin', () => {
  let plugin;

  beforeEach(() => {
    plugin = new SlackPlugin();
    fetch.mockClear();
  });

  describe('Initialization', () => {
    test('should initialize with webhook URL', async() => {
      const config = {
        webhookUrl: 'https://hooks.slack.com/services/test'
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('ok')
      });

      const result = await plugin.initialize(config);

      expect(result).toBe(true);
      expect(plugin.config.webhookUrl).toBe('https://hooks.slack.com/services/test');
    });
  });

  describe('Message Sending', () => {
    beforeEach(async() => {
      const config = {
        webhookUrl: 'https://hooks.slack.com/services/test'
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('ok')
      });

      await plugin.initialize(config);
      fetch.mockClear();
    });

    test('should send Slack message successfully', async() => {
      fetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('ok')
      });

      const result = await plugin.sendSlackMessage('Test message', 'info');

      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        'https://hooks.slack.com/services/test',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('Test message')
        })
      );
    });
  });
});
