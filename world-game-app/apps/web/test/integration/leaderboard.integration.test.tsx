import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LeaderboardPage from '../../src/pages/leaderboard';
import { renderWithProviders } from '../test-utils';

const useListTopScores = vi.fn();

vi.mock('@workspace/api-client-react', () => ({
  useListTopScores: (...args: unknown[]) => useListTopScores(...args),
}));

const SCORES = [
  { id: 1, playerName: 'Ada', winnings: 1_000_000, difficulty: 'hard', questionsAnswered: 15, correctAnswers: 15, won: true, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 2, playerName: 'Grace', winnings: 32_000, difficulty: 'medium', questionsAnswered: 10, correctAnswers: 10, won: false, createdAt: '2026-01-02T00:00:00.000Z' },
  { id: 3, playerName: 'Alan', winnings: 1_000, difficulty: 'easy', questionsAnswered: 5, correctAnswers: 5, won: false, createdAt: '2026-01-03T00:00:00.000Z' },
];

function mockScores(overrides: Partial<{ data: typeof SCORES; isLoading: boolean; isError: boolean }> = {}) {
  useListTopScores.mockReturnValue({
    data: SCORES,
    isLoading: false,
    isError: false,
    ...overrides,
  });
}

describe('LeaderboardPage', () => {
  beforeEach(() => {
    useListTopScores.mockReset();
  });

  it('shows a loading state while scores are fetching', () => {
    mockScores({ data: undefined, isLoading: true });
    renderWithProviders(<LeaderboardPage />);
    expect(screen.getByText(/Loading top scores/)).toBeInTheDocument();
  });

  it('shows an error state when the request fails', () => {
    mockScores({ data: undefined, isError: true });
    renderWithProviders(<LeaderboardPage />);
    expect(screen.getByText(/Failed to load leaderboard/)).toBeInTheDocument();
  });

  it('shows an empty state when there are no scores yet', () => {
    mockScores({ data: [] });
    renderWithProviders(<LeaderboardPage />);
    expect(screen.getByText(/Be the first!/)).toBeInTheDocument();
  });

  it('ranks scores by winnings, highest first', () => {
    mockScores();
    renderWithProviders(<LeaderboardPage />);
    const rows = screen.getAllByTestId(/^row-score-/);
    expect(within(rows[0]).getByText('Ada')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Grace')).toBeInTheDocument();
    expect(within(rows[2]).getByText('Alan')).toBeInTheDocument();
  });

  it('filters by contender name', async () => {
    mockScores();
    const user = userEvent.setup();
    renderWithProviders(<LeaderboardPage />);
    await user.type(screen.getByTestId('input-search-name'), 'grace');
    expect(screen.getAllByTestId(/^row-score-/)).toHaveLength(1);
    expect(screen.getByText('Grace')).toBeInTheDocument();
  });

  it('filters by difficulty', async () => {
    mockScores();
    const user = userEvent.setup();
    renderWithProviders(<LeaderboardPage />);
    await user.selectOptions(screen.getByTestId('select-difficulty-filter'), 'easy');
    expect(screen.getAllByTestId(/^row-score-/)).toHaveLength(1);
    expect(screen.getByText('Alan')).toBeInTheDocument();
  });

  it('shows "no matches" state when a filter excludes everything', async () => {
    mockScores();
    const user = userEvent.setup();
    renderWithProviders(<LeaderboardPage />);
    await user.type(screen.getByTestId('input-search-name'), 'nobody-plays-this-name');
    expect(screen.getByText(/No scores match your search\/filter/)).toBeInTheDocument();
  });

  it('toggles winnings sort direction on repeated clicks', async () => {
    mockScores();
    const user = userEvent.setup();
    renderWithProviders(<LeaderboardPage />);

    // First click switches the sort key to winnings, defaulting to descending.
    await user.click(screen.getByTestId('sort-winnings'));
    let rows = screen.getAllByTestId(/^row-score-/);
    expect(within(rows[0]).getByText('Ada')).toBeInTheDocument();

    // Second click on the same header flips to ascending.
    await user.click(screen.getByTestId('sort-winnings'));
    rows = screen.getAllByTestId(/^row-score-/);
    expect(within(rows[0]).getByText('Alan')).toBeInTheDocument();
  });

  it('navigates back home', async () => {
    mockScores();
    const user = userEvent.setup();
    const { location } = renderWithProviders(<LeaderboardPage />, { initialPath: '/leaderboard' });
    await user.click(screen.getByTestId('btn-back-home'));
    expect(location.history.at(-1)).toBe('/');
  });
});
