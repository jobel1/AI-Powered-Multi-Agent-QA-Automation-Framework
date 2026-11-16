# Multi-Agent QA Automation Tester

An AI-powered QA automation framework built with **TypeScript, Playwright, and Google's Gemini AI**. It uses multiple specialized agents to automate e-commerce testing, generate edge-case inputs, test unauthorized access, simulate application failures, and monitor browser activity. A central AI-powered Orchestrator coordinates test execution, while the Observer collects errors and test evidence. The project also integrates **GitHub Actions CI/CD** for automated testing and reporting.

## Measurable Testing Outcomes

- Tracks total, passed, failed, and skipped test scenarios.

- Records individual scenario execution times.

- Counts browser errors, network failures, HTTP errors, and other observations.

- Measures the number of AI-generated test cases executed.

- Generates structured JSON and Playwright HTML reports.

   ## Project Architecture

```mermaid
flowchart TD
    B["Playwright Test Runner"]
    B --> C["Orchestrator Test"]
    C --> D["Orchestrator Agent"]

    D <--> E["AI Service"]
    E <--> F["Google Gemini API"]

    D --> G["Shopper Agent"]
    D --> H["Attacker Agent"]
    D --> I["Chaos Injector"]

    E --> H

    G --> J["Playwright Browser"]
    H --> J
    I --> J

    J --> K["SauceDemo Application"]

    J -. "Browser, console and network events" .-> L["Observer Agent"]
    L --> M["Test Results & Observations"]

    G --> M
    H --> M
    I --> M

    M --> N["JSON Test Report"]
    M --> O["Playwright HTML Report"]

    N --> P["GitHub Actions Artifacts"]
    O --> P

    classDef ai fill:#e9e3ff,stroke:#7655c7,color:#241747
    classDef agent fill:#dceeff,stroke:#3976b8,color:#102b45
    classDef output fill:#e0f3e5,stroke:#45885a,color:#173b22

    class E,F ai
    class D,G,H,I,L agent
    class N,O,P output
```


  

