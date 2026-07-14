import { test, expect } from '@playwright/test';
import { mockApi } from './helpers/mock-api';

const QUESTION = {
  options: ['London', 'Paris', 'Berlin', 'Madrid'] as [string, string, string, string],
  correctIndex: 1,
};

test.describe('full game session', () => {
  test('start -> lifelines -> correct answer -> wrong answer -> game over -> leaderboard', async ({ page }) => {
    await mockApi(page, QUESTION);

    await page.goto('/');
    await page.getByTestId('input-player-name').fill('Ada Lovelace');
    await page.getByTestId('btn-difficulty-easy').click();
    await page.getByTestId('button-start-game').click();

    await expect(page.getByTestId('text-question-prompt')).toBeVisible();
    await expect(page.getByTestId('btn-option-0')).toBeEnabled();

    // Ask the expert lifeline highlights the correct option.
    await page.getByTestId('btn-lifeline-expert').click();
    await expect(page.getByText('Expert pick')).toBeVisible();
    await expect(page.getByTestId('btn-lifeline-expert')).toBeDisabled();

    // Answer correctly -> advances to level 2.
    await page.getByTestId(`btn-option-${QUESTION.correctIndex}`).click();
    await expect(page.getByTestId('ladder-active-level-2')).toBeVisible({ timeout: 10_000 });

    // 50:50 lifeline removes two wrong options (indices 0 and 2 per the
    // mock's deterministic "first two wrong indices" rule), leaving the
    // correct option (1) and one wrong option (3) visible.
    await page.getByTestId('btn-lifeline-5050').click();
    await expect
      .poll(async () => page.locator('[data-testid^="btn-option-"]:visible').count())
      .toBe(2);
    await expect(page.getByTestId('btn-option-0')).toHaveCount(0);
    await expect(page.getByTestId('btn-option-2')).toHaveCount(0);

    // Answer wrong on level 2 -> game over, below the level-5 safe haven so $0.
    await page.getByTestId('btn-option-3').click();

    await expect(page.getByTestId('text-final-winnings')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('text-final-winnings')).toHaveText('$0');

    await page.getByTestId('btn-view-leaderboard').click();
    await expect(page).toHaveURL(/\/leaderboard$/);
    await expect(page.getByText('Ada Lovelace')).toBeVisible();
  });

  test('running out of time ends the game as a timeout', async ({ page }) => {
    await mockApi(page, QUESTION);

    await page.goto('/');
    await page.getByTestId('input-player-name').fill('Grace Hopper');
    await page.getByTestId('btn-difficulty-easy').click();
    await page.getByTestId('button-start-game').click();

    await expect(page.getByTestId('btn-option-0')).toBeEnabled();
    // easy difficulty gives 20s; wait past it without answering.
    await expect(page.getByText("Time's Up!")).toBeVisible({ timeout: 25_000 });
    await expect(page.getByTestId('text-final-winnings')).toHaveText('$0');
  });

  test('walk away banks the current winnings without answering', async ({ page }) => {
    await mockApi(page, QUESTION);

    await page.goto('/');
    await page.getByTestId('input-player-name').fill('Alan Turing');
    await page.getByTestId('btn-difficulty-medium').click();
    await page.getByTestId('button-start-game').click();

    await expect(page.getByTestId('btn-option-0')).toBeEnabled();
    // Can't walk away on level 1 (nothing banked yet).
    await expect(page.getByTestId('btn-walk-away')).toBeDisabled();

    await page.getByTestId(`btn-option-${QUESTION.correctIndex}`).click();
    await expect(page.getByTestId('ladder-active-level-2')).toBeVisible({ timeout: 10_000 });

    await page.getByTestId('btn-walk-away').click();
    await expect(page.getByText('Smart Choice')).toBeVisible();
    await expect(page.getByTestId('text-final-winnings')).toHaveText('$100');
  });
});
