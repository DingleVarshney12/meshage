import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DataSource } from "typeorm";
import {
  FriendRequest,
  FriendRequestStatus,
} from "../database/entities/friend-request.entity";
import { Friendship } from "../database/entities/friendship.entity";
import { ProfileVisibility, User } from "../database/entities/user.entity";
import { RespondFriendRequestDto } from "./dto/respond-friend-request.dto";
import { SearchUsersDto } from "./dto/search-users.dto";
import { SendFriendRequestDto } from "./dto/send-friend-request.dto";
import { SupabaseStorageService } from "../infrastructure/supabase-storage.service";
import {
  NotificationsService,
  type SerializedNotification,
} from "../notifications/notifications.service";
import { NotificationType } from "../database/entities/notification.entity";

@Injectable()
export class FriendsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly storageService: SupabaseStorageService,
    private readonly notificationsService: NotificationsService,
  ) {}
  async searchUsers(currentUserId: string, dto: SearchUsersDto) {
    const users = await this.dataSource
      .getRepository(User)
      .createQueryBuilder("user")
      .select([
        "user.id",
        "user.username",
        "user.displayName",
        "user.avatarUrl",
        "user.avatarStoragePath",
      ])
      .where("user.id <> :currentUserId", { currentUserId })
      .andWhere("user.profileVisibility = :visibility", {
        visibility: ProfileVisibility.PUBLIC,
      })
      .andWhere("user.username ILIKE :query", {
        query: `${dto.query}%`,
      })
      .orderBy("user.username", "ASC")
      .take(20)
      .getMany();

    return Promise.all(users.map((user) => this.serializeProfile(user, true)));
  }

  async sendRequest(senderId: string, dto: SendFriendRequestDto) {
    // Username se exact request bhejna allowed hai, including private profiles.
    const receiver = await this.dataSource
      .getRepository(User)
      .findOneBy({ username: dto.username });

    if (!receiver) {
      throw new NotFoundException("User not found.");
    }

    if (receiver.id === senderId) {
      throw new ConflictException("You cannot send a request to yourself.");
    }

    const notifications: SerializedNotification[] = [];
    let changedUserIds: string[] = [];
    const result = await this.dataSource.transaction(async (manager) => {
      const users = manager.getRepository(User);
      const requests = manager.getRepository(FriendRequest);
      const friendships = manager.getRepository(Friendship);

      const [firstUserId, secondUserId] = [senderId, receiver.id].sort();

      for (const userId of [firstUserId, secondUserId]) {
        const lockedUser = await users.findOne({
          where: { id: userId },
          lock: { mode: "pessimistic_write" },
        });

        if (!lockedUser) {
          throw new NotFoundException("User not found.");
        }
      }

      const pair = this.getFriendshipPair(senderId, receiver.id);
      const existingFriendship = await friendships.findOneBy(pair);

      if (existingFriendship) {
        throw new ConflictException("You are already friends.");
      }

      const outgoingRequest = await requests.findOne({
        where: {
          senderId,
          receiverId: receiver.id,
          status: FriendRequestStatus.PENDING,
        },
      });

      if (outgoingRequest) {
        throw new ConflictException("Friend request is already pending.");
      }

      const incomingRequest = await requests.findOne({
        where: {
          senderId: receiver.id,
          receiverId: senderId,
          status: FriendRequestStatus.PENDING,
        },
        lock: { mode: "pessimistic_write" },
      });

      const now = new Date();

      if (incomingRequest) {
        incomingRequest.status = FriendRequestStatus.ACCEPTED;
        incomingRequest.respondedAt = now;
        await requests.save(incomingRequest);

        await friendships.save(friendships.create(pair));

        notifications.push(
          await this.notificationsService.createInTransaction(manager, {
            recipientId: incomingRequest.senderId,
            actorId: senderId,
            type: NotificationType.FRIEND_REQUEST_ACCEPTED,
          }),
        );
        changedUserIds = [senderId, receiver.id];

        return { message: "Friend request accepted. You are now friends." };
      }

      const request = await requests.save(
        requests.create({
          senderId,
          receiverId: receiver.id,
          status: FriendRequestStatus.PENDING,
        }),
      );

      notifications.push(
        await this.notificationsService.createInTransaction(manager, {
          recipientId: receiver.id,
          actorId: senderId,
          type: NotificationType.FRIEND_REQUEST_RECEIVED,
          data: { requestId: request.id },
        }),
      );
      changedUserIds = [senderId, receiver.id];

      return {
        message: "Friend request sent.",
        requestId: request.id,
      };
    });

    notifications.forEach((notification) =>
      this.notificationsService.emitCreated(notification),
    );
    this.notificationsService.emitFriendsChanged(changedUserIds);
    return result;
  }

  async listIncomingRequests(userId: string) {
    const requests = await this.dataSource.getRepository(FriendRequest).find({
      where: {
        receiverId: userId,
        status: FriendRequestStatus.PENDING,
      },
      relations: { sender: true, receiver: true },
      order: { createdAt: "DESC" },
    });

    return this.serializeRequests(requests, userId);
  }

  async listOutgoingRequests(userId: string) {
    const requests = await this.dataSource.getRepository(FriendRequest).find({
      where: {
        senderId: userId,
        status: FriendRequestStatus.PENDING,
      },
      relations: { sender: true, receiver: true },
      order: { createdAt: "DESC" },
    });

    return this.serializeRequests(requests, userId);
  }

  async respondToRequest(
    receiverId: string,
    requestId: string,
    dto: RespondFriendRequestDto,
  ) {
    let notification: SerializedNotification | null = null;
    let changedUserIds: string[] = [];
    const result = await this.dataSource.transaction(async (manager) => {
      const requests = manager.getRepository(FriendRequest);

      const request = await requests.findOne({
        where: { id: requestId },
        lock: { mode: "pessimistic_write" },
      });

      if (!request) {
        throw new NotFoundException("Friend request not found.");
      }

      if (request.receiverId !== receiverId) {
        throw new ForbiddenException("You cannot respond to this request.");
      }

      if (request.status !== FriendRequestStatus.PENDING) {
        throw new ConflictException("This request is no longer pending.");
      }

      const now = new Date();
      request.respondedAt = now;

      if (dto.decision === "reject") {
        request.status = FriendRequestStatus.REJECTED;
        await requests.save(request);
        notification = await this.notificationsService.createInTransaction(
          manager,
          {
            recipientId: request.senderId,
            actorId: receiverId,
            type: NotificationType.FRIEND_REQUEST_REJECTED,
          },
        );
        changedUserIds = [receiverId, request.senderId];
        return { message: "Friend request rejected." };
      }

      request.status = FriendRequestStatus.ACCEPTED;
      await requests.save(request);

      const friendships = manager.getRepository(Friendship);
      const pair = this.getFriendshipPair(request.senderId, receiverId);

      if (!(await friendships.findOneBy(pair))) {
        await friendships.save(friendships.create(pair));
      }

      notification = await this.notificationsService.createInTransaction(
        manager,
        {
          recipientId: request.senderId,
          actorId: receiverId,
          type: NotificationType.FRIEND_REQUEST_ACCEPTED,
        },
      );
      changedUserIds = [receiverId, request.senderId];

      return { message: "Friend request accepted." };
    });

    if (notification) this.notificationsService.emitCreated(notification);
    this.notificationsService.emitFriendsChanged(changedUserIds);
    return result;
  }

  async cancelRequest(senderId: string, requestId: string) {
    const receiverId = await this.dataSource.transaction(async (manager) => {
      const requests = manager.getRepository(FriendRequest);
      const request = await requests.findOne({
        where: { id: requestId },
        lock: { mode: "pessimistic_write" },
      });

      if (!request) throw new NotFoundException("Friend request not found.");
      if (request.senderId !== senderId) {
        throw new ForbiddenException("You cannot cancel this request.");
      }
      if (request.status !== FriendRequestStatus.PENDING) {
        throw new ConflictException("This request is no longer pending.");
      }

      request.status = FriendRequestStatus.CANCELLED;
      request.respondedAt = new Date();
      await requests.save(request);
      return request.receiverId;
    });

    this.notificationsService.emitFriendsChanged([senderId, receiverId]);
    return { message: "Friend request cancelled." };
  }

  async listFriends(userId: string) {
    const friendships = await this.dataSource
      .getRepository(Friendship)
      .createQueryBuilder("friendship")
      .leftJoinAndSelect("friendship.userA", "userA")
      .leftJoinAndSelect("friendship.userB", "userB")
      .where("friendship.userAId = :userId", { userId })
      .orWhere("friendship.userBId = :userId", { userId })
      .orderBy("friendship.createdAt", "DESC")
      .getMany();

    // Accepted friends are allowed to see each other's full profile details.
    return Promise.all(
      friendships.map(async (friendship) => {
        const friend =
          friendship.userAId === userId ? friendship.userB : friendship.userA;

        return {
          ...(await this.serializeProfile(friend, true)),
          friendsSince: friendship.createdAt,
        };
      }),
    );
  }

  async removeFriend(userId: string, friendUserId: string) {
    const pair = this.getFriendshipPair(userId, friendUserId);
    const result = await this.dataSource.getRepository(Friendship).delete(pair);

    if (!result.affected) {
      throw new NotFoundException("Friendship not found.");
    }

    this.notificationsService.emitFriendsChanged([userId, friendUserId]);

    return { message: "Friend removed." };
  }

  private async serializeRequests(requests: FriendRequest[], viewerId: string) {
    if (requests.length === 0) {
      return [];
    }

    const otherUserIds = [
      ...new Set(
        requests.flatMap((request) =>
          [request.senderId, request.receiverId].filter(
            (userId) => userId !== viewerId,
          ),
        ),
      ),
    ];

    const friendIds = new Set<string>();

    if (otherUserIds.length > 0) {
      const friendships = await this.dataSource
        .getRepository(Friendship)
        .createQueryBuilder("friendship")
        .select("friendship.userAId", "userAId")
        .addSelect("friendship.userBId", "userBId")
        .where(
          `(
            friendship.userAId = :viewerId
            AND friendship.userBId IN (:...otherUserIds)
          ) OR (
            friendship.userBId = :viewerId
            AND friendship.userAId IN (:...otherUserIds)
          )`,
          { viewerId, otherUserIds },
        )
        .getRawMany<{ userAId: string; userBId: string }>();

      for (const friendship of friendships) {
        friendIds.add(
          friendship.userAId === viewerId
            ? friendship.userBId
            : friendship.userAId,
        );
      }
    }

    return Promise.all(
      requests.map(async (request) => {
        const [sender, receiver] = await Promise.all([
          this.serializeProfile(
            request.sender,
            request.senderId === viewerId || friendIds.has(request.senderId),
          ),
          this.serializeProfile(
            request.receiver,
            request.receiverId === viewerId ||
              friendIds.has(request.receiverId),
          ),
        ]);

        return {
          id: request.id,
          status: request.status,
          createdAt: request.createdAt,
          sender,
          receiver,
        };
      }),
    );
  }

  private async serializeProfile(user: User, canSeePrivateProfile: boolean) {
    const canSeeDetails =
      canSeePrivateProfile ||
      user.profileVisibility === ProfileVisibility.PUBLIC;

    let avatarUrl: string | null = null;

    if (canSeeDetails) {
      avatarUrl = user.avatarStoragePath
        ? await this.storageService.createSignedUrl(user.avatarStoragePath)
        : (user.avatarUrl ?? null);
    }

    return {
      id: user.id,
      username: user.username,
      displayName: canSeeDetails ? user.displayName : user.username,
      avatarUrl,
    };
  }

  private getFriendshipPair(firstUserId: string, secondUserId: string) {
    return firstUserId < secondUserId
      ? { userAId: firstUserId, userBId: secondUserId }
      : { userAId: secondUserId, userBId: firstUserId };
  }
}
