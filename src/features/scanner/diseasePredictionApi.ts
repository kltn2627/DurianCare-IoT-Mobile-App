import type { CameraCapturedPicture } from "expo-camera";
import * as ImagePicker from "expo-image-picker";

import { authorizedRequest } from "@/src/features/auth/authApi";
import { loadAuthTokens } from "@/src/features/auth/authTokenStore";
import { getApiBaseUrl } from "@/src/lib/apiBase";
import { resolveMediaUrl, resolvePredictionHistoryImageUrl } from "@/src/lib/mediaUrl";

import { durianDiseaseCatalog, type DurianDisease } from "./diseaseCatalog";

export type PredictionSource = "MOBILE" | "WEB" | "IOT_CAMERA";

export type PredictionBoundingBox = {
  height: number;
  left: number;
  top: number;
  width: number;
};

export type StoredImageInfo = {
  objectKey?: string | null;
  path?: string | null;
  url?: string | null;
};

export type KnowledgeLineItem = {
  confidenceLevel?: number;
  order?: number;
  text: string;
};

export type ChemicalTreatmentSummary = {
  treatmentOrder?: number;
  treatmentText: string;
};

export type DiseaseRecommendation = {
  biologicalTreatments?: KnowledgeLineItem[] | null;
  causes?: KnowledgeLineItem[] | null;
  chemicalTreatments?: ChemicalTreatmentSummary[] | null;
  confidenceLevel?: number | null;
  diseaseCode?: string | null;
  diseaseSummary?: string | null;
  englishName?: string | null;
  exportConsiderations?: Array<{ requirementText: string }> | null;
  favorableConditions?: string | null;
  issueType?: string | null;
  organicTreatments?: KnowledgeLineItem[] | null;
  prevention?: KnowledgeLineItem[] | null;
  references?: Array<{
    sourceName?: string | null;
    publicationTitle?: string | null;
    url?: string | null;
  }> | null;
  scientificName?: string | null;
  severity?: string | null;
  symptoms?: KnowledgeLineItem[] | null;
  vietnameseName?: string | null;
};

export type DecisionSupport = {
  biologicalPlan?: string[] | null;
  chemicalPlan?: string[] | null;
  exportReadiness?: string[] | null;
  farmerNotes?: string[] | null;
  immediateActions?: string[] | null;
  monitoringPlan?: string[] | null;
  organicPlan?: string[] | null;
  riskLevel?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | string | null;
};

export type PredictionData = {
  boundingBox?: PredictionBoundingBox | null;
  confidence: number;
  confidenceText: string;
  decisionSupport?: DecisionSupport | null;
  deviceId?: string | null;
  disease: DurianDisease;
  historyId?: string | null;
  image?: StoredImageInfo | null;
  predictedDisease: string;
  recommendation?: DiseaseRecommendation | null;
  source: PredictionSource;
  topPredictions: Array<{ confidence: number; label: string }>;
  usedDetectionCrop: boolean;
};

export type DiseasePrediction = PredictionData;

export type PredictionHistoryItem = {
  confidence: number;
  confidenceText: string;
  data: PredictionData;
  diagnosedAt: string;
  deviceId?: string | null;
  id: string;
  image?: StoredImageInfo | null;
  originalFilename?: string | null;
  predictedDisease: string;
  severity?: string | null;
  source: PredictionSource;
  status: string;
  usedDetectionCrop: boolean;
};

export type PredictionHistoryResponse = {
  items: PredictionHistoryItem[];
  page: number;
  pageSize: number;
  total: number;
};

type UploadableImage = {
  height?: number;
  mimeType?: string | null;
  uri: string;
  width?: number;
};

type PredictionRequestOptions = {
  deviceId?: string | null;
  externalSignal?: AbortSignal;
  source?: PredictionSource;
};

// The Gateway allows AI predictions to run for up to 120 seconds. On-device
// uploads can take longer than the initial 45-second client budget, so leave
// enough room for a completed prediction while staying below that limit.
const REQUEST_TIMEOUT_MS = 90_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value.replace("%", "")))) {
    return Number(value.replace("%", ""));
  }
  return null;
}

function normalizeDiseaseCode(value: string) {
  return value.trim().replace(/[-\s]/g, "_");
}

function resolveDisease(code: string, recommendation?: DiseaseRecommendation | null): DurianDisease {
  const normalizedCode = normalizeDiseaseCode(code);
  const known = durianDiseaseCatalog.find(
    (item) => item.code.toLowerCase() === normalizedCode.toLowerCase(),
  );
  if (known) return known;

  return {
    category: "DISEASE",
    code: normalizedCode as DurianDisease["code"],
    name: recommendation?.vietnameseName || normalizedCode,
    note: recommendation?.diseaseSummary || "Backend chưa trả mô tả ngắn cho kết quả này.",
  };
}

function normalizeConfidence(value: unknown) {
  const number = readNumber(value);
  if (number == null) return 0;
  const percentage = number <= 1 ? number * 100 : number;
  return Math.max(0, Math.min(100, Number(percentage.toFixed(2))));
}

function normalizeConfidenceText(value: unknown) {
  const confidence = normalizeConfidence(value);
  return `${confidence.toFixed(2)}%`;
}

function normalizeBoundingBox(value: unknown, width?: number, height?: number): PredictionBoundingBox | null {
  if (!isRecord(value)) return null;
  const left = readNumber(value.left);
  const top = readNumber(value.top);
  const right = readNumber(value.right);
  const bottom = readNumber(value.bottom);
  if (left == null || top == null || right == null || bottom == null) return null;

  const normalizedLeft = width && right > 100 ? (left / width) * 100 : left;
  const normalizedTop = height && bottom > 100 ? (top / height) * 100 : top;
  const normalizedRight = width && right > 100 ? (right / width) * 100 : right;
  const normalizedBottom = height && bottom > 100 ? (bottom / height) * 100 : bottom;

  return {
    height: Math.max(8, Math.min(100 - normalizedTop, normalizedBottom - normalizedTop)),
    left: Math.max(0, Math.min(92, normalizedLeft)),
    top: Math.max(0, Math.min(92, normalizedTop)),
    width: Math.max(8, Math.min(100 - normalizedLeft, normalizedRight - normalizedLeft)),
  };
}

function normalizeStoredImage(value: unknown, historyId?: string | null): StoredImageInfo | null {
  if (!isRecord(value)) return null;
  const objectKey = readString(value.objectKey ?? value.object_key);
  const path = readString(value.path);
  const url = readString(value.url);
  if (!objectKey && !path && !url) return null;
  return {
    objectKey,
    path,
    url:
      historyId && path?.startsWith("artifacts/prediction-history-images/")
        ? resolvePredictionHistoryImageUrl(historyId)
        : resolveMediaUrl(url ?? path),
  };
}

function normalizePredictionData(payload: unknown, image?: UploadableImage): PredictionData {
  const data = isRecord(payload) ? payload : {};
  const recommendation = isRecord(data.recommendation)
    ? (data.recommendation as DiseaseRecommendation)
    : null;
  const predictedDisease = readString(data.predictedDisease ?? data.predicted_disease) ?? "";
  const historyId = readString(data.historyId ?? data.history_id);
  const confidenceText = normalizeConfidenceText(data.confidence);
  const topPredictions = Array.isArray(data.topPredictions ?? data.top_predictions)
    ? ((data.topPredictions ?? data.top_predictions) as unknown[]).filter(isRecord).map((item) => ({
        confidence: normalizeConfidence(item.confidence),
        label: readString(item.label) ?? "",
      }))
    : [];

  const confidence = normalizeConfidence(confidenceText);
  const resolvedDisease = resolveDisease(predictedDisease, recommendation);

  // Override category based on confidence thresholds (Phase F standardization)
  let disease = resolvedDisease;
  if (!predictedDisease || confidence < 20) {
    disease = { ...resolvedDisease, category: "INVALID_IMAGE" };
  } else if (confidence < 50 && resolvedDisease.category !== "HEALTHY") {
    disease = { ...resolvedDisease, category: "LOW_CONFIDENCE" };
  }

  return {
    boundingBox: normalizeBoundingBox(data.boundingBox ?? data.bounding_box, image?.width, image?.height),
    confidence,
    confidenceText,
    decisionSupport: isRecord(data.decisionSupport ?? data.decision_support)
      ? ((data.decisionSupport ?? data.decision_support) as DecisionSupport)
      : null,
    deviceId: readString(data.deviceId ?? data.device_id),
    disease,
    historyId,
    image: normalizeStoredImage(data.image, historyId),
    predictedDisease,
    recommendation,
    source: ((readString(data.source) ?? "MOBILE") as PredictionSource),
    topPredictions,
    usedDetectionCrop: Boolean(data.usedDetectionCrop ?? data.used_detection_crop),
  };
}

function normalizePredictionResponse(payload: unknown, image?: UploadableImage): PredictionData {
  const root = isRecord(payload) ? payload : {};
  if (!isRecord(root.data) || !readString(root.data.predictedDisease ?? root.data.predicted_disease)) {
    throw Object.assign(new Error("Máy chủ AI trả về kết quả không hợp lệ. Vui lòng thử lại."), {
      code: "INVALID_RESPONSE",
    });
  }
  return normalizePredictionData(root.data, image);
}

function normalizeHistoryItem(value: unknown): PredictionHistoryItem {
  const item = isRecord(value) ? value : {};
  const rawData = isRecord(item.data) ? item.data : {};
  const id = readString(item.id) ?? "";
  const data = normalizePredictionData({
    predictedDisease: item.predictedDisease ?? item.predicted_disease,
    confidence: item.confidenceText ?? item.confidence_text ?? item.confidence,
    source: item.source,
    deviceId: item.deviceId ?? item.device_id,
    usedDetectionCrop: item.usedDetectionCrop ?? item.used_detection_crop,
    image: item.image,
    ...rawData,
  });
  const confidenceText = normalizeConfidenceText(item.confidenceText ?? item.confidence_text ?? item.confidence);

  return {
    confidence: normalizeConfidence(confidenceText),
    confidenceText,
    data: {
      ...data,
      historyId: id || data.historyId,
      image: normalizeStoredImage(item.image ?? rawData.image, id || data.historyId) ?? data.image,
    },
    diagnosedAt: readString(item.diagnosedAt ?? item.diagnosed_at ?? item.createdAt ?? item.created_at) ?? "",
    deviceId: readString(item.deviceId ?? item.device_id),
    id,
    image: normalizeStoredImage(item.image ?? rawData.image, id || data.historyId) ?? data.image,
    originalFilename: readString(item.originalFilename ?? item.original_filename),
    predictedDisease: readString(item.predictedDisease ?? item.predicted_disease) ?? data.predictedDisease,
    severity: readString(item.severity),
    source: ((readString(item.source) ?? data.source) as PredictionSource),
    status: readString(item.status) ?? "PENDING",
    usedDetectionCrop: Boolean(item.usedDetectionCrop ?? item.used_detection_crop ?? data.usedDetectionCrop),
  };
}

function normalizeHistoryResponse(payload: unknown): PredictionHistoryResponse {
  const root = isRecord(payload) ? payload : {};
  const items = Array.isArray(root.items) ? root.items.map(normalizeHistoryItem) : [];
  return {
    items,
    page: readNumber(root.page) ?? 1,
    pageSize: readNumber(root.pageSize ?? root.page_size) ?? 5,
    total: readNumber(root.total) ?? items.length,
  };
}

function resolveFileName(uri: string) {
  const candidate = uri.split("/").pop()?.split("?")[0];
  return candidate?.includes(".") ? candidate : `durian-leaf-${Date.now()}.jpg`;
}

function resolveMimeType(image: UploadableImage) {
  if (image.mimeType?.startsWith("image/")) return image.mimeType;
  const lower = image.uri.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

function toUploadFile(image: UploadableImage) {
  return {
    name: resolveFileName(image.uri),
    type: resolveMimeType(image),
    uri: image.uri,
  };
}

function toErrorMessage(error: unknown) {
  if (isRecord(error) && isRecord(error.response)) {
    const response = error.response;
    const data = isRecord(response.data) ? response.data : {};
    const detail = readString(data.detail);
    const message = readString(data.message ?? data.error);
    if (message || detail) return message ?? detail ?? "Không thể phân tích ảnh lá.";
  }
  if (error instanceof Error && error.message) return error.message;
  return "Không thể phân tích ảnh lá. Vui lòng kiểm tra mạng và thử lại.";
}

async function withTimeout<T>(
  work: (signal: AbortSignal) => Promise<T>,
  externalSignal?: AbortSignal,
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const abort = () => controller.abort();
  externalSignal?.addEventListener("abort", abort, { once: true });
  if (externalSignal?.aborted) controller.abort();

  try {
    return await work(controller.signal);
  } catch (error) {
    if (controller.signal.aborted && !externalSignal?.aborted) {
      throw new Error(
        `Máy chủ AI phản hồi quá thời gian ${REQUEST_TIMEOUT_MS / 1_000} giây.`,
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
    externalSignal?.removeEventListener("abort", abort);
  }
}

export async function predictDurianDisease(
  image: UploadableImage,
  options: PredictionRequestOptions = {},
): Promise<DiseasePrediction> {
  if (options.source === "IOT_CAMERA" && !options.deviceId?.trim()) {
    throw new Error("Vui lòng nhập mã thiết bị khi chọn nguồn camera IoT.");
  }

  const formData = new FormData();
  const uploadFile = toUploadFile(image);
  const endpoint = `${getApiBaseUrl()}/api/v1/predict`;
  formData.append("image", uploadFile as never);
  formData.append("source", options.source ?? "MOBILE");
  if (options.source === "IOT_CAMERA" && options.deviceId?.trim()) {
    formData.append("device_id", options.deviceId.trim());
  }

  return withTimeout(async (signal) => {
    const startedAt = Date.now();
    let uploadedBytes = 0;
    let uploadTotalBytes: number | undefined;
    let lastUploadLogAt = 0;
    const authTokens = __DEV__ ? await loadAuthTokens().catch(() => null) : null;
    if (__DEV__) {
      console.warn("[Diagnosis] request started", {
        hasAuthToken: Boolean(authTokens?.accessToken),
        imageMimeType: uploadFile.type,
        imageUri: image.uri,
        method: "POST",
        resolvedUrl: endpoint,
        timeoutMs: REQUEST_TIMEOUT_MS,
        startedAt: new Date(startedAt).toISOString(),
      });
    }
    try {
      const response = await authorizedRequest<unknown>({
        baseURL: getApiBaseUrl(),
        data: formData,
        headers: { Accept: "application/json" },
        method: "POST",
        onUploadProgress: __DEV__ ? (progress) => {
          uploadedBytes = progress.loaded;
          uploadTotalBytes = progress.total;
          const now = Date.now();
          if (now - lastUploadLogAt >= 5000 || progress.loaded === progress.total) {
            lastUploadLogAt = now;
            console.warn("[Diagnosis] upload progress", {
              elapsedMs: now - startedAt,
              uploadedBytes,
              uploadTotalBytes,
            });
          }
        } : undefined,
        signal,
        timeout: REQUEST_TIMEOUT_MS,
        url: "/api/v1/predict",
      });
      const prediction = normalizePredictionResponse(response.data, image);
      if (__DEV__) console.warn("[Diagnosis] response received", {
        elapsedMs: Date.now() - startedAt,
        status: response.status,
        resolvedUrl: endpoint,
      });
      return prediction;
    } catch (error) {
      if (__DEV__) {
        // The shared auth interceptor wraps Axios errors for friendly UI messages.
        // Inspect its original cause so cancellation/status information survives.
        const originalError = isRecord(error) && error.cause ? error.cause : error;
        const axiosError = originalError as { code?: string; name?: string; response?: { data?: unknown; status?: number } };
        const responseData = isRecord(axiosError.response?.data) ? axiosError.response?.data : undefined;
        console.warn("[DurianCare AI diagnosis]", {
          code: axiosError.code,
          classification: options.externalSignal?.aborted ? "CANCELED"
            : signal.aborted ? "TIMEOUT" : classifyDiagnosisFailure(axiosError),
          errorType: axiosError.name,
          elapsedMs: Date.now() - startedAt,
          uploadedBytes,
          uploadTotalBytes,
          responseBody: safeDevelopmentResponseBody(responseData),
          method: "POST",
          status: axiosError.response?.status,
          url: endpoint,
        });
      }
      throw new Error(toErrorMessage(error));
    }
  }, options.externalSignal);
}

function classifyDiagnosisFailure(error: { code?: string; response?: { status?: number } }) {
  const status = error.response?.status;
  if (status === 401 || status === 403) return "AUTHENTICATION";
  if (status === 404) return "ENDPOINT_NOT_FOUND";
  if (status && status >= 500) return "SERVER_ERROR";
  if (status === 400 || status === 413 || status === 415 || status === 422) return "INVALID_MULTIPART_OR_REQUEST";
  if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") return "TIMEOUT";
  if (error.code === "ERR_CANCELED") return "CANCELED";
  if (error.code === "INVALID_RESPONSE") return "INVALID_RESPONSE";
  if (error.code === "ERR_NETWORK") return "NETWORK_UNREACHABLE";
  return status ? "HTTP_ERROR" : "UNKNOWN_ERROR";
}

function safeDevelopmentResponseBody(value: Record<string, unknown> | undefined) {
  if (!value) return undefined;
  const safe = { detail: value.detail, error: value.error, message: value.message, status: value.status };
  return Object.fromEntries(Object.entries(safe).filter(([, entry]) => entry !== undefined));
}

export async function predictCapturedDurianDisease(
  photo: CameraCapturedPicture,
  externalSignal?: AbortSignal,
) {
  return predictDurianDisease(photo, { externalSignal, source: "MOBILE" });
}

export async function predictPickedDurianDisease(
  asset: ImagePicker.ImagePickerAsset,
  externalSignal?: AbortSignal,
) {
  return predictDurianDisease(
    {
      height: asset.height,
      mimeType: asset.mimeType,
      uri: asset.uri,
      width: asset.width,
    },
    { externalSignal, source: "MOBILE" },
  );
}

export async function listPredictionHistory(params: {
  page?: number;
  pageSize?: number;
  query?: string;
  status?: string;
} = {}) {
  const query = new URLSearchParams({
    page: String(params.page ?? 1),
    pageSize: String(params.pageSize ?? 10),
  });
  if (params.query?.trim()) query.set("q", params.query.trim());
  if (params.status?.trim() && params.status !== "ALL") query.set("status", params.status.trim());

  try {
    const response = await authorizedRequest<unknown>({
      baseURL: getApiBaseUrl(),
      method: "GET",
      url: `/api/v1/predict/history?${query.toString()}`,
    });
    return normalizeHistoryResponse(response.data);
  } catch (error) {
    throw new Error(toErrorMessage(error));
  }
}

export async function getPredictionHistoryItem(historyId: string) {
  const response = await listPredictionHistory({ page: 1, pageSize: 50 });
  return response.items.find((item) => item.id === historyId) ?? null;
}

export async function deletePredictionHistory(historyId: string) {
  try {
    await authorizedRequest({
      baseURL: getApiBaseUrl(),
      method: "DELETE",
      url: `/api/v1/predict/history/${encodeURIComponent(historyId)}`,
    });
  } catch (error) {
    throw new Error(toErrorMessage(error));
  }
}
