import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Redis } from "@upstash/redis";

@Injectable()
export class UpstashRedisService {
  readonly client: Redis | null;

  constructor(config: ConfigService) {
    const url = config.get<string>("UPSTASH_REDIS_REST_URL");
    const token = config.get<string>("UPSTASH_REDIS_REST_TOKEN");
    this.client = url && token ? new Redis({ url, token }) : null;
  }

  get isConfigured() {
    return this.client !== null;
  }

  async checkConnection(): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      await this.client.ping();
      return true;
    } catch {
      return false;
    }
  }
}
