import { Injectable } from "@nestjs/common";
import { DataSource, In } from "typeorm";

import { Friendship } from "../database/entities/friendship.entity";
import { ProfileVisibility, User } from "../database/entities/user.entity";
import { SupabaseStorageService } from "../infrastructure/supabase-storage.service";

export interface ProfileSummary {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
}

@Injectable()
export class ProfileVisibilityService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly storageService: SupabaseStorageService,
  ) {}

  async getVisibleProfileUserIds(
    viewerId: string,
    profileUserIds: string[],
  ): Promise<Set<string>> {
    const uniqueUserIds = [...new Set(profileUserIds)];

    if (uniqueUserIds.length === 0) {
      return new Set<string>();
    }

    const users = await this.dataSource.getRepository(User).find({
      where: { id: In(uniqueUserIds) },
      select: {
        id: true,
        profileVisibility: true,
      },
    });

    const visibleUserIds = new Set(
      users
        .filter(
          (user) =>
            user.id === viewerId ||
            user.profileVisibility === ProfileVisibility.PUBLIC,
        )
        .map((user) => user.id),
    );

    const privateUserIds = users
      .filter(
        (user) =>
          user.id !== viewerId &&
          user.profileVisibility === ProfileVisibility.PRIVATE,
      )
      .map((user) => user.id);

    if (privateUserIds.length === 0) {
      return visibleUserIds;
    }

    const friendships = await this.dataSource
      .getRepository(Friendship)
      .createQueryBuilder("friendship")
      .select("friendship.userAId", "userAId")
      .addSelect("friendship.userBId", "userBId")
      .where(
        `(
          friendship.userAId = :viewerId
          AND friendship.userBId IN (:...privateUserIds)
        ) OR (
          friendship.userBId = :viewerId
          AND friendship.userAId IN (:...privateUserIds)
        )`,
        { viewerId, privateUserIds },
      )
      .getRawMany<{ userAId: string; userBId: string }>();

    for (const friendship of friendships) {
      visibleUserIds.add(
        friendship.userAId === viewerId
          ? friendship.userBId
          : friendship.userAId,
      );
    }

    return visibleUserIds;
  }

  async getAvatarUrls(
    profileUserIds: string[],
  ): Promise<Map<string, string | null>> {
    const uniqueUserIds = [...new Set(profileUserIds)];

    if (uniqueUserIds.length === 0) {
      return new Map<string, string | null>();
    }

    const users = await this.dataSource.getRepository(User).find({
      where: { id: In(uniqueUserIds) },
      select: {
        id: true,
        avatarUrl: true,
        avatarStoragePath: true,
      },
    });

    const entries = await Promise.all(
      users.map(async (user) => {
        const avatarUrl = user.avatarStoragePath
          ? await this.storageService.createSignedUrl(user.avatarStoragePath)
          : (user.avatarUrl ?? null);

        return [user.id, avatarUrl] as const;
      }),
    );

    return new Map(entries);
  }

  serializeProfile<T extends ProfileSummary>(
    profile: T | null | undefined,
    visibleUserIds: ReadonlySet<string>,
  ): T | null {
    if (!profile) {
      return null;
    }

    if (visibleUserIds.has(profile.id)) {
      return { ...profile };
    }

    return {
      ...profile,
      displayName: profile.username,
      avatarUrl: null,
    };
  }
}
