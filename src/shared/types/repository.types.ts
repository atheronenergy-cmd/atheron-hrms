import type { PaginatedResult } from "@/shared/types";

export type BaseEntity = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  version?: number;
};

export type FindManyParams = {
  page?: number;
  pageSize?: number;
  search?: string;
};

export interface IReadRepository<T, Query extends FindManyParams = FindManyParams> {
  findById(id: string): Promise<T | null>;
  findMany(query: Query): Promise<PaginatedResult<T>>;
}

export interface IWriteRepository<TCreate, TUpdate, T> {
  create(data: TCreate): Promise<T>;
  update(id: string, data: TUpdate, version: number): Promise<T>;
  softDelete(id: string, deletedBy: string): Promise<void>;
}

export interface IRepository<T, TCreate, TUpdate, TQuery extends FindManyParams = FindManyParams>
  extends IReadRepository<T, TQuery>,
    IWriteRepository<TCreate, TUpdate, T> {}
