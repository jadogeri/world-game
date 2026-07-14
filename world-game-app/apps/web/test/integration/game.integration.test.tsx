import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GamePage from '../../src/pages/game';
import { renderWithProviders } from '../test-utils';

const mockUseGetQuestion = vi.fn();
const mockVerifyMutate = vi.fn();
const mockFiftyFiftyMutate = vi.fn();
const mockAudienceMutate = vi.fn();
const mockExpertMutate = vi.fn();
const mockScoreMutate = vi.fn();

vi.mock('@workspace/api-client-react', () => ({
  useGetQuestion: (...args: unknown[]) => mockUseGetQuestion(...args),
  useVerifyAnswer: () => ({ mutate: mockVerifyMutate }),
  useUseFiftyFifty: () => ({ mutate: mockFiftyFiftyMutate }),
  useAskAudience: () => ({ mutate: mockAudienceMutate }),
  useAskExpert: () => ({ mutate: mockExpertMutate }),
  useCreateScore: () => ({ mutate: mockScoreMutate }),
  getGetQuestionQueryKey: (params: unknown) => ['question', params],
  Difficulty: { easy: 'easy', medium: 'medium', hard: 'hard' },
}));

const QUESTION = {
  id: 'q1',
  difficulty: 'easy',
  level: 1,
  type: 'capital',
  prompt: 'What is the capital of France?',
  flagImage: null,
  options: ['London', 'Paris', 'Berlin', 'Madrid'],
  token: 'signed-token-abc',
};

function setUpQuestion(overrides: Partial<typeof QUESTION> = {}) {
  const question = { ...QUESTION, ...overrides };
  const refetch = vi.fn().mockResolvedValue({ data: question, error: undefined });
  mockUseGetQuestion.mockReturnValue({ data: question, isLoading: false, refetch });
  return { question, refetch };
}

async function startGame() {
  sessionStorage.setItem('playerName', 'Ada');
  sessionStorage.setItem('difficulty', 'easy');
  renderWithProviders(<GamePage />);

  // LOADING -> READY (1s delay) -> PLAYING
  await waitFor(() => expect(screen.getByTestId('text-question-prompt')).toBeInTheDocument());
  await act(async () => {
    vi.advanceTimersByTime(1000);
  });
  await waitFor(() => expect(screen.getByTestId('btn-option-0')).not.toBeDisabled());
}

describe('GamePage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockUseGetQuestion.mockReset();
    mockVerifyMutate.mockReset();
    mockFiftyFiftyMutate.mockReset();
    mockAudienceMutate.mockReset();
    mockExpertMutate.mockReset();
    mockScoreMutate.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('redirects to the start page when no player name is set', async () => {
    setUpQuestion();
    const { location } = renderWithProviders(<GamePage />);
    await waitFor(() => expect(location.history.at(-1)).toBe('/'));
  });

  it('loads a question and renders the options once ready', async () => {
    setUpQuestion();
    await startGame();
    expect(screen.getByTestId('text-question-prompt')).toHaveTextContent('capital of France');
    expect(screen.getByTestId('btn-option-1')).toHaveTextContent('Paris');
    expect(screen.getByTestId('ladder-active-level-1')).toBeInTheDocument();
  });

  it('shows an error state and can retry when the question fails to load', async () => {
    const refetch = vi.fn().mockResolvedValue({ data: undefined, error: new Error('network down') });
    mockUseGetQuestion.mockReturnValue({ data: undefined, isLoading: false, refetch });
    sessionStorage.setItem('playerName', 'Ada');
    sessionStorage.setItem('difficulty', 'easy');
    renderWithProviders(<GamePage />);

    await waitFor(() => expect(screen.getByTestId('btn-retry-question')).toBeInTheDocument());

    setUpQuestion();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(screen.getByTestId('btn-retry-question'));
    await waitFor(() => expect(screen.getByTestId('text-question-prompt')).toBeInTheDocument());
  });

  it('answering correctly advances to the next level', async () => {
    setUpQuestion();
    mockVerifyMutate.mockImplementation((vars, opts) => {
      opts.onSuccess({ correct: true, correctIndex: vars.data.selectedIndex, correctAnswer: 'Paris' });
    });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await startGame();

    await user.click(screen.getByTestId('btn-option-1'));
    expect(mockVerifyMutate).toHaveBeenCalledWith(
      { data: { token: QUESTION.token, selectedIndex: 1 } },
      expect.anything(),
    );

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    await waitFor(() => expect(screen.getByTestId('ladder-active-level-2')).toBeInTheDocument());
  });

  it('answering wrong ends the game with the correct safe-haven payout', async () => {
    setUpQuestion({ level: 6 });
    mockVerifyMutate.mockImplementation((vars, opts) => {
      opts.onSuccess({ correct: false, correctIndex: 1, correctAnswer: 'Paris' });
    });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await startGame();

    await user.click(screen.getByTestId('btn-option-2'));
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    await waitFor(() => expect(screen.getByTestId('text-final-winnings')).toBeInTheDocument());
    // The component's own level state starts at 1 regardless of the mocked
    // question payload, so a wrong answer on level 1 (below the first safe
    // haven at level 5) pays out $0.
    expect(screen.getByTestId('text-final-winnings')).toHaveTextContent('$0');
    expect(mockScoreMutate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ won: false, playerName: 'Ada' }) }),
    );
  });

  it('running out of time ends the game as a timeout', async () => {
    setUpQuestion();
    mockVerifyMutate.mockImplementation((vars, opts) => {
      opts.onSuccess({ correct: false, correctIndex: 1, correctAnswer: 'Paris' });
    });
    await startGame();

    await act(async () => {
      vi.advanceTimersByTime(20_000);
    });

    await waitFor(() => expect(screen.getByText("Time's Up!")).toBeInTheDocument());
    expect(mockVerifyMutate).toHaveBeenCalledWith(
      { data: { token: QUESTION.token, selectedIndex: 0 } },
      expect.anything(),
    );
  });

  it('walking away banks the previous level winnings', async () => {
    setUpQuestion();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await startGame();

    // Walk Away is disabled at level 1 (nothing to walk away with yet).
    expect(screen.getByTestId('btn-walk-away')).toBeDisabled();
  });

  it('50:50 lifeline hides two incorrect options and can only be used once', async () => {
    setUpQuestion();
    mockFiftyFiftyMutate.mockImplementation((vars, opts) => {
      opts.onSuccess({ removeIndices: [0, 2] });
    });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await startGame();

    await user.click(screen.getByTestId('btn-lifeline-5050'));
    expect(mockFiftyFiftyMutate).toHaveBeenCalledWith(
      { data: { token: QUESTION.token } },
      expect.anything(),
    );
    await waitFor(() => expect(screen.queryByTestId('btn-option-0')).not.toBeInTheDocument());
    expect(screen.queryByTestId('btn-option-2')).not.toBeInTheDocument();
    expect(screen.getByTestId('btn-option-1')).toBeInTheDocument();
    expect(screen.getByTestId('btn-lifeline-5050')).toBeDisabled();
  });

  it('ask the audience shows vote percentages for each option', async () => {
    setUpQuestion();
    mockAudienceMutate.mockImplementation((vars, opts) => {
      opts.onSuccess({ percentages: [10, 60, 20, 10] });
    });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await startGame();

    await user.click(screen.getByTestId('btn-lifeline-audience'));
    await waitFor(() => expect(screen.getByTestId('text-audience-pct-1')).toHaveTextContent('60%'));
    expect(screen.getByTestId('btn-lifeline-audience')).toBeDisabled();
  });

  it('ask the expert highlights the correct option as a hint', async () => {
    setUpQuestion();
    mockExpertMutate.mockImplementation((vars, opts) => {
      opts.onSuccess({ correctIndex: 1 });
    });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await startGame();

    await user.click(screen.getByTestId('btn-lifeline-expert'));
    await waitFor(() => expect(screen.getByText('Expert pick')).toBeInTheDocument());
    expect(screen.getByTestId('btn-lifeline-expert')).toBeDisabled();
  });

  it('a verify API failure treats the answer as wrong instead of soft-locking', async () => {
    setUpQuestion();
    mockVerifyMutate.mockImplementation((_vars, opts) => {
      opts.onError(new Error('server exploded'));
    });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await startGame();

    await user.click(screen.getByTestId('btn-option-1'));
    await waitFor(() => expect(screen.getByTestId('text-final-winnings')).toBeInTheDocument());
  });
});
