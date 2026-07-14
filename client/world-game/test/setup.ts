import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

// @testing-library/dom's `waitFor`/`findBy*` only auto-advance fake timers
// when they detect a global `jest` with a mocked `setTimeout` (its fake-timer
// check is Jest-specific). Vitest never defines that global, so without this
// shim `waitFor` falls back to a *real* setInterval — which is itself faked
// by `vi.useFakeTimers()` and therefore never fires, hanging the test.
if (typeof (globalThis as { jest?: unknown }).jest === 'undefined') {
  (globalThis as Record<string, unknown>).jest = {
    advanceTimersByTime: (ms: number) => vi.advanceTimersByTime(ms),
  };
}

// jsdom doesn't implement matchMedia; ThemeProvider reads it when theme is
// "system", so provide a deterministic stub for every test.
beforeEach(() => {
  window.matchMedia =
    window.matchMedia ||
    ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;

  sessionStorage.clear();
  localStorage.clear();
});

afterEach(() => {
  cleanup();
});
