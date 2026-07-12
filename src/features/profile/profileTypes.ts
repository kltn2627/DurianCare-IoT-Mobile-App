import type { ApiErrorResponse } from "@/src/features/auth/authTypes";

export type ProfileGender = "MALE" | "FEMALE" | "OTHER" | "";
export type ProfileAccountStatus =
  | "PENDING_VERIFICATION"
  | "PENDING_APPROVAL"
  | "PENDING"
  | "ACTIVE"
  | "BLOCKED"
  | "REJECTED"
  | string;

export type ProfileRecord = {
  address: string | null;
  accountStatus: ProfileAccountStatus;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: string;
  dateOfBirth: string | null;
  email: string;
  fullName: string;
  gender: ProfileGender | string | null;
  phoneNumber: string | null;
  provinceCity: string | null;
  role: "ADMIN" | "EXPERT" | "FARMER" | "GUEST" | string;
  updatedAt: string;
  userId: string;
  workplace?: string | null;
  specialization?: string | null;
  yearsExperience?: number | null;
  certificateUrls?: string[] | null;
};

export type ProfileUpdateRequest = {
  address?: string;
  bio?: string;
  dateOfBirth?: string;
  fullName: string;
  gender?: ProfileGender | string;
  phoneNumber?: string;
  provinceCity?: string;
};

export type ProfileAvatarResponse = {
  avatarUrl: string;
};

export type ProfileDeleteAvatarResponse = {
  message: string;
};

export type AvatarUploadFile = {
  name: string;
  type: string;
  uri: string;
};

export type ProfileApiErrorBody = ApiErrorResponse;
