import "reflect-metadata";
import { jest } from "@jest/globals";

import type { DataSource } from "typeorm";
import {
  FriendRequest,
  FriendRequestStatus,
} from "../database/entities/friend-request.entity";
import { ProfileVisibility, User } from "../database/entities/user.entity";
import type { SupabaseStorageService } from "../infrastructure/supabase-storage.service";
import { FriendsService } from "./friends.service";

describe("FriendsService private-profile serialization", () => {
  it("masks a private sender's details from an unrelated request recipient", async () => {
    const privateSender = {
      id: "sender-id",
      username: "private_sender",
      displayName: "Hidden Name",
      avatarUrl: "https://example.test/hidden.png",
      avatarStoragePath: null,
      profileVisibility: ProfileVisibility.PRIVATE,
    } as User;
    const viewer = {
      id: "viewer-id",
      username: "viewer",
      displayName: "Viewer Name",
      avatarUrl: null,
      avatarStoragePath: null,
      profileVisibility: ProfileVisibility.PUBLIC,
    } as User;
    const request = {
      id: "request-id",
      senderId: privateSender.id,
      receiverId: viewer.id,
      sender: privateSender,
      receiver: viewer,
      status: FriendRequestStatus.PENDING,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    } as FriendRequest;
    const friendshipQuery = {
      select: jest.fn<(...args: any[]) => any>().mockReturnThis(),
      addSelect: jest.fn<(...args: any[]) => any>().mockReturnThis(),
      where: jest.fn<(...args: any[]) => any>().mockReturnThis(),
      getRawMany: jest.fn<(...args: any[]) => any>().mockResolvedValue([]),
    };
    const requestRepository = {
      find: jest.fn<(...args: any[]) => any>().mockResolvedValue([request]),
    };
    const friendshipRepository = {
      createQueryBuilder: jest
        .fn<(...args: any[]) => any>()
        .mockReturnValue(friendshipQuery),
    };
    const dataSource = {
      getRepository: jest.fn((entity: unknown) =>
        entity === FriendRequest ? requestRepository : friendshipRepository,
      ),
    } as unknown as DataSource;
    const storageService = {
      createSignedUrl: jest.fn<(...args: any[]) => any>(),
    } as unknown as SupabaseStorageService;
    const notificationsService = {
      createInTransaction: jest.fn(),
      emitCreated: jest.fn(),
      emitFriendsChanged: jest.fn(),
    };
    const service = new FriendsService(
      dataSource,
      storageService,
      notificationsService as never,
    );

    const [serialized] = await service.listIncomingRequests(viewer.id);

    expect(serialized.sender).toEqual({
      id: privateSender.id,
      username: privateSender.username,
      displayName: privateSender.username,
      avatarUrl: null,
    });
    expect(serialized.receiver).toEqual({
      id: viewer.id,
      username: viewer.username,
      displayName: viewer.displayName,
      avatarUrl: null,
    });
    expect(storageService.createSignedUrl).not.toHaveBeenCalled();
  });
});
