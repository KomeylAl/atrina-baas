/**
 * Atrina BaaS — Storage module
 *
 * Upload/download files via /storage/* endpoints.
 */

import { HttpClient } from "./client";
import type { StorageObject } from "./types";

export class Storage {
  constructor(private client: HttpClient) {}

  /** Upload a file. Returns the created object metadata. */
  async upload(file: File | Blob, fileName?: string): Promise<StorageObject> {
    const res = await this.client.upload<{ object: StorageObject }>("/storage/upload", file, fileName);
    return res.object;
  }

  /** Download file content as a Blob. */
  async download(key: string): Promise<Blob> {
    // Use the client's GET method with the raw key path
    const url = `/storage/download/${encodeURIComponent(key)}`;
    // The download endpoint returns binary, so we need raw fetch
    return this.client.get<Blob>(url);
  }
}
