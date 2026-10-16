import type { UserRole } from "@/src/session/types";

export type ProtocolDay = {
  completed: boolean;
  day: number;
  task: string;
};

export type ChatMessage = {
  author: string;
  body: string;
  createdAt: string;
  id: string;
  imageUri?: string;
  kind: "text" | "scan-alert" | "protocol" | "bot" | "image" | "location";
  protocol?: ProtocolDay[];
  role: UserRole | "BOT";
  zoneLabel?: string;
};
