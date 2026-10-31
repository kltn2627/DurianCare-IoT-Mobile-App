import type { AgriculturalInput, CreateUserRecordedAgriculturalInputRequest, InputCategory, MaterialRecordSource } from "./cultivationTypes";

export type MaterialSelectionSource = "RECENT" | "SEARCH" | "OCR" | "MANUAL" | "QR" | "BARCODE";

export type RecognizedIngredient = {
  name: string;
  concentration?: number;
  concentrationUnit?: string;
};

export type MaterialRecognitionResult = {
  productName?: string;
  category?: string;
  activeIngredients?: RecognizedIngredient[];
  manufacturer?: string;
  registrationNumber?: string;
  rawText?: string;
  confidence?: number;
};

export type RecognitionReviewDraft = {
  productName: string;
  category: string;
  activeIngredients: Array<{ name: string; concentration: string; concentrationUnit: string }>;
  manufacturer: string;
  ocrConfidence?: number;
  registrationNumber: string;
  rawText: string;
};

export function createRecognitionReviewDraft(result: MaterialRecognitionResult): RecognitionReviewDraft {
  const categoryLabels: Record<string, string> = { PESTICIDE: "Thuốc BVTV", FERTILIZER: "Phân bón", BIOLOGICAL: "Chế phẩm sinh học", OTHER: "Khác" };
  return {
    productName: result.productName ?? "",
    category: result.category ? categoryLabels[result.category] ?? result.category : "",
    activeIngredients: (result.activeIngredients ?? []).filter((item) => Boolean(item?.name)).map((item) => ({
      name: item.name,
      concentration: item.concentration == null ? "" : String(item.concentration),
      concentrationUnit: item.concentrationUnit ?? "",
    })),
    manufacturer: result.manufacturer ?? "",
    ...(Number.isFinite(result.confidence) ? { ocrConfidence: result.confidence } : {}),
    registrationNumber: result.registrationNumber ?? "",
    rawText: result.rawText ?? "",
  };
}

const normalizeName = (name: string) => name.normalize("NFKC").trim().replace(/\s+/g, " ");

export function resolveExistingMaterial(productName: string, catalog: AgriculturalInput[]): AgriculturalInput | null {
  const requested = normalizeName(productName);
  if (!requested) return null;
  const usable = catalog.filter((item) => item.status === "VERIFIED" || item.status === "USER_RECORDED");
  const names = (item: AgriculturalInput) => [item.productName, item.tradeName].filter((name): name is string => Boolean(name));
  const exact = usable.filter((item) => names(item).some((name) => normalizeName(name) === requested));
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) return null;
  const folded = requested.toLocaleLowerCase("vi");
  const insensitive = usable.filter((item) => names(item).some((name) => normalizeName(name).toLocaleLowerCase("vi") === folded));
  return insensitive.length === 1 ? insensitive[0] : null;
}

export const resolveVerifiedMaterial = resolveExistingMaterial;

function categoryFromRecognition(value: string): InputCategory {
  const normalized = value.trim().toLocaleUpperCase("vi");
  if (normalized === "PESTICIDE" || normalized.includes("THUỐC BVTV")) return "CHEMICAL_PESTICIDE";
  if (normalized === "FERTILIZER" || normalized.includes("PHÂN BÓN")) return "CHEMICAL_FERTILIZER";
  if (normalized === "BIOLOGICAL" || normalized.includes("SINH HỌC")) return "BIOLOGICAL_CONTROL";
  return "OTHER";
}

export function userRecordedMaterialRequest(
  draft: RecognitionReviewDraft,
  source: MaterialRecordSource,
): CreateUserRecordedAgriculturalInputRequest {
  return {
    productName: draft.productName.trim(),
    category: categoryFromRecognition(draft.category),
    manufacturer: draft.manufacturer.trim() || undefined,
    registrationNumber: draft.registrationNumber.trim() || undefined,
    activeIngredients: draft.activeIngredients.filter((item) => item.name.trim()).map((item) => {
      const concentration = Number(item.concentration);
      return {
        code: item.name.trim().toLocaleUpperCase("vi").replace(/\s+/g, "_"),
        name: item.name.trim(),
        concentration: Number.isFinite(concentration) && concentration >= 0 ? concentration : undefined,
        concentrationUnit: item.concentrationUnit.trim() || undefined,
      };
    }),
    source,
    ocrConfidence: source === "OCR" && Number.isFinite(draft.ocrConfidence) ? draft.ocrConfidence : undefined,
  };
}
