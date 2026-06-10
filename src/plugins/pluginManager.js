const EventEmitter = require('events');
const path = require('path');
const fs = require('fs').promises;

class PluginManager extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = {
      pluginsDir: path.join(__dirname, 'notifications'),
      autoLoad: true,
      enabledPlugins: [],
      ...config
    };

    this.plugins = new Map();
    this.hooks = new Map();
    this.isInitialized = false;
  }

  async initialize() {
    try {
      if (this.config.autoLoad) {
        await this.loadAllPlugins();
      }

      this.isInitialized = true;
      this.emit('initialized', { pluginCount: this.plugins.size });

      console.log(`Plugin Manager initialized with ${this.plugins.size} plugins`);

      return true;
    } catch (error) {
      this.emit('error', { type: 'initialization', error });
      throw error;
    }
  }

  async loadAllPlugins() {
    try {
      const pluginFiles = await fs.readdir(this.config.pluginsDir);

      for (const file of pluginFiles) {
        if (file.endsWith('.js') && !file.startsWith('_')) {
          const pluginName = path.basename(file, '.js');
          await this.loadPlugin(pluginName);
        }
      }
    } catch (error) {
      console.warn('Could not load plugins directory:', error.message);
    }
  }

  async loadPlugin(pluginName, config = {}) {
    try {
      let plugin;
      
      // Check if plugin is already registered (for testing)
      if (this.plugins.has(pluginName)) {
        plugin = this.plugins.get(pluginName);
      } else {
        // Load from file
        const pluginPath = path.join(this.config.pluginsDir, `${pluginName}.js`);

        // Check if plugin file exists
        await fs.access(pluginPath);

        // Clear require cache to allow reloading
        delete require.cache[require.resolve(pluginPath)];

        // Load plugin
        const PluginClass = require(pluginPath);
        plugin = new PluginClass(this.config[pluginName] || config);

        // Validate plugin interface
        if (!this.validatePlugin(plugin)) {
          throw new Error(`Plugin ${pluginName} does not implement required interface`);
        }

        // Register plugin
        this.plugins.set(pluginName, plugin);
      }

      // Initialize plugin
      await plugin.initialize(config);

      // Register plugin hooks
      if (plugin.hooks) {
        for (const [hookName, handler] of Object.entries(plugin.hooks)) {
          this.registerHook(hookName, pluginName, handler);
        }
      }

      this.emit('pluginLoaded', { name: pluginName, plugin });

      console.log(`Plugin loaded: ${pluginName}`);

      return true;
    } catch (error) {
      // Remove plugin from registry if initialization failed
      if (this.plugins.has(pluginName)) {
        this.plugins.delete(pluginName);
      }
      this.emit('error', { type: 'pluginLoad', pluginName, error });
      console.error(`Failed to load plugin ${pluginName}:`, error.message);
      throw error;
    }
  }

  async unloadPlugin(pluginName) {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin ${pluginName} not found`);
    }

    try {
      // Cleanup plugin
      if (plugin.cleanup) {
        await plugin.cleanup();
      }

      // Remove hooks
      for (const [hookName, handlers] of this.hooks) {
        const filtered = handlers.filter(h => h.plugin !== pluginName);
        if (filtered.length === 0) {
          this.hooks.delete(hookName);
        } else {
          this.hooks.set(hookName, filtered);
        }
      }

      // Remove plugin
      this.plugins.delete(pluginName);

      this.emit('pluginUnloaded', { name: pluginName });

      console.log(`Plugin unloaded: ${pluginName}`);

      return true;
    } catch (error) {
      this.emit('error', { type: 'pluginUnload', pluginName, error });
      throw error;
    }
  }

  validatePlugin(plugin) {
    // Check required methods
    const requiredMethods = ['initialize', 'getName', 'getVersion'];
    for (const method of requiredMethods) {
      if (typeof plugin[method] !== 'function') {
        return false;
      }
    }

    return true;
  }

  registerPlugin(name, plugin) {
    if (this.plugins.has(name)) {
      throw new Error(`Plugin ${name} is already registered`);
    }

    if (!this.validatePlugin(plugin)) {
      throw new Error(`Plugin ${name} does not implement required methods`);
    }

    this.plugins.set(name, plugin);
    this.emit('pluginRegistered', { name, plugin });
    
    return true;
  }

  registerHook(hookName, pluginName, handler) {
    if (!this.hooks.has(hookName)) {
      this.hooks.set(hookName, []);
    }

    this.hooks.get(hookName).push({
      plugin: pluginName,
      handler
    });
  }

  async executeHook(hookName, data = {}) {
    const handlers = this.hooks.get(hookName);
    if (!handlers || handlers.length === 0) {
      return [];
    }

    const results = [];

    for (const { plugin: pluginName, handler } of handlers) {
      try {
        const plugin = this.plugins.get(pluginName);
        if (plugin && plugin.isEnabled()) {
          const result = await handler.call(plugin, data);
          results.push({ plugin: pluginName, result });
        }
      } catch (error) {
        this.emit('error', { type: 'hookExecution', hookName, pluginName, error });
        results.push({ plugin: pluginName, error: error.message });
      }
    }

    return results;
  }

  async notify(type, data) {
    return await this.executeHook('notification', { type, data, timestamp: new Date() });
  }

  async sendAlert(level, message, data = {}) {
    return await this.executeHook('alert', {
      level,
      message,
      data,
      timestamp: new Date()
    });
  }

  async sendTradeNotification(trade) {
    return await this.executeHook('tradeNotification', {
      trade,
      timestamp: new Date()
    });
  }

  async sendPerformanceReport(performance) {
    return await this.executeHook('performanceReport', {
      performance,
      timestamp: new Date()
    });
  }

  async sendNotification(message, level = 'info') {
    const plugins = Array.from(this.plugins.values());
    const promises = plugins.map(plugin => {
      if (plugin.sendNotification && typeof plugin.sendNotification === 'function') {
        return plugin.sendNotification(message, level);
      }
    });
    return await Promise.all(promises.filter(p => p));
  }

  getPlugin(name) {
    return this.plugins.get(name);
  }

  getPlugins() {
    return Array.from(this.plugins.entries()).map(([name, plugin]) => ({
      name,
      version: plugin.getVersion(),
      enabled: plugin.isEnabled(),
      status: plugin.getStatus ? plugin.getStatus() : 'unknown'
    }));
  }

  async enablePlugin(name) {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin ${name} not found`);
    }

    if (plugin.enable) {
      await plugin.enable();
    }

    this.emit('pluginEnabled', { name });
  }

  async disablePlugin(name) {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin ${name} not found`);
    }

    if (plugin.disable) {
      await plugin.disable();
    }

    this.emit('pluginDisabled', { name });
  }

  async configurePlugin(name, config) {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin ${name} not found`);
    }

    if (plugin.configure) {
      await plugin.configure(config);
    }

    this.emit('pluginConfigured', { name, config });
  }

  getHooks() {
    const hookInfo = {};

    for (const [hookName, handlers] of this.hooks) {
      hookInfo[hookName] = handlers.map(h => h.plugin);
    }

    return hookInfo;
  }

  async cleanup() {
    for (const [name, plugin] of this.plugins) {
      try {
        if (plugin.cleanup) {
          await plugin.cleanup();
        }
      } catch (error) {
        console.error(`Error cleaning up plugin ${name}:`, error.message);
      }
    }

    this.plugins.clear();
    this.hooks.clear();
    this.isInitialized = false;
  }
}

// Base Plugin Class
class BasePlugin {
  constructor(config = {}) {
    this.config = config;
    this.enabled = config.enabled !== false;
    this.initialized = false;
    this.messageCount = 0;
    this.lastResetTime = Date.now();
  }

  async initialize() {
    this.initialized = true;
  }

  async cleanup() {
    this.initialized = false;
  }

  getName() {
    return this.constructor.name;
  }

  getVersion() {
    return '1.0.0';
  }

  isEnabled() {
    return this.enabled && this.initialized;
  }

  async enable() {
    this.enabled = true;
  }

  async disable() {
    this.enabled = false;
  }

  async configure(config) {
    this.config = { ...this.config, ...config };
  }

  getStatus() {
    return {
      enabled: this.enabled,
      initialized: this.initialized,
      config: this.config
    };
  }

  // Hook methods to be overridden by plugins
  async onNotification(data) {
    // Override in plugin
  }

  async onAlert(data) {
    // Override in plugin
  }

  async onTradeNotification(data) {
    // Override in plugin
  }

  async onPerformanceReport(data) {
    // Override in plugin
  }

  // Utility methods
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${this.getName()}] [${level.toUpperCase()}] ${message}`);
  }

  error(message, error = null) {
    this.log(`ERROR: ${message}${error ? ` - ${error.message}` : ''}`, 'error');
  }

  formatMessage(template, data) {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] || match;
    });
  }

  validateConfig(requiredFields) {
    const missing = requiredFields.filter(field => !this.config[field]);
    if (missing.length > 0) {
      throw new Error(`Missing required configuration: ${missing.join(', ')}`);
    }
  }

  // Rate limiting
  checkRateLimit() {
    const now = Date.now();
    const rateLimitPerMinute = this.config.rateLimitPerMinute || 60;
    
    // Reset counter if more than a minute has passed
    if (now - this.lastResetTime > 60000) {
      this.messageCount = 0;
      this.lastResetTime = now;
    }
    
    // Check if we would exceed the rate limit
    if (this.messageCount >= rateLimitPerMinute) {
      return false;
    }
    
    // Increment counter and allow the message
    this.messageCount++;
    return true;
  }

  // Message formatting methods
  formatTradeMessage(trade) {
    return `Trade: ${trade.symbol} ${trade.side} ${trade.amount} at ${trade.price} (PnL: ${trade.pnl})`;
  }

  formatPerformanceMessage(performance) {
    return `Performance Report - Total PnL: ${performance.totalPnL}, Win Rate: ${performance.winRate}%, Total Trades: ${performance.totalTrades}, Max Drawdown: ${performance.maxDrawdown}%`;
  }
}

module.exports = {
  PluginManager,
  BasePlugin
};
