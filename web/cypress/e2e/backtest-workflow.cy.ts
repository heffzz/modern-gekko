describe('Backtest Workflow', () => {
  beforeEach(() => {
    // Mock API responses
    cy.intercept('GET', '/api/strategies', {
      fixture: 'strategies.json'
    }).as('getStrategies')
    
    cy.intercept('GET', '/api/backtests', {
      fixture: 'backtests.json'
    }).as('getBacktests')
    
    cy.intercept('POST', '/api/backtest', {
      fixture: 'backtest-result.json'
    }).as('startBacktest')
    
    cy.intercept('GET', '/api/backtest/*/progress', {
      fixture: 'backtest-progress.json'
    }).as('getProgress')
    
    cy.visit('/backtest')
  })

  it('should complete full backtest workflow', () => {
    // Wait for page to load
    cy.wait('@getStrategies')
    cy.wait('@getBacktests')
    
    // Navigate to new backtest form
    cy.get('[data-testid="new-backtest-btn"]').click()
    
    // Select strategy
    cy.get('[data-testid="strategy-select"]').select('sample-strategy')
    
    // Upload CSV file
    cy.get('[data-testid="csv-file"]').selectFile('cypress/fixtures/sample-data.csv')
    
    // Set date range
    cy.get('[data-testid="start-date"]').type('2024-01-01')
    cy.get('[data-testid="end-date"]').type('2024-01-31')
    
    // Configure portfolio
    cy.get('[data-testid="initial-capital"]').clear().type('10000')
    cy.get('[data-testid="trading-fee"]').clear().type('0.001')
    
    // Adjust strategy parameters
    cy.get('[data-testid="parameter-period"]').clear().type('20')
    cy.get('[data-testid="parameter-threshold"]').clear().type('0.02')
    
    // Start backtest
    cy.get('[data-testid="run-backtest-btn"]').click()
    
    // Verify API call
    cy.wait('@startBacktest').then((interception) => {
      expect(interception.request.body).to.deep.include({
        strategyId: 'sample-strategy',
        parameters: {
          period: 20,
          threshold: 0.02
        },
        portfolio: {
          initialCapital: 10000,
          tradingFee: 0.001
        }
      })
    })
    
    // Verify redirect to results page
    cy.url().should('include', '/backtest/')
    
    // Verify progress monitoring
    cy.get('[data-testid="progress-bar"]').should('be.visible')
    cy.wait('@getProgress')
    
    // Verify results display
    cy.get('[data-testid="performance-metrics"]').should('be.visible')
    cy.get('[data-testid="equity-chart"]').should('be.visible')
    cy.get('[data-testid="trades-table"]').should('be.visible')
  })

  it('should validate form inputs', () => {
    // Try to submit without required fields
    cy.get('[data-testid="run-backtest-btn"]').click()
    
    // Verify validation errors
    cy.get('[data-testid="error-message"]').should('contain', 'Strategy is required')
    
    // Select strategy but leave other fields empty
    cy.get('[data-testid="strategy-select"]').select('sample-strategy')
    cy.get('[data-testid="run-backtest-btn"]').click()
    
    cy.get('[data-testid="error-message"]').should('contain', 'Start date is required')
    
    // Set invalid date range
    cy.get('[data-testid="start-date"]').type('2024-01-31')
    cy.get('[data-testid="end-date"]').type('2024-01-01')
    cy.get('[data-testid="run-backtest-btn"]').click()
    
    cy.get('[data-testid="error-message"]').should('contain', 'End date must be after start date')
  })

  it('should handle file upload validation', () => {
    // Try to upload invalid file type
    cy.get('[data-testid="csv-file"]').selectFile('cypress/fixtures/invalid-file.txt')
    
    cy.get('[data-testid="file-error"]').should('contain', 'Only CSV files are allowed')
    
    // Upload valid CSV file
    cy.get('[data-testid="csv-file"]').selectFile('cypress/fixtures/sample-data.csv')
    
    cy.get('[data-testid="file-success"]').should('contain', 'File uploaded successfully')
  })

  it('should update parameters when strategy changes', () => {
    // Select first strategy
    cy.get('[data-testid="strategy-select"]').select('sample-strategy')
    
    // Verify parameters are loaded
    cy.get('[data-testid="parameter-period"]').should('have.value', '20')
    cy.get('[data-testid="parameter-threshold"]').should('have.value', '0.02')
    
    // Change strategy
    cy.get('[data-testid="strategy-select"]').select('another-strategy')
    
    // Verify parameters are updated
    cy.get('[data-testid="parameter-period"]').should('have.value', '14')
    cy.get('[data-testid="parameter-lookback"]').should('exist')
  })

  it('should show/hide advanced options', () => {
    // Advanced options should be hidden by default
    cy.get('[data-testid="slippage-input"]').should('not.be.visible')
    
    // Toggle advanced options
    cy.get('[data-testid="advanced-toggle"]').click()
    
    // Advanced options should be visible
    cy.get('[data-testid="slippage-input"]').should('be.visible')
    cy.get('[data-testid="max-position-size"]').should('be.visible')
    
    // Toggle again to hide
    cy.get('[data-testid="advanced-toggle"]').click()
    
    cy.get('[data-testid="slippage-input"]').should('not.be.visible')
  })

  it('should handle backtest errors gracefully', () => {
    // Mock error response
    cy.intercept('POST', '/api/backtest', {
      statusCode: 400,
      body: { error: 'Invalid strategy parameters' }
    }).as('backtestError')
    
    // Fill form and submit
    cy.get('[data-testid="strategy-select"]').select('sample-strategy')
    cy.get('[data-testid="csv-file"]').selectFile('cypress/fixtures/sample-data.csv')
    cy.get('[data-testid="start-date"]').type('2024-01-01')
    cy.get('[data-testid="end-date"]').type('2024-01-31')
    cy.get('[data-testid="run-backtest-btn"]').click()
    
    // Verify error handling
    cy.wait('@backtestError')
    cy.get('[data-testid="error-message"]').should('contain', 'Invalid strategy parameters')
    
    // Verify form is still usable
    cy.get('[data-testid="run-backtest-btn"]').should('not.be.disabled')
  })

  it('should save and load backtest configurations', () => {
    // Configure backtest
    cy.get('[data-testid="strategy-select"]').select('sample-strategy')
    cy.get('[data-testid="start-date"]').type('2024-01-01')
    cy.get('[data-testid="end-date"]').type('2024-01-31')
    cy.get('[data-testid="initial-capital"]').clear().type('50000')
    
    // Save configuration
    cy.get('[data-testid="save-config-btn"]').click()
    cy.get('[data-testid="config-name"]').type('My Test Config')
    cy.get('[data-testid="save-confirm-btn"]').click()
    
    // Verify saved
    cy.get('[data-testid="success-message"]').should('contain', 'Configuration saved')
    
    // Reset form
    cy.get('[data-testid="reset-form-btn"]').click()
    
    // Load configuration
    cy.get('[data-testid="load-config-btn"]').click()
    cy.get('[data-testid="config-item"]').contains('My Test Config').click()
    
    // Verify loaded
    cy.get('[data-testid="strategy-select"]').should('have.value', 'sample-strategy')
    cy.get('[data-testid="initial-capital"]').should('have.value', '50000')
  })

  it('should display estimated backtest duration', () => {
    // Set date range
    cy.get('[data-testid="start-date"]').type('2024-01-01')
    cy.get('[data-testid="end-date"]').type('2024-01-31')
    
    // Verify duration estimate
    cy.get('[data-testid="estimated-duration"]').should('contain', '30 days')
    
    // Change date range
    cy.get('[data-testid="end-date"]').clear().type('2024-03-31')
    
    cy.get('[data-testid="estimated-duration"]').should('contain', '90 days')
  })

  it('should handle real-time progress updates', () => {
    // Mock progressive updates
    let progressValue = 0
    cy.intercept('GET', '/api/backtest/*/progress', (req) => {
      progressValue += 10
      req.reply({
        progress: Math.min(progressValue, 100),
        status: progressValue >= 100 ? 'completed' : 'running',
        currentStep: `Processing ${progressValue}%`,
        estimatedTimeRemaining: Math.max(0, (100 - progressValue) * 1000)
      })
    }).as('getProgressUpdates')
    
    // Start backtest
    cy.get('[data-testid="strategy-select"]').select('sample-strategy')
    cy.get('[data-testid="csv-file"]').selectFile('cypress/fixtures/sample-data.csv')
    cy.get('[data-testid="start-date"]').type('2024-01-01')
    cy.get('[data-testid="end-date"]').type('2024-01-31')
    cy.get('[data-testid="run-backtest-btn"]').click()
    
    // Verify progress updates
    cy.wait('@startBacktest')
    cy.get('[data-testid="progress-bar"]').should('be.visible')
    
    // Wait for multiple progress updates
    cy.wait('@getProgressUpdates')
    cy.get('[data-testid="progress-text"]').should('contain', 'Processing')
    
    // Verify completion
    cy.wait('@getProgressUpdates', { timeout: 10000 })
    cy.get('[data-testid="progress-bar"]').should('not.exist')
    cy.get('[data-testid="results-section"]').should('be.visible')
  })
})