import { auth } from "@/infrastructure/auth/auth";
import { authorizationService } from "@/infrastructure/authorization/authorization.service";
import { handleApiError } from "@/shared/errors";
import { serializeAuthorizationContext } from "@/shared/permissions/serialization";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const context = await authorizationService.getContext(
      session.user.id,
      session.user.companyId,
    );

    return Response.json({
      success: true,
      data: serializeAuthorizationContext(context),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
