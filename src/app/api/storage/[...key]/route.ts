import { NextResponse } from "next/server";

import { requirePermission } from "@/infrastructure/authorization/server/guards";
import { prisma } from "@/infrastructure/database/prisma-client";
import { getProviderForCategory, resolveStorageTier } from "@/infrastructure/storage/storage-router";
import { PERMISSIONS } from "@/shared/permissions/definitions";

type RouteParams = { params: Promise<{ key: string[] }> };

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const auth = await requirePermission(PERMISSIONS.DOCUMENT.FILE.READ);
    if (!auth.companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { key: keyParts } = await params;
    const storageKey = decodeURIComponent(keyParts.join("/"));

    if (!storageKey.startsWith(`${auth.companyId}/`)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const file = await prisma.file.findFirst({
      where: { storageKey, companyId: auth.companyId, deletedAt: null },
    });
    if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const metadata = file.metadata as Record<string, unknown> | null;
    const provider = getProviderForCategory(file.category, metadata);
    const tier = resolveStorageTier(file.category, metadata);

    if (tier === "cloud") {
      const url = await provider.getSignedUrl(storageKey);
      return NextResponse.redirect(url);
    }

    const buffer = await provider.download(storageKey);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": file.mimeType ?? "application/octet-stream",
        "Content-Disposition": `inline; filename="${file.originalName}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
