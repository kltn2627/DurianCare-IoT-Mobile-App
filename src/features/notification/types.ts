export type NotificationSortBy = "createdAt" | "title";
export type NotificationSortDirection = "asc" | "desc";

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
};

export type NotificationPageResponse = {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  numberOfElements: number;
  hasNext: boolean;
  hasPrevious: boolean;
  sortBy: NotificationSortBy;
  sortDirection: NotificationSortDirection;
  notifications: NotificationItem[];
};

export type NotificationCountResponse = {
  count: number;
};

export type NotificationApiErrorBody = {
  timestamp?: string;
  status: number;
  error: string;
  message: string;
};
