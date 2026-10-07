import { applyDecorators, UseGuards } from "@nestjs/common";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";

export function RateLimit(limit: number, ttl: number) {
  return applyDecorators(
    Throttle({ default: { limit, ttl } }),
    UseGuards(ThrottlerGuard),
  );
}
