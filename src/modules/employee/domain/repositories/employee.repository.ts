import type { EmployeeRepository } from "../../infrastructure/repositories/prisma-employee.repository";

export type { CreateEmployeeData, EmployeeQuery,EmployeeRepository, UpdateEmployeeData } from "../../infrastructure/repositories/prisma-employee.repository";
export { createEmployeeRepository,PrismaEmployeeRepository } from "../../infrastructure/repositories/prisma-employee.repository";

export type EmployeeRepositoryPort = EmployeeRepository;
