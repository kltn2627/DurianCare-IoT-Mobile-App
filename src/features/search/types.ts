export type SearchDocumentType = "ARTICLE" | "DISEASE";
export type SearchSortBy = "updatedAt" | "title";
export type SearchSortDirection = "asc" | "desc";

export type SearchResult = {
  id: string;
  type: SearchDocumentType | string;
  title: string;
  content: string;
  updatedAt: string;
};

export type SearchResponse = {
  query: string;
  type: SearchDocumentType | null;
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  numberOfElements: number;
  hasNext: boolean;
  hasPrevious: boolean;
  sortBy: SearchSortBy;
  sortDirection: SearchSortDirection;
  results: SearchResult[];
};

export type SearchRequest = {
  query: string;
  type?: SearchDocumentType | "";
  page: number;
  size: number;
  sortBy: SearchSortBy;
  sortDirection: SearchSortDirection;
};

export type SearchApiErrorBody = {
  timestamp?: string;
  status: number;
  error: string;
  message: string;
};
