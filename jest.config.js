export default {
  testEnvironment: 'node',
  globals: {
    'NODE_ENV': 'test'
  },
  transform: {},
  moduleNameMapper: {
    '^(\\.\\.?\\/.+)\\.js$': '$1'
  },
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  testMatch: [
    '**/test/**/*.test.js'
  ]
};