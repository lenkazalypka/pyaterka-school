import * as Sentry from "@sentry/nextjs";

type Attributes = Record<string, string | number | boolean | null | undefined>;

export function logEvent(event: string, attributes: Attributes = {}) {
  Sentry.logger.info(event, attributes);
}

export function logWarning(event: string, attributes: Attributes = {}) {
  Sentry.logger.warn(event, attributes);
}

export function logError(event: string, error: unknown, attributes: Attributes = {}) {
  Sentry.logger.error(event, attributes);
  Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
    tags: { event },
    extra: attributes,
  });
}
