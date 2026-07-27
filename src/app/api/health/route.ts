import { prisma } from "@/infrastructure/database";
import { handleApiError } from "@/shared/errors";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({
      success: true,
      data: {
        status: "healthy",
        timestamp: new Date().toISOString(),
        version: "0.1.0",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
