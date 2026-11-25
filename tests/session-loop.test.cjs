const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const read = (file) => readFileSync(join(__dirname, "..", file), "utf8").replace(/\r\n/g, "\n");

test("profile callbacks keep a stable identity, so loading the profile cannot re-trigger itself", () => {
  const source = read("src/session/SessionContext.tsx");
  for (const name of ["refreshProfile", "applyProfileSnapshot"]) {
    const start = source.indexOf(`const ${name} = useCallback(`);
    assert.ok(start > 0, name);
    const body = source.slice(start, source.indexOf("\n  const ", start + 10) > 0
      ? Math.min(source.indexOf("\n  const ", start + 10), source.indexOf("\n  useEffect(", start) > 0 ? source.indexOf("\n  useEffect(", start) : Infinity)
      : undefined);
    assert.doesNotMatch(body, /\[session\]/, name);
    assert.match(body, /\[\]/, name);
    assert.match(body, /JSON\.stringify\(nextUser\) === JSON\.stringify\(currentUser\)/, name);
  }
});

test("dashboard reload depends on the user id, not the session object, and loads quietly", () => {
  const source = read("src/features/dashboard/DurianOperationsScreen.tsx");
  assert.ok(source.includes("[backendRole, chatSupported, userId]"));
  assert.ok(source.includes("if (showSpinner) setRefreshing(true);"));
});

test("camera schedule cannot be saved before it was read, and stored photos carry the token", () => {
  const camera = read("src/features/camera/CameraMonitorScreen.tsx");
  assert.ok(camera.includes("disabled={loading || !loaded}"));
  assert.ok(camera.includes("!loaded ? ("));
  assert.doesNotMatch(camera, /uri: cap(ture)?\.image_url/);
});
