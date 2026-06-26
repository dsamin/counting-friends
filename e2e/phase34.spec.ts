import { test, expect, type Page } from '@playwright/test';

/**
 * Phase 3/4 activity smokes: More or Fewer, Put It in Order (next), and the
 * arithmetic games (One More, Add) which appear once the grown-up toggle is on.
 * Correctness is derived from the DOM / the spoken prompt — never assumed.
 */

const WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
  'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen',
  'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty',
];
const num = (w: string) => WORDS.indexOf(w.toLowerCase());

async function roundId(page: Page): Promise<number> {
  return Number(await page.locator('[data-round]').getAttribute('data-round'));
}

test('More or Fewer: tapping the correct group advances the round', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /more or fewer game/i }).click();
  await expect(page.locator('[data-compare-group]').first()).toBeVisible();

  const ask = ((await page.getByRole('status').textContent()) ?? '').match(
    /with (more|fewer)/i,
  )?.[1];
  const groups = page.locator('[data-compare-group]');
  const vals = [
    Number(await groups.nth(0).getAttribute('data-value')),
    Number(await groups.nth(1).getAttribute('data-value')),
  ];
  const target = ask === 'fewer' ? Math.min(...vals) : Math.max(...vals);

  const before = await roundId(page);
  await page.locator(`[data-compare-group][data-value="${target}"]`).click();
  await expect
    .poll(() => roundId(page), { timeout: 4000 })
    .toBeGreaterThan(before);
});

test('Put It in Order (next): tapping the next number advances the round', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /put in order game/i }).click();
  await expect(page.locator('[data-order-run]').first()).toBeVisible();

  const runEls = page.locator('[data-order-run]');
  const n = await runEls.count();
  let maxRun = 0;
  for (let i = 0; i < n; i += 1) {
    maxRun = Math.max(maxRun, Number(await runEls.nth(i).getAttribute('data-value')));
  }
  const next = maxRun + 1;

  const before = await roundId(page);
  await page.getByRole('button', { name: `number ${next}`, exact: true }).click();
  await expect
    .poll(() => roundId(page), { timeout: 4000 })
    .toBeGreaterThan(before);
});

test('arithmetic toggle reveals One More & Add; One More is answerable', async ({
  page,
}) => {
  await page.addInitScript(() =>
    { localStorage.setItem('cf_schema', '2'); localStorage.setItem('cf_settings', JSON.stringify({ arithmetic: true })); },
  );
  await page.goto('/');

  // Both arithmetic tiles now show on the Home Board.
  await expect(page.getByRole('button', { name: /one more game/i })).toBeVisible();
  await expect(
    page.getByRole('button', { name: /add and take away game/i }),
  ).toBeVisible();

  await page.getByRole('button', { name: /one more game/i }).click();
  const prompt = (await page.getByRole('status').textContent()) ?? '';
  const m = prompt.match(/Here are (\w+)\. What is one (more|less)/i);
  expect(m, `unexpected one-more prompt: "${prompt}"`).not.toBeNull();
  const base = num(m![1]);
  const answer = base + (m![2].toLowerCase() === 'more' ? 1 : -1);

  const btn = page.getByRole('button', { name: `number ${answer}`, exact: true });
  await btn.click();
  await expect(btn).toHaveClass(/cf-number--correct/);
});

test('Add: answering the total is correct', async ({ page }) => {
  await page.addInitScript(() =>
    { localStorage.setItem('cf_schema', '2'); localStorage.setItem('cf_settings', JSON.stringify({ arithmetic: true })); },
  );
  await page.goto('/');
  await page.getByRole('button', { name: /add and take away game/i }).click();

  const prompt = (await page.getByRole('status').textContent()) ?? '';
  let answer: number;
  const plus = prompt.match(/(\w+) and (\w+) more/i);
  const minus = prompt.match(/(\w+) take away (\w+)/i);
  if (plus) answer = num(plus[1]) + num(plus[2]);
  else if (minus) answer = num(minus[1]) - num(minus[2]);
  else throw new Error(`unexpected add prompt: "${prompt}"`);

  const btn = page.getByRole('button', { name: `number ${answer}`, exact: true });
  await btn.click();
  await expect(btn).toHaveClass(/cf-number--correct/);
});
