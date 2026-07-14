import React from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router } from 'wouter';
import { memoryLocation } from 'wouter/memory-location';
import { ThemeProvider } from '../src/components/theme-provider';

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
