import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ThrottlerStorage } from "@nestjs/throttler";
import { Ratelimit } from "@upstash/ratelimit";
import { UpstashRedisService } from "./upstash-redis.service";

interface ThrottlerStorageRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

@Injectable()
export class UpstashThrottlerStorage implements ThrottlerStorage {
  private readonly logger = new Logger(UpstashThrottlerStorage.name);
  private readonly limiters = new Map<string, Ratelimit>();

  constructor(private readonly upstashRedis: UpstashRedisService) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const redis = this.upstashRedis.client;

    if (!redis) {
      throw new ServiceUnavailableException(
        "Rate limiting is unavailable because Redis is not configured.",
      );
    }

    const limiterKey = `${throttlerName}:${limit}:${ttl}`;
    let limiter = this.limiters.get(limiterKey);

    if (!limiter) {
      limiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(limit, `${Math.ceil(ttl / 1000)} s`),
        prefix: `meshage:rate-limit:${limiterKey}`,
        analytics: false,
      });
      this.limiters.set(limiterKey, limiter);
    }

    try {
      const result = await limiter.limit(key);
      const secondsUntilReset = Math.max(
        1,
        Math.ceil((result.reset - Date.now()) / 1000),
      );
      const isBlocked = !result.success;

      return {
        totalHits: isBlocked
          ? Math.max(limit + 1, limit - result.remaining + 1)
          : limit - result.remaining,
        timeToExpire: secondsUntilReset,
        isBlocked,
        timeToBlockExpire: isBlocked
          ? Math.max(secondsUntilReset, Math.ceil(blockDuration / 1000))
          : 0,
      };
    } catch (error) {
      this.logger.error("Upstash rate-limit check failed.", error);
      throw new ServiceUnavailableException(
        "Rate limiting is temporarily unavailable. Please try again shortly.",
      );
    }
  }
}
