import type { ConnectionUser } from "@/src/features/community/connectionApi";

export type ChatActorRole = "FARMER" | "ENGINEER";
export type ChatConversationStatus = "WAITING" | "IN_PROGRESS" | "RESOLVED" | string;
export type ChatMessageType = "TEXT" | "IMAGE" | "TREATMENT_REGIMEN" | string;

export type ChatParticipant = {
  name: string;
  phoneNumber: string | null;
  role: ChatActorRole;
  userId: string;
};

export type TreatmentRegimenStep = {
  day: number;
  task: string;
  completed?: boolean;
};

export type TreatmentRegimen = {
  title?: string;
  name?: string;
  description?: string;
  steps?: TreatmentRegimenStep[];
  days?: TreatmentRegimenStep[];
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  sender: ChatParticipant;
  content: string;
  sentAt: string;
  type: ChatMessageType;
  image?: string | null;
  regimen?: TreatmentRegimen | null;
};

export type ChatConversation = {
  id: string;
  farmer: ChatParticipant;
  engineer: ChatParticipant;
  farm?: string | null;
  zone?: string | null;
  location?: string | null;
  status: ChatConversationStatus;
  activityLabel?: string | null;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  cropContext?: string | null;
  sensorContext?: string | null;
  createdAt: string;
  updatedAt: string;
  unreadCount: number;
  messages: ChatMessage[];
};

export type ChatListResponse = {
  conversations: ChatConversation[];
  engineers?: ConnectionUser[];
};

export type CreateConversationRequest = {
  peerUserId?: string;
  peerPhoneNumber?: string;
  engineerPhoneNumber?: string;
  farmerPhoneNumber?: string;
  farm?: string;
  zone?: string;
  location?: string;
  cropContext?: string;
  sensorContext?: string;
  initialMessage?: string;
};

export type SendMessageRequest = {
  content?: string;
  image?: string | null;
};

export type PublishRegimenRequest = {
  regimen: TreatmentRegimen;
};

