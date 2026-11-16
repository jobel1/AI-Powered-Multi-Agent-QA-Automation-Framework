
import { test, expect } from '@playwright/test';
import { ChaosInjector } from '../utils/chaos-injector';

const BASE_URL = 'https://www.saucedemo.com';

test('Inventory remains usable when product images fail', async ({ page }) => {

  const chaos = new ChaosInjector(page);

  // Open SauceDemo login page
  await page.goto(BASE_URL);

  // Activate chaos before opening the inventory
  await chaos.failProductImages();

  // Login
  await page.locator('[data-test="username"]').fill(
    process.env.SHOPPER_USERNAME!
  );

  await page.locator('[data-test="password"]').fill(
    process.env.SHOPPER_PASSWORD!
  );

  await page.locator('[data-test="login-button"]').click();

  // Verify inventory page loads
  await expect(
    page.locator('[data-test="inventory-container"]')
  ).toBeVisible();

  // Verify a product is still visible
  const backpack = page
    .locator('.inventory_item')
    .filter({ hasText: 'Sauce Labs Backpack' });

  await expect(backpack).toBeVisible();

  // Verify the add-to-cart functionality still works
  await backpack.getByRole('button', {
    name: 'Add to cart'
  }).click();

  await expect(
    backpack.getByRole('button', { name: 'Remove' })
  ).toBeVisible();

  // Verify that image failures actually occurred
  expect(chaos.getFailedImageCount()).toBeGreaterThan(0);

});
