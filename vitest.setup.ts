import '@testing-library/jest-dom'

// jsdom には window.matchMedia が存在しないため Mantine のカラースキーム検出用にモック。
// `// @vitest-environment node` のテスト（DB・API ルート）には window が無いので飛ばす
if (typeof window !== 'undefined') Object.defineProperty(window, 'matchMedia', {
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

// jsdom には ResizeObserver が存在しないため Mantine の SegmentedControl 用にモック
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
