import { test, expect, type Page } from '@playwright/test';

/**
 * Reward-system e2e (Phase 2a): the streak callout banner (name-bearing) and the
 * collectible unlock pipeline. Determinism comes from reading the on-screen animal
 * count and clicking the matching number — never assuming which tile is correct.
 */

async function playCorrect(page: Page): Promise<void> {
  const k = await page.locator('.cf-animal').count();
  await page.getByRole('button', { name: `number ${k}`, exact: true }).click();
}

async function waitNextRound(page: Page): Promise<void> {
  await expect(page.locator('.cf-number--correct')).toHaveCount(0, {
    timeout: 4000,
  });
}

async function enterCounting(page: Page): Promise<void> {
  await page.getByRole('button', { name: /counting game/i }).click();
  await expect(page.locator('.cf-number').first()).toBeVisible();
}

test('a 3-in-a-row streak shows a name-bearing celebration banner', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('cf_name', 'Jayden'));
  await page.goto('/');
  await enterCounting(page);

  await playCorrect(page);
  await waitNextRound(page);
  await playCorrect(page);
  await waitNextRound(page);
  await playCorrect(page); // 3rd → streak milestone banner (no advance yet)

  await expect(page.getByText(/in a row/i)).toBeVisible();
  await expect(page.getByText(/Jayden/)).toBeVisible();
});

test('crossing a star threshold unlocks a friend (cf_unlocks) and reveals it', async ({
  page,
}) => {
  await page.goto('/');
  await enterCounting(page);

  let unlocked = false;
  for (let i = 0; i < 30 && !unlocked; i += 1) {
    await playCorrect(page);
    const stored = (await page.evaluate(
      () => localStorage.getItem('cf_unlocks') ?? '',
    )) as string;
    if (stored.includes('dog')) {
      // The unlock reveal is on screen at this moment (before auto-advance).
      await expect(page.getByText(/new friend/i)).toBeVisible();
      unlocked = true;
      break;
    }
    await waitNextRound(page);
  }
  expect(unlocked, 'expected a collectible to unlock within 30 rounds').toBe(
    true,
  );
});
