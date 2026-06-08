import pino from "pino";

type LogFields = Record<string, unknown>;

const SECRET_FIELD_PATTERN =
  /(api[-_]?key|authorization|connection[-_]?string|database[-_]?url|key|password|secret|token)/i;

const REDACTED = "[REDACTED]";

export function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    name: "UnknownError",
    message: typeof error === "string" ? error : "Unknown error",
  };
}

export function redactLogFields<T>(fields: T): T {
  if (!fields || typeof fields !== "object") {
    return fields;
  }

  if (Array.isArray(fields)) {
    return fields.map((item) => redactLogFields(item)) as T;
  }

  return Object.fromEntries(
    Object.entries(fields as LogFields).map(([key, value]) => [
      key,
      SECRET_FIELD_PATTERN.test(key) ? REDACTED : redactLogFields(value),
    ])
  ) as T;
}

export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug"),
  base: {
    service: process.env.LOG_SERVICE_NAME || "agent-specs-app",
    environment: process.env.NODE_ENV || "development",
  },
  messageKey: "msg",
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      "*.apiKey",
      "*.authorization",
      "*.connectionString",
      "*.databaseUrl",
      "*.key",
      "*.password",
      "*.secret",
      "*.token",
      "apiKey",
      "authorization",
      "connectionString",
      "databaseUrl",
      "key",
      "password",
      "secret",
      "token",
    ],
    censor: REDACTED,
  },
});

export function logInfo(message: string, fields: LogFields = {}) {
  logger.info(redactLogFields(fields), message);
}

export function logWarn(message: string, fields: LogFields = {}) {
  logger.warn(redactLogFields(fields), message);
}

export function logError(message: string, error: unknown, fields: LogFields = {}) {
  logger.error(
    {
      ...redactLogFields(fields),
      err: serializeError(error),
    },
    message
  );
}

export function durationMs(startedAt: number) {
  return Math.round(performance.now() - startedAt);
}
