
import { expect, type Page } from '@playwright/test';
import { Type } from '@google/genai';

import { AIService } from '../AI/ai.service';

const BASE_URL = 'https://www.saucedemo.com';

export interface AIInputCase {
  name: string;
  username: string;
  password: string;
}

export const protectedRoutes = [
  '/inventory.html',
  '/cart.html',
  '/checkout-step-one.html',
  '/checkout-step-two.html',
  '/checkout-complete.html'
];

export class AttackerAgent {
  private page: Page;
  private ai?: AIService;

  constructor(page: Page) {
    this.page = page;
  }

  // Create the AI service only when AI is needed
  private getAIService(): AIService {
    this.ai ??= new AIService();
    return this.ai;
  }

  // Generate login test cases using Gemini
  async generateAttackInputs(): Promise<AIInputCase[]> {

    const prompt = `
      You are an e-commerce QA security testing assistant.

      Generate 10 unusual but safe login test cases
      for the SauceDemo login page.

      Include:
      - Empty username and password
      - Missing username or password
      - Extremely long strings
      - Special characters
      - Unicode characters
      - Whitespace
      - Invalid credentials

      Requirements:
      - Every generated case must represent an invalid login.
      - Do not generate valid SauceDemo credentials.
      - Generate only input values.
      - Do not generate code, URLs or commands.
      - Keep each username and password below 2000 characters.

      Return the results in the requested JSON format.
    `;

    const response = await this.getAIService().generateResponse(
      prompt,
      {
        responseMimeType: 'application/json',
        responseJsonSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              username: { type: Type.STRING },
              password: { type: Type.STRING }
            },
            required: ['name', 'username', 'password']
          }
        }
      }
    );

    // Parse Gemini response
    let parsed: unknown;

    try {
      parsed = JSON.parse(response);
    } catch {
      throw new Error('Gemini returned invalid JSON');
    }

    if (!Array.isArray(parsed)) {
      throw new Error('Gemini did not return an array');
    }

    // Validate generated test cases
    const validCases = parsed.filter(
      (item): item is AIInputCase => {
        return (
          typeof item === 'object' &&
          item !== null &&
          typeof item.name === 'string' &&
          typeof item.username === 'string' &&
          typeof item.password === 'string' &&
          item.name.length <= 100 &&
          item.username.length <= 2000 &&
          item.password.length <= 2000
        );
      }
    );

    if (validCases.length === 0) {
      throw new Error('Gemini did not generate valid test cases');
    }

    return validCases.slice(0, 10);
  }

  // Execute AI-generated login inputs
  async testLoginInput(input: AIInputCase) {

    await this.page.goto(BASE_URL);

    await this.page.locator('[data-test="username"]').fill(input.username);
    await this.page.locator('[data-test="password"]').fill(input.password);
    await this.page.locator('[data-test="login-button"]').click();

    await expect(
      this.page.locator('[data-test="error"]')
    ).toBeVisible();

    await expect(
      this.page.locator('[data-test="inventory-container"]')
    ).toHaveCount(0);
  }

  // Test unauthorized access without login
  async testAccessWithoutLogin(route: string) {

    await this.page.goto(BASE_URL);

    await this.page.context().clearCookies();

    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    await this.page.goto(new URL(route, BASE_URL).toString());

    await expect(
      this.page.locator('[data-test="login-button"]')
    ).toBeVisible();

    await expect(
      this.page.locator('[data-test="inventory-container"]')
    ).toHaveCount(0);
  }

  // Test access after logout
  async testAccessAfterLogout(
    route: string,
    username: string,
    password: string
  ) {

    await this.page.goto(BASE_URL);

    await this.page.locator('[data-test="username"]').fill(username);
    await this.page.locator('[data-test="password"]').fill(password);

    await this.page.locator('[data-test="login-button"]').click();

    await expect(
      this.page.locator('[data-test="inventory-container"]')
    ).toBeVisible();

    await this.page.locator('#react-burger-menu-btn').click();
    await this.page.locator('#logout_sidebar_link').click();

    await expect(
      this.page.locator('[data-test="login-button"]')
    ).toBeVisible();

    await this.page.goto(new URL(route, BASE_URL).toString());

    await expect(
      this.page.locator('[data-test="login-button"]')
    ).toBeVisible();

    await expect(
      this.page.locator('[data-test="inventory-container"]')
    ).toHaveCount(0);
  }
}
