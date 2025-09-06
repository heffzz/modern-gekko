// Simple test to isolate the issue
describe('Simple MultiTimeframe Test', () => {
  test('should import MultiTimeframeManager', async() => {
    const module = await import('../src/engine/multiTimeframe.js');
    expect(module.MultiTimeframeManager).toBeDefined();
  });
});
