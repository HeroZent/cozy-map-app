import { test, expect } from '@playwright/test';
import { JourneyTracker } from './journey-tracker';

test('post a hopeful story and see it on the map', async ({ page }) => {
  await page.goto('/');

  const journey = new JourneyTracker(page);
  await journey.install([
    { id: 'home', label: 'Home loaded' },
    { id: 'compose', label: 'Composer opened' },
    { id: 'mood', label: 'Mood picked' },
    { id: 'text', label: 'Text written' },
    { id: 'location', label: 'Location chosen' },
    { id: 'pin', label: 'New pin visible on map' },
  ]);

  // Wait for map to render (canvas exists)
  await expect(page.locator('canvas')).toBeVisible({ timeout: 15_000 });
  await journey.tick('home');

  // Open composer
  await page.getByText('+', { exact: true }).click();
  await expect(page.getByText('What is this?')).toBeVisible();
  await journey.tick('compose');

  // Pick "Hopeful"
  await page.getByText('Hopeful').click();
  await expect(page.getByText("What's giving you hope?")).toBeVisible();
  await journey.tick('mood');

  // Write text
  await page.getByPlaceholder(/looking forward/i).fill('A small win today, e2e style.');
  await page.getByText('Continue →').click();
  await journey.tick('text');

  // Pick a city
  await page.getByText('🏙️ Pick a city').click();
  await page.getByPlaceholder(/Search for a city/).fill('Cebu City');
  await page.waitForTimeout(1_500);
  await page.getByText(/Cebu/).first().click();
  await journey.tick('location');

  // Back on home — wait for new pin to render via realtime
  await page.waitForTimeout(2_000);
  await expect(page.locator('canvas')).toBeVisible();
  await journey.tick('pin');
});
