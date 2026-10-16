import axios from "axios";
import type { AxiosRequestConfig } from "axios";

import { authorizedRequest } from "@/src/features/auth/authApi";

import type {
  AvatarUploadFile,
  ProfileApiErrorBody,
  ProfileAvatarResponse,
  ProfileDeleteAvatarResponse,
  ProfileRecord,
  ProfileUpdateRequest,
} from "./profileTypes";

export class ProfileApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly body?: ProfileApiErrorBody,
  ) {
    super(message);
    this.name = "ProfileApiError";
  }
}

async function request<T>(config: AxiosRequestConfig) {
  try {
    const response = await authorizedRequest<T>(config);
    return response.data;
  } catch (error) {
    throw normalizeProfileError(error);
  }
}

function buildAvatarFormData(file: AvatarUploadFile) {
  const formData = new FormData();
  formData.append(
    "avatar",
    {
      name: file.name,
      type: file.type,
      uri: file.uri,
    } as never,
  );
  return formData;
}

export const profileClient = {
  deleteAvatar: () =>
    request<ProfileDeleteAvatarResponse>({
      method: "DELETE",
      url: "/api/users/me/avatar",
    }),
  me: () =>
    request<ProfileRecord>({
      method: "GET",
      url: "/api/users/me",
    }),
  updateMe: (body: ProfileUpdateRequest) =>
    request<ProfileRecord>({
      data: body,
      method: "PUT",
      url: "/api/users/me",
    }),
  uploadAvatar: (file: AvatarUploadFile) =>
    request<ProfileAvatarResponse>({
      data: buildAvatarFormData(file),
      method: "POST",
      url: "/api/users/me/avatar",
    }),
};

function normalizeProfileError(error: unknown) {
  if (error instanceof ProfileApiError) return error;
  if (axios.isAxiosError<ProfileApiErrorBody>(error)) {
    const message =
      error.response?.data?.message ??
      (error.code === "ECONNABORTED"
        ? "Máy chủ phản hồi quá chậm. Vui lòng thử lại."
        : "Không thể tải hồ sơ cá nhân.");
    return new ProfileApiError(
      message,
      error.response?.status,
      error.response?.data,
    );
  }
  return new ProfileApiError(
    error instanceof Error ? error.message : "Đã xảy ra lỗi hồ sơ không xác định.",
  );
}
