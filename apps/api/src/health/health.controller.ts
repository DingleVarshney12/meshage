import {
  Controller,
  Get,
  Optional,
  ServiceUnavailableException,
} from "@nestjs/common";
import { DataSource } from "typeorm";
import { SupabaseStorageService } from "../infrastructure/supabase-storage.service";
import { UpstashRedisService } from "../infrastructure/upstash-redis.service";

@Controller("health")
export class HealthController {
  constructor(
    private readonly redis: UpstashRedisService,
    private readonly storage: SupabaseStorageService,
    @Optional() private readonly dataSource?: DataSource,
  ) {}

  @Get()
  getHealth() {
    return {
      status: "ok",
      service: "chat-api",
      timestamp: new Date().toISOString(),
    };
  }

  @Get("ready")
  async getReadiness() {
    const checks = {
      database: await this.checkDatabaseConnection(),
      redis: await this.redis.checkConnection(),
      storage: await this.storage.checkConnection(),
    };
    const isReady = Object.values(checks).every(Boolean);
    const response = {
      status: isReady ? "ready" : "not_ready",
      service: "chat-api",
      checks,
      timestamp: new Date().toISOString(),
    };

    if (!isReady) {
      throw new ServiceUnavailableException(response);
    }

    return response;
  }

  private async checkDatabaseConnection(): Promise<boolean> {
    if (!this.dataSource?.isInitialized) {
      return false;
    }

    try {
      await this.dataSource.query("SELECT 1");
      return true;
    } catch {
      return false;
    }
  }
}
