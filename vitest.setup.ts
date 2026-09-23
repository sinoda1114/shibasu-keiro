import '@testing-library/jest-dom'

// node 環境（API ルートのテスト等）では window が無いため jsdom のときだけモックする
if (typeof window !== 'undefined') {
  // jsdom には window.matchMedia が存在しないため Mantine のカラースキーム検出用にモック
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

// jsdom には ResizeObserver が存在しないため Mantine の SegmentedControl 用にモック
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
