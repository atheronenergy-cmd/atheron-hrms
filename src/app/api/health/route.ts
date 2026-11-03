import { prisma } from "@/infrastructure/database";

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
    console.error("Health check failed:", error);
    return Response.json(
      {
        success: false,
        data: {
          status: "unhealthy",
          timestamp: new Date().toISOString(),
        },
      },
      { status: 503 },
    );
  }
}
