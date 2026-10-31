import assert from "node:assert/strict";
import test from "node:test";
import { createHistoryCache, saveCompletionAndRefresh, notifyCultivationChanged, subscribeCultivation, getCultivationRevision } from "./cultivationRefresh.ts";

test("history is shared between modal and history view, isolated by season, and refreshed after completion", async () => {
  const calls = [];
  const cache = createHistoryCache(async id => { calls.push(id); return { seasonId: id, executions: [] }; });
  const [modal, history] = await Promise.all([cache.get("season-a"), cache.get("season-a")]);
  assert.equal(modal, history);
  await cache.get("season-a"); await cache.get("season-b");
  assert.deepEqual(calls, ["season-a", "season-b"]);
  cache.invalidate("season-a"); await cache.get("season-a");
  assert.deepEqual(calls, ["season-a", "season-b", "season-a"]);
});

test("a late pre-completion response cannot overwrite reloaded history", async () => {
  const resolvers = [];
  const cache = createHistoryCache(() => new Promise(resolve => resolvers.push(resolve)));
  const before = cache.get("season");
  cache.invalidate("season");
  const after = cache.get("season");
  resolvers[1]({ version: "authoritative-after-save" }); await after;
  resolvers[0]({ version: "stale" }); await before;
  assert.equal((await cache.get("season")).version, "authoritative-after-save");
});

test("successful save invalidates all dependents once and refresh failure is not a save failure", async () => {
  const events = [];
  const unsubscribe = subscribeCultivation(() => events.push("invalidate-risk-and-export"));
  const revision = getCultivationRevision();
  try {
    const outcomes = await saveCompletionAndRefresh(async () => events.push("saved"), notifyCultivationChanged,
      [async () => events.push("calendar"), async () => { events.push("history"); throw new Error("offline"); }]);
    assert.deepEqual(events, ["saved", "invalidate-risk-and-export", "calendar", "history"]);
    assert.equal(getCultivationRevision(), revision + 1);
    assert.equal(outcomes[1].status, "rejected");
  } finally { unsubscribe(); }
});

test("failed completion does not change caches or refresh consumers", async () => {
  let changed = false;
  await assert.rejects(saveCompletionAndRefresh(async () => { throw new Error("403"); }, () => { changed = true; },
    [async () => { changed = true; }]), /403/);
  assert.equal(changed, false);
});
