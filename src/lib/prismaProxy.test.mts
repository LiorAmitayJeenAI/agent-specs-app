import assert from "node:assert/strict";
import { test } from "node:test";

import { createPrismaProxy } from "./prismaProxy.ts";

test("binds function members to the resolved Prisma client", () => {
  const client = {
    marker: "real-client",
    $transaction() {
      return this.marker;
    },
  };

  const proxy = createPrismaProxy(() => client);

  assert.equal(proxy.$transaction(), "real-client");
});
