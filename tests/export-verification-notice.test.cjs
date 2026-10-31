const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

test("traceability does not render the removed export verification notice", () => {
  const source = readFileSync(
    join(__dirname, "../src/features/profile/DurianTraceabilityScreen.tsx"),
    "utf8",
  );
  assert.ok(
    !source.includes("Chưa có dữ liệu xuất xưởng vận hành được xác minh."),
  );
});
