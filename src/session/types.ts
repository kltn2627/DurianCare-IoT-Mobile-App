export type UserRole = "OWNER" | "ENGINEER";

export type SessionUser = {
  email: string;
  name: string;
  role: UserRole;
};

export type SessionState = {
  token: string;
  user: SessionUser;
};
