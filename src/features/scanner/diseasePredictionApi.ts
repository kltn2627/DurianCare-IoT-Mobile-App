import type { CameraCapturedPicture } from "expo-camera";

import { durianDiseaseCatalog, type DurianDisease } from "./diseaseCatalog";

const PREDICTION_PATH = "/api/v1/predict";
const REQUEST_TIMEOUT_MS = 45_000;

export type PredictionBoundingBox = {
  height: number;
  left: number;
  top: number;
  width: number;
};

export type DiseasePrediction = {
  boundingBox: PredictionBoundingBox;
  confidence: number;
  disease: DurianDisease;
  inferenceTimeMs?: number;
};

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function readNumber(record: UnknownRecord, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      // Handle percentage strings like "48.59%" from AI service
      const stripped = value.trim().replace(/%$/, "");
      if (Number.isFinite(Number(stripped))) return Number(stripped);
    }
  }
  return undefined;
}

function readString(record: UnknownRecord, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function unwrapPrediction(payload: unknown): UnknownRecord {
  if (!isRecord(payload)) throw new Error("Máy chủ trả về dữ liệu không hợp lệ.");

  const data = isRecord(payload.data) ? payload.data : payload;
  const detections = Array.isArray(data.detections) ? data.detections : [];
  const predictions = Array.isArray(data.predictions) ? data.predictions : [];
  const firstResult = detections[0] ?? predictions[0];

  return isRecord(firstResult) ? { ...data, ...firstResult } : data;
}

// Maps backend CLASS_LABELS (normalized) to catalog codes where names diverge
const BACKEND_CODE_ALIASES: Record<string, string> = {
  allocaridara_attack: "allocaridara_attacked",
};

function resolveDisease(code: string | undefined): DurianDisease {
  const raw = code?.trim().toLowerCase().replaceAll("-", "_").replaceAll(" ", "_");
  const normalizedCode = raw !== undefined ? (BACKEND_CODE_ALIASES[raw] ?? raw) : undefined;
  const disease = durianDiseaseCatalog.find(
    (item) => item.code.toLowerCase() === normalizedCode,
  );

  if (!disease) {
    throw new Error(`Nhãn bệnh từ máy chủ chưa được hỗ trợ: ${code ?? "không xác định"}.`);
  }

  return disease;
}

function normalizeConfidence(value: number | undefined): number {
  if (value === undefined) return 0;
  const percentage = value <= 1 ? value * 100 : value;
  return Math.min(100, Math.max(0, Number(percentage.toFixed(1))));
}

function normalizeCoordinate(value: number, dimension: number): number {
  if (value >= 0 && value <= 1) return value * 100;
  return dimension > 0 ? (value / dimension) * 100 : value;
}

function resolveBoundingBox(
  record: UnknownRecord,
  imageWidth: number,
  imageHeight: number,
): PredictionBoundingBox {
  const rawBox = record.bounding_box ?? record.boundingBox ?? record.box ?? record.bbox;
  const fallback = { height: 34, left: 24, top: 22, width: 52 };

  if (Array.isArray(rawBox) && rawBox.length >= 4) {
    const [x1, y1, x2, y2] = rawBox.map(Number);
    if ([x1, y1, x2, y2].every(Number.isFinite)) {
      const left = normalizeCoordinate(x1, imageWidth);
      const top = normalizeCoordinate(y1, imageHeight);
      const right = normalizeCoordinate(x2, imageWidth);
      const bottom = normalizeCoordinate(y2, imageHeight);
      return {
        height: Math.max(8, Math.min(100 - top, bottom - top)),
        left: Math.max(0, Math.min(92, left)),
        top: Math.max(0, Math.min(92, top)),
        width: Math.max(8, Math.min(100 - left, right - left)),
      };
    }
  }

  if (isRecord(rawBox)) {
    const x = readNumber(rawBox, ["x", "left", "x1"]);
    const y = readNumber(rawBox, ["y", "top", "y1"]);
    const width = readNumber(rawBox, ["width", "w"]);
    const height = readNumber(rawBox, ["height", "h"]);
    const x2 = readNumber(rawBox, ["x2", "right"]);
    const y2 = readNumber(rawBox, ["y2", "bottom"]);

    if (x !== undefined && y !== undefined) {
      const left = normalizeCoordinate(x, imageWidth);
      const top = normalizeCoordinate(y, imageHeight);
      const normalizedWidth =
        width !== undefined
          ? normalizeCoordinate(width, imageWidth)
          : normalizeCoordinate(x2 ?? x, imageWidth) - left;
      const normalizedHeight =
        height !== undefined
          ? normalizeCoordinate(height, imageHeight)
          : normalizeCoordinate(y2 ?? y, imageHeight) - top;

      return {
        height: Math.max(8, Math.min(100 - top, normalizedHeight)),
        left: Math.max(0, Math.min(92, left)),
        top: Math.max(0, Math.min(92, top)),
        width: Math.max(8, Math.min(100 - left, normalizedWidth)),
      };
    }
  }

  return fallback;
}

function buildPredictionUrl(): string {
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, "");
  if (!baseUrl) {
    throw new Error(
      "Thiếu EXPO_PUBLIC_API_BASE_URL. Hãy cấu hình địa chỉ FastAPI có thể truy cập từ điện thoại.",
    );
  }
  return `${baseUrl}${PREDICTION_PATH}`;
}

function resolveFileName(uri: string): string {
  const candidate = uri.split("/").pop()?.split("?")[0];
  return candidate?.includes(".") ? candidate : `durian-leaf-${Date.now()}.jpg`;
}

export async function predictDurianDisease(
  photo: CameraCapturedPicture,
  externalSignal?: AbortSignal,
): Promise<DiseasePrediction> {
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), REQUEST_TIMEOUT_MS);
  const abortFromExternalSignal = () => timeoutController.abort();
  externalSignal?.addEventListener("abort", abortFromExternalSignal, { once: true });

  const formData = new FormData();
  formData.append(
    "image",
    {
      name: resolveFileName(photo.uri),
      type: "image/jpeg",
      uri: photo.uri,
    } as unknown as Blob,
  );
  formData.append("source", "MOBILE");

  try {
    const response = await fetch(buildPredictionUrl(), {
      body: formData,
      headers: { Accept: "application/json" },
      method: "POST",
      signal: timeoutController.signal,
    });

    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 422) {
        throw new Error(
          "Không phát hiện lá sầu riêng trong ảnh. Hãy chụp gần hơn và đảm bảo lá chiếm phần lớn khung hình.",
        );
      }
      const detail = isRecord(payload)
        ? readString(payload, ["detail", "message", "error"])
        : undefined;
      throw new Error(detail ?? `FastAPI phản hồi lỗi HTTP ${response.status}.`);
    }

    const record = unwrapPrediction(payload);
    const disease = resolveDisease(
      readString(record, [
        "predictedDisease",  // AI service returns camelCase
        "predicted_disease",
        "label",
        "class_name",
        "className",
        "disease",
        "disease_code",
        "prediction",
      ]),
    );

    return {
      boundingBox: resolveBoundingBox(record, photo.width, photo.height),
      confidence: normalizeConfidence(
        readNumber(record, [
          "confidence",
          "confidence_score",
          "confidenceScore",
          "probability",
          "score",
        ]),
      ),
      disease,
      inferenceTimeMs: readNumber(record, [
        "inference_time_ms",
        "inferenceTimeMs",
        "processing_time_ms",
        "processingTimeMs",
      ]),
    };
  } catch (error) {
    if (timeoutController.signal.aborted && !externalSignal?.aborted) {
      throw new Error("Máy chủ AI phản hồi quá thời gian 45 giây.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
    externalSignal?.removeEventListener("abort", abortFromExternalSignal);
  }
}
