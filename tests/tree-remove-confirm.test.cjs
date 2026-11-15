const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

// Regression: on Expo web a multi-button Alert.alert is a no-op, so "Đã đốn cây" did nothing.
test("tree removal confirms with the in-app ConfirmModal, not Alert.alert", () => {
  const source = readFileSync(join(__dirname, "../src/features/trees/TreeDetailScreen.tsx"), "utf8");
  assert.doesNotMatch(source, /Alert\.alert\(/);
  assert.ok(source.includes('import { ConfirmModal } from "@/src/components/ConfirmModal"'));
  assert.ok(source.includes("onPress={() => setConfirmingRemove(true)}"));
  assert.ok(source.includes("visible={confirmingRemove}"));
  assert.ok(source.includes("onConfirm={() => void removeConfirmedTree()}"));
  assert.ok(source.includes("await removeTree(treeId);"));
});

test("removeTree still calls DELETE /api/trees/{id}", () => {
  const source = readFileSync(join(__dirname, "../src/features/trees/treeApi.ts"), "utf8");
  const fn = source.slice(source.indexOf("export async function removeTree"));
  assert.match(fn.slice(0, 300), /method: "DELETE",\s*url: `\/api\/trees\/\$\{encodeURIComponent\(treeId\)\}`/);
});
