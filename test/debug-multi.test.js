describe('Debug MultiTimeframe', () => {
  let MultiTimeframeManager;
  let manager;

  beforeAll(async() => {
    const module = await import('../src/engine/multiTimeframe.js');
    MultiTimeframeManager = module.MultiTimeframeManager;
  });

  beforeEach(() => {
    manager = new MultiTimeframeManager();
  });

  test('should create manager', () => {
    expect(manager).toBeDefined();
    expect(typeof manager.addTimeframe).toBe('function');
  });

  test('should add timeframe with mock source', () => {
    const mockSource = {
      on: () => {},
      emit: () => {}
    };

    expect(() => {
      manager.addTimeframe('1h', mockSource);
    }).not.toThrow();

    expect(manager.timeframes.has('1h')).toBe(true);
  });
});
