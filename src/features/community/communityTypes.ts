export type CommunityRole = "ADMIN" | "ENGINEER" | "FARMER" | "EXPERT" | string;
export type CommunityPostStatus = "PUBLISHED" | "REPORTED" | "HIDDEN";
export type CommunityPostVisibility = "PUBLIC" | "CONNECTIONS";
export type CommunityReactionType = "LIKE" | "LOVE" | "WOW" | "SAD" | "HAHA";
export type CommunityMediaType = "IMAGE" | "VIDEO";

export type CommunityAuthor = {
  avatar: string | null;
  fullName: string;
  id: string;
  region: string | null;
  role: CommunityRole;
};

export type CommunityMedia = {
  contentType: string;
  id: string;
  type: CommunityMediaType;
  url: string;
};

export type CommunityComment = {
  author: CommunityAuthor;
  content: string;
  createdAt: string;
  id: string;
  parentId: string | null;
  replies: CommunityComment[];
};

export type CommunityPost = {
  author: CommunityAuthor;
  commentCount: number;
  comments: CommunityComment[];
  content: string;
  createdAt: string;
  id: string;
  media: CommunityMedia[];
  myReaction: CommunityReactionType | null;
  reactionCount: number;
  shareCount: number;
  status: CommunityPostStatus;
  tags: string[];
  topic: string;
  updatedAt: string;
  visibility: CommunityPostVisibility;
};

export type CommunityPage<T> = {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type CommunityListParams = {
  page?: number;
  query?: string;
  size?: number;
  status?: CommunityPostStatus | "";
  topic?: string;
};

export type CommunityUploadFile = {
  name: string;
  type: string;
  uri: string;
};

export type CreateCommunityPostRequest = {
  content: string;
  media: CommunityUploadFile[];
  topic: string;
  visibility: CommunityPostVisibility;
};
