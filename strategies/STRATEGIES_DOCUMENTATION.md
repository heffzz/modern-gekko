# Gekko Trading Strategies Documentation

Questo documento fornisce una guida completa alle strategie di trading implementate nel sistema Gekko, con parametri configurabili dinamicamente attraverso etichette (labels).

## Indice

1. [Panoramica](#panoramica)
2. [Struttura Base](#struttura-base)
3. [Strategie Disponibili](#strategie-disponibili)
   - [DEMA Strategy](#dema-strategy)
   - [MACD Strategy](#macd-strategy)
   - [RSI Strategy](#rsi-strategy)
   - [PPO Strategy](#ppo-strategy)
   - [StochRSI Strategy](#stochrsi-strategy)
   - [CCI Strategy](#cci-strategy)
   - [Bollinger Bands Strategy](#bollinger-bands-strategy)
4. [Configurazione Parametri](#configurazione-parametri)
5. [Esempi di Utilizzo](#esempi-di-utilizzo)
6. [Best Practices](#best-practices)

## Panoramica

Il sistema di strategie Gekko implementa tutte le principali strategie di trading della documentazione ufficiale originale, con un sistema modulare e configurabile che permette la personalizzazione dinamica dei parametri attraverso un'interfaccia utente intuitiva.

### Caratteristiche Principali

- **Parametri Configurabili**: Ogni strategia include etichette (labels) per la modifica dinamica dei parametri
- **Sistema Modulare**: Architettura basata su classe base comune per consistenza
- **Gestione del Rischio**: Risk management integrato in tutte le strategie
- **Validazione Parametri**: Validazione automatica dei parametri con messaggi di errore descrittivi
- **Multi-modalità**: Diverse modalità di trading per ogni strategia
- **Indicatori Avanzati**: Calcolo di indicatori tecnici con ottimizzazioni per performance

## Struttura Base

Tutte le strategie estendono la classe `BaseStrategy` che fornisce:

```javascript
// Struttura base comune
class BaseStrategy {
  constructor() {
    this.parameters = {};
    this.position = null;
    this.entryPrice = null;
    this.initialized = false;
  }
  
  // Metodi comuni
  defineParameter(name, config) { /* ... */ }
  updateParameters(newParams) { /* ... */ }
  validateParameters() { /* ... */ }
  checkRiskManagement() { /* ... */ }
  createEntrySignal() { /* ... */ }
  createExitSignal() { /* ... */ }
}
```

### Sistema di Etichette (Labels)

Ogni parametro include etichette descrittive:

```javascript
this.defineParameter('period', {
  label: 'Periodo',                    // Etichetta visualizzata
  description: 'Periodo per il calcolo', // Descrizione dettagliata
  type: 'number',                      // Tipo di dato
  default: 20,                         // Valore predefinito
  min: 5,                             // Valore minimo
  max: 50,                            // Valore massimo
  step: 1,                            // Incremento
  category: 'Impostazioni Base'        // Categoria per raggruppamento
});
```

## Strategie Disponibili

### DEMA Strategy

**Descrizione**: Strategia basata su Double Exponential Moving Average per ridurre il lag delle medie mobili tradizionali.

**File**: `DEMAStrategy.js`

**Parametri Principali**:
- `fastPeriod` (5-20): Periodo DEMA veloce
- `slowPeriod` (20-50): Periodo DEMA lenta
- `tradingMode`: Modalità di trading (crossover, trend_following, etc.)
- `volatilityFilter`: Filtro di volatilità ATR
- `confirmationBars`: Barre di conferma segnale

**Modalità di Trading**:
1. **Crossover**: Segnali su incrocio DEMA veloce/lenta
2. **Trend Following**: Seguimento del trend con DEMA
3. **Pullback**: Entrata su pullback al trend
4. **Breakout**: Entrata su breakout con conferma DEMA

**Esempio Configurazione**:
```javascript
const demaConfig = {
  fastPeriod: 12,
  slowPeriod: 26,
  tradingMode: 'crossover',
  volatilityFilter: true,
  atrPeriod: 14,
  confirmationBars: 2
};
```

### MACD Strategy

**Descrizione**: Moving Average Convergence Divergence con rilevamento divergenze e multiple modalità di segnale.

**File**: `MACDStrategy.js`

**Parametri Principali**:
- `fastEMA` (8-15): Periodo EMA veloce
- `slowEMA` (20-30): Periodo EMA lenta
- `signalEMA` (7-12): Periodo EMA segnale
- `tradingMode`: Modalità (crossover, zero_line, divergence, etc.)
- `divergenceDetection`: Rilevamento divergenze

**Modalità di Trading**:
1. **Crossover**: Incrocio MACD/Signal line
2. **Zero Line**: Attraversamento linea zero
3. **Divergence**: Rilevamento divergenze
4. **Histogram**: Analisi istogramma MACD
5. **Trend Strength**: Forza del trend

**Esempio Configurazione**:
```javascript
const macdConfig = {
  fastEMA: 12,
  slowEMA: 26,
  signalEMA: 9,
  tradingMode: 'crossover',
  divergenceDetection: true,
  divergencePeriod: 20
};
```

### RSI Strategy

**Descrizione**: Relative Strength Index con livelli dinamici, multi-timeframe e rilevamento divergenze.

**File**: `RSIStrategy.js`

**Parametri Principali**:
- `period` (10-20): Periodo RSI
- `overboughtLevel` (70-85): Livello ipercomprato
- `oversoldLevel` (15-30): Livello ipervenduto
- `tradingMode`: Modalità (levels, divergence, trend, etc.)
- `dynamicLevels`: Livelli dinamici

**Modalità di Trading**:
1. **Levels**: Trading su livelli overbought/oversold
2. **Divergence**: Rilevamento divergenze
3. **Trend**: Filtro di trend
4. **Multi-Timeframe**: Analisi multi-timeframe
5. **Mean Reversion**: Ritorno alla media

**Esempio Configurazione**:
```javascript
const rsiConfig = {
  period: 14,
  overboughtLevel: 75,
  oversoldLevel: 25,
  tradingMode: 'levels',
  dynamicLevels: true,
  trendFilter: 'ema'
};
```

### PPO Strategy

**Descrizione**: Percentage Price Oscillator, versione percentuale del MACD per comparazioni cross-asset.

**File**: `PPOStrategy.js`

**Parametri Principali**:
- `fastEMA` (8-15): Periodo EMA veloce
- `slowEMA` (20-30): Periodo EMA lenta
- `signalEMA` (7-12): Periodo EMA segnale
- `tradingMode`: Modalità di trading
- `percentageThreshold`: Soglia percentuale

**Modalità di Trading**:
1. **Crossover**: Incrocio PPO/Signal
2. **Zero Line**: Attraversamento zero
3. **Threshold**: Soglie percentuali
4. **Divergence**: Rilevamento divergenze

### StochRSI Strategy

**Descrizione**: Stochastic RSI che combina Stochastic Oscillator e RSI per segnali più sensibili.

**File**: `StochRSIStrategy.js`

**Parametri Principali**:
- `rsiPeriod` (10-20): Periodo RSI
- `stochPeriod` (10-20): Periodo Stochastic
- `kPeriod` (3-5): Periodo %K
- `dPeriod` (3-5): Periodo %D
- `tradingMode`: Modalità (crossover, levels, hybrid)

**Modalità di Trading**:
1. **Crossover**: Incrocio %K/%D
2. **Levels**: Livelli overbought/oversold
3. **Hybrid**: Combinazione segnali
4. **Divergence**: Rilevamento divergenze

### CCI Strategy

**Descrizione**: Commodity Channel Index per identificare condizioni di ipercomprato/ipervenduto e trend.

**File**: `CCIStrategy.js`

**Parametri Principali**:
- `period` (14-25): Periodo CCI
- `overboughtLevel` (100-150): Livello ipercomprato
- `oversoldLevel` (-150 a -100): Livello ipervenduto
- `tradingMode`: Modalità (standard, zero_line, extreme)

**Modalità di Trading**:
1. **Standard**: Livelli +100/-100
2. **Zero Line**: Attraversamento linea zero
3. **Extreme**: Livelli estremi ±200
4. **Trend**: Analisi trend
5. **Divergence**: Rilevamento divergenze

### Bollinger Bands Strategy

**Descrizione**: Bollinger Bands con analisi volatilità, squeeze detection e multiple modalità di trading.

**File**: `BollingerBandsStrategy.js`

**Parametri Principali**:
- `period` (15-25): Periodo media mobile
- `standardDeviations` (1.5-2.5): Deviazioni standard
- `tradingMode`: Modalità (mean_reversion, breakout, squeeze)
- `squeezeThreshold`: Soglia squeeze
- `adaptiveBands`: Bande adattive

**Modalità di Trading**:
1. **Mean Reversion**: Ritorno alla media
2. **Breakout**: Rottura delle bande
3. **Squeeze**: Breakout dopo squeeze
4. **%B Oscillator**: Oscillatore %B
5. **Walking Bands**: Camminata sulle bande
6. **Hybrid**: Segnali multipli

## Configurazione Parametri

### Struttura Parametro

Ogni parametro segue questa struttura:

```javascript
{
  label: 'Etichetta Visualizzata',
  description: 'Descrizione dettagliata del parametro',
  type: 'number|boolean|select|string',
  default: valorePredefinito,
  min: valoreMinimo,        // Solo per type: 'number'
  max: valoreMassimo,       // Solo per type: 'number'
  step: incremento,         // Solo per type: 'number'
  options: [...],           // Solo per type: 'select'
  category: 'Categoria',
  validation: function(value) { /* validazione custom */ }
}
```

### Categorie Parametri

I parametri sono organizzati in categorie per una migliore UX:

- **Impostazioni Base**: Parametri principali della strategia
- **Modalità Trading**: Selezione modalità di trading
- **Filtri Segnale**: Filtri per conferma segnali
- **Gestione Rischio**: Parametri risk management
- **Funzionalità Avanzate**: Opzioni avanzate

### Validazione Parametri

Il sistema include validazione automatica:

```javascript
// Validazione automatica
validation: (value) => {
  if (value >= this.parameters.overboughtLevel) {
    return 'Il livello oversold deve essere minore di overbought';
  }
  return true;
}
```

## Esempi di Utilizzo

### Inizializzazione Strategia

```javascript
import DEMAStrategy from './strategies/DEMAStrategy.js';

// Creare istanza strategia
const strategy = new DEMAStrategy();

// Configurare parametri
strategy.updateParameters({
  fastPeriod: 12,
  slowPeriod: 26,
  tradingMode: 'crossover',
  volatilityFilter: true
});

// Inizializzare
await strategy.init();
```

### Elaborazione Candele

```javascript
// Elaborare nuova candela
const signal = await strategy.onCandle(candle, historicalCandles, engine);

if (signal) {
  console.log('Segnale generato:', signal);
  // signal.direction: 'long' | 'short'
  // signal.price: prezzo di entrata
  // signal.metadata: informazioni aggiuntive
}
```

### Aggiornamento Parametri Dinamico

```javascript
// Aggiornare parametri durante l'esecuzione
strategy.updateParameters({
  fastPeriod: 10,
  confirmationBars: 3
});

// Ottenere valori indicatori correnti
const indicators = strategy.getIndicatorValues();
console.log('DEMA veloce:', indicators.fastDEMA);
console.log('DEMA lenta:', indicators.slowDEMA);
```

### Configurazione UI

```javascript
// Ottenere definizioni parametri per UI
const parameterDefinitions = strategy.getParameterDefinitions();

// Raggruppare per categoria
const categorizedParams = {};
for (const [name, config] of Object.entries(parameterDefinitions)) {
  const category = config.category || 'Generale';
  if (!categorizedParams[category]) {
    categorizedParams[category] = {};
  }
  categorizedParams[category][name] = config;
}
```

## Best Practices

### 1. Configurazione Parametri

- **Iniziare con valori predefiniti**: I valori di default sono ottimizzati per la maggior parte dei casi
- **Testare modifiche gradualmente**: Cambiare un parametro alla volta per valutare l'impatto
- **Utilizzare backtesting**: Testare sempre le configurazioni su dati storici
- **Considerare la correlazione**: Alcuni parametri sono correlati (es. fast/slow periods)

### 2. Selezione Modalità Trading

- **Mercati trending**: Utilizzare modalità trend-following
- **Mercati laterali**: Preferire modalità mean-reversion
- **Alta volatilità**: Attivare filtri di volatilità
- **Bassa liquidità**: Aumentare periodi di conferma

### 3. Gestione del Rischio

- **Sempre attivare stop loss**: Impostare stop loss appropriati
- **Dimensionamento posizioni**: Utilizzare position sizing basato su volatilità
- **Diversificazione**: Non utilizzare una sola strategia
- **Monitoraggio continuo**: Verificare performance regolarmente

### 4. Ottimizzazione Performance

- **Evitare over-optimization**: Non ottimizzare eccessivamente sui dati storici
- **Validazione out-of-sample**: Testare su dati non utilizzati per ottimizzazione
- **Robustezza parametri**: Verificare che piccole variazioni non cambino drasticamente i risultati
- **Costi di transazione**: Considerare spread e commissioni

### 5. Monitoraggio e Manutenzione

- **Log dettagliati**: Mantenere log di tutti i segnali e decisioni
- **Metriche performance**: Monitorare Sharpe ratio, max drawdown, win rate
- **Adattamento mercato**: Adattare parametri ai cambiamenti di mercato
- **Backup configurazioni**: Salvare configurazioni funzionanti

## Troubleshooting

### Problemi Comuni

1. **Nessun segnale generato**:
   - Verificare che ci siano abbastanza dati storici
   - Controllare i filtri di conferma (potrebbero essere troppo restrittivi)
   - Verificare la modalità di trading selezionata

2. **Troppi segnali falsi**:
   - Aumentare i periodi di conferma
   - Attivare filtri di volatilità
   - Utilizzare cooldown tra segnali

3. **Performance scadenti**:
   - Rivedere la selezione della modalità di trading
   - Ottimizzare i parametri con backtesting
   - Considerare condizioni di mercato diverse

4. **Errori di validazione**:
   - Verificare che i parametri siano nei range consentiti
   - Controllare le dipendenze tra parametri
   - Consultare i messaggi di errore specifici

### Supporto e Documentazione

Per ulteriori informazioni:
- Consultare i commenti nel codice sorgente
- Eseguire i test unitari per esempi di utilizzo
- Verificare i log di debug per informazioni dettagliate
- Utilizzare il metodo `getIndicatorValues()` per debugging

---

*Documentazione aggiornata per Gekko Trading Strategies v1.0.0*
*Per segnalazioni di bug o richieste di funzionalità, consultare il repository del progetto*