import { test, expect, type Page } from '@playwright/test';

/**
 * Match Up e2e (Phase 2b headline feature). Tap-then-tap linking, verified by
 * reading each left group's value and tapping the right numeral with the same
 * value. Linking every pair must complete the round (ribbons appear, then the
 * round auto-advances and resets). Run at iPad portrait AND landscape.
 */

async function enterMatch(page: Page): Promise<void> {
  await page.getByRole('button', { name: /matching game/i }).click();
  await expect(page.locator('[data-match-left]').first()).toBeVisible();
}

/** Link every pair by matching values; returns the pair count. */
async function solveRound(page: Page): Promise<number> {
  const lefts = page.locator('[data-match-left]');
  const n = await lefts.count();
  const values: string[] = [];
  for (let i = 0; i < n; i += 1) {
    values.push((await lefts.nth(i).getAttribute('data-value')) ?? '');
  }
  for (const v of values) {
    await page.locator(`[data-match-left][data-value="${v}"]`).click();
    await page.locator(`[data-match-right][data-value="${v}"]`).click();
  }
  return n;
}

for (const { name, width, height } of [
  { name: 'portrait', width: 820, height: 1180 },
  { name: 'landscape', width: 1180, height: 820 },
]) {
  test(`match: linking all pairs completes the round (${name})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await enterMatch(page);

    const n = await solveRound(page);
    expect(n).toBeGreaterThanOrEqual(2);

    // All pairs linked → a ribbon per pair is drawn.
    await expect(page.locator('[data-linked-pair]')).toHaveCount(n);

    // Completing the round auto-advances to a fresh round, which resets the
    // links (ribbons gone) — proof the round completed end-to-end.
    await expect(page.locator('[data-linked-pair]')).toHaveCount(0, {
      timeout: 4000,
    });
    await expect(page.locator('[data-match-left]').first()).toBeVisible();
  });
}

test('match: a wrong connect is silent and does not link (no-fail)', async ({
  page,
}) => {
  await page.goto('/');
  await enterMatch(page);

  const lefts = page.locator('[data-match-left]');
  const first = lefts.first();
  const leftVal = await first.getAttribute('data-value');
  // pick a RIGHT numeral whose value differs from the selected left group
  const rights = page.locator('[data-match-right]');
  const n = await rights.count();
  let wrongVal: string | null = null;
  for (let i = 0; i < n; i += 1) {
    const v = await rights.nth(i).getAttribute('data-value');
    if (v !== leftVal) {
      wrongVal = v;
      break;
    }
  }
  expect(wrongVal).not.toBeNull();

  await first.click();
  await page.locator(`[data-match-right][data-value="${wrongVal}"]`).click();

  // No link formed, and no failure messaging anywhere.
  await expect(page.locator('[data-linked-pair]')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText(
    /game over|wrong|incorrect|try again|error/i,
  );
});
