import type { AuthRole } from "@/src/features/auth/authTypes";

export type UserRole = "OWNER" | "ENGINEER";

export type SessionUser = {
  accountStatus: string | null;
  address: string | null;
  avatarUrl: string | null;
  backendRole: AuthRole;
  bio: string | null;
  certificateUrls: string[] | null;
  createdAt: string | null;
  dateOfBirth: string | null;
  email: string;
  farmAddress: string | null;
  fullName: string;
  gender: string | null;
  id: string;
  name: string;
  phoneNumber: string | null;
  provinceCity: string | null;
  role: UserRole;
  specialization: string | null;
  updatedAt: string | null;
  workplace: string | null;
  yearsExperience: number | null;
};

export type SessionState = {
  accessTokenExpiresAt: number;
  token: string;
  user: SessionUser;
};
