import React from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router } from 'wouter';
import { memoryLocation } from 'wouter/memory-location';
import { ThemeProvider } from '../src/components/theme-provider';

// =========================================================================
// 🟢 FIXED: INTEGRATION TESTING STORAGE & THREAD SAFETY LAYER
// Ensures that whenever an integration file loads this utility file at the
// module boundary, localStorage is mocked out instantly to prevent crashes.
// =========================================================================
if (typeof globalThis.localStorage === 'undefined' || globalThis.localStorage === null) {
  const mockStorage: Record<string, string> = {};
  globalThis.localStorage = {
    getItem: (key: string) => mockStorage[key] || null,
    setItem: (key: string, value: string) => { mockStorage[key] = value; },
    clear: () => { Object.keys(mockStorage).forEach(key => delete mockStorage[key]); },
    removeItem: (key: string) => { delete mockStorage[key]; },
    length: 0,
    key: (index: number) => Object.keys(mockStorage)[index] || null
  };
}

if (typeof globalThis.sessionStorage === 'undefined' || globalThis.sessionStorage === null) {
  const mockSession: Record<string, string> = {};
  globalThis.sessionStorage = {
    getItem: (key: string) => mockSession[key] || null,
    setItem: (key: string, value: string) => { mockSession[key] = value; },
    clear: () => { Object.keys(mockSession).forEach(key => delete mockSession[key]); },
    removeItem: (key: string) => { delete mockSession[key]; },
    length: 0,
    key: (index: number) => Object.keys(mockSession)[index] || null
  };
}

/**
 * Renders a page component wrapped in the same providers App.tsx supplies
 * (query client, theme, wouter router) so pages that assume that context
 * (e.g. ThemeToggle, useLocation) work the same way they do in the real app.
 */
export function renderWithProviders(
  ui: React.ReactElement,
  { initialPath = '/' }: { initialPath?: string } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const location = memoryLocation({ path: initialPath, record: true });

  const result = render(
    <ThemeProvider defaultTheme="light" storageKey="world-game-theme">
      <QueryClientProvider client={queryClient}>
        <Router hook={location.hook} searchHook={location.searchHook}>
          {ui}
        </Router>
      </QueryClientProvider>
    </ThemeProvider>,
  );

  return { ...result, location, queryClient };
}
