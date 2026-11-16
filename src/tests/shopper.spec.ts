import { test } from '@playwright/test';
import { ShopperAgent } from '../agents/shopper.agent';
import 'dotenv/config';


test('shopper test', async ({page}) => {
    const shopper = new ShopperAgent(page);

    await shopper.openStore()

    await shopper.login(
    process.env.SHOPPER_USERNAME!,
    process.env.SHOPPER_PASSWORD!
  );

  await shopper.addProductToCart('Sauce Labs Backpack');

  await shopper.verifyCart('Sauce Labs Backpack');

  await shopper.startCheckout();

  await shopper.enterCustomerDetails(
    'Job',
    'I',
    '654321'
  );

  await shopper.completePurchase();

})