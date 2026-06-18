/**
 * SSR Mock for browser APIs
 * Must be imported FIRST before any other imports
 */

// Mock DOMParser
class MockDOMParser {
  parseFromString() {
    return {
      querySelector: () => null,
      querySelectorAll: () => [],
    }
  }
}

// Mock localStorage and sessionStorage
const mockStorage = {
  _data: {} as Record<string, string>,
  getItem(key: string) {
    return this._data[key] ?? null
  },
  setItem(key: string, value: string) {
    this._data[key] = String(value)
  },
  removeItem(key: string) {
    delete this._data[key]
  },
  clear() {
    this._data = {}
  },
}

// Mock navigator
const mockNavigator = {
  onLine: true,
  userAgent: "snort-ssr/1.0",
  languages: ["en"],
  language: "en",
}

// Mock window
const mockWindow = {
  localStorage: mockStorage,
  sessionStorage: mockStorage,
  scrollTo() {},
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() {},
  location: {
    href: "/",
    pathname: "/",
    search: "",
    hash: "",
  },
  matchMedia: () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }),
  navigator: mockNavigator,
}

// Assign to globalThis
const globalAny = globalThis as any
globalAny.window = mockWindow
globalAny.localStorage = mockStorage
globalAny.sessionStorage = mockStorage
globalAny.navigator = mockNavigator
const mockDocument = {
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener() {},
  removeEventListener() {},
  createElement() {
    return {
      setAttribute() {},
      appendChild() {},
      removeChild() {},
    }
  },
}
globalAny.document = mockDocument
mockWindow.document = mockDocument
globalAny.ServiceWorkerGlobalScope = undefined
globalAny.DOMParser = MockDOMParser
globalAny.matchMedia = () => ({
  matches: false,
  addEventListener() {},
  removeEventListener() {},
})
globalAny.IntersectionObserver = class {
  observe() {}
  disconnect() {}
  unobserve() {}
  takeRecords() { return [] }
}
globalAny.ResizeObserver = class {
  observe() {}
  disconnect() {}
  unobserve() {}
}

// Bun provides fetch and WebSocket natively for SSR — no mock needed
