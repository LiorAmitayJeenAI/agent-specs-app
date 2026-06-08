import assert from "node:assert/strict";
import { test } from "node:test";

import { redactLogFields, serializeError } from "./logger.ts";

test("serializes errors with safe diagnostic fields", () => {
  const error = new TypeError("Upload failed");

  const serialized = serializeError(error);

  assert.equal(serialized.name, "TypeError");
  assert.equal(serialized.message, "Upload failed");
  assert.match(serialized.stack ?? "", /TypeError: Upload failed/);
});

test("redacts known secret fields before logging", () => {
  const fields = redactLogFields({
    route: "/api/file-upload",
    apiKey: "secret-api-key",
    nested: {
      password: "secret-password",
      safe: "visible",
    },
  });

  assert.deepEqual(fields, {
    route: "/api/file-upload",
    apiKey: "[REDACTED]",
    nested: {
      password: "[REDACTED]",
      safe: "visible",
    },
  });
});
