import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Marketing screenshots — committed deliverables under docs/screenshots/.
 *
 * Captured at iPad-landscape (1366x1024) @2x for crisp App Store / README art.
 * Like the behavioral specs, the "correct number" for the celebration hero is
 * derived from the live DOM (animal count) so the shot is reproducible.
 */

const DIR = join(process.cwd(), 'docs', 'screenshots');
const VIEWPORT = { width: 1366, height: 1024 };

test.use({ viewport: VIEWPORT, deviceScaleFactor: 2 });

test.beforeAll(() => {
  mkdirSync(DIR, { recursive: true });
});

async function animalCount(page: Page): Promise<number> {
  return page.locator('.cf-animal').count();
}

async function enterPlay(page: Page, tierLabel: string): Promise<void> {
  await page.getByRole('button', { name: tierLabel, exact: true }).click();
  await expect(page.locator('.cf-animal').first()).toBeVisible();
  await expect(page.locator('.cf-number').first()).toBeVisible();
}

/** Let fonts + entrance animations settle before a clean capture. */
async function settle(page: Page): Promise<void> {
  await page.evaluate(() => (document as Document).fonts?.ready);
  await page.waitForTimeout(700);
}

test('01 - start / tier-select screen', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: /Counting Friends/i }),
  ).toBeVisible();
  await settle(page);
  await page.screenshot({
    path: join(DIR, '01-start.png'),
    animations: 'allow',
  });
});

test('02 - counting / mid-round play screen', async ({ page }) => {
  await page.goto('/');
  await enterPlay(page, 'Easy — count 1 to 5');
  await settle(page);
  await page.screenshot({
    path: join(DIR, '02-counting.png'),
    animations: 'allow',
  });
});

test('03 - celebration / hero shot with live confetti', async ({ page }) => {
  await page.goto('/');

  // Try a few times: tap the correct number and capture immediately, within
  // the 1450ms confetti window, so the live burst is on screen.
  let captured = false;
  for (let attempt = 0; attempt < 4 && !captured; attempt++) {
    await enterPlay(page, 'Easy — count 1 to 5');
    await settle(page);

    const k = await animalCount(page);
    const correctBtn = page.getByRole('button', {
      name: `number ${k}`,
      exact: true,
    });

    await correctBtn.click();
    // Confirm the burst actually started (button flipped to correct →
    // useEffect fired confetti.burst). No long waits: capture mid-burst.
    await expect(correctBtn).toHaveClass(/cf-number--correct/);

    // Verify confetti drew non-transparent pixels before committing the shot.
    const hasParticles = await page.evaluate(() => {
      const c = document.querySelector(
        'canvas.cf-confetti',
      ) as HTMLCanvasElement | null;
      if (!c) return false;
      const ctx = c.getContext('2d');
      if (!ctx) return false;
      const { width, height } = c;
      if (!width || !height) return false;
      const data = ctx.getImageData(0, 0, width, height).data;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] !== 0) return true; // any non-transparent alpha
      }
      return false;
    });

    if (hasParticles) {
      await page.screenshot({
        path: join(DIR, '03-celebration.png'),
        animations: 'allow',
      });
      captured = true;
    } else {
      // Round will auto-advance; loop and try a fresh round.
      await page.waitForTimeout(2200);
    }
  }

  expect(captured, 'expected to capture a frame with confetti particles').toBe(
    true,
  );
});

test('04 - settings / "For grown-ups" dialog', async ({ page }) => {
  await page.goto('/');
  await enterPlay(page, 'Easy — count 1 to 5');

  const gate = page.getByRole('button', {
    name: 'Parent settings (press and hold)',
  });
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
  // Seed a friendly name so the shot looks lived-in.
  await dialog.getByLabel(/Child.?s name/i).fill('Jayden');
  await settle(page);

  await page.screenshot({
    path: join(DIR, '04-settings.png'),
    animations: 'allow',
  });
});
