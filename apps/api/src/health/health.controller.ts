import { Controller, Get } from "@nestjs/common";
import { SupabaseStorageService } from "../infrastructure/supabase-storage.service";
import { UpstashRedisService } from "../infrastructure/upstash-redis.service";

@Controller("health")
export class HealthController {
  constructor(
    private readonly redis: UpstashRedisService,
    private readonly storage: SupabaseStorageService,
  ) {}

  @Get()
  getHealth() {
    return {
      status: "ok",
      service: "chat-api",
      databaseConfigured: Boolean(process.env.DATABASE_URL),
      redisConfigured: this.redis.isConfigured,
      storageConfigured: this.storage.isConfigured,
      timestamp: new Date().toISOString(),
    };
  }
}
