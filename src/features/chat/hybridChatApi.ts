import type { CameraCapturedPicture } from "expo-camera";

const AI_CHAT_PATH = process.env.EXPO_PUBLIC_AI_CHAT_PATH ?? "/api/v1/chat/ai";
const EXPERT_MEDIA_PATH =
  process.env.EXPO_PUBLIC_EXPERT_MEDIA_PATH ?? "/api/v1/chat/expert/media";
const REQUEST_TIMEOUT_MS = 45_000;

type UnknownRecord = Record<string, unknown>;

export type AiAssistantReply = {
  answer: string;
  references: string[];
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function getApiBaseUrl(): string {
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, "");
  if (!baseUrl) {
    throw new Error("Thiếu EXPO_PUBLIC_API_BASE_URL để kết nối dịch vụ tư vấn.");
  }
  return baseUrl;
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

export async function askDurianAssistant(
  question: string,
  photo?: CameraCapturedPicture | null,
  signal?: AbortSignal,
): Promise<AiAssistantReply> {
  const formData = new FormData();
  formData.append("question", question);
  formData.append("context", "durian-care-mobile");
  if (photo) appendPhoto(formData, photo);

  const record = unwrapRecord(await postMultipart(AI_CHAT_PATH, formData, signal));
  const answer =
    [record.answer, record.message, record.content, record.response].find(
      (value): value is string => typeof value === "string" && value.trim().length > 0,
    ) ?? "Trợ lý chưa tạo được câu trả lời phù hợp.";
  const references = Array.isArray(record.references)
    ? record.references.filter((value): value is string => typeof value === "string")
    : [];

  return { answer, references };
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
