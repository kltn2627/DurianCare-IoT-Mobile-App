import { authorizedRequest } from "@/src/features/auth/authApi";
import { getApiBaseUrl } from "@/src/lib/apiBase";

export type CommunityAuthorDTO = {
  id: string;
  name: string;
  avatarUrl?: string;
  role?: string;
};

export type CommunityMediaDTO = {
  id: string;
  type: string;
  url: string;
  contentType?: string;
};

export type CommunityCommentDTO = {
  id: string;
  author: CommunityAuthorDTO;
  content: string;
  createdAt: string;
};

export type CommunityPostDTO = {
  id: string;
  author: CommunityAuthorDTO;
  topic?: string;
  content: string;
  media: CommunityMediaDTO[];
  tags: string[];
  reactionCount: number;
  commentCount: number;
  myReaction?: string | null;
  comments: CommunityCommentDTO[];
  createdAt: string;
};

type CommunityPageResponse = {
  content: CommunityPostDTO[];
  totalElements: number;
  totalPages: number;
  number: number;
};

const BASE = () => getApiBaseUrl();

export async function fetchCommunityFeed(
  page = 0,
  size = 20,
): Promise<CommunityPageResponse> {
  const { data } = await authorizedRequest<CommunityPageResponse>({
    baseURL: BASE(),
    url: `/api/community/posts`,
    method: "GET",
    params: { page, size },
  });
  return data;
}

export async function createCommunityPost(
  content: string,
  topic?: string,
): Promise<CommunityPostDTO> {
  const formData = new FormData();
  formData.append("content", content);
  if (topic) formData.append("topic", topic);

  const { data } = await authorizedRequest<CommunityPostDTO>({
    baseURL: BASE(),
    url: `/api/community/posts`,
    method: "POST",
    data: formData,
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function reactToPost(
  postId: string,
  type: "LIKE" | "HEART" | null,
): Promise<CommunityPostDTO> {
  const { data } = await authorizedRequest<CommunityPostDTO>({
    baseURL: BASE(),
    url: `/api/community/posts/${postId}/reaction`,
    method: "POST",
    params: type ? { type } : {},
  });
  return data;
}

export async function addCommentToPost(
  postId: string,
  content: string,
): Promise<CommunityPostDTO> {
  const { data } = await authorizedRequest<CommunityPostDTO>({
    baseURL: BASE(),
    url: `/api/community/posts/${postId}/comments`,
    method: "POST",
    data: { content },
  });
  return data;
}
