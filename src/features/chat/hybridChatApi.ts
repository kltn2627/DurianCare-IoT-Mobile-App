import { authorizedRequest } from "@/src/features/auth/authApi";

const AI_CHAT_PATH = process.env.EXPO_PUBLIC_AI_CHAT_PATH ?? "/api/v1/chat/ask";
const REQUEST_TIMEOUT_MS = 45_000;

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
