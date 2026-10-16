const {test}=require("node:test");
const assert=require("node:assert/strict");
const {isIllustration,illustrationTitle,quantityLabel}=require("../src/features/profile/exportPresentation.ts");
const {readFileSync}=require("node:fs");

test("screen has one origin-independent list but retains fixture write and stale-snapshot guards",()=>{
  const source=readFileSync(require("node:path").join(__dirname,"../src/features/profile/DurianTraceabilityScreen.tsx"),"utf8");
  assert.doesNotMatch(source,/dataScope|Dữ liệu minh họa|Mô phỏng/);
  assert.ok(source.includes("!isIllustration(batch) && isReleaseEligibleBatch(batch)"));
  assert.ok(source.includes("batches={releaseEligibleBatches}"));
  assert.ok(source.includes("syntheticRelease(release) ? [] : releaseActions(release)"));
  assert.ok(source.includes("setTraceability(null)"));
  assert.ok(source.includes("traceability?.releaseId === selectedRelease?.id"));
});

test("illustration titles preserve provenance without exposing internal codes",()=>{
  const row=Object.freeze({releaseCode:"DEMO-SYNTHETIC-2026-RI6",dataOrigin:"DEMO_SYNTHETIC",traceabilitySnapshot:{variety:"Ri6"}});
  assert.equal(illustrationTitle(row),"Lô Ri6");
  assert.equal(isIllustration(row),true);
  assert.equal(row.dataOrigin,"DEMO_SYNTHETIC");
  assert.equal(quantityLabel(3500,"KG"),"3.500 kg");
  assert.equal(quantityLabel("5000","KG"),"5.000 kg");
});
test("all provenance markers remain available for verified-total exclusion",()=>{
  for(const row of [{dataOrigin:"DEMO_SYNTHETIC"},{batchCode:"DEMO-SYNTHETIC-LOT"},{releaseCode:"DEMO-SYNTHETIC-RELEASE"},{traceabilitySnapshot:{dataOrigin:"DEMO_SYNTHETIC"}}])assert.equal(isIllustration(row),true);
  const actual={releaseCode:"ER-REAL",dataOrigin:"OPERATIONAL",traceabilitySnapshot:{variety:"Ri6"}};
  assert.equal(isIllustration(actual),false);
  assert.equal(illustrationTitle(actual),"ER-REAL");
  assert.equal(illustrationTitle({dataOrigin:"DEMO_SYNTHETIC"}),"Lô thu hoạch");
});
