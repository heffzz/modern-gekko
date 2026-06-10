module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\.js$': 'babel-jest'
  },
  moduleNameMapper: {
    '^(\.\.?\/.+)\.js$': '$1'
  },
  moduleFileExtensions: ['js', 'json'],
  verbose: true,
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js'
  ],
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