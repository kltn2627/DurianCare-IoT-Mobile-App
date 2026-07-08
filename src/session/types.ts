export type UserRole = "OWNER" | "ENGINEER";

export type SessionUser = {
  avatarUrl: string | null;
  backendRole: "EXPERT" | "FARMER";
  accountStatus: string | null;
  address: string | null;
  bio: string | null;
  email: string;
  createdAt: string | null;
  dateOfBirth: string | null;
  farmAddress: string | null;
  id: string;
  gender: string | null;
  name: string;
  phoneNumber: string | null;
  provinceCity: string | null;
  role: UserRole;
  updatedAt: string | null;
};

export type SessionState = {
  accessTokenExpiresAt: number;
  token: string;
  user: SessionUser;
};
