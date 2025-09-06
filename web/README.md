# Modern Gekko Frontend

A modern Vue 3 + TypeScript frontend for the Modern Gekko trading bot platform.

## Features

### 🎨 Modern UI/UX
- **Dark/Light Theme System**: Complete theme switching with system preference detection
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Accessibility**: WCAG AA compliant with keyboard navigation and screen reader support
- **Performance Optimized**: Lazy loading, code splitting, and optimized bundle size

### 📊 Trading Dashboard
- Real-time server health monitoring
- Strategy and indicator statistics
- Recent activity feed
- Quick action shortcuts

### 📈 Advanced Charting
- **Lightweight Charts Integration**: High-performance candlestick charts
- **Technical Indicators**: 50+ built-in indicators with real-time overlay
- **Custom Indicators**: Add your own indicators with preview functionality
- **Multi-timeframe Support**: Switch between different timeframes seamlessly

### ⚡ Strategy Development
- **Monaco Editor**: Full-featured code editor with syntax highlighting
- **Strategy Templates**: Pre-built templates for common trading strategies
- **Live Preview**: Test strategies with historical data
- **Gekko Lifecycle Compatible**: Full compatibility with original Gekko strategy format

### 🧪 Backtesting Engine
- **Interactive Backtesting**: Upload CSV data and run backtests
- **Comprehensive Reports**: Detailed metrics including ROI, Sharpe ratio, max drawdown
- **Equity Curve Visualization**: Interactive charts showing strategy performance
- **Trade Analysis**: Detailed trade-by-trade breakdown

### 🔍 Parameter Optimization
- **Grid Search**: Automated parameter sweep with heatmap visualization
- **Performance Metrics**: Compare different parameter combinations
- **Export Results**: Save optimization results for further analysis

### 📚 Indicator Library
- **50+ Technical Indicators**: Comprehensive collection of trading indicators
- **Category Organization**: Organized by trend, momentum, volatility, etc.
- **Real-time Preview**: See indicator calculations before adding to chart
- **Custom Parameters**: Adjust indicator settings with live preview

## Technology Stack

- **Frontend Framework**: Vue 3 with Composition API
- **Language**: TypeScript for type safety
- **Build Tool**: Vite for fast development and optimized builds
- **Styling**: Tailwind CSS for utility-first styling
- **State Management**: Pinia for reactive state management
- **Charts**: TradingView Lightweight Charts
- **Code Editor**: Monaco Editor (VS Code editor)
- **Testing**: Vitest + Cypress for unit and E2E testing
- **Icons**: Heroicons for consistent iconography

## Project Structure

```
web/
├── src/
│   ├── components/          # Reusable Vue components
│   │   ├── charts/         # Chart-related components
│   │   ├── indicators/     # Indicator library components
│   │   ├── strategy/       # Strategy editor components
│   │   ├── backtest/       # Backtesting components
│   │   └── ui/            # Base UI components
│   ├── views/              # Page-level components
│   ├── stores/             # Pinia state stores
│   ├── services/           # API and external services
│   ├── composables/        # Vue composition functions
│   ├── types/              # TypeScript type definitions
│   ├── utils/              # Utility functions
│   └── assets/             # Static assets
├── cypress/                # E2E tests
├── src/tests/              # Unit tests
└── public/                 # Public static files
```

## Getting Started

### Prerequisites

- Node.js >= 18
- npm or yarn
- Modern Gekko backend running on port 3000

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Run E2E tests
npm run test:e2e

# Lint code
npm run lint
```

### Environment Configuration

Create a `.env.local` file:

```env
# API Configuration
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000

# Feature Flags
VITE_ENABLE_LIVE_TRADING=false
VITE_ENABLE_WEBSOCKET=true

# Theme Configuration
VITE_DEFAULT_THEME=system
```

## Development Guide

### Adding New Indicators

1. **Backend**: Add indicator to `src/indicators/` in the main project
2. **Frontend**: The indicator will automatically appear in the library
3. **Custom UI**: Optionally create custom parameter components in `components/indicators/`

### Creating Custom Strategies

1. Use the Strategy Editor in the frontend
2. Follow the Gekko lifecycle format:
   ```javascript
   const strategy = {
     init() {
       // Initialize strategy
     },
     update(candle) {
       // Process new candle
     },
     check(candle) {
       // Check for trading signals
     },
     onTrade(trade) {
       // Handle trade execution
     }
   }
   ```

### Theme Customization

The theme system supports:
- **Light Theme**: Clean, professional appearance
- **Dark Theme**: Easy on the eyes for extended use
- **System Theme**: Automatically follows OS preference
- **Custom Themes**: Extend with your own color schemes

### Performance Optimization

- **Lazy Loading**: Routes and components are loaded on demand
- **Code Splitting**: Vendor libraries are split into separate chunks
- **Tree Shaking**: Unused code is eliminated from the bundle
- **Image Optimization**: SVG icons for scalability and performance

## API Integration

The frontend integrates with the Modern Gekko backend through:

- **REST API**: For data fetching and strategy management
- **WebSocket**: For real-time updates and live trading
- **File Upload**: For CSV data and strategy files

### API Endpoints Used

- `GET /api/health` - Server health status
- `GET /api/indicators` - Available indicators
- `POST /api/indicators/:name/preview` - Indicator preview
- `POST /api/backtest` - Run backtest
- `GET /api/strategies` - Strategy management

## Testing

### Unit Tests

```bash
# Run unit tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### E2E Tests

```bash
# Run E2E tests
npm run test:e2e

# Run in headed mode
npm run test:e2e:headed
```

### Test Coverage

- **Components**: All major components have unit tests
- **Stores**: State management logic is thoroughly tested
- **Services**: API services have mock-based tests
- **E2E**: Critical user workflows are covered

## Accessibility Features

- **Keyboard Navigation**: Full keyboard support for all interactive elements
- **Screen Reader Support**: Proper ARIA labels and semantic HTML
- **High Contrast**: Theme system supports high contrast modes
- **Focus Management**: Clear focus indicators and logical tab order
- **Reduced Motion**: Respects user's motion preferences

## Browser Support

- Chrome/Chromium 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

1. Follow the existing code style and conventions
2. Add tests for new features
3. Update documentation as needed
4. Ensure accessibility compliance
5. Test across different browsers and devices

## License

MIT License - see the main project LICENSE file for details.
