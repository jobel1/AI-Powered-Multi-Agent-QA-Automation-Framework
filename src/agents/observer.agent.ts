
import type { Page, Request, Response, ConsoleMessage } from '@playwright/test';
import { performance } from 'node:perf_hooks';

export type ObservationCategory =
  | 'console-error'
  | 'javascript-exception'
  | 'network-request'
  | 'http-response'
  | 'http-error'
  | 'network-failure'
  | 'slow-api';

export interface Observation {
  category: ObservationCategory;
  severity: 'info' | 'warning' | 'error';
  message: string;
  timestamp: string;
  action: string;
  url?: string;
  method?: string;
  status?: number;
  durationMs?: number;
}

interface RequestMetadata {
  startedAt: number;
  action: string;
  isApi: boolean;
}

// Hide potentially sensitive query parameters from report URLs.
function safeUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);

    for (const key of url.searchParams.keys()) {
      if (/token|key|secret|password|auth|session/i.test(key)) {
        url.searchParams.set(key, '[REDACTED]');
      }
    }

    return url.toString();
  } catch {
    return rawUrl;
  }
}

export function attachObserver(
  page: Page,
  slowApiThresholdMs = 2000
) {
  const observations: Observation[] = [];

  const requestMetadata = new Map<Request, RequestMetadata>();

  let currentAction = 'Test setup';

  function record(
    observation: Omit<Observation, 'timestamp'>
  ) {
    observations.push({
      ...observation,
      timestamp: new Date().toISOString()
    });
  }

  function isApiRequest(request: Request): boolean {
    return ['xhr', 'fetch'].includes(request.resourceType());
  }

  //  Network request monitoring
  const onRequest = (request: Request) => {
    const metadata: RequestMetadata = {
      startedAt: performance.now(),
      action: currentAction,
      isApi: isApiRequest(request)
    };

    requestMetadata.set(request, metadata);

    record({
      category: 'network-request',
      severity: 'info',
      message: 'Request started',
      action: metadata.action,
      url: safeUrl(request.url()),
      method: request.method()
    });
  };

  //  Response and API performance monitoring
  const onResponse = (response: Response) => {
    const request = response.request();
    const metadata = requestMetadata.get(request);

    const durationMs = metadata
      ? Math.round(performance.now() - metadata.startedAt)
      : undefined;

    const action = metadata?.action ?? currentAction;
    const status = response.status();

    record({
      category: status >= 400 ? 'http-error' : 'http-response',
      severity: status >= 400 ? 'warning' : 'info',
      message: `Received HTTP ${status} response`,
      action,
      url: safeUrl(response.url()),
      method: request.method(),
      status,
      durationMs
    });

    // Flaging slow API responses.
    if (
      metadata?.isApi &&
      durationMs !== undefined &&
      durationMs > slowApiThresholdMs
    ) {
      record({
        category: 'slow-api',
        severity: 'warning',
        message: `API took ${durationMs}ms to return response headers`,
        action,
        url: safeUrl(request.url()),
        method: request.method(),
        status,
        durationMs
      });
    }

    requestMetadata.delete(request);
  };

  //  Network-level failures
  const onRequestFailed = (request: Request) => {
    const metadata = requestMetadata.get(request);

    record({
      category: 'network-failure',
      severity: 'error',
      message: request.failure()?.errorText ?? 'Unknown network failure',
      action: metadata?.action ?? currentAction,
      url: safeUrl(request.url()),
      method: request.method()
    });

    requestMetadata.delete(request);
  };

  //  Browser console monitoring
 const onConsole = (message: ConsoleMessage) => {
    if (message.type() === 'error') {
        record({
            category: 'console-error',
            severity: 'warning',
            message: message.text(),
            action: currentAction
        });
    }
};
  

  //  Uncaught JavaScript exceptions
  const onPageError = (error: Error) => {
    record({
      category: 'javascript-exception',
      severity: 'error',
      message: error.message,
      action: currentAction
    });
  };

  // Register all listeners.
  page.on('request', onRequest);
  page.on('response', onResponse);
  page.on('requestfailed', onRequestFailed);
  page.on('console', onConsole);
  page.on('pageerror', onPageError);

  return {
    // Update the action currently being performed.
    setAction(action: string) {
      currentAction = action;
    },

    // Return all collected observations.
    getObservations() {
      return [...observations];
    }
  };
}
