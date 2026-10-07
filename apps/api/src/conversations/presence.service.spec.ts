import "reflect-metadata";

import type { DataSource } from "typeorm";
import { User } from "../database/entities/user.entity";
import type { UpstashRedisService } from "../infrastructure/upstash-redis.service";
import { PresenceService } from "./presence.service";

describe("PresenceService local fallback", () => {
  it("reports online until the user's final socket disconnects", async () => {
    const lastSeenAt = new Date("2026-01-02T03:04:05.000Z");
    const userRepository = {
      update: jest
        .fn<(...args: any[]) => any>()
        .mockResolvedValue({ affected: 1 }),
      findOne: jest
        .fn<(...args: any[]) => any>()
        .mockResolvedValue({ id: "user-1", lastSeenAt }),
    };
    const dataSource = {
      getRepository: jest
        .fn<(...args: any[]) => any>()
        .mockReturnValue(userRepository),
    } as unknown as DataSource;
    const redisService = { client: null } as unknown as UpstashRedisService;
    const service = new PresenceService(redisService, dataSource);
    const connectedSocketIds = new Set(["socket-1", "socket-2"]);

    await expect(
      service.addSocket("user-1", "socket-1", connectedSocketIds),
    ).resolves.toBe(true);
    await expect(
      service.addSocket("user-1", "socket-2", connectedSocketIds),
    ).resolves.toBe(false);
    await expect(service.getStatus("user-1")).resolves.toEqual({
      userId: "user-1",
      isOnline: true,
      lastSeenAt: null,
    });

    await expect(service.removeSocket("user-1", "socket-1")).resolves.toBe(
      false,
    );
    expect(userRepository.update).not.toHaveBeenCalled();

    await expect(service.removeSocket("user-1", "socket-2")).resolves.toBe(
      true,
    );
    expect(userRepository.update).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ lastSeenAt: expect.any(Date) }),
    );
    await expect(service.getStatus("user-1")).resolves.toEqual({
      userId: "user-1",
      isOnline: false,
      lastSeenAt: lastSeenAt.toISOString(),
    });
    expect(dataSource.getRepository).toHaveBeenCalledWith(User);
  });
});
import { jest } from "@jest/globals";
