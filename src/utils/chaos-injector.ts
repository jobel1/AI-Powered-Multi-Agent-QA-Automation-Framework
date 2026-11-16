
import type { Page } from '@playwright/test';

export class ChaosInjector {
  private failedImageCount = 0;
  private page: Page;

  constructor(page: Page) {
    this.page=page;
  }

  // Simulating product image loading failures
  async failProductImages() {
    await this.page.route('**/*', async (route) => {
      const request = route.request();

      if (request.resourceType() === 'image') {
        this.failedImageCount++;

        await route.abort();
        return;
      }

      await route.continue();
    });
  }

  // Return the number of failed image requests
  getFailedImageCount() {
    return this.failedImageCount;
  }
}
