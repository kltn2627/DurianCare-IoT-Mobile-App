export type KnowledgeStatus = "DRAFT" | "REVIEW" | "PUBLISHED" | "REJECTED";

export type KnowledgeBackendRole = "ADMIN" | "ENGINEER" | "EXPERT" | "FARMER" | "GUEST" | string;

export type KnowledgeSort =
  | "publishedAt,desc"
  | "updatedAt,desc"
  | "views,desc"
  | "title,asc"
  | string;

export type KnowledgeArticle = {
  id: string;
  title: string;
  slug: string;
  category: string;
  author: string;
  authorUserId?: string | null;
  authorRole?: KnowledgeBackendRole | null;
  excerpt: string;
  content: string;
  status: KnowledgeStatus;
  featured: boolean;
  coverImage: string | null;
  readingTime: string;
  tags: string[];
  publishedAt: string;
  updatedAt: string;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  rejectionReason?: string | null;
  views: number;
};

export type KnowledgeArticlePage = {
  articles: KnowledgeArticle[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
};

export type KnowledgeArticleListParams = {
  search?: string;
  category?: string;
  status?: KnowledgeStatus;
  page?: number;
  size?: number;
  sort?: KnowledgeSort;
};

export type KnowledgeCategoryCount = {
  category: string;
  count: number;
};

export type KnowledgeCategoryOption = {
  value: string;
  label: string;
};

export type KnowledgeArticleInput = {
  title: string;
  category: string;
  author: string;
  excerpt: string;
  content: string;
  status?: KnowledgeStatus;
  featured?: boolean;
  tags?: string[];
};

export type KnowledgeCoverImage = {
  uri: string;
  name: string;
  type: string;
};
