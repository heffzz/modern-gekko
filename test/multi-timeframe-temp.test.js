// Temporary CommonJS test to debug Jest issues
describe('MultiTimeframeManager - Temp Test', () => {
  test('should load without import errors', () => {
    // Use CommonJS require
    const { MultiTimeframeManager, TimeframeConverter } = require('../src/engine/multiTimeframe.js');

    expect(MultiTimeframeManager).toBeDefined();
    expect(TimeframeConverter).toBeDefined();

    const manager = new MultiTimeframeManager();
    expect(manager).toBeDefined();
  });
});
