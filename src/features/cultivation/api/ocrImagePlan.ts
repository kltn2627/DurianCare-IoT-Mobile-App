export const OCR_IMAGE_MAX_BYTES = Math.floor(1.5 * 1024 * 1024);
export const ocrUploadMetadata = { fileName: "material-label.jpg" as const, mimeType: "image/jpeg" as const };

export type OcrCompressionPlan = {
  maxDimension: number;
  quality: number;
};

export const primaryOcrCompression: OcrCompressionPlan = { maxDimension: 1600, quality: 0.78 };
export const fallbackOcrCompression: OcrCompressionPlan = { maxDimension: 1280, quality: 0.65 };

export function resizeForMaximumDimension(width: number, height: number, maxDimension: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  if (Math.max(width, height) <= maxDimension) return null;
  return width >= height ? { width: maxDimension } : { height: maxDimension };
}

export function needsFallbackCompression(fileSize?: number | null) {
  return typeof fileSize === "number" && fileSize > OCR_IMAGE_MAX_BYTES;
}
