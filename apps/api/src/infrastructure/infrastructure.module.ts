import { Global, Module } from "@nestjs/common";
import { SupabaseStorageService } from "./supabase-storage.service";
import { UpstashRedisService } from "./upstash-redis.service";
import { UpstashThrottlerStorage } from "./upstash-throttler.storage";
import { GoogleRecaptchaService } from "./google-recaptcha.service";

@Global()
@Module({
  providers: [
    SupabaseStorageService,
    UpstashRedisService,
    UpstashThrottlerStorage,
    GoogleRecaptchaService,
  ],
  exports: [
    SupabaseStorageService,
    UpstashRedisService,
    UpstashThrottlerStorage,
    GoogleRecaptchaService,
  ],
})
export class InfrastructureModule {}
