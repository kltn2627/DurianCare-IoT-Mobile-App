import assert from "node:assert/strict";
import test from "node:test";
import { fallbackOcrCompression, needsFallbackCompression, OCR_IMAGE_MAX_BYTES, ocrUploadMetadata, primaryOcrCompression, resizeForMaximumDimension } from "./ocrImagePlan.ts";

test("a phone-sized label image is resized to the OCR target without changing its ratio", () => {
  assert.deepEqual(resizeForMaximumDimension(4032, 3024, primaryOcrCompression.maxDimension), { width: 1600 });
});

test("a smaller label image is never enlarged", () => {
  assert.equal(resizeForMaximumDimension(1200, 900, primaryOcrCompression.maxDimension), null);
});

test("only an oversized processed file uses the bounded second compression pass", () => {
  assert.equal(needsFallbackCompression(OCR_IMAGE_MAX_BYTES), false);
  assert.equal(needsFallbackCompression(OCR_IMAGE_MAX_BYTES + 1), true);
  assert.deepEqual(fallbackOcrCompression, { maxDimension: 1280, quality: 0.65 });
});

test("all OCR uploads are normalized to a JPEG filename and MIME type", () => {
  assert.deepEqual(ocrUploadMetadata, { fileName: "material-label.jpg", mimeType: "image/jpeg" });
});
