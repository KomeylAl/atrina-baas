/**
 * Atrina BaaS — Data module
 *
 * Generic CRUD over /data/{table} endpoints. Type-safe with generics.
 *
 * Usage:
 *   const posts = atrina.data.table<Post>("posts");
 *   const list = await posts.list({ page: 1, pageSize: 20 });
 *   const post = await posts.create({ title: "Hello", body: "World" });
 *   const updated = await posts.update(recordId, { views: 42 });
 *   await posts.delete(recordId);
 */

import { HttpClient } from "./client";
import type { DataListResponse, DataRecord } from "./types";

export type ListOptions = {
  page?: number;
  pageSize?: number;
};

export class Table<T extends Record<string, unknown> = Record<string, unknown>> {
  constructor(
    private client: HttpClient,
    private name: string
  ) {}

  /** List records (with pagination). */
  async list(options: ListOptions = {}): Promise<DataListResponse<T>> {
    return this.client.get<DataListResponse<T>>(`/data/${this.name}`, {
      page: options.page ?? 1,
      pageSize: options.pageSize ?? 20,
    });
  }

  /** Get a single record by ID. */
  async get(recordId: string): Promise<DataRecord & { data: T }> {
    return this.client.get<DataRecord & { data: T }>(`/data/${this.name}/${recordId}`);
  }

  /** Create a new record. */
  async create(data: T): Promise<DataRecord & { data: T }> {
    return this.client.post<DataRecord & { data: T }>(`/data/${this.name}`, data);
  }

  /** Update a record (partial). */
  async update(recordId: string, data: Partial<T>): Promise<DataRecord & { data: T }> {
    return this.client.patch<DataRecord & { data: T }>(`/data/${this.name}/${recordId}`, data);
  }

  /** Delete a record. */
  async delete(recordId: string): Promise<void> {
    await this.client.delete(`/data/${this.name}/${recordId}`);
  }
}

export class Data {
  constructor(private client: HttpClient) {}

  /** Get a typed wrapper for a specific table. */
  table<T extends Record<string, unknown> = Record<string, unknown>>(name: string): Table<T> {
    return new Table<T>(this.client, name);
  }

  /** Quick list (shortcut for `table(name).list(options)`). */
  async list<T extends Record<string, unknown> = Record<string, unknown>>(
    name: string,
    options?: ListOptions
  ): Promise<DataListResponse<T>> {
    return this.table<T>(name).list(options);
  }

  /** Quick create (shortcut for `table(name).create(data)`). */
  async create<T extends Record<string, unknown> = Record<string, unknown>>(
    name: string,
    data: T
  ): Promise<DataRecord & { data: T }> {
    return this.table<T>(name).create(data);
  }
}
