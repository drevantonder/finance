import { beforeAll } from 'vitest'
import { vi } from 'vitest'
import { ref, computed, watch } from 'vue'

// Mock Nuxt-specific globals
global.$fetch = vi.fn() as any

// Make Vue's reactive functions globally available (Nuxt auto-imports them)
;(globalThis as any).ref = ref
;(globalThis as any).computed = computed
;(globalThis as any).watch = watch

// Mock window and localStorage if not available
if (typeof window === 'undefined') {
  global.window = {
    localStorage: {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    },
    dispatchEvent: vi.fn(),
  } as any
}

if (typeof localStorage === 'undefined') {
  global.localStorage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  } as any
}

// Mock import.meta.client for client-side code
Object.defineProperty(import.meta, 'client', {
  get: () => false
})

beforeAll(() => {
  // Clear all mocks before each test file
  vi.clearAllMocks()
})
