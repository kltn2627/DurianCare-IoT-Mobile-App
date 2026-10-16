import { authorizedRequest, normalizeAuthError } from "@/src/features/auth/authApi";

import { resolveMediaUrl } from "@/src/lib/mediaUrl";
import type {
  CommunityComment,
  CommunityListParams,
  CommunityPage,
  CommunityPost,
  CommunityReactionType,
  CreateCommunityPostRequest,
} from "./communityTypes";

function queryString(params: CommunityListParams = {}) {
  const query = new URLSearchParams({
    page: String(params.page ?? 0),
    size: String(params.size ?? 20),
  });
  if (params.topic?.trim() && params.topic !== "Tất cả") query.set("topic", params.topic.trim());
  if (params.query?.trim()) query.set("query", params.query.trim());
  if (params.status) query.set("status", params.status);
  return query.toString();
}

function normalizeComment(comment: CommunityComment): CommunityComment {
  return {
    ...comment,
    author: { ...comment.author, avatar: resolveMediaUrl(comment.author.avatar) },
    parentId: comment.parentId ?? null,
    replies: (comment.replies ?? []).map(normalizeComment),
  };
}

function normalizePost(post: CommunityPost): CommunityPost {
  return {
    ...post,
    author: { ...post.author, avatar: resolveMediaUrl(post.author.avatar) },
    comments: (post.comments ?? []).map(normalizeComment),
    media: (post.media ?? []).map((item) => ({
      ...item,
      url: resolveMediaUrl(item.url) ?? item.url,
    })),
  };
}

function normalizePage(page: CommunityPage<CommunityPost>): CommunityPage<CommunityPost> {
  return { ...page, items: page.items.map(normalizePost) };
}

async function request<T>(config: Parameters<typeof authorizedRequest<T>>[0]) {
  try {
    const response = await authorizedRequest<T>(config);
    return response.data;
  } catch (error) {
    throw normalizeAuthError(error);
  }
}

export const communityApi = {
  adminPosts: (params?: CommunityListParams) =>
    request<CommunityPage<CommunityPost>>({
      method: "GET",
      url: `/api/community/admin/posts?${queryString(params)}`,
    }).then(normalizePage),
  comment: (postId: string, content: string, parentId?: string | null) =>
    request<CommunityPost>({
      data: { content, parentId: parentId ?? null },
      method: "POST",
      url: `/api/community/posts/${encodeURIComponent(postId)}/comments`,
    }).then(normalizePost),
  create: (body: CreateCommunityPostRequest) => {
    const formData = new FormData();
    formData.append("content", body.content);
    formData.append("topic", body.topic);
    formData.append("visibility", body.visibility);
    body.media.forEach((file) => formData.append("media", file as unknown as Blob));
    return request<CommunityPost>({
      data: formData,
      headers: { "Content-Type": "multipart/form-data" },
      method: "POST",
      url: "/api/community/posts",
    }).then(normalizePost);
  },
  delete: (postId: string) =>
    request<void>({
      method: "DELETE",
      url: `/api/community/posts/${encodeURIComponent(postId)}`,
    }),
  deleteComment: (postId: string, commentId: string) =>
    request<CommunityPost>({
      method: "DELETE",
      url: `/api/community/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`,
    }).then(normalizePost),
  detail: (postId: string) =>
    request<CommunityPost>({
      method: "GET",
      url: `/api/community/posts/${encodeURIComponent(postId)}`,
    }).then(normalizePost),
  feed: (params?: CommunityListParams) =>
    request<CommunityPage<CommunityPost>>({
      method: "GET",
      url: `/api/community/posts?${queryString(params)}`,
    }).then(normalizePage),
  mine: (page = 0, size = 20) =>
    request<CommunityPage<CommunityPost>>({
      method: "GET",
      url: `/api/community/posts/mine?page=${page}&size=${size}`,
    }).then(normalizePage),
  react: (postId: string, type: CommunityReactionType | null) => {
    const suffix = type ? `?type=${encodeURIComponent(type)}` : "";
    return request<CommunityPost>({
      method: "POST",
      url: `/api/community/posts/${encodeURIComponent(postId)}/reaction${suffix}`,
    }).then(normalizePost);
  },
  report: (postId: string) =>
    request<CommunityPost>({
      method: "POST",
      url: `/api/community/posts/${encodeURIComponent(postId)}/report`,
    }).then(normalizePost),
};
