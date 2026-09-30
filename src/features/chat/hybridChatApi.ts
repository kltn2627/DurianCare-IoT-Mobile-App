import type { CameraCapturedPicture } from "expo-camera";

import { authorizedRequest } from "@/src/features/auth/authApi";
import { getApiBaseUrl } from "@/src/lib/apiBase";


const AI_CHAT_PATH = process.env.EXPO_PUBLIC_AI_CHAT_PATH ?? "/api/v1/chat/ask";
const EXPERT_MEDIA_PATH =
  process.env.EXPO_PUBLIC_EXPERT_MEDIA_PATH ?? "/api/v1/chat/expert/media";
const REQUEST_TIMEOUT_MS = 45_000;

type UnknownRecord = Record<string, unknown>;

export type AiAssistantReply = {
  answer: string;
  sources: string[];
};

type RagAskResponse = {
  data?: {
    answer?: string;
    sources?: unknown[];
  };
  status?: string;
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function appendPhoto(formData: FormData, photo: CameraCapturedPicture) {
  formData.append(
    "image",
    {
      name: photo.uri.split("/").pop() || `durian-chat-${Date.now()}.jpg`,
      type: "image/jpeg",
      uri: photo.uri,
    } as unknown as Blob,
  );
}

async function postJson(
  path: string,
  body: unknown,
  externalSignal?: AbortSignal,
): Promise<unknown> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const abort = () => controller.abort();
  externalSignal?.addEventListener("abort", abort, { once: true });

  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      body: JSON.stringify(body),
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      method: "POST",
      signal: controller.signal,
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const detail =
        isRecord(payload) && typeof payload.detail === "string"
          ? payload.detail
          : `Dịch vụ phản hồi lỗi HTTP ${response.status}.`;
      throw new Error(detail);
    }
    return payload;
  } catch (error) {
    if (controller.signal.aborted && !externalSignal?.aborted) {
      throw new Error("Dịch vụ tư vấn phản hồi quá thời gian 45 giây.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
    externalSignal?.removeEventListener("abort", abort);
  }
}

async function postMultipart(
  path: string,
  formData: FormData,
  externalSignal?: AbortSignal,
): Promise<unknown> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const abort = () => controller.abort();
  externalSignal?.addEventListener("abort", abort, { once: true });

  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      body: formData,
      headers: { Accept: "application/json" },
      method: "POST",
      signal: controller.signal,
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const detail =
        isRecord(payload) && typeof payload.detail === "string"
          ? payload.detail
          : `Dịch vụ phản hồi lỗi HTTP ${response.status}.`;
      throw new Error(detail);
    }
    return payload;
  } catch (error) {
    if (controller.signal.aborted && !externalSignal?.aborted) {
      throw new Error("Dịch vụ tư vấn phản hồi quá thời gian 45 giây.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
    externalSignal?.removeEventListener("abort", abort);
  }
}

function unwrapRecord(payload: unknown): UnknownRecord {
  if (!isRecord(payload)) return {};
  return isRecord(payload.data) ? payload.data : payload;
}

// photo param kept for API compatibility but /api/v1/chat/ask is text-only
export async function askDurianAssistant(
  question: string,
  signal?: AbortSignal,
  predictedDisease?: string,
): Promise<AiAssistantReply> {
  const normalizedQuestion = question.trim();
  if (!normalizedQuestion) {
    throw new Error("Vui lòng nhập câu hỏi trước khi gửi.");
  }

  const response = await authorizedRequest<RagAskResponse>({
    data: { question: normalizedQuestion },
    method: "POST",
    signal,
    timeout: REQUEST_TIMEOUT_MS,
    url: AI_CHAT_PATH,
  });
  const answer = response.data.data?.answer;
  if (typeof answer !== "string" || !answer.trim()) {
    throw new Error("AI Service chưa trả câu trả lời hợp lệ.");
  }
  const sources = Array.isArray(response.data.data?.sources)
    ? response.data.data.sources.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    : [];

  return { answer: answer.trim(), sources };
}

export async function uploadExpertGardenPhoto(
  photo: CameraCapturedPicture,
  zoneLabel: string,
  caption: string,
  signal?: AbortSignal,
): Promise<string> {
  const formData = new FormData();
  appendPhoto(formData, photo);
  formData.append("zone", zoneLabel);
  formData.append("caption", caption);

  const record = unwrapRecord(await postMultipart(EXPERT_MEDIA_PATH, formData, signal));
  const imageUrl = [record.url, record.imageUrl, record.fileUrl].find(
    (value): value is string => typeof value === "string" && value.length > 0,
  );
  return imageUrl ?? photo.uri;
}
