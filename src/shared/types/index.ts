export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
};

export type ApiErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export type PaginatedMeta = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type PaginatedResult<T> = {
  items: T[];
  meta: PaginatedMeta;
};

export type RequestContext = {
  requestId: string;
  userId?: string;
  companyId?: string;
  ipAddress?: string;
};

export type Theme = "light" | "dark" | "system";

export type NavItem = {
  label: string;
  href: string;
  icon: string;
  badge?: string;
  disabled?: boolean;
};

export * from "./repository.types";
