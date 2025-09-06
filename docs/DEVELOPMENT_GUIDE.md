# Modern Gekko Development Guide

This guide provides detailed instructions for extending Modern Gekko with custom indicators and strategies.

## Adding Custom Indicators

### Backend Implementation

1. **Create Indicator File**

Create a new file in `src/indicators/` following this template:

```javascript
// src/indicators/MyCustomIndicator.js
class MyCustomIndicator {
  constructor(options = {}) {
    this.period = options.period || 14;
    this.values = [];
    this.results = [];
  }

  update(price) {
    this.values.push(price);
    
    if (this.values.length > this.period) {
      this.values.shift();
    }
    
    if (this.values.length === this.period) {
      const result = this.calculate();
      this.results.push(result);
      return result;
    }
    
    return null;
  }

  calculate() {
    // Implement your indicator logic here
    const sum = this.values.reduce((a, b) => a + b, 0);
    return sum / this.values.length;
  }

  getResult() {
    return this.results[this.results.length - 1];
  }

  static getMetadata() {
    return {
      name: 'MyCustomIndicator',
      description: 'A custom indicator example',
      category: 'trend',
      parameters: [
        {
          name: 'period',
          type: 'number',
          default: 14,
          min: 1,
          max: 100,
          description: 'Period for calculation'
        }
      ],
      outputs: [
        {
          name: 'value',
          type: 'line',
          color: '#3B82F6'
        }
      ]
    };
  }
}

module.exports = MyCustomIndicator;
```

2. **Register Indicator**

Add your indicator to the indicator registry in `src/indicators/index.js`:

```javascript
const MyCustomIndicator = require('./MyCustomIndicator');

const indicators = {
  // ... existing indicators
  MyCustomIndicator,
};

module.exports = indicators;
```

3. **Add Tests**

Create tests in `test/indicators/MyCustomIndicator.test.js`:

```javascript
const MyCustomIndicator = require('../../src/indicators/MyCustomIndicator');

describe('MyCustomIndicator', () => {
  let indicator;

  beforeEach(() => {
    indicator = new MyCustomIndicator({ period: 3 });
  });

  test('should calculate correctly', () => {
    indicator.update(10);
    indicator.update(20);
    const result = indicator.update(30);
    
    expect(result).toBe(20); // (10 + 20 + 30) / 3
  });

  test('should return metadata', () => {
    const metadata = MyCustomIndicator.getMetadata();
    expect(metadata.name).toBe('MyCustomIndicator');
    expect(metadata.parameters).toHaveLength(1);
  });
});
```

### Frontend Integration

The frontend will automatically detect your new indicator through the API. To add custom UI components:

1. **Create Parameter Component** (optional)

Create `web/src/components/indicators/MyCustomIndicatorParams.vue`:

```vue
<template>
  <div class="space-y-4">
    <div>
      <label class="block text-sm font-medium mb-2">Period</label>
      <input
        v-model.number="localParams.period"
        type="number"
        :min="1"
        :max="100"
        class="w-full px-3 py-2 border rounded-md"
        @input="updateParams"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

interface Props {
  params: Record<string, any>;
}

interface Emits {
  (e: 'update', params: Record<string, any>): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const localParams = ref({ ...props.params });

watch(() => props.params, (newParams) => {
  localParams.value = { ...newParams };
}, { deep: true });

const updateParams = () => {
  emit('update', { ...localParams.value });
};
</script>
```

2. **Register Component**

Add to `web/src/components/indicators/index.ts`:

```typescript
import MyCustomIndicatorParams from './MyCustomIndicatorParams.vue';

export const indicatorComponents = {
  // ... existing components
  MyCustomIndicator: MyCustomIndicatorParams,
};
```

## Creating Custom Strategies

### Strategy Structure

Strategies follow the Gekko lifecycle format:

```javascript
// strategies/my-strategy.js
const strategy = {
  // Strategy metadata
  name: 'My Custom Strategy',
  description: 'A custom trading strategy',
  author: 'Your Name',
  version: '1.0.0',
  
  // Strategy parameters
  parameters: {
    fastPeriod: 10,
    slowPeriod: 21,
    signal: 9,
    thresholds: {
      down: -0.025,
      up: 0.025
    }
  },

  // Required indicators
  requiredIndicators: ['MACD'],

  // Initialize strategy
  init() {
    // Set up indicators
    this.addIndicator('MACD', 'macd', {
      fast: this.parameters.fastPeriod,
      slow: this.parameters.slowPeriod,
      signal: this.parameters.signal
    });

    // Initialize state
    this.trend = {
      direction: 'none',
      duration: 0,
      persisted: false,
      adviced: false
    };
  },

  // Process each candle
  update(candle) {
    // Update indicators (handled automatically)
    // Access indicator values via this.indicators.macd
  },

  // Check for trading signals
  check(candle) {
    const macd = this.indicators.macd;
    
    if (!macd.result) {
      return;
    }

    const { macd: macdLine, signal, histogram } = macd.result;
    const diff = macdLine - signal;

    // Determine trend
    if (diff > this.parameters.thresholds.up) {
      this.trend.direction = 'up';
    } else if (diff < this.parameters.thresholds.down) {
      this.trend.direction = 'down';
    } else {
      this.trend.direction = 'none';
    }

    // Generate signals
    if (this.trend.direction === 'up' && !this.trend.adviced) {
      this.trend.adviced = true;
      this.advice('long');
    } else if (this.trend.direction === 'down' && !this.trend.adviced) {
      this.trend.adviced = true;
      this.advice('short');
    } else if (this.trend.direction === 'none' && this.trend.adviced) {
      this.trend.adviced = false;
      this.advice('close');
    }
  },

  // Handle trade execution
  onTrade(trade) {
    this.log(`Trade executed: ${trade.action} at ${trade.price}`);
  },

  // Handle portfolio updates
  onPortfolioChange(portfolio) {
    this.log(`Portfolio value: ${portfolio.balance + portfolio.asset * portfolio.price}`);
  },

  // Custom logging
  log(message) {
    console.log(`[${this.name}] ${message}`);
  }
};

module.exports = strategy;
```

### Strategy Templates

Common strategy patterns:

#### 1. Moving Average Crossover

```javascript
const maCrossover = {
  name: 'MA Crossover',
  parameters: {
    short: 10,
    long: 21
  },
  requiredIndicators: ['SMA'],
  
  init() {
    this.addIndicator('SMA', 'short', { period: this.parameters.short });
    this.addIndicator('SMA', 'long', { period: this.parameters.long });
    this.trend = { direction: 'none', adviced: false };
  },
  
  check() {
    const short = this.indicators.short.result;
    const long = this.indicators.long.result;
    
    if (!short || !long) return;
    
    if (short > long && this.trend.direction !== 'up') {
      this.trend = { direction: 'up', adviced: true };
      this.advice('long');
    } else if (short < long && this.trend.direction !== 'down') {
      this.trend = { direction: 'down', adviced: true };
      this.advice('short');
    }
  }
};
```

#### 2. RSI Mean Reversion

```javascript
const rsiMeanReversion = {
  name: 'RSI Mean Reversion',
  parameters: {
    period: 14,
    overbought: 70,
    oversold: 30
  },
  requiredIndicators: ['RSI'],
  
  init() {
    this.addIndicator('RSI', 'rsi', { period: this.parameters.period });
    this.position = 'none';
  },
  
  check() {
    const rsi = this.indicators.rsi.result;
    
    if (!rsi) return;
    
    if (rsi < this.parameters.oversold && this.position !== 'long') {
      this.position = 'long';
      this.advice('long');
    } else if (rsi > this.parameters.overbought && this.position !== 'short') {
      this.position = 'short';
      this.advice('short');
    } else if (rsi > 40 && rsi < 60 && this.position !== 'none') {
      this.position = 'none';
      this.advice('close');
    }
  }
};
```

### Testing Strategies

1. **Unit Tests**

Create `test/strategies/my-strategy.test.js`:

```javascript
const Strategy = require('../../src/engine/strategyEngine');
const myStrategy = require('../../strategies/my-strategy');

describe('My Strategy', () => {
  let strategy;
  
  beforeEach(() => {
    strategy = new Strategy(myStrategy);
  });
  
  test('should initialize correctly', () => {
    expect(strategy.name).toBe('My Custom Strategy');
    expect(strategy.parameters.fastPeriod).toBe(10);
  });
  
  test('should generate buy signal', () => {
    // Mock candle data and test signal generation
    const candles = [
      { close: 100, timestamp: 1000 },
      { close: 105, timestamp: 2000 },
      // ... more test data
    ];
    
    const signals = [];
    strategy.onAdvice = (advice) => signals.push(advice);
    
    candles.forEach(candle => {
      strategy.update(candle);
      strategy.check(candle);
    });
    
    expect(signals).toContain('long');
  });
});
```

2. **Backtesting**

Test with historical data:

```bash
# Run backtest
node src/engine/backtester.js \
  --data test/sample-candles.csv \
  --strategy strategies/my-strategy.js \
  --output results/my-strategy-backtest.json
```

## Best Practices

### Indicator Development

1. **Performance**: Use efficient algorithms for calculations
2. **Memory**: Limit stored values to necessary minimum
3. **Validation**: Validate input parameters
4. **Documentation**: Provide clear parameter descriptions
5. **Testing**: Write comprehensive unit tests

### Strategy Development

1. **Risk Management**: Implement proper position sizing
2. **Signal Quality**: Avoid over-optimization
3. **Robustness**: Test across different market conditions
4. **Documentation**: Document strategy logic and parameters
5. **Backtesting**: Validate with out-of-sample data

### Code Quality

1. **ESLint**: Follow project linting rules
2. **Comments**: Document complex logic
3. **Error Handling**: Handle edge cases gracefully
4. **Modularity**: Keep functions small and focused
5. **Version Control**: Use meaningful commit messages

## Debugging

### Strategy Debugging

```javascript
// Add debug logging
check(candle) {
  const macd = this.indicators.macd;
  
  if (this.debug) {
    console.log({
      timestamp: candle.timestamp,
      price: candle.close,
      macd: macd.result,
      trend: this.trend
    });
  }
  
  // ... strategy logic
}
```

### Indicator Debugging

```javascript
update(price) {
  this.values.push(price);
  
  if (this.debug) {
    console.log({
      input: price,
      values: this.values,
      result: this.calculate()
    });
  }
  
  // ... indicator logic
}
```

## Deployment

### Production Checklist

- [ ] All tests passing
- [ ] Code linted and formatted
- [ ] Strategy backtested on multiple datasets
- [ ] Risk parameters validated
- [ ] Documentation updated
- [ ] Performance benchmarked
- [ ] Error handling tested

### Monitoring

1. **Logging**: Implement structured logging
2. **Metrics**: Track strategy performance
3. **Alerts**: Set up failure notifications
4. **Backup**: Regular strategy and data backups

For more information, see the main project documentation and API reference.