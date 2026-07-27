import { formatDistanceToNow } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RoleBadge } from "@/modules/user/components/role-badge";
import { UserAvatar } from "@/modules/user/components/user-avatar";
import { UserStatusBadge } from "@/modules/user/components/user-status-badge";
import type { UserListItem } from "@/modules/user/domain/types";

type UserCardProps = {
  user: UserListItem;
  actions?: React.ReactNode;
};

export function UserCard({ user, actions }: UserCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex items-center gap-3">
          <UserAvatar name={user.name} size="lg" />
          <div>
            <CardTitle className="text-base">{user.name}</CardTitle>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <UserStatusBadge status={user.status} />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1">
          {user.roles.map((role) => (
            <RoleBadge key={role.id} name={role.name} slug={role.slug} />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Last login:{" "}
          {user.lastLoginAt
            ? formatDistanceToNow(user.lastLoginAt, { addSuffix: true })
            : "Never"}
        </p>
        {actions}
      </CardContent>
    </Card>
  );
}
