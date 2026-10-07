import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import { User } from "../database/entities/user.entity";
import { UpstashRedisService } from "../infrastructure/upstash-redis.service";

const PRESENCE_TTL_SECONDS = 60;

export interface UserPresence {
  userId: string;
  isOnline: boolean;
  lastSeenAt: string | null;
}

@Injectable()
export class PresenceService {
  private readonly localSockets = new Map<string, Set<string>>();

  constructor(
    private readonly redisService: UpstashRedisService,
    private readonly dataSource: DataSource,
  ) {}

  async addSocket(
    userId: string,
    socketId: string,
    connectedSocketIds: Set<string>,
  ) {
    const redis = this.redisService.client;

    if (!redis) {
      return this.addLocalSocket(userId, socketId, connectedSocketIds);
    }

    const key = this.getSocketSetKey(userId);
    const existingSocketIds = await redis.smembers(key);

    const staleSocketIds = existingSocketIds.filter(
      (existingSocketId) => !connectedSocketIds.has(existingSocketId),
    );

    if (staleSocketIds.length > 0) {
      await redis.srem(key, ...staleSocketIds);
    }

    const activeSocketCount = await redis.scard(key);

    await redis.sadd(key, socketId);
    await redis.expire(key, PRESENCE_TTL_SECONDS);

    return activeSocketCount === 0;
  }

  async refreshSocket(userId: string, socketId: string) {
    const redis = this.redisService.client;

    // Local memory presence does not need a Redis TTL refresh.
    if (!redis) {
      return;
    }

    const key = this.getSocketSetKey(userId);
    const isTracked = await redis.sismember(key, socketId);

    if (isTracked) {
      await redis.expire(key, PRESENCE_TTL_SECONDS);
    }
  }

  async removeSocket(userId: string, socketId: string) {
    const redis = this.redisService.client;

    if (!redis) {
      return this.removeLocalSocket(userId, socketId);
    }

    const key = this.getSocketSetKey(userId);

    await redis.srem(key, socketId);

    const remainingSocketCount = await redis.scard(key);

    if (remainingSocketCount > 0) {
      await redis.expire(key, PRESENCE_TTL_SECONDS);
      return false;
    }

    await redis.del(key);
    await this.updateLastSeen(userId);

    return true;
  }

  async getStatus(userId: string): Promise<UserPresence> {
    const redis = this.redisService.client;
    const isOnline = redis
      ? (await redis.scard(this.getSocketSetKey(userId))) > 0
      : (this.localSockets.get(userId)?.size ?? 0) > 0;

    const user = await this.dataSource.getRepository(User).findOne({
      where: { id: userId },
      select: { id: true, lastSeenAt: true },
    });

    return {
      userId,
      isOnline,
      lastSeenAt:
        !isOnline && user?.lastSeenAt ? user.lastSeenAt.toISOString() : null,
    };
  }

  private addLocalSocket(
    userId: string,
    socketId: string,
    connectedSocketIds: Set<string>,
  ) {
    let sockets = this.localSockets.get(userId);

    if (!sockets) {
      sockets = new Set<string>();
      this.localSockets.set(userId, sockets);
    }

    for (const existingSocketId of sockets) {
      if (!connectedSocketIds.has(existingSocketId)) {
        sockets.delete(existingSocketId);
      }
    }

    const wasOffline = sockets.size === 0;
    sockets.add(socketId);

    return wasOffline;
  }

  private async removeLocalSocket(userId: string, socketId: string) {
    const sockets = this.localSockets.get(userId);

    sockets?.delete(socketId);

    if (sockets && sockets.size > 0) {
      return false;
    }

    this.localSockets.delete(userId);
    await this.updateLastSeen(userId);

    return true;
  }

  private async updateLastSeen(userId: string) {
    await this.dataSource.getRepository(User).update(userId, {
      lastSeenAt: new Date(),
    });
  }

  private getSocketSetKey(userId: string) {
    return `presence:user:${userId}:sockets`;
  }
}
