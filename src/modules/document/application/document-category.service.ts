import { BaseRepository } from "@/infrastructure/database/base-repository";
import { prisma } from "@/infrastructure/database/prisma-client";
import type { DocumentCategoryItem } from "@/modules/document/domain/types";
import { ensureDefaultDocumentCategories } from "@/modules/document/application/document-audit.service";

export class DocumentCategoryService extends BaseRepository {
  async list(): Promise<DocumentCategoryItem[]> {
    const companyId = this.requireCompanyId();
    await ensureDefaultDocumentCategories(companyId);

    const rows = await prisma.documentCategory.findMany({
      where: {
        status: "active",
        OR: [{ companyId }, { companyId: null, isSystem: true }],
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    return rows.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description,
    }));
  }

  async findByCode(code: string) {
    const companyId = this.requireCompanyId();
    return prisma.documentCategory.findFirst({
      where: {
        code,
        status: "active",
        OR: [{ companyId }, { companyId: null, isSystem: true }],
      },
    });
  }

  protected requireCompanyId(): string {
    if (!this.companyId) throw new Error("Company context required");
    return this.companyId;
  }
}

export function createDocumentCategoryService(companyId: string) {
  return new DocumentCategoryService(companyId);
}
