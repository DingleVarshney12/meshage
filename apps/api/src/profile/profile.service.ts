import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { DataSource } from "typeorm";

import { User } from "../database/entities/user.entity";
import { SupabaseStorageService } from "../infrastructure/supabase-storage.service";
import { UpdateProfileDto } from "./dto/update-profile.dto";

interface UploadedAvatarFile {
  buffer: Buffer;
  mimetype: string;
}

const AVATAR_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly storageService: SupabaseStorageService,
  ) {}

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    if (
      dto.displayName === undefined &&
      dto.bio === undefined &&
      dto.profileVisibility === undefined
    ) {
      throw new BadRequestException("Provide at least one profile field.");
    }

    const userRepository = this.dataSource.getRepository(User);
    const user = await userRepository.findOneBy({ id: userId });

    if (!user) {
      throw new NotFoundException("User not found.");
    }

    if (dto.displayName !== undefined) {
      user.displayName = dto.displayName;
    }

    if (dto.bio !== undefined) {
      user.bio = dto.bio;
    }

    if (dto.profileVisibility !== undefined) {
      user.profileVisibility = dto.profileVisibility;
    }

    const savedUser = await userRepository.save(user);
    return this.serializeUser(savedUser);
  }

  async uploadAvatar(userId: string, file: UploadedAvatarFile) {
    const extension = AVATAR_EXTENSIONS[file.mimetype];

    if (!extension) {
      throw new BadRequestException(
        "Avatar must be a JPEG, PNG, or WebP image.",
      );
    }

    const userRepository = this.dataSource.getRepository(User);
    const user = await userRepository.findOneBy({ id: userId });

    if (!user) {
      throw new NotFoundException("User not found.");
    }

    const previousStoragePath = user.avatarStoragePath ?? null;
    const storagePath = `profile-avatars/${userId}/${randomUUID()}.${extension}`;

    await this.storageService.uploadObject(
      storagePath,
      file.buffer,
      file.mimetype,
    );

    user.avatarStoragePath = storagePath;
    user.avatarUrl = null;

    try {
      const savedUser = await userRepository.save(user);

      if (previousStoragePath) {
        try {
          await this.storageService.deleteObject(previousStoragePath);
        } catch (error) {
          this.logger.warn(
            `Could not remove replaced avatar for user ${userId}.`,
            error instanceof Error ? error.message : undefined,
          );
        }
      }

      return this.serializeUser(savedUser);
    } catch (error) {
      try {
        await this.storageService.deleteObject(storagePath);
      } catch {
        this.logger.warn(
          `Could not clean up an unused avatar upload for user ${userId}.`,
        );
      }

      throw error;
    }
  }

  async removeAvatar(userId: string) {
    const userRepository = this.dataSource.getRepository(User);
    const user = await userRepository.findOneBy({ id: userId });

    if (!user) {
      throw new NotFoundException("User not found.");
    }

    const previousStoragePath = user.avatarStoragePath ?? null;

    user.avatarStoragePath = null;
    user.avatarUrl = null;

    const savedUser = await userRepository.save(user);

    if (previousStoragePath) {
      try {
        await this.storageService.deleteObject(previousStoragePath);
      } catch (error) {
        this.logger.warn(
          `Could not remove avatar for user ${userId}.`,
          error instanceof Error ? error.message : undefined,
        );
      }
    }

    return this.serializeUser(savedUser);
  }

  private async serializeUser(user: User) {
    const avatarUrl = user.avatarStoragePath
      ? await this.storageService.createSignedUrl(user.avatarStoragePath)
      : (user.avatarUrl ?? null);

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      bio: user.bio ?? null,
      avatarUrl,
      profileVisibility: user.profileVisibility,
    };
  }
}
