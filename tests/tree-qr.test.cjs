const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const ts = require("typescript");

function loadTreeQr() {
  const source = readFileSync(join(__dirname, "../src/features/qr-scanner/treeQr.ts"), "utf8");
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
  const module = { exports: {} };
  new Function("module", "exports", outputText)(module, module.exports);
  return module.exports;
}

test("tree QR parser accepts only DurianCare tree URLs", () => {
  const { parseTreeQr } = loadTreeQr();
  assert.equal(parseTreeQr("https://farm.example.com/dashboard/client/trees/tree-001"), "tree-001");
  assert.equal(parseTreeQr(" http://192.0.2.10:3000/dashboard/client/trees/tree-050 "), "tree-050");
  assert.equal(parseTreeQr("https://x.com/traceability/VN-ABC-2026-0001"), null);
  assert.equal(parseTreeQr("https://x.com/trees/a/b"), null);
  assert.equal(parseTreeQr("javascript:alert(1)"), null);
  assert.equal(parseTreeQr("tree-001"), null);
  assert.equal(parseTreeQr("https://x.com/trees/%3Cscript%3E"), null);
  assert.equal(parseTreeQr("https://x.com/trees/%E0%A4%A"), null);
});

test("scanner routes tree QR to tree detail, keeps traceability and reports unknown codes", () => {
  const source = readFileSync(join(__dirname, "../src/features/qr-scanner/QrScanScreen.tsx"), "utf8");
  assert.ok(source.includes("parseTreeQr(data)"));
  assert.ok(source.includes('pathname: "/(main)/trees/[treeId]"'));
  assert.ok(source.includes("fetchPublicTrace(code)"));
  assert.ok(source.includes("processingRef.current"));
  assert.ok(source.includes('setError("Mã QR không hợp lệ.")'));
  assert.doesNotMatch(source, /token|Authorization/);
});

test("zone screen no longer renders the SVG tree map and links to the QR scanner", () => {
  const source = readFileSync(join(__dirname, "../src/features/trees/ZoneTreesScreen.tsx"), "utf8");
  assert.doesNotMatch(source, /react-native-svg|TreeMapSvg/);
  assert.ok(source.includes('router.push("/(main)/qr-scan")'));
});

test("tree AI diagnosis stores the server image, blocks double submits and shows no fallback result", () => {
  const source = readFileSync(join(__dirname, "../src/features/trees/TreeDetailScreen.tsx"), "utf8");
  assert.ok(source.includes("Chẩn đoán bệnh bằng ảnh"));
  assert.ok(source.includes('imageUrl: prediction.image?.url || "MOBILE_AI_NO_STORED_IMAGE"'));
  assert.doesNotMatch(source, /imageUrl: photo\.uri/);
  assert.ok(source.includes("if (!photo || predictingRef.current) return;"));
  assert.ok(source.includes("savingRef.current) return;"));
  assert.ok(source.includes('source: "MOBILE"'));
});

test("tree detail lets the farmer set any of the five health statuses without an AI/recovery gate", () => {
  const source = readFileSync(join(__dirname, "../src/features/trees/TreeDetailScreen.tsx"), "utf8");
  for (const [value, label] of [["HEALTHY", "Khỏe mạnh"], ["SUSPECTED", "Nghi ngờ"], ["DISEASED", "Bệnh"],
    ["TREATING", "Đang điều trị"], ["RECOVERED", "Đã hồi phục"]]) {
    assert.ok(source.includes(`{ value: "${value}", label: "${label}" }`), value);
  }
  assert.ok(source.includes("updateTreeHealthStatus(treeId, choice)"));
  assert.ok(source.includes("if (!choice || choice === current || inFlight.current) return;"));
  assert.ok(source.includes('tree.status !== "REMOVED" ?'));
  assert.doesNotMatch(source, /RECOVERY_OUTCOME_ELIGIBLE|Không đủ điều kiện RECOVERED|function RecoveryPanel|function TreatmentPanel/);
  assert.ok(source.includes("function CarePlanSection"), "care plan section kept");
  const api = readFileSync(join(__dirname, "../src/features/trees/treeApi.ts"), "utf8");
  assert.match(api, /healthStatus: TreeHealthStatus,\r?\n\): Promise<TreeDetail>/);
});
