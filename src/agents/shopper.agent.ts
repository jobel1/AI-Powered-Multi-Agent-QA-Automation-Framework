import {expect} from '@playwright/test'
import type {Page} from '@playwright/test'


export class ShopperAgent {
  private page:Page;

  constructor(page:Page) {
    this.page=page;
  }

  async openStore() {
    await this.page.goto('https://www.saucedemo.com/');

    await expect(
      this.page.locator('[data-test="login-button"]')
    ).toBeVisible(); 
  }

  async login(username: string, password: string) {
    await this.page.getByLabel('username').fill(username);

    await this.page.getByLabel('password').fill(password);

    await this.page.getByRole('button',{name:'LOGIN'}).click();

    await expect(
      this.page.locator('[data-test="inventory-container"]')
    ).toBeVisible();
  }


  async addProductToCart(productName: string) {
    const product = this.page
      .locator('.inventory_item')
      .filter({ hasText: productName });

    await expect(product).toBeVisible();

    await product.getByRole('button', {
      name: 'Add to cart'
    }).click();

    await expect(
      product.getByRole('button', {
        name: 'Remove'
      })
    ).toBeVisible();
  }


   async verifyCart(productName: string) {
    await this.page.locator('[data-test="shopping-cart-link"]').click();

    await expect(
      this.page.locator('[data-test="inventory-item"]')
        .filter({ hasText: productName })
    ).toBeVisible();
  }


  async startCheckout() {
    await this.page.locator('[data-test="checkout"]').click();

    await expect(
      this.page.locator('[data-test="firstName"]')
    ).toBeVisible();
  }


  async enterCustomerDetails(
    firstName: string,
    lastName: string,
    postalCode: string
  ) {
    await this.page.locator('[data-test="firstName"]').fill(firstName);
    await this.page.locator('[data-test="lastName"]').fill(lastName);
    await this.page.locator('[data-test="postalCode"]').fill(postalCode);

    await this.page.locator('[data-test="continue"]').click();

    await expect(
      this.page.locator('[data-test="finish"]')
    ).toBeVisible();
  }


    async completePurchase() {
    await this.page.locator('[data-test="finish"]').click();

    await expect(
      this.page.getByText('Thank you for your order!')
    ).toBeVisible();
  }


}