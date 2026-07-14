import React from 'react';
import { describe, expect, it } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StartPage from '../../src/pages/start';
import { renderWithProviders } from '../test-utils';

describe('StartPage', () => {
  it('disables the start button until a name is entered', () => {
    renderWithProviders(<StartPage />);
    expect(screen.getByTestId('button-start-game')).toBeDisabled();

    fireEvent.change(screen.getByTestId('input-player-name'), {
      target: { value: 'Ada' },
    });
    expect(screen.getByTestId('button-start-game')).not.toBeDisabled();
  });

  it('defaults to easy difficulty and lets the player pick another', async () => {
    const user = userEvent.setup();
    renderWithProviders(<StartPage />);
    expect(screen.getByTestId('btn-difficulty-easy')).toHaveClass('bg-primary');

    await user.click(screen.getByTestId('btn-difficulty-hard'));
    expect(screen.getByTestId('btn-difficulty-hard')).toHaveClass('bg-primary');
    expect(screen.getByTestId('btn-difficulty-easy')).not.toHaveClass('bg-primary');
  });

  it('starting the game stores the player name/difficulty and navigates to /play', async () => {
    const user = userEvent.setup();
    const { location } = renderWithProviders(<StartPage />);

    await user.type(screen.getByTestId('input-player-name'), 'Grace');
    await user.click(screen.getByTestId('btn-difficulty-medium'));
    await user.click(screen.getByTestId('button-start-game'));

    expect(sessionStorage.getItem('playerName')).toBe('Grace');
    expect(sessionStorage.getItem('difficulty')).toBe('medium');
    expect(location.history.at(-1)).toBe('/play');
  });

  it('does not navigate when submitting a blank/whitespace-only name', async () => {
    const { location } = renderWithProviders(<StartPage />);
    fireEvent.change(screen.getByTestId('input-player-name'), {
      target: { value: '   ' },
    });
    fireEvent.submit(screen.getByTestId('button-start-game').closest('form')!);

    expect(sessionStorage.getItem('playerName')).toBeNull();
    expect(location.history.at(-1)).toBe('/');
  });

  it('navigates to the leaderboard from the link', async () => {
    const user = userEvent.setup();
    const { location } = renderWithProviders(<StartPage />);
    await user.click(screen.getByTestId('link-leaderboard'));
    expect(location.history.at(-1)).toBe('/leaderboard');
  });
});
