
import { test, expect } from '@playwright/test';

import { OrchestratorAgent } from '../agents/orchestrator.agent';

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

test.describe('AI Orchestrator', () => {

  test('Orchestrator executes the complete QA suite', async ({
    browser
  }, testInfo) => {

    // Allow sufficient time for Gemini and all Playwright scenarios
    test.setTimeout(300_000);

    
    //  CREATE ORCHESTRATOR
    

    const orchestrator = new OrchestratorAgent(browser);

    
    //  DEFINE QA OBJECTIVE
    

    const objective = `
      Perform complete QA testing of the SauceDemo e-commerce application.

      Test the following areas:

      1. Normal shopping workflow
      2. Login input validation
      3. Unauthorized access to protected pages
      4. Access after logout
      5. Application behaviour when product images fail

      Prioritize the scenarios according to their importance.
    `;

    console.log('\nStarting AI Multi-Agent QA Testing...');


    
    //  EXECUTE THE ORCHESTRATOR
    

    const results = await orchestrator.runAll(objective);


    
    //  CALCULATE TEST SUMMARY
   

    const passed = results.filter(
      result => result.status === 'passed'
    ).length;

    const failed = results.filter(
      result => result.status === 'failed'
    ).length;

    const skipped = results.filter(
      result => result.status === 'skipped'
    ).length;

    const total = results.length;


    
    //  DISPLAY RESULTS
    

    console.log('\n========== FINAL QA SUMMARY ==========');

    console.log(`Total scenarios: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Skipped: ${skipped}`);

    console.log('\n========== AGENT RESULTS ==========');

    for (const result of results) {

      console.log(
        `\n[${result.status.toUpperCase()}] ${result.agent}`
      );

      console.log(`Scenario: ${result.scenario}`);

      console.log(`Duration: ${result.durationMs} ms`);

      console.log(
        `Observations: ${result.observations.length}`
      );

      if (result.error) {
        console.log(`Error: ${result.error}`);
      }

    }


   
    //  GENERATE JSON REPORT
    

    const report = {

      objective,

      generatedAt: new Date().toISOString(),

      summary: {
        total,
        passed,
        failed,
        skipped
      },

      results

    };

    const reportPath = testInfo.outputPath(
      'orchestrator-results.json'
    );

    await mkdir(dirname(reportPath), {
      recursive: true
    });

    await writeFile(
      reportPath,
      JSON.stringify(report, null, 2),
      'utf-8'
    );

    // Attach JSON report to Playwright HTML report
    await testInfo.attach('orchestrator-results', {
      path: reportPath,
      contentType: 'application/json'
    });

    console.log(`\nJSON report saved: ${reportPath}`);


    
    //  VALIDATE FINAL RESULTS
    

    expect(
      total,
      'Orchestrator did not execute any scenarios'
    ).toBeGreaterThan(0);

    const failures = results.filter(
      result => result.status === 'failed'
    );

    expect(
      failures,
      `Some QA scenarios failed:\n${JSON.stringify(
        failures,
        null,
        2
      )}`
    ).toHaveLength(0);

  });

});
