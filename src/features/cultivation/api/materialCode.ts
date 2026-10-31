import type { AgriculturalInput } from "./cultivationTypes";
import type { MaterialSelectionSource } from "./materialRecognition";

export type ScannedMaterialCode = { code: string; codeType: "QR" | "BARCODE" };

export function materialCodeFromScan(data: string, scannerType: string): ScannedMaterialCode | null {
  const code = data.trim();
  if (!code || code.length > 512 || /[\x00-\x1f\x7f]/.test(code)) return null;
  return { code, codeType: scannerType.toLowerCase() === "qr" ? "QR" : "BARCODE" };
}

export function selectWithOptionalCodeMapping(
  input: AgriculturalInput,
  source: MaterialSelectionSource,
  pending: ScannedMaterialCode | null,
  select: (input: AgriculturalInput, source: MaterialSelectionSource) => void,
  save: (code: ScannedMaterialCode, agriculturalInputId: string) => Promise<unknown>,
  onMappingError: () => void,
): void {
  if (input.status !== "VERIFIED" && input.status !== "USER_RECORDED") return;
  select(input, source);
  if (!pending || (source !== "SEARCH" && source !== "OCR" && source !== "MANUAL")) return;
  void save(pending, input.id).catch(onMappingError);
}
