export default {
  testEnvironment: 'node',
  globals: {
    'NODE_ENV': 'test',
    jest: true
  },
  transform: {},
  moduleNameMapper: {
    '^(\.\.?\/.+)\.js$': '$1'
  },
  moduleFileExtensions: ['js', 'json'],
  verbose: true,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  testMatch: [
    '**/test/**/*.test.js'
  ],
  setupFilesAfterEnv: ['<rootDir>/test/setup.js']
};