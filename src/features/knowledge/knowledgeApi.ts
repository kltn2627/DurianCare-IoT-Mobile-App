import { authorizedRequest } from "@/src/features/auth/authApi";
import { getApiBaseUrl } from "@/src/lib/apiBase";

export type KnowledgeArticleDTO = {
  id: string;
  title: string;
  slug: string;
  category: string;
  author: string;
  excerpt: string;
  content: string;
  coverImage?: string;
  readingTime?: string;
  tags: string[];
  publishedAt?: string;
  views: number;
};

type KnowledgePageResponse = {
  content: KnowledgeArticleDTO[];
  totalElements: number;
  totalPages: number;
};

const BASE = () => getApiBaseUrl();

export async function fetchKnowledgeArticles(
  page = 0,
  size = 50,
): Promise<KnowledgeArticleDTO[]> {
  const { data } = await authorizedRequest<KnowledgePageResponse>({
    baseURL: BASE(),
    url: `/api/knowledge/articles`,
    method: "GET",
    params: { status: "PUBLISHED", page, size },
  });
  return data.content ?? [];
}

export async function fetchKnowledgeArticle(slug: string): Promise<KnowledgeArticleDTO> {
  const { data } = await authorizedRequest<KnowledgeArticleDTO>({
    baseURL: BASE(),
    url: `/api/knowledge/articles/${slug}`,
    method: "GET",
  });
  return data;
}
