import assert from "node:assert/strict";
import test from "node:test";
import { ingredientPresentation, labPresentation, residueDate, riskPresentation } from "./residueRisk.ts";

const ingredient = {
  riskLevel: "HIGH", riskReasons: ["EXPECTED_HARVEST_BEFORE_SAFE_HARVEST"],
  timeline: [{ usageId: "u1", usedAt: "2026-09-18T23:00:00Z", productName: "Product A", quantityUsed: 200, quantityUnit: "g" },
    { usageId: "u2", usedAt: "2026-09-19T08:00:00Z", productName: "Product B", quantityUsed: 1, quantityUnit: "L" }],
  labAssessment: { status: "NOT_TESTED", results: [] },
};

test("overall risk has explicit labels and distinct colors including unknown", () => {
  assert.equal(riskPresentation.HIGH.label, "Cao");
  assert.equal(riskPresentation.LOW.label, "Thấp");
  assert.equal(riskPresentation.MEDIUM.label, "Trung bình");
  assert.equal(riskPresentation.UNKNOWN.label, "Chưa đủ dữ liệu");
  assert.notEqual(riskPresentation.HIGH.color, riskPresentation.LOW.color);
});
test("ingredient risk explains PHI without claiming measured MRL failure", () => {
  const view = ingredientPresentation(ingredient);
  assert.equal(view.risk.label, "Cao");
  assert.deepEqual(view.reasons, ["Thu hoạch dự kiến sớm hơn thời gian cách ly."]);
  assert.equal(view.reasons.join(" ").includes("Vượt MRL"), false);
});
test("timeline preserves each product quantity and UTC dates without summation", () => {
  assert.deepEqual(ingredientPresentation(ingredient).timeline, [
    { key: "u1", date: "18/09/2026", product: "Product A", quantity: "200 g" },
    { key: "u2", date: "19/09/2026", product: "Product B", quantity: "1 L" },
  ]);
  assert.equal(residueDate(null), "Chưa có");
});
test("no lab explicitly shows not tested and has no inferred measurement", () => {
  assert.equal(ingredientPresentation(ingredient).noLab, "Chưa có kết quả xét nghiệm dư lượng.");
  assert.equal(ingredientPresentation({ ...ingredient, labAssessment: { status: "AVAILABLE", results: [] } }).noLab, null);
});
test("real lab PASS and FAIL display measurement separately with MRL unit", () => {
  const lab = { resultStatus: "PASS", measuredValue: 0.42, unit: "mg/kg", applicableMrl: 0.5, mrlUnit: "mg/kg" };
  assert.deepEqual(labPresentation(lab), { label: "Đạt", measured: "0.42 mg/kg", mrl: "0.5 mg/kg", color: "#15803d" });
  assert.equal(labPresentation({ ...lab, resultStatus: "FAIL", measuredValue: 0.62 }).label, "Không đạt");
  assert.equal(labPresentation({ ...lab, resultStatus: "NO_STANDARD_FOUND", applicableMrl: null }).mrl, "Chưa có");
  assert.equal(labPresentation({ ...lab, resultStatus: "PENDING_REVIEW", measuredValue: null }).measured, "Không có giá trị định lượng");
  assert.equal(labPresentation({ ...lab, measuredValue: 0 }).measured, "0 mg/kg");
});
