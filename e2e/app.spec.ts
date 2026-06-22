import { test, expect } from '@playwright/test';

test('loads the jukebox home page', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('Welcome to my JukeBox Aurora App');
});
