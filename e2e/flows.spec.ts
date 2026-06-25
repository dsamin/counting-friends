import { test, expect, type Page } from '@playwright/test';

/**
 * Behavioral end-to-end tests for Counting Friends (v2 Home Board entry).
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

/** Enter the counting game from the Home Board and wait for the round. */
async function enterCounting(page: Page): Promise<void> {
  await page.getByRole('button', { name: /counting game/i }).click();
  await expect(page.locator('.cf-animal').first()).toBeVisible();
  await expect(page.locator('.cf-number').first()).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('home board renders the heading and the counting-game tile', async ({
  page,
}) => {
  await expect(
    page.getByRole('heading', { name: /Counting Friends/i }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /counting game/i }),
  ).toBeVisible();
});

test('enter counting game: play field with the number row and a prompt', async ({
  page,
}) => {
  await enterCounting(page);

  // A fresh install starts at level 1 → 3 number buttons.
  await expect(page.locator('.cf-number')).toHaveCount(3);
  expect(await animalCount(page)).toBeGreaterThan(0);

  // The visually-hidden live region announces the question.
  await expect(page.getByRole('status')).toContainText('How many');
});

test('correct tap -> celebration -> auto-advance to a fresh round', async ({
  page,
}) => {
  await enterCounting(page);

  const k = await animalCount(page);
  expect(k).toBeGreaterThan(0);

  const correctBtn = page.getByRole('button', {
    name: `number ${k}`,
    exact: true,
  });
  await correctBtn.click();

  await expect(correctBtn).toHaveClass(/cf-number--correct/);
  await expect(page.locator('canvas.cf-confetti')).toHaveCount(1);

  await expect(page.locator('.cf-number--correct')).toHaveCount(0, {
    timeout: 4000,
  });
  await expect(page.locator('.cf-number').first()).toBeVisible();
  expect(await animalCount(page)).toBeGreaterThan(0);
});

test('wrong tap -> no-fail: does not advance and shows no error', async ({
  page,
}) => {
  await enterCounting(page);

  const k = await animalCount(page);
  expect(k).toBeGreaterThan(0);

  const labels = await page.locator('.cf-number').allInnerTexts();
  const choices = labels
    .map((t) => Number(t.trim()))
    .filter((n) => !Number.isNaN(n));
  const wrong = choices.find((n) => n !== k);
  expect(wrong, 'expected at least one non-correct choice').toBeDefined();

  await page
    .getByRole('button', { name: `number ${wrong}`, exact: true })
    .click();

  await page.waitForTimeout(800);
  expect(await animalCount(page)).toBe(k);

  await expect(
    page.getByRole('button', { name: `number ${k}`, exact: true }),
  ).toBeEnabled();

  await expect(page.locator('body')).not.toContainText(
    /game over|wrong|incorrect|try again|error/i,
  );
});

test('parental gate -> settings open, edit, and close', async ({ page }) => {
  await enterCounting(page);

  const gate = page.getByRole('button', {
    name: 'Parent settings (press and hold)',
  });
  await expect(gate).toBeVisible();

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

  const nameInput = dialog.getByLabel(/Child.?s name/i);
  await nameInput.fill('Jayden');
  await expect(nameInput).toHaveValue('Jayden');

  const reduceMotion = dialog.getByRole('switch', { name: 'Reduce motion' });
  const before = await reduceMotion.getAttribute('aria-checked');
  await reduceMotion.click();
  await expect(reduceMotion).not.toHaveAttribute('aria-checked', before ?? '');

  await dialog.getByRole('button', { name: 'Close settings' }).click();
  await expect(dialog).toBeHidden();
});

test('back returns to the Home Board', async ({ page }) => {
  await enterCounting(page);

  await page.getByRole('button', { name: /back to start/i }).click();

  await expect(
    page.getByRole('button', { name: /counting game/i }),
  ).toBeVisible();
});
