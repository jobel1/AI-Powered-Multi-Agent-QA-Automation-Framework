
import { test, expect } from '@playwright/test';
import { AttackerAgent } from '../agents/attacker.agent';

test('Attacker tests AI-generated login inputs', async ({ page }) => {

  test.setTimeout(120_000);

  const attacker = new AttackerAgent(page);

  // Generate inputs through Gemini
  const testCases = await attacker.generateAttackInputs();

  console.log(`Generated ${testCases.length} test cases`);

  expect(testCases.length).toBeGreaterThan(0);

  // Execute generated inputs
  for (const input of testCases) {

    await test.step(input.name, async () => {
      await attacker.testLoginInput(input);
    });

  }
});
