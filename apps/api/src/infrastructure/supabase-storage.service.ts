import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

@Injectable()
export class SupabaseStorageService {
  readonly client: SupabaseClient | null;
  readonly bucket: string;

  constructor(config: ConfigService) {
    const url = config.get<string>("SUPABASE_URL");
    const secretKey =
      config.get<string>("SUPABASE_SECRET_KEY") ??
      config.get<string>("SUPABASE_SERVICE_ROLE_KEY");

    this.bucket = config.get<string>("SUPABASE_STORAGE_BUCKET") ?? "chat-media";

    this.client = url && secretKey ? createClient(url, secretKey) : null;
  }

  get isConfigured() {
    return this.client !== null;
  }

  async checkConnection(): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      const { error } = await this.client.storage.getBucket(this.bucket);
      return !error;
    } catch {
      return false;
    }
  }

  async uploadObject(
    storagePath: string,
    file: Buffer,
    contentType: string,
  ): Promise<void> {
    const client = this.getClient();

    const { error } = await client.storage
      .from(this.bucket)
      .upload(storagePath, file, {
        contentType,
        upsert: false,
      });

    if (error) {
      throw new ServiceUnavailableException("File storage upload failed.");
    }
  }

  async deleteObject(storagePath: string): Promise<void> {
    const client = this.getClient();

    const { error } = await client.storage
      .from(this.bucket)
      .remove([storagePath]);

    if (error) {
      throw new ServiceUnavailableException("File storage delete failed.");
    }
  }

  async createSignedUrl(
    storagePath: string,
    expiresInSeconds = 3600,
  ): Promise<string> {
    const client = this.getClient();

    const { data, error } = await client.storage
      .from(this.bucket)
      .createSignedUrl(storagePath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      throw new ServiceUnavailableException(
        "Could not create a temporary file link.",
      );
    }

    return data.signedUrl;
  }

  private getClient(): SupabaseClient {
    if (!this.client) {
      throw new ServiceUnavailableException(
        "Supabase Storage is not configured.",
      );
    }

    return this.client;
  }
}
