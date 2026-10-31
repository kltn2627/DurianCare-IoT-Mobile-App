import assert from "node:assert/strict";
import test from "node:test";
import { resolveApiBaseUrl } from "./apiBaseResolver.ts";
test("LAN auto resolves to configured gateway port, never a microservice", () => {
  assert.equal(resolveApiBaseUrl("auto", true, "192.168.1.7:8081", "18080", true), "http://192.168.1.7:18080");
  assert.equal(resolveApiBaseUrl("auto", true, "192.168.1.7:8081"), "http://192.168.1.7:8080");
  assert.throws(() => resolveApiBaseUrl("auto", true, "localhost:8081", "18080", true), /LAN/);
  assert.throws(() => resolveApiBaseUrl("http://localhost:8080", true, undefined, "8080", true), /localhost/);
});
test("explicit production HTTPS is unchanged and production never guesses LAN", () => {
  assert.equal(resolveApiBaseUrl("https://gateway.example/api/", false), "https://gateway.example/api");
  assert.throws(() => resolveApiBaseUrl("auto", false, "192.168.1.7:8081"), /EXPO_PUBLIC_API_BASE_URL/);
});
