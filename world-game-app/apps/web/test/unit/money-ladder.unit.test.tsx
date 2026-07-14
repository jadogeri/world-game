import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MoneyLadder } from '../../src/pages/game';

describe('MoneyLadder', () => {
  it('marks the current level as the active row', () => {
    render(<MoneyLadder level={3} playerName="Ada" difficulty="easy" />);
    expect(screen.getByTestId('ladder-active-level-3')).toBeInTheDocument();
  });

  it('only ever highlights a single level at a time', () => {
    render(<MoneyLadder level={7} playerName="Ada" difficulty="medium" />);
    expect(screen.getByTestId('ladder-active-level-7')).toBeInTheDocument();
    expect(screen.queryByTestId('ladder-active-level-6')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ladder-active-level-8')).not.toBeInTheDocument();
  });

  it('shows the player name and difficulty in the header', () => {
    render(<MoneyLadder level={1} playerName="Grace" difficulty="hard" />);
    expect(screen.getByText(/Grace/)).toBeInTheDocument();
    expect(screen.getByText(/hard/)).toBeInTheDocument();
  });

  it('renders all 15 ladder amounts', () => {
    render(<MoneyLadder level={1} playerName="Ada" difficulty="easy" />);
    expect(screen.getByText('$1,000,000')).toBeInTheDocument();
    expect(screen.getByText('$100')).toBeInTheDocument();
    expect(screen.getByText('$32,000')).toBeInTheDocument();
  });
});
