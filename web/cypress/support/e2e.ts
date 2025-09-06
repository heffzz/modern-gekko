// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Global configuration
Cypress.on('uncaught:exception', (err, _runnable) => {
  // Returning false here prevents Cypress from
  // failing the test on uncaught exceptions
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false
  }
  if (err.message.includes('Non-Error promise rejection captured')) {
    return false
  }
  return true
})

// Custom commands for API mocking
Cypress.Commands.add('mockApi', (method: string, url: string, response: any, statusCode = 200) => {
  cy.intercept(method as any, url, {
    statusCode,
    body: response,
    headers: {
      'content-type': 'application/json',
    },
  })
})

Cypress.Commands.add('mockBacktestApi', () => {
  // Mock strategies endpoint
  cy.fixture('strategies').then((strategies) => {
    cy.mockApi('GET', '/api/strategies', strategies)
  })

  // Mock backtests list endpoint
  cy.fixture('backtests').then((backtests) => {
    cy.mockApi('GET', '/api/backtests', backtests)
  })

  // Mock backtest start endpoint
  cy.fixture('backtest-result').then((result) => {
    cy.mockApi('POST', '/api/backtests', result)
  })

  // Mock backtest progress endpoint
  cy.fixture('backtest-progress').then((progress) => {
    cy.mockApi('GET', '/api/backtests/*/progress', progress)
  })

  // Mock indicators endpoint
  cy.mockApi('GET', '/api/indicators', {
    indicators: [
      {
        id: 'sma',
        name: 'Simple Moving Average',
        category: 'trend',
        parameters: [
          { name: 'period', type: 'number', default: 20, min: 1, max: 200 }
        ]
      },
      {
        id: 'rsi',
        name: 'Relative Strength Index',
        category: 'momentum',
        parameters: [
          { name: 'period', type: 'number', default: 14, min: 2, max: 100 }
        ]
      }
    ]
  })
})

Cypress.Commands.add('uploadFile', (selector: string, fileName: string, fileType = 'text/csv') => {
  cy.fixture(fileName, 'base64').then((fileContent) => {
    cy.get(selector).selectFile({
      contents: Cypress.Buffer.from(fileContent, 'base64'),
      fileName,
      mimeType: fileType,
    }, { force: true })
  })
})

Cypress.Commands.add('waitForBacktestComplete', (backtestId: string) => {
  cy.intercept('GET', `/api/backtests/${backtestId}/progress`, {
    statusCode: 200,
    body: {
      progress: 100,
      status: 'completed',
      currentStep: 'Backtest completed successfully'
    }
  })
  
  cy.fixture('backtest-result').then((result) => {
    cy.intercept('GET', `/api/backtests/${backtestId}`, {
      statusCode: 200,
      body: { ...result, id: backtestId, status: 'completed' }
    })
  })
})

// Declare custom commands for TypeScript
declare global {
  namespace Cypress {
    interface Chainable {
      mockApi(method: string, url: string, response: any, statusCode?: number): Chainable<void>
      mockBacktestApi(): Chainable<void>
      uploadFile(selector: string, fileName: string, fileType?: string): Chainable<void>
      waitForBacktestComplete(backtestId: string): Chainable<void>
    }
  }
}
