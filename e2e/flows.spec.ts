import { test, expect, type Page } from '@playwright/test';

/**
 * Behavioral end-to-end tests for Counting Friends.
 *
 * The game is intentionally no-fail and auto-advances after a correct tap, so
 * every "click the right answer" step is made deterministic by *reading the DOM*:
 * we count the on-screen animal slots (`.cf-animal`, the only place play-field
 * sprites live) and click the number button whose label equals that count. We
 * never assume which number is correct.
 */

/** Count the animal sprites currently on the play field. */
async function animalCount(page: Page): Promise<number> {
  return page.locator('.cf-animal').count();
}

/** Enter play on the given tier and wait for the round to be fully dealt. */
async function enterPlay(page: Page, tierLabel: string): Promise<void> {
  await page.getByRole('button', { name: tierLabel, exact: true }).click();
  // A round is dealt once at least one animal and the number row exist.
  await expect(page.locator('.cf-animal').first()).toBeVisible();
  await expect(page.locator('.cf-number').first()).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('start screen renders the three tier cards and the heading', async ({
  page,
}) => {
  await expect(
    page.getByRole('heading', { name: /Counting Friends/i }),
  ).toBeVisible();

  await expect(
    page.getByRole('button', { name: 'Easy — count 1 to 5', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Medium — count 1 to 10', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Hard — count 1 to 20', exact: true }),
  ).toBeVisible();
});

test('tier -> play: Easy enters play with the number row and a prompt', async ({
  page,
}) => {
  await enterPlay(page, 'Easy — count 1 to 5');

  // Easy tier shows exactly 3 number buttons.
  await expect(page.locator('.cf-number')).toHaveCount(3);

  // At least one animal sprite is visible.
  expect(await animalCount(page)).toBeGreaterThan(0);

  // The visually-hidden live region announces the question.
  await expect(page.getByRole('status')).toContainText('How many');
});

test('correct tap -> celebration -> auto-advance to a fresh round', async ({
  page,
}) => {
  await enterPlay(page, 'Easy — count 1 to 5');

  const k = await animalCount(page);
  expect(k).toBeGreaterThan(0);

  const correctBtn = page.getByRole('button', {
    name: `number ${k}`,
    exact: true,
  });
  await correctBtn.click();

  // The tapped button is marked correct and confetti exists.
  await expect(correctBtn).toHaveClass(/cf-number--correct/);
  await expect(page.locator('canvas.cf-confetti')).toHaveCount(1);

  // After the ~1950ms advance window, a fresh round is dealt: the previous
  // correct styling is gone (the row re-rendered with a new choice set).
  await expect(page.locator('.cf-number--correct')).toHaveCount(0, {
    timeout: 4000,
  });
  // And a new round is interactive: number buttons present, animals present.
  await expect(page.locator('.cf-number').first()).toBeVisible();
  expect(await animalCount(page)).toBeGreaterThan(0);
});

test('wrong tap -> no-fail: does not advance and shows no error', async ({
  page,
}) => {
  await enterPlay(page, 'Medium — count 1 to 10');

  const k = await animalCount(page);
  expect(k).toBeGreaterThan(0);

  // Read the visible choices and pick one that is NOT the correct answer.
  const labels = await page.locator('.cf-number').allInnerTexts();
  const choices = labels.map((t) => Number(t.trim())).filter((n) => !Number.isNaN(n));
  const wrong = choices.find((n) => n !== k);
  expect(wrong, 'expected at least one non-correct choice').toBeDefined();

  await page
    .getByRole('button', { name: `number ${wrong}`, exact: true })
    .click();

  // No advance: after the wrong-revert window the SAME K animals remain.
  await page.waitForTimeout(800);
  expect(await animalCount(page)).toBe(k);

  // The number row is still interactive (correct answer still clickable).
  await expect(
    page.getByRole('button', { name: `number ${k}`, exact: true }),
  ).toBeEnabled();

  // No-fail: no score, no "Game Over", no error/"wrong" copy anywhere.
  await expect(page.locator('body')).not.toContainText(/game over|wrong|incorrect|try again|error/i);
});

test('parental gate -> settings open, edit, and close', async ({ page }) => {
  await enterPlay(page, 'Easy — count 1 to 5');

  const gate = page.getByRole('button', {
    name: 'Parent settings (press and hold)',
  });
  await expect(gate).toBeVisible();

  // Press-and-hold the gate dot for >3s of real time (gate uses RAF +
  // performance.now, so virtual timers won't advance it).
  const box = await gate.boundingBox();
  expect(box).not.toBeNull();
  const cx = box!.x + box!.width / 2;
  const cy = box!.y + box!.height / 2;

  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.waitForTimeout(3300);
  await page.mouse.up();

  const dialog = page.getByRole('dialog', { name: 'For grown-ups' });
  await expect(dialog).toBeVisible();

  // Type a name into the input.
  const nameInput = dialog.getByLabel(/Child.?s name/i);
  await nameInput.fill('Jayden');
  await expect(nameInput).toHaveValue('Jayden');

  // Toggle a switch (Reduce motion) and confirm aria-checked flips.
  const reduceMotion = dialog.getByRole('switch', { name: 'Reduce motion' });
  const before = await reduceMotion.getAttribute('aria-checked');
  await reduceMotion.click();
  await expect(reduceMotion).not.toHaveAttribute('aria-checked', before ?? '');

  // Close via the × button.
  await dialog.getByRole('button', { name: 'Close settings' }).click();
  await expect(dialog).toBeHidden();
});

test('back to start returns to the tier select', async ({ page }) => {
  await enterPlay(page, 'Easy — count 1 to 5');

  await page.getByRole('button', { name: 'Back to start' }).click();

  await expect(
    page.getByRole('button', { name: 'Easy — count 1 to 5', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Medium — count 1 to 10', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Hard — count 1 to 20', exact: true }),
  ).toBeVisible();
});
