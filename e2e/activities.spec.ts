import { test, expect, type Page } from '@playwright/test';

/**
 * Per-activity smoke e2e for the two single-tap v2 activities (Find the Number,
 * Quick Look). Each is played to a correct answer; correctness is read from the
 * DOM (the spoken numeral word / the reveal count), never assumed.
 */

const WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
  'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen',
  'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty',
];

async function enter(page: Page, name: RegExp): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name }).click();
}

test('Find the Number: tapping the spoken numeral is correct', async ({
  page,
}) => {
  await enter(page, /find the number game/i);
  const prompt = (await page.getByRole('status').textContent()) ?? '';
  const m = prompt.match(/find the (\w+)/i);
  expect(m, `expected a "Find the X" prompt, got "${prompt}"`).not.toBeNull();
  const target = WORDS.indexOf(m![1].toLowerCase());
  expect(target).toBeGreaterThanOrEqual(1);

  const btn = page.getByRole('button', { name: `number ${target}`, exact: true });
  await btn.click();
  await expect(btn).toHaveClass(/cf-number--correct/);
});

test('Quick Look: answering the revealed count is correct', async ({ page }) => {
  await enter(page, /quick look game/i);

  // The friends flash during the "revealed" phase; the count is exposed as a
  // test seam (invisible to the child).
  const field = page.locator('[data-count]');
  await expect(field).toBeVisible();
  const count = Number(await field.getAttribute('data-count'));
  expect(count).toBeGreaterThan(0);

  // Wait for the reveal to end and the number tiles to appear.
  await expect(page.locator('[data-phase="hidden"]')).toBeVisible({
    timeout: 3000,
  });
  const btn = page.getByRole('button', { name: `number ${count}`, exact: true });
  await btn.click();
  await expect(btn).toHaveClass(/cf-number--correct/);
});
