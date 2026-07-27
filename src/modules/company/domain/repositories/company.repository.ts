export type {
  CompanyQuery,
  CompanyRepository,
  CreateCompanyData,
  UpdateCompanyData,
} from "../../infrastructure/repositories/prisma-company.repository";
export {
  createCompanyRepository,
  PrismaCompanyRepository,
} from "../../infrastructure/repositories/prisma-company.repository";

export type CompanyRepositoryPort = import("../../infrastructure/repositories/prisma-company.repository").CompanyRepository;
