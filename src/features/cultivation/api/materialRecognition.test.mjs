import assert from "node:assert/strict";
import test from "node:test";
import { createRecognitionReviewDraft, resolveVerifiedMaterial, userRecordedMaterialRequest } from "./materialRecognition.ts";

const catalog = [
  { id: "verified", productName: "Ridomil Gold 68WG", status: "VERIFIED" },
  { id: "draft", productName: "Unverified Mix", status: "DRAFT" },
];

test("incomplete OCR result remains editable", () => {
  assert.deepEqual(createRecognitionReviewDraft({}), {
    productName: "", category: "", activeIngredients: [], manufacturer: "", registrationNumber: "", rawText: "",
  });
  assert.equal(createRecognitionReviewDraft({ activeIngredients: [{ name: "Metalaxyl-M", concentration: 4, concentrationUnit: "%" }] }).activeIngredients[0].concentration, "4");
});

test("normalized exact product resolves only to one verified catalog entry", () => {
  assert.equal(resolveVerifiedMaterial("  Ridomil   Gold 68WG ", catalog)?.id, "verified");
  assert.equal(resolveVerifiedMaterial("ridomil gold 68wg", catalog)?.id, "verified");
  assert.equal(resolveVerifiedMaterial("Unverified Mix", catalog), null);
});

test("weak or ambiguous names never auto-select", () => {
  assert.equal(resolveVerifiedMaterial("Ridomil Gold", catalog), null);
  assert.equal(resolveVerifiedMaterial("", catalog), null);
  assert.equal(resolveVerifiedMaterial("ridomil gold 68wg", [...catalog, { id: "duplicate", productName: "RIDOMIL GOLD 68WG", status: "VERIFIED" }]), null);
});

test("an OCR product without a catalog match becomes a user-recorded request", () => {
  const request = userRecordedMaterialRequest(createRecognitionReviewDraft({
    productName: "RUỒI VÀNG", category: "PESTICIDE", confidence: 0.82,
    activeIngredients: [{ name: "Metalaxyl-M", concentration: 4, concentrationUnit: "%" }],
  }), "OCR");
  assert.equal(request.productName, "RUỒI VÀNG");
  assert.equal(request.source, "OCR");
  assert.equal(request.category, "CHEMICAL_PESTICIDE");
  assert.equal(request.activeIngredients[0].concentration, 4);
});
