// Jest setup file
global.jest = {
  fn: () => {
    const mockFn = function(...args) {
      mockFn.calls.push(args);
      return mockFn.returnValue;
    };
    mockFn.calls = [];
    mockFn.returnValue = undefined;
    mockFn.mockReturnValue = (value) => {
      mockFn.returnValue = value;
      return mockFn;
    };
    return mockFn;
  }
};
