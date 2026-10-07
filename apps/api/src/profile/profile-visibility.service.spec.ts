import "reflect-metadata";
import { jest } from "@jest/globals";

import type { DataSource } from "typeorm";
import { ProfileVisibility, User } from "../database/entities/user.entity";
import type { SupabaseStorageService } from "../infrastructure/supabase-storage.service";
import { ProfileVisibilityService } from "./profile-visibility.service";

describe("ProfileVisibilityService", () => {
  it("shows public profiles, the viewer's profile, and private friends", async () => {
    const viewerId = "viewer-id";
    const users = [
      { id: viewerId, profileVisibility: ProfileVisibility.PRIVATE },
      { id: "public-id", profileVisibility: ProfileVisibility.PUBLIC },
      { id: "private-friend-id", profileVisibility: ProfileVisibility.PRIVATE },
      {
        id: "private-stranger-id",
        profileVisibility: ProfileVisibility.PRIVATE,
      },
    ];

    const userRepository = {
      find: jest.fn<(...args: any[]) => any>().mockResolvedValue(users),
    };
    const friendshipQuery = {
      select: jest.fn<(...args: any[]) => any>().mockReturnThis(),
      addSelect: jest.fn<(...args: any[]) => any>().mockReturnThis(),
      where: jest.fn<(...args: any[]) => any>().mockReturnThis(),
      getRawMany: jest
        .fn<(...args: any[]) => any>()
        .mockResolvedValue([
          { userAId: viewerId, userBId: "private-friend-id" },
        ]),
    };
    const friendshipRepository = {
      createQueryBuilder: jest
        .fn<(...args: any[]) => any>()
        .mockReturnValue(friendshipQuery),
    };
    const dataSource = {
      getRepository: jest.fn((entity: unknown) =>
        entity === User ? userRepository : friendshipRepository,
      ),
    } as unknown as DataSource;
    const storageService = {
      createSignedUrl: jest.fn<(...args: any[]) => any>(),
    } as unknown as SupabaseStorageService;
    const service = new ProfileVisibilityService(dataSource, storageService);

    const visibleIds = await service.getVisibleProfileUserIds(viewerId, [
      viewerId,
      "public-id",
      "private-friend-id",
      "private-stranger-id",
      "public-id",
    ]);

    expect([...visibleIds].sort()).toEqual(
      [viewerId, "public-id", "private-friend-id"].sort(),
    );
    expect(userRepository.find).toHaveBeenCalledTimes(1);
    expect(friendshipQuery.getRawMany).toHaveBeenCalledTimes(1);
  });

  it("masks private profile details from people who cannot see them", () => {
    const service = new ProfileVisibilityService(
      {} as DataSource,
      {} as SupabaseStorageService,
    );
    const profile = {
      id: "private-user",
      username: "quiet_user",
      displayName: "Private Name",
      avatarUrl: "https://example.test/avatar.png",
    };

    expect(service.serializeProfile(profile, new Set())).toEqual({
      ...profile,
      displayName: "quiet_user",
      avatarUrl: null,
    });
  });

  it("preserves profile details for visible users", () => {
    const service = new ProfileVisibilityService(
      {} as DataSource,
      {} as SupabaseStorageService,
    );
    const profile = {
      id: "friend-user",
      username: "friend_user",
      displayName: "Friend Name",
      avatarUrl: "https://example.test/avatar.png",
    };

    expect(service.serializeProfile(profile, new Set([profile.id]))).toEqual(
      profile,
    );
  });
});
