const { createRequire } = require('module');
const require = createRequire(import.meta.url);

// Temporary CommonJS test to debug Jest issues
describe('MultiTimeframeManager - Temp Test', () => {
  test('should load without import errors', async() => {
    // Try to dynamically import the module
    const { MultiTimeframeManager, TimeframeConverter } = await import('../src/engine/multiTimeframe.js');

    expect(MultiTimeframeManager).toBeDefined();
    expect(TimeframeConverter).toBeDefined();

    const manager = new MultiTimeframeManager();
    expect(manager).toBeDefined();
  });
});
