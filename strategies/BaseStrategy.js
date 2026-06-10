/**
 * Base Strategy Class
 * 
 * Provides a foundation for all trading strategies with:
 * - Dynamic parameter configuration with labels
 * - Standardized strategy interface
 * - Parameter validation and type checking
 * - Automatic parameter documentation
 */

export default class BaseStrategy {
  constructor() {
    this.name = 'Base Strategy';
    this.description = 'Base class for all trading strategies';
    this.author = 'Gekko Team';
    this.version = '1.0.0';
    this.category = 'base';
    
    // Strategy state
    this.initialized = false;
    this.position = null; // 'long', 'short', or null
    this.entryPrice = null;
    this.entryTime = null;
    
    // Parameter definitions with labels and validation
    this.parameterDefinitions = {};
    this.parameters = {};
    
    // Initialize default parameters
    this.initializeParameters();
  }

  /**
   * Initialize parameter definitions - override in child classes
   */
  initializeParameters() {
    this.defineParameter('stopLoss', {
      label: 'Stop Loss (%)',
      description: 'Maximum loss percentage before closing position',
      type: 'number',
      default: 5,
      min: 0.1,
      max: 20,
      step: 0.1,
      category: 'Risk Management'
    });
    
    this.defineParameter('takeProfit', {
      label: 'Take Profit (%)',
      description: 'Target profit percentage before closing position',
      type: 'number',
      default: 10,
      min: 0.5,
      max: 50,
      step: 0.5,
      category: 'Risk Management'
    });
  }

  /**
   * Define a parameter with validation and UI metadata
   * @param {string} name - Parameter name
   * @param {Object} definition - Parameter definition
   */
  defineParameter(name, definition) {
    const paramDef = {
      label: definition.label || name,
      description: definition.description || '',
      type: definition.type || 'number',
      default: definition.default,
      min: definition.min,
      max: definition.max,
      step: definition.step,
      options: definition.options, // For select type
      category: definition.category || 'General',
      required: definition.required !== false,
      validation: definition.validation || null
    };
    
    this.parameterDefinitions[name] = paramDef;
    this.parameters[name] = definition.default;
  }

  /**
   * Get parameter definitions for UI rendering
   * @returns {Object} Parameter definitions grouped by category
   */
  getParameterDefinitions() {
    const grouped = {};
    
    Object.entries(this.parameterDefinitions).forEach(([name, def]) => {
      const category = def.category || 'General';
      if (!grouped[category]) {
        grouped[category] = {};
      }
      grouped[category][name] = def;
    });
    
    return grouped;
  }

  /**
   * Get current parameter values
   * @returns {Object} Current parameter values
   */
  getParameters() {
    return { ...this.parameters };
  }

  /**
   * Update strategy parameters with validation
   * @param {Object} newParams - New parameter values
   * @throws {Error} If validation fails
   */
  updateParameters(newParams) {
    const validatedParams = {};
    
    Object.entries(newParams).forEach(([name, value]) => {
      const definition = this.parameterDefinitions[name];
      
      if (!definition) {
        console.warn(`Unknown parameter: ${name}`);
        return;
      }
      
      // Type validation
      const validatedValue = this.validateParameter(name, value, definition);
      validatedParams[name] = validatedValue;
    });
    
    // Apply validated parameters
    Object.assign(this.parameters, validatedParams);
    
    // Trigger parameter change hook
    this.onParametersChanged(validatedParams);
  }

  /**
   * Validate a single parameter
   * @param {string} name - Parameter name
   * @param {*} value - Parameter value
   * @param {Object} definition - Parameter definition
   * @returns {*} Validated value
   * @throws {Error} If validation fails
   */
  validateParameter(name, value, definition) {
    // Type conversion
    let validatedValue = value;
    
    switch (definition.type) {
      case 'number':
        validatedValue = Number(value);
        if (isNaN(validatedValue)) {
          throw new Error(`Parameter ${name} must be a number`);
        }
        
        if (definition.min !== undefined && validatedValue < definition.min) {
          throw new Error(`Parameter ${name} must be >= ${definition.min}`);
        }
        
        if (definition.max !== undefined && validatedValue > definition.max) {
          throw new Error(`Parameter ${name} must be <= ${definition.max}`);
        }
        break;
        
      case 'boolean':
        validatedValue = Boolean(value);
        break;
        
      case 'string':
        validatedValue = String(value);
        break;
        
      case 'select':
        if (definition.options && !definition.options.some(opt => opt.value === value)) {
          throw new Error(`Parameter ${name} must be one of: ${definition.options.map(o => o.value).join(', ')}`);
        }
        break;
    }
    
    // Custom validation
    if (definition.validation && typeof definition.validation === 'function') {
      const validationResult = definition.validation(validatedValue);
      if (validationResult !== true) {
        throw new Error(validationResult || `Invalid value for parameter ${name}`);
      }
    }
    
    return validatedValue;
  }

  /**
   * Hook called when parameters are changed
   * @param {Object} changedParams - Changed parameters
   */
  onParametersChanged(changedParams) {
    // Override in child classes if needed
  }

  /**
   * Initialize strategy (called once before backtesting starts)
   * @param {Object} config - Configuration object
   */
  init(config = {}) {
    this.currency = config.currency || 'USD';
    this.asset = config.asset || 'BTC';
    this.initialized = true;
    
    console.log(`Initialized ${this.name} for ${this.asset}/${this.currency}`);
    console.log('Parameters:', this.parameters);
  }

  /**
   * Main strategy logic - override in child classes
   * @param {Object} candle - Current candle data
   * @param {Array} historicalCandles - All historical candles
   * @param {Object} engine - Strategy engine with indicators
   * @returns {Object|null} Trading advice or null
   */
  async onCandle(candle, historicalCandles, engine) {
    throw new Error('onCandle method must be implemented in child class');
  }

  /**
   * Check risk management conditions
   * @param {number} currentPrice - Current market price
   * @param {number} timestamp - Current timestamp
   * @returns {Object|null} Exit signal or null
   */
  checkRiskManagement(currentPrice, timestamp) {
    if (!this.position || !this.entryPrice) {
      return null;
    }
    
    const pnlPercent = ((currentPrice - this.entryPrice) / this.entryPrice) * 100;
    
    // Stop loss check
    if (this.position === 'long' && pnlPercent <= -this.parameters.stopLoss) {
      return this.createExitSignal('stop_loss', currentPrice, timestamp, {
        reason: 'Stop loss triggered',
        pnl: pnlPercent
      });
    }
    
    // Take profit check
    if (this.position === 'long' && pnlPercent >= this.parameters.takeProfit) {
      return this.createExitSignal('take_profit', currentPrice, timestamp, {
        reason: 'Take profit triggered',
        pnl: pnlPercent
      });
    }
    
    return null;
  }

  /**
   * Create entry signal
   * @param {string} direction - 'long' or 'short'
   * @param {number} price - Entry price
   * @param {number} timestamp - Entry timestamp
   * @param {Object} metadata - Additional metadata
   * @returns {Object} Entry signal
   */
  createEntrySignal(direction, price, timestamp, metadata = {}) {
    this.position = direction;
    this.entryPrice = price;
    this.entryTime = timestamp;

    // A short entry is executed as a sell, a long entry as a buy. The
    // engines (backtester, portfolioManager) consume `action`/`side`, while
    // `direction` is kept for strategy-level bookkeeping.
    const action = direction === 'short' ? 'sell' : 'buy';

    return {
      type: 'entry',
      action,
      side: action,
      direction,
      price,
      amount: metadata.amount || 'all',
      stopLoss: metadata.stopLoss,
      takeProfit: metadata.takeProfit,
      timestamp,
      strategy: this.name,
      confidence: metadata.confidence || 0.5,
      metadata: {
        ...metadata,
        parameters: this.getParameters()
      }
    };
  }

  /**
   * Create exit signal
   * @param {string} reason - Exit reason
   * @param {number} price - Exit price
   * @param {number} timestamp - Exit timestamp
   * @param {Object} metadata - Additional metadata
   * @returns {Object} Exit signal
   */
  createExitSignal(reason, price, timestamp, metadata = {}) {
    // Closing a long means selling, closing a short means buying. Capture the
    // direction before the position state is reset below.
    const closingAction = this.position === 'short' ? 'buy' : 'sell';
    const pnlRaw = this.entryPrice ? ((price - this.entryPrice) / this.entryPrice) * 100 : 0;
    const pnl = this.position === 'short' ? -pnlRaw : pnlRaw;

    const signal = {
      type: 'exit',
      action: closingAction,
      side: closingAction,
      amount: 'all',
      reason,
      price,
      timestamp,
      strategy: this.name,
      entryPrice: this.entryPrice,
      entryTime: this.entryTime,
      duration: timestamp - this.entryTime,
      pnl,
      metadata: {
        ...metadata,
        parameters: this.getParameters()
      }
    };

    // Reset position
    this.position = null;
    this.entryPrice = null;
    this.entryTime = null;

    return signal;
  }

  /**
   * Get strategy information for UI display
   * @returns {Object} Strategy information
   */
  getInfo() {
    return {
      name: this.name,
      description: this.description,
      author: this.author,
      version: this.version,
      category: this.category,
      parameters: this.getParameterDefinitions(),
      currentValues: this.getParameters()
    };
  }

  /**
   * Reset strategy state
   */
  reset() {
    this.position = null;
    this.entryPrice = null;
    this.entryTime = null;
    this.initialized = false;
  }

  /**
   * Clone strategy with same parameters
   * @returns {BaseStrategy} Cloned strategy
   */
  clone() {
    const cloned = new this.constructor();
    cloned.updateParameters(this.getParameters());
    return cloned;
  }
}

// Named export for compatibility
export { BaseStrategy };

// CommonJS export for compatibility with tests (Jest/babel). Guarded so the
// file can also be loaded as native ESM (e.g. the CLI backtester's dynamic
// import), where `module` is undefined.
if (typeof module !== 'undefined') {
  module.exports = BaseStrategy;
}