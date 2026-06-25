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

test('Count-Along: a wrong count answer lets the child count along, then answer (§5.1)', async ({
  page,
}) => {
  await enter(page, /counting game/i);
  await expect(page.locator('.cf-number').first()).toBeVisible();

  const k = await page.locator('.cf-animal').count();
  const labels = await page.locator('.cf-number').allInnerTexts();
  const choices = labels
    .map((t) => Number(t.trim()))
    .filter((n) => !Number.isNaN(n));
  const wrong = choices.find((n) => n !== k)!;

  // A wrong tap surfaces Count-Along (no-fail): friends become tappable, tiles hide.
  await page.getByRole('button', { name: `number ${wrong}`, exact: true }).click();
  await expect(page.locator('[data-count-friend]').first()).toBeVisible();

  // Count each friend; once all are counted the tiles return.
  const friends = page.locator('[data-count-friend]');
  const n = await friends.count();
  for (let i = 0; i < n; i += 1) await friends.nth(i).click();

  const correct = page.getByRole('button', { name: `number ${k}`, exact: true });
  await expect(correct).toBeVisible();
  await correct.click();
  await expect(correct).toHaveClass(/cf-number--correct/);
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
