import { auth } from "@/infrastructure/auth/auth";
import { authorizationService } from "@/infrastructure/authorization/authorization.service";
import { AuthenticationError, AuthorizationError } from "@/shared/errors";
import type { PermissionKey } from "@/shared/permissions/engine";

export async function requireApiAuth(permission: PermissionKey) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new AuthenticationError("Authentication required");
  }
  if (!session.user.companyId) {
    throw new AuthenticationError("Company context required");
  }

  const result = await authorizationService.checkPermission(
    session.user.id,
    permission,
    session.user.companyId,
  );
  if (!result.allowed) {
    throw new AuthorizationError(result.reason ?? "Access denied");
  }

  return {
    userId: session.user.id,
    companyId: session.user.companyId,
  };
}

export function getRequestMeta(request: Request) {
  return {
    ipAddress: request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? undefined,
    userAgent: request.headers.get("user-agent") ?? undefined,
  };
}

export function apiSuccess<T>(data: T, message = "Success", status = 200) {
  return Response.json({ success: true, message, data }, { status });
}

export function apiError(message: string, status = 400, fieldErrors?: Record<string, string[]>) {
  return Response.json({ success: false, message, fieldErrors }, { status });
}
