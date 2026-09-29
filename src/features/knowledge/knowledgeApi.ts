import { authorizedRequest, normalizeAuthError } from "@/src/features/auth/authApi";

import { resolveKnowledgeMediaUrl } from "./knowledgeMedia";
import type {
  KnowledgeArticle,
  KnowledgeArticleInput,
  KnowledgeArticleListParams,
  KnowledgeArticlePage,
  KnowledgeCategoryCount,
  KnowledgeCategoryOption,
  KnowledgeCoverImage,
} from "./knowledgeTypes";

function queryString(params?: KnowledgeArticleListParams) {
  const query = new URLSearchParams();
  if (params?.search?.trim()) query.set("search", params.search.trim());
  if (params?.category?.trim() && params.category.trim() !== "Tất cả") {
    query.set("category", params.category.trim());
  }
  if (params?.status) query.set("status", params.status);
  if (params?.page != null) query.set("page", String(params.page));
  if (params?.size != null) query.set("size", String(params.size));
  if (params?.sort) query.set("sort", params.sort);
  const value = query.toString();
  return value ? `?${value}` : "";
}

function normalizeArticle(article: KnowledgeArticle): KnowledgeArticle {
  return {
    ...article,
    coverImage: resolveKnowledgeMediaUrl(article.coverImage),
    tags: Array.isArray(article.tags) ? article.tags : [],
    views: Number(article.views ?? 0),
  };
}

function normalizePage(page: KnowledgeArticlePage): KnowledgeArticlePage {
  return {
    ...page,
    articles: page.articles.map(normalizeArticle),
  };
}

async function request<T>(config: Parameters<typeof authorizedRequest<T>>[0]) {
  try {
    const response = await authorizedRequest<T>(config);
    return response.data;
  } catch (error) {
    throw normalizeAuthError(error);
  }
}

export const knowledgeApi = {
  list: (params?: KnowledgeArticleListParams) =>
    request<KnowledgeArticlePage>({
      method: "GET",
      url: `/api/knowledge/articles${queryString(params)}`,
    }).then(normalizePage),
  listAdmin: (params?: KnowledgeArticleListParams) =>
    request<KnowledgeArticlePage>({
      method: "GET",
      url: `/api/knowledge/admin/articles${queryString(params)}`,
    }).then(normalizePage),
  listMine: (params?: KnowledgeArticleListParams) =>
    request<KnowledgeArticlePage>({
      method: "GET",
      url: `/api/knowledge/articles/mine${queryString(params)}`,
    }).then(normalizePage),
  recent: (size = 5) =>
    request<KnowledgeArticlePage>({
      method: "GET",
      url: `/api/knowledge/articles/recent?size=${encodeURIComponent(String(size))}`,
    }).then(normalizePage),
  popular: (size = 5) =>
    request<KnowledgeArticlePage>({
      method: "GET",
      url: `/api/knowledge/articles/popular?size=${encodeURIComponent(String(size))}`,
    }).then(normalizePage),
  categories: () =>
    request<KnowledgeCategoryCount[]>({
      method: "GET",
      url: "/api/knowledge/categories",
    }),
  categoryOptions: () =>
    request<KnowledgeCategoryOption[]>({
      method: "GET",
      url: "/api/knowledge/category-options",
    }),
  related: (slug: string, size = 4) =>
    request<KnowledgeArticlePage>({
      method: "GET",
      url: `/api/knowledge/articles/${encodeURIComponent(slug)}/related?size=${encodeURIComponent(String(size))}`,
    }).then(normalizePage),
  get: (slug: string) =>
    request<KnowledgeArticle>({
      method: "GET",
      url: `/api/knowledge/articles/${encodeURIComponent(slug)}`,
    }).then(normalizeArticle),
  save: (body: KnowledgeArticleInput, id?: string | null) =>
    request<KnowledgeArticle>({
      data: body,
      method: id ? "PUT" : "POST",
      url: id ? `/api/knowledge/articles/${encodeURIComponent(id)}` : "/api/knowledge/articles",
    }).then(normalizeArticle),
  uploadCover: (id: string, coverImage: KnowledgeCoverImage) => {
    const formData = new FormData();
    formData.append("coverImage", coverImage as unknown as Blob);
    return request<KnowledgeArticle>({
      data: formData,
      headers: { "Content-Type": "multipart/form-data" },
      method: "POST",
      url: `/api/knowledge/articles/${encodeURIComponent(id)}/cover`,
    }).then(normalizeArticle);
  },
  approve: (id: string) =>
    request<KnowledgeArticle>({
      method: "POST",
      url: `/api/knowledge/articles/${encodeURIComponent(id)}/approve`,
    }).then(normalizeArticle),
  reject: (id: string, reason: string) =>
    request<KnowledgeArticle>({
      data: { reason },
      method: "POST",
      url: `/api/knowledge/articles/${encodeURIComponent(id)}/reject`,
    }).then(normalizeArticle),
  delete: (id: string) =>
    request<void>({
      method: "DELETE",
      url: `/api/knowledge/articles/${encodeURIComponent(id)}`,
    }),
};
