import assert from "node:assert/strict";
import test from "node:test";
import { cultivationError } from "./cultivationError.ts";
test("API status contracts yield readable messages and never server stack traces", () => {
  for (const status of [400, 401, 403, 404, 409, 413, 422, 500, 503]) {
    const message = cultivationError({ name: "AuthApiError", status, message: "java.lang.StackTrace: secret" });
    assert.ok(message.length > 10);
    assert.equal(message.includes("StackTrace"), false);
  }
  assert.match(cultivationError({ name: "AuthApiError", cause: { code: "ECONNABORTED" } }), /thử lại/);
});
