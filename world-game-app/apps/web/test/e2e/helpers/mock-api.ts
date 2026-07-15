import type { Page } from '@playwright/test';

export type MockQuestion = {
  options: [string, string, string, string];
  correctIndex: number;
};

/**
 * Stubs the whole `@repo/api-client-react` surface the game talks to,
 * since e2e here is about exercising the real browser/UI against a
 * deterministic API contract, not the actual quiz-server logic (that's
 * covered by api-server's own suites). Keeps an in-memory score list so a
 * score submitted during a run round-trips through the leaderboard.
 */
export async function mockApi(page: Page, question: MockQuestion) {
  const scores: Array<Record<string, unknown>> = [];
  let nextId = 1;

  await page.route('**/api/game/question**', async (route) => {
    const url = new URL(route.request().url());
    const level = Number(url.searchParams.get('level') ?? '1');
    const difficulty = url.searchParams.get('difficulty') ?? 'easy';
    await route.fulfill({
      json: {
        id: `q-${level}`,
        difficulty,
        level,
        type: 'capital',
        prompt: `Mock question for level ${level}`,
        flagImage: null,
        options: question.options,
        token: `token-level-${level}`,
      },
    });
  });

  await page.route('**/api/game/verify', async (route) => {
    const body = route.request().postDataJSON() as { selectedIndex: number };
    const correct = body.selectedIndex === question.correctIndex;
    await route.fulfill({
      json: {
        correct,
        correctIndex: question.correctIndex,
        correctAnswer: question.options[question.correctIndex],
      },
    });
  });

  await page.route('**/api/game/fifty-fifty', async (route) => {
    const wrongIndices = [0, 1, 2, 3].filter((i) => i !== question.correctIndex);
    await route.fulfill({ json: { removeIndices: wrongIndices.slice(0, 2) } });
  });

  await page.route('**/api/game/ask-audience', async (route) => {
    const percentages = [10, 10, 10, 10];
    percentages[question.correctIndex] = 70;
    await route.fulfill({ json: { percentages } });
  });

  await page.route('**/api/game/ask-expert', async (route) => {
    await route.fulfill({ json: { correctIndex: question.correctIndex } });
  });

  await page.route('**/api/scores**', async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      const score = { ...body, id: nextId++, createdAt: new Date().toISOString() };
      scores.push(score);
      await route.fulfill({ status: 201, json: score });
      return;
    }
    await route.fulfill({ json: scores });
  });
}
