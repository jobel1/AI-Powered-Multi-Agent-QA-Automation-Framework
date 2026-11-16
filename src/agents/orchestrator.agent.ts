
import { expect, type Browser, type Page } from '@playwright/test';

import { ShopperAgent } from './shopper.agent';
import { AttackerAgent, protectedRoutes } from './attacker.agent';
import { attachObserver, type Observation } from './observer.agent';

import { loginInputCases } from '../utils/input-generator';
import { ChaosInjector } from '../utils/chaos-injector';

import { Type } from '@google/genai';
import { AIService } from '../AI/ai.service';

const BASE_URL = 'https://www.saucedemo.com';

type ScenarioId =
  | 'shopper_purchase'
  | 'attacker_login'
  | 'attacker_unauthorized'
  | 'attacker_post_logout'
  | 'chaos_images';

type ScenarioStatus =
  | 'passed'
  | 'failed'
  | 'skipped';

interface PlannedScenario {
  id: ScenarioId;
  reason: string;
  priority: number;
}

interface ScenarioDefinition {
  id: ScenarioId;
  description: string;
}

interface AgentResult {
  agent: string;
  scenario: string;
  status: ScenarioStatus;
  durationMs: number;
  error?: string;
  observations: Observation[];
}

type ScenarioTask = (
  page: Page,
  setAction: (action: string) => void
) => Promise<void>;



export class OrchestratorAgent {

  private results: AgentResult[] = [];

  private ai?: AIService;
  private browser: Browser;

  constructor(browser:Browser) {
    this.browser= browser;
  }



  private getAIService(): AIService {
    this.ai ??= new AIService();

    return this.ai;
  }


  private getAvailableScenarios(): ScenarioDefinition[] {

    const hasCredentials = Boolean(
      process.env.SHOPPER_USERNAME &&
      process.env.SHOPPER_PASSWORD
    );

    const scenarios: ScenarioDefinition[] = [

      {
        id: 'attacker_login',
        description: 'Test login using AI-generated invalid inputs'
      },

      {
        id: 'attacker_unauthorized',
        description: 'Test direct access to protected routes without login'
      }

    ];

    if (hasCredentials) {

      scenarios.push(

        {
          id: 'shopper_purchase',
          description: 'Complete a normal customer purchase'
        },

        {
          id: 'attacker_post_logout',
          description: 'Test access to protected pages after logout'
        },

        {
          id: 'chaos_images',
          description: 'Test inventory usability when product images fail'
        }

      );
    }

    return scenarios;
  }


  private async generateExecutionPlan(
    objective: string
  ): Promise<PlannedScenario[]> {

    const scenarios = this.getAvailableScenarios();

    const allowedIds = new Set(
      scenarios.map(scenario => scenario.id)
    );

    const prompt = `
      You are an AI QA orchestration assistant.

      Your job is to create a test execution plan
      for an e-commerce application.

      USER OBJECTIVE:
      ${objective.slice(0, 500)}

      AVAILABLE SCENARIOS:
      ${JSON.stringify(scenarios, null, 2)}

      RULES:

      1. Select only scenario IDs from the available list.
      2. Never invent scenario IDs.
      3. Prioritize scenarios based on the user objective.
      4. Priority 1 means highest priority.
      5. For a complete QA objective, include every available scenario.
      6. Provide a short reason for every selected scenario.
      7. Do not generate code or browser commands.
      8. Do not repeat scenarios.

      Return a valid JSON execution plan.
    `;

    try {

      const response = await this.getAIService().generateResponse(
        prompt,
        {
          responseMimeType: 'application/json',

          responseJsonSchema: {

            type: Type.OBJECT,

            properties: {

              plan: {

                type: Type.ARRAY,

                items: {

                  type: Type.OBJECT,

                  properties: {

                    id: {
                      type: Type.STRING,
                      enum: scenarios.map(s => s.id)
                    },

                    reason: {
                      type: Type.STRING
                    },

                    priority: {
                      type: Type.INTEGER
                    }

                  },

                  required: [
                    'id',
                    'reason',
                    'priority'
                  ]

                }

              }

            },

            required: ['plan']

          }
        }
      );


      // Parse Gemini response

      const parsed: unknown = JSON.parse(response);

      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        !('plan' in parsed) ||
        !Array.isArray(parsed.plan)
      ) {
        throw new Error('Invalid Gemini execution plan');
      }


      // Validate scenario IDs and remove duplicates

      const seen = new Set<ScenarioId>();

      const validPlan: PlannedScenario[] = [];

      for (const item of parsed.plan) {

        if (
          typeof item !== 'object' ||
          item === null ||
          !('id' in item) ||
          !('reason' in item) ||
          !('priority' in item)
        ) {
          continue;
        }

        const id = item.id;
        const reason = item.reason;
        const priority = item.priority;

        if (
          typeof id !== 'string' ||
          !allowedIds.has(id as ScenarioId) ||
          typeof reason !== 'string' ||
          typeof priority !== 'number' ||
          !Number.isInteger(priority) ||
          seen.has(id as ScenarioId)
        ) {
          continue;
        }

        seen.add(id as ScenarioId);

        validPlan.push({

          id: id as ScenarioId,

          reason: reason.slice(0, 300),

          priority

        });

      }


      if (validPlan.length === 0) {
        throw new Error('Gemini returned no valid scenarios');
      }


      return validPlan.sort(
        (a, b) => a.priority - b.priority
      );

    } catch (error) {

      console.error(
        'Gemini planning failed:',
        error
      );

      console.log('Using default execution plan');

      // Fallback: run every available scenario

      return scenarios.map((scenario, index) => ({

        id: scenario.id,

        reason: 'Default fallback execution',

        priority: index + 1

      }));

    }
  }

  private async runScenario(
    agent: string,
    scenario: string,
    task: ScenarioTask
  ): Promise<AgentResult> {

    const context = await this.browser.newContext();

    const page = await context.newPage();

    const startTime = Date.now();

    let observer: ReturnType<typeof attachObserver> | undefined;

    const result: AgentResult = {

      agent,

      scenario,

      status: 'passed',

      durationMs: 0,

      observations: []

    };

    try {



      observer = attachObserver(page);


      await task(page, (action) => {

        observer!.setAction(action);

      });

    } catch (error) {

      result.status = 'failed';

      result.error =
        error instanceof Error
          ? error.message
          : String(error);

    } finally {

      result.durationMs = Date.now() - startTime;



      if (observer) {

        result.observations = observer.getObservations();

      }


      await context.close();

    }

    this.results.push(result);

    return result;
  }



  // SHOPPER SCENARIO


  async runShopperScenario(): Promise<AgentResult> {

    const username = process.env.SHOPPER_USERNAME!;

    const password = process.env.SHOPPER_PASSWORD!;

    return this.runScenario(

      'Shopper',

      'Complete purchase',

      async (page, setAction) => {

        const shopper = new ShopperAgent(page);

        setAction('Open store');

        await shopper.openStore();

        setAction('Login');

        await shopper.login(username, password);

        setAction('Add product to cart');

        await shopper.addProductToCart(
          'Sauce Labs Backpack'
        );

        setAction('Verify cart');

        await shopper.verifyCart(
          'Sauce Labs Backpack'
        );

        setAction('Start checkout');

        await shopper.startCheckout();

        setAction('Enter customer details');

        await shopper.enterCustomerDetails(
          'Test',
          'Customer',
          '695001'
        );

        setAction('Complete purchase');

        await shopper.completePurchase();

      }

    );
  }



  // ATTACKER: LOGIN INPUT TESTING

  async runInputAttackScenarios(): Promise<void> {

    for (const input of loginInputCases) {

      await this.runScenario(

        'Attacker',

        `Login input: ${input.name}`,

        async (page, setAction) => {

          const attacker = new AttackerAgent(page);

          setAction(`Testing ${input.name}`);

          await attacker.testLoginInput(input);

        }

      );

    }
  }


 
  // ATTACKER: UNAUTHORIZED ACCESS
  

  async runUnauthorizedAccessScenarios(): Promise<void> {

    for (const route of protectedRoutes) {

      await this.runScenario(

        'Attacker',

        `Unauthorized access: ${route}`,

        async (page, setAction) => {

          const attacker = new AttackerAgent(page);

          setAction(`Testing protected route: ${route}`);

          await attacker.testAccessWithoutLogin(route);

        }

      );

    }
  }


 
  // ATTACKER: ACCESS AFTER LOGOUT
  

  async runPostLogoutScenario(): Promise<AgentResult> {

    const username = process.env.SHOPPER_USERNAME;

    const password = process.env.SHOPPER_PASSWORD;

    if (!username || !password) {

      return this.skipScenario(
        'Attacker',
        'Access after logout',
        'Shopper credentials are missing'
      );

    }

    return this.runScenario(

      'Attacker',

      'Access after logout',

      async (page, setAction) => {

        const attacker = new AttackerAgent(page);

        setAction('Login and logout');

        await attacker.testAccessAfterLogout(
          '/inventory.html',
          username,
          password
        );

      }

    );
  }


  // CHAOS TESTING
 

  async runChaosScenario(): Promise<AgentResult> {

    const username = process.env.SHOPPER_USERNAME;

    const password = process.env.SHOPPER_PASSWORD;

    if (!username || !password) {

      return this.skipScenario(
        'Chaos',
        'Product image failure',
        'Shopper credentials are missing'
      );

    }

    return this.runScenario(

      'Chaos',

      'Product image failure',

      async (page, setAction) => {

        const chaos = new ChaosInjector(page);

        const shopper = new ShopperAgent(page);

        setAction('Open store');

        await shopper.openStore();

        setAction('Inject image failures');

        await chaos.failProductImages();

        setAction('Login');

        await shopper.login(username, password);

        setAction('Verify inventory');

        await expect(
          page.locator('[data-test="inventory-container"]')).toBeVisible();

        setAction('Verify product');

        const backpack = page
          .locator('.inventory_item')
          .filter({
            hasText: 'Sauce Labs Backpack'
          });

        await expect(backpack).toBeVisible();

        setAction('Add product to cart');

        await shopper.addProductToCart(
          'Sauce Labs Backpack'
        );

        if (chaos.getFailedImageCount() === 0) {

          throw new Error(
            'No product image requests were intercepted'
          );

        }

      }

    );
  }


  private skipScenario(
    agent: string,
    scenario: string,
    reason: string
  ): AgentResult {

    const result: AgentResult = {

      agent,

      scenario,

      status: 'skipped',

      durationMs: 0,

      error: reason,

      observations: []

    };

    this.results.push(result);

    return result;
  }


  
  async executePlan(
    plan: PlannedScenario[]
  ): Promise<AgentResult[]> {

    for (const scenario of plan) {

      console.log(
        `\n[Orchestrator] Running: ${scenario.id}`
      );

      console.log(
        `Reason: ${scenario.reason}`
      );

      switch (scenario.id) {

        case 'shopper_purchase':

          await this.runShopperScenario();

          break;


        case 'attacker_login':

          await this.runInputAttackScenarios();

          break;


        case 'attacker_unauthorized':

          await this.runUnauthorizedAccessScenarios();

          break;


        case 'attacker_post_logout':

          await this.runPostLogoutScenario();

          break;


        case 'chaos_images':

          await this.runChaosScenario();

          break;

      }

    }

    return this.getResults();
  }



  async runAll(

    objective = `
      Run a complete QA suite covering normal shopping,
      login security, unauthorized access and application resilience.
    `

  ): Promise<AgentResult[]> {

  
    this.results = [];


    // Generate execution plan using Gemini

    const plan = await this.generateExecutionPlan(objective);


    console.log('\n========== GEMINI EXECUTION PLAN ==========');

    for (const scenario of plan) {

      console.log(
        `${scenario.priority}. ${scenario.id}`
      );

      console.log(
        `   ${scenario.reason}`
      );

    }



    const results = await this.executePlan(plan);

    return results;
  }



  getResults(): AgentResult[] {

    return [...this.results];

  }





}