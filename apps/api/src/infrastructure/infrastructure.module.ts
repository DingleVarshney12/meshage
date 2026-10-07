import { Global, Module } from "@nestjs/common";
import { SupabaseStorageService } from "./supabase-storage.service";
import { UpstashRedisService } from "./upstash-redis.service";
import { UpstashThrottlerStorage } from "./upstash-throttler.storage";

@Global()
@Module({
  providers: [
    SupabaseStorageService,
    UpstashRedisService,
    UpstashThrottlerStorage,
  ],
  exports: [
    SupabaseStorageService,
    UpstashRedisService,
    UpstashThrottlerStorage,
  ],
})
export class InfrastructureModule {}
