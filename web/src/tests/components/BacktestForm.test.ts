import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import BacktestForm from '@/components/backtest/BacktestForm.vue'
import { useBacktestStore } from '@/stores/backtest'
import { useStrategyStore } from '@/stores/strategy'
import { createMockFile, nextTick } from '../setup'

vi.mock('@/stores/backtest')
vi.mock('@/stores/strategy')
vi.mock('@/stores/notifications', () => ({
  useNotificationStore: () => ({
    addNotification: vi.fn()
  })
}))

describe('BacktestForm', () => {
  let wrapper: any
  let backtestStore: any
  let strategyStore: any
  beforeEach(() => {
    setActivePinia(createPinia())
    
    // Mock store implementations
    backtestStore = {
      startBacktest: vi.fn(),
      validateRequest: vi.fn(() => []),
      isRunning: false
    }
    
    // Mock the store functions
    vi.mocked(useBacktestStore).mockReturnValue(backtestStore)
    
    strategyStore = {
      strategies: [
        {
          id: 'strategy-1',
          name: 'Test Strategy',
          description: 'A test strategy',
          parameters: [
            {
              name: 'period',
              type: 'number',
              default: 20,
              min: 1,
              max: 100,
              step: 1,
              required: true,
              description: 'Period parameter'
            },
            {
              name: 'threshold',
              type: 'number',
              default: 0.02,
              min: 0,
              max: 1,
              step: 0.01,
              required: false,
              description: 'Threshold parameter'
            }
          ],
          code: 'module.exports = { /* strategy code */ }',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        }
      ],
      loadStrategies: vi.fn(),
      initialize: vi.fn().mockResolvedValue(undefined)
    }
    
    vi.mocked(useBacktestStore).mockReturnValue(backtestStore)
    vi.mocked(useStrategyStore).mockReturnValue(strategyStore)
    
    wrapper = mount(BacktestForm, {
      global: {
        plugins: [createPinia()]
      }
    })
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  it('should render form elements correctly', () => {
    expect(wrapper.find('[data-testid="strategy-select"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="start-date"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="end-date"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="initial-capital"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="trading-fee"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="run-backtest-btn"]').exists()).toBe(true)
  })

  it('should initialize with default form data', () => {
    const vm = wrapper.vm
    
    expect(vm.form.strategyId).toBe('')
    expect(vm.form.dataSource.type).toBe('csv')
    expect(vm.form.portfolio.initialCapital).toBe(10000)
    expect(vm.form.portfolio.tradingFee).toBe(0.001)
  })

  it('should update strategy parameters when strategy is selected', async () => {
    const vm = wrapper.vm
    
    // Set strategy directly on form
    vm.form.strategyId = 'strategy-1'
    await nextTick()
    
    expect(vm.form.strategyId).toBe('strategy-1')
    expect(vm.form.parameters).toEqual({
      period: 20,
      threshold: 0.02
    })
  })

  it('should handle CSV file upload', async () => {
    const fileInput = wrapper.find('[data-testid="csv-file"]')
    const mockFile = createMockFile('timestamp,open,high,low,close,volume\n1640995200,100,105,95,102,1000', 'test.csv')
    
    // Mock file input change
    Object.defineProperty(fileInput.element, 'files', {
      value: [mockFile],
      writable: false,
    })
    
    await fileInput.trigger('change')
    await nextTick()
    
    const vm = wrapper.vm
    expect(vm.form.csvFile).toStrictEqual(mockFile)
  })

  it('should validate form before submission', async () => {
    backtestStore.validateRequest.mockReturnValue(['Strategy is required'])
    
    const form = wrapper.find('form')
    await form.trigger('submit')
    await nextTick()
    
    expect(backtestStore.validateRequest).toHaveBeenCalled()
    expect(backtestStore.startBacktest).not.toHaveBeenCalled()
  })

  it('should submit valid form', async () => {
    const vm = wrapper.vm
    
    // Set up valid form data
    vm.form.strategyId = 'strategy-1'
    vm.form.startDate = '2024-01-01'
    vm.form.endDate = '2024-01-31'
    vm.form.csvFile = createMockFile('test data', 'test.csv')
    vm.form.portfolio.initialCapital = 10000
    vm.form.dataSource.type = 'csv'
    
    backtestStore.validateRequest.mockReturnValue([])
    backtestStore.startBacktest.mockResolvedValue({ id: 'backtest-1' })
    
    await nextTick() // Wait for form validation
    
    // Check if form is valid
    expect(vm.isFormValid).toBe(true)
    
    const runButton = wrapper.find('[data-testid="run-backtest-btn"]')
    expect(runButton.element.disabled).toBe(false)
    
    const form = wrapper.find('form')
    await form.trigger('submit')
    await nextTick()
    
    expect(backtestStore.startBacktest).toHaveBeenCalledWith(vm.form)
  })

  it('should disable form when backtest is running', async () => {
    backtestStore.isRunning = true
    
    await wrapper.vm.$nextTick()
    
    const runButton = wrapper.find('[data-testid="run-backtest-btn"]')
    expect(runButton.attributes('disabled')).toBeDefined()
  })

  it('should update parameter values correctly', async () => {
    const vm = wrapper.vm
    
    // Select strategy first
    vm.form.strategyId = 'strategy-1'
    await nextTick()
    
    // Update parameter
    vm.updateParameter('period', 30)
    
    expect(vm.form.parameters.period).toBe(30)
  })

  it('should reset form correctly', async () => {
    const vm = wrapper.vm
    
    // Set some form data
    vm.form.strategyId = 'strategy-1'
    vm.form.dataSource.startDate = '2024-01-01'
    vm.form.parameters = { period: 30 }
    
    // Reset form
    vm.resetForm()
    
    expect(vm.form.strategyId).toBe('')
    expect(vm.form.dataSource.startDate).toBe('')
    expect(vm.form.parameters).toEqual({})
  })

  it('should handle file validation', async () => {
    const vm = wrapper.vm
    
    // Test valid CSV file
    const validFile = createMockFile('timestamp,open,high,low,close,volume\n1640995200,100,105,95,102,1000', 'test.csv', 'text/csv')
    expect(vm.validateFile(validFile)).toBe(true)
    
    // Test invalid file type
    const invalidFile = createMockFile('invalid content', 'test.txt', 'text/plain')
    expect(vm.validateFile(invalidFile)).toBe(false)
    
    // Test file too large
    const largeFile = createMockFile('x'.repeat(11 * 1024 * 1024), 'large.csv', 'text/csv')
    Object.defineProperty(largeFile, 'size', { value: 11 * 1024 * 1024 })
    expect(vm.validateFile(largeFile)).toBe(false)
  })

  it('should calculate estimated duration', () => {
    const vm = wrapper.vm
    
    vm.form.dataSource.startDate = '2024-01-01'
    vm.form.dataSource.endDate = '2024-01-31'
    
    const duration = vm.estimatedDuration
    expect(duration).toContain('30 days')
  })

  it('should show/hide advanced options', async () => {
    const vm = wrapper.vm
    
    expect(vm.showAdvanced).toBe(false)
    
    const advancedToggle = wrapper.find('[data-testid="advanced-toggle"]')
    await advancedToggle.trigger('click')
    
    expect(vm.showAdvanced).toBe(true)
  })

  it('should handle form submission error', async () => {
    const vm = wrapper.vm
    
    vm.form.strategyId = 'strategy-1'
    vm.form.dataSource.startDate = '2024-01-01'
    vm.form.dataSource.endDate = '2024-01-31'
    vm.form.startDate = '2024-01-01'
    vm.form.endDate = '2024-01-31'
    vm.form.csvFile = new File(['test'], 'test.csv', { type: 'text/csv' })
    
    backtestStore.validateRequest.mockReturnValue([])
    backtestStore.startBacktest.mockRejectedValue(new Error('API Error'))
    
    // Call runBacktest directly to ensure it's executed
    await vm.runBacktest()
    
    expect(vm.error).toBe('API Error')
  })

  it('should emit events correctly', async () => {
    const vm = wrapper.vm
    
    // Set all required form fields to make form valid
    vm.form.strategyId = 'strategy-1'
    vm.form.startDate = '2024-01-01'
    vm.form.endDate = '2024-01-31'
    vm.form.portfolio.initialCapital = 10000
    vm.form.dataSource.type = 'csv'
    vm.form.csvFile = createMockFile('test.csv', 'timestamp,open,high,low,close,volume\n')
    
    backtestStore.validateRequest.mockReturnValue([])
    backtestStore.startBacktest.mockResolvedValue({ id: 'backtest-1' })
    
    await nextTick() // Wait for form validation
    
    // Check form validity first
    expect(vm.form.strategyId).toBe('strategy-1')
    expect(vm.form.startDate).toBe('2024-01-01')
    expect(vm.form.endDate).toBe('2024-01-31')
    expect(vm.form.portfolio.initialCapital).toBe(10000)
    expect(vm.form.dataSource.type).toBe('csv')
    expect(vm.form.csvFile).toBeTruthy()
    expect(vm.isFormValid).toBe(true)
    
    const runButton = wrapper.find('[data-testid="run-backtest-btn"]')
    expect(runButton.exists()).toBe(true)
    expect(runButton.element.disabled).toBe(false)
    
    // Trigger form submit instead of button click
    const form = wrapper.find('form')
    await form.trigger('submit')
    await nextTick()
    
    expect(backtestStore.startBacktest).toHaveBeenCalled()
    expect(wrapper.emitted('backtest-started')).toBeTruthy()
    expect(wrapper.emitted('backtest-started')[0]).toEqual([{ id: 'backtest-1' }])
  })

  it('should handle portfolio settings correctly', async () => {
    const vm = wrapper.vm
    
    const initialCapitalInput = wrapper.find('[data-testid="initial-capital"]')
    const tradingFeeInput = wrapper.find('[data-testid="trading-fee"]')
    
    await initialCapitalInput.setValue(50000)
    await tradingFeeInput.setValue(0.002)
    
    expect(vm.form.portfolio.initialCapital).toBe(50000)
    expect(vm.form.portfolio.tradingFee).toBe(0.002)
  })

  it('should handle date range validation', () => {
    const vm = wrapper.vm
    
    vm.form.dataSource.startDate = '2024-01-31'
    vm.form.dataSource.endDate = '2024-01-01'
    
    const errors = vm.validateDateRange()
    expect(errors).toContain('End date must be after start date')
  })

  it('should handle parameter range validation', () => {
    const vm = wrapper.vm
    
    vm.form.strategyId = 'strategy-1'
    vm.form.parameters = { period: 300 } // Above max
    
    const errors = vm.validateParameters()
    expect(errors.length).toBeGreaterThan(0)
  })
})