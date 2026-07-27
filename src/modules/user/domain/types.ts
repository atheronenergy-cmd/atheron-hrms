export const USER_ROUTES = {
  list: "/dashboard/users",
  create: "/dashboard/users/create",
  detail: (id: string) => `/dashboard/users/${id}`,
  edit: (id: string) => `/dashboard/users/${id}/edit`,
  acceptInvitation: "/accept-invitation",
} as const;

export const USER_STATUS_LABELS: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
  locked: "Locked",
  suspended: "Suspended",
  pending_verification: "Pending Verification",
};

export const INVITATION_EXPIRY_HOURS = 72;

export type UserListItem = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  avatarFileId: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  roles: { id: string; name: string; slug: string }[];
};

export type UserDetail = UserListItem & {
  emailVerified: Date | null;
  companyId: string | null;
  remarks: string | null;
  version: number;
  updatedAt: Date;
  createdBy: string | null;
};

export type PermissionWithSource = {
  key: string;
  module: string;
  resource: string;
  action: string;
  description: string | null;
  granted: boolean;
  sourceRoles: string[];
};

export type UserPermissionSummary = {
  modules: {
    module: string;
    permissions: PermissionWithSource[];
  }[];
  totalGranted: number;
  totalAvailable: number;
};
