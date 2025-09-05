# Modern Gekko

A modern fork of askmike/gekko - Trading bot and backtester with Vue 3 UI

## Features

- 📈 **Backtesting Engine**: Test your strategies against historical data
- 🤖 **Trading Bot**: Automated trading with multiple exchange support
- 📊 **Technical Indicators**: SMA, EMA, RSI and more
- 🎨 **Modern UI**: Vue 3 + Vite frontend
- 🐳 **Docker Support**: Easy deployment with Docker
- 🧪 **Comprehensive Testing**: Jest test suite
- 🔒 **Security First**: Safe handling of API keys and live trading

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- Docker (optional)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd modern-gekko

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev
```

### Usage

#### Development Mode

```bash
npm run dev
```

This starts both the API server and the Vue 3 frontend in development mode.

#### Production Mode

```bash
npm run build
npm start
```

#### Running Tests

```bash
npm test
```

#### Backtesting CLI

```bash
node src/engine/backtester.js --data test/sample-candles.csv --strategy strategies/sample-strategy.js
```

## Project Structure

```
modern-gekko/
├── src/
│   ├── server.js              # Main server file
│   ├── api/                   # API routes
│   ├── engine/                # Core trading engine
│   │   ├── backtester.js      # Backtesting CLI
│   │   ├── strategyEngine.js  # Strategy execution
│   │   └── portfolioSimulator.js # Portfolio simulation
│   ├── indicators/            # Technical indicators
│   │   ├── SMA.js
│   │   ├── EMA.js
│   │   └── RSI.js
│   ├── exchanges/             # Exchange connectors
│   │   └── mock.js
│   └── importers/             # Data importers
│       └── csvImporter.js
├── web/                       # Vue 3 frontend
├── strategies/                # Trading strategies
│   └── sample-strategy.js
├── test/                      # Test files
└── WORKLOG/                   # Build and test logs
```

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/backtest` - Run backtest

## Configuration

Copy `.env.example` to `.env` and configure your settings:

- **LIVE**: Set to `true` for live trading (requires manual confirmation)
- **Exchange API Keys**: Add your exchange credentials
- **Risk Management**: Configure position sizes and stop losses

## Safety Features

- 🔒 Live trading requires `LIVE=true` and manual confirmation
- 🚫 No real API keys in repository
- ⚠️ Comprehensive risk management settings
- 📝 Detailed logging and audit trails

## Docker

```bash
# Build and run with Docker Compose
docker-compose up --build

# Or build manually
npm run docker:build
npm run docker:up
```

## Development

### Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server
- `npm test` - Run tests
- `npm run lint` - Lint code
- `npm run build` - Build for production
- `npm run docker:build` - Build Docker image

### Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## Testing

The project includes comprehensive tests:

- Unit tests for indicators
- Integration tests for backtester
- API endpoint tests
- Strategy validation tests

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Disclaimer

⚠️ **Trading cryptocurrencies involves substantial risk of loss. This software is for educational and research purposes. Use at your own risk. The authors are not responsible for any financial losses.**

## Acknowledgments

- Original [Gekko](https://github.com/askmike/gekko) by Mike van Rossum
- Vue.js and Vite communities
- Node.js ecosystem contributors