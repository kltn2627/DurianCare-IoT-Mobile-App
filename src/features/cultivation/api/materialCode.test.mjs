import assert from "node:assert/strict";
import test from "node:test";
import { materialCodeFromScan, selectWithOptionalCodeMapping } from "./materialCode.ts";
import { addSelectedMaterial, buildCompletionPayload } from "./activityCompletion.ts";

const input = { id: "verified-1", productName: "Ridomil Gold 68WG", status: "VERIFIED", unit: "kg" };
const userRecorded = { id: "user-recorded-1", productName: "RUỒI VÀNG", status: "USER_RECORDED", unit: "ml" };

test("scanner preserves the identifier and distinguishes QR from linear barcode", () => {
  assert.deepEqual(materialCodeFromScan(" 0012345678905 ", "ean13"), { code: "0012345678905", codeType: "BARCODE" });
  assert.deepEqual(materialCodeFromScan("https://example.test/product/ABC", "qr"), { code: "https://example.test/product/ABC", codeType: "QR" });
  assert.equal(materialCodeFromScan("\n", "qr"), null);
});

test("unknown barcode resolved by Search saves mapping and selects through the shared hook", async () => {
  const pending = { code: "0012345678905", codeType: "BARCODE" };
  let usages = [];
  let source;
  let saved;
  selectWithOptionalCodeMapping(input, "SEARCH", pending,
    (selected, selectedSource) => { source = selectedSource; usages = addSelectedMaterial(usages, selected); },
    async (code, id) => { saved = { code, id }; },
    () => assert.fail("mapping should save"));
  await new Promise(setImmediate);
  assert.equal(source, "SEARCH");
  assert.equal(usages[0].agriculturalInputId, input.id);
  assert.deepEqual(saved, { code: pending, id: input.id });
});

test("mapping failure does not prevent OCR selection", async () => {
  let usages = [];
  let warned = false;
  selectWithOptionalCodeMapping(input, "OCR", { code: "QR-42", codeType: "QR" },
    (selected) => { usages = addSelectedMaterial(usages, selected); },
    async () => { throw new Error("offline"); },
    () => { warned = true; });
  await new Promise(setImmediate);
  assert.equal(usages[0].agriculturalInputId, input.id);
  assert.equal(warned, true);
});

test("known QR and barcode select without writing another mapping", () => {
  for (const source of ["QR", "BARCODE"]) {
    let selectedSource;
    let usages = [];
    let saves = 0;
    selectWithOptionalCodeMapping(input, source, null,
      (selected, passedSource) => { selectedSource = passedSource; usages = addSelectedMaterial(usages, selected, undefined, passedSource); },
      async () => { saves++; },
      () => assert.fail("unexpected mapping failure"));
    assert.equal(selectedSource, source);
    assert.equal(usages[0].selectionSource, source);
    assert.equal(saves, 0);
    const payload = buildCompletionPayload("FERTILIZATION", {
      startedAt: "2026-10-07T07:00", completedAt: "2026-10-07T08:00", actualArea: "", areaUnit: "ha", notes: "",
      inputUsages: [{ ...usages[0], quantityUsed: "2" }],
    }, [input], "actor-1");
    assert.equal("selectionSource" in payload.inputUsages[0], false);
  }
});

test("draft input cannot be selected or learned", () => {
  selectWithOptionalCodeMapping({ ...input, status: "DRAFT" }, "SEARCH", { code: "abc", codeType: "QR" },
    () => assert.fail("must not select unverified input"),
    async () => assert.fail("must not map unverified input"),
    () => assert.fail("must reject before any request"));
});

test("unknown QR can map a user-recorded material and reuse it", async () => {
  let selected;
  let saved;
  selectWithOptionalCodeMapping(userRecorded, "MANUAL", { code: "QR-RUOI-VANG", codeType: "QR" },
    (input) => { selected = input; },
    async (code, id) => { saved = { code, id }; },
    () => assert.fail("mapping should save"));
  await new Promise(setImmediate);
  assert.equal(selected.id, "user-recorded-1");
  assert.deepEqual(saved, { code: { code: "QR-RUOI-VANG", codeType: "QR" }, id: "user-recorded-1" });
});
