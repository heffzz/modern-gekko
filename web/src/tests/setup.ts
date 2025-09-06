import { vi, beforeEach, afterEach } from 'vitest'
import { config } from '@vue/test-utils'
import { createPinia } from 'pinia'

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch as any
mockFetch.mockResolvedValue = vi.fn()

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock
})

// Mock URL.createObjectURL
Object.defineProperty(URL, 'createObjectURL', {
  writable: true,
  value: vi.fn(() => 'mocked-url')
})

// Mock URL.revokeObjectURL
Object.defineProperty(URL, 'revokeObjectURL', {
  writable: true,
  value: vi.fn()
})

// Mock File constructor
global.File = class MockFile {
  public size: number
  public type: string
  
  constructor(public chunks: any[], public name: string, public options?: any) {
    this.type = options?.type || 'text/csv'
    this.size = options?.size || 1024
  }
  get lastModified() { return Date.now() }
  get webkitRelativePath() { return '' }
  arrayBuffer() { return Promise.resolve(new ArrayBuffer(0)) }
  text() { return Promise.resolve('') }
  stream() { return new ReadableStream() }
  slice() { return new MockFile([], '') }
  bytes() { return Promise.resolve(new Uint8Array()) }
} as any

// Mock FileReader
class MockFileReader {
  static readonly EMPTY = 0
  static readonly LOADING = 1
  static readonly DONE = 2
  
  readonly EMPTY = 0
  readonly LOADING = 1
  readonly DONE = 2
  
  result: any = null
  error: any = null
  readyState: number = 0
  onload: any = null
  onerror: any = null
  onabort: any = null
  onloadend: any = null
  onloadstart: any = null
  onprogress: any = null
  
  readAsArrayBuffer() {}
  readAsBinaryString() {}
  readAsDataURL() {
    setTimeout(() => {
      this.result = 'data:text/csv;base64,bW9ja2VkIGZpbGUgY29udGVudA=='
      this.readyState = 2
      if (this.onload) this.onload({ target: this })
    }, 0)
  }
  readAsText() {
    setTimeout(() => {
      this.result = 'mocked file content'
      this.readyState = 2
      if (this.onload) this.onload({ target: this })
    }, 0)
  }
  abort() {}
  
  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() { return true }
}

global.FileReader = MockFileReader as any

// Configure Vue Test Utils
config.global.plugins = [createPinia()]

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error
const originalConsoleWarn = console.warn

beforeEach(() => {
  // Reset all mocks
  vi.clearAllMocks()
  
  // Reset localStorage mock
  localStorageMock.getItem.mockReturnValue(null)
  localStorageMock.setItem.mockImplementation(() => {})
  localStorageMock.removeItem.mockImplementation(() => {})
  localStorageMock.clear.mockImplementation(() => {})
  
  // Reset sessionStorage mock
  sessionStorageMock.getItem.mockReturnValue(null)
  sessionStorageMock.setItem.mockImplementation(() => {})
  sessionStorageMock.removeItem.mockImplementation(() => {})
  sessionStorageMock.clear.mockImplementation(() => {})
  
  // Mock successful fetch by default
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob()),
  })
  
  // Suppress console errors/warnings during tests unless explicitly needed
  console.error = vi.fn()
  console.warn = vi.fn()
})

afterEach(() => {
  // Restore console methods
  console.error = originalConsoleError
  console.warn = originalConsoleWarn
})

// Helper function to create mock API responses
export function mockApiResponse(data: any, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    blob: () => Promise.resolve(new Blob([JSON.stringify(data)])),
  }
}

// Helper function to create mock file
export function createMockFile(content: string, name: string, type = 'text/csv') {
  return new File([content], name, { type })
}

// Helper function to wait for next tick
export function nextTick() {
  return new Promise(resolve => setTimeout(resolve, 0))
}

// Helper function to wait for async operations
export function waitFor(fn: () => boolean, timeout = 1000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now()
    const check = () => {
      if (fn()) {
        resolve(true)
      } else if (Date.now() - startTime > timeout) {
        reject(new Error('Timeout waiting for condition'))
      } else {
        setTimeout(check, 10)
      }
    }
    check()
  })
}