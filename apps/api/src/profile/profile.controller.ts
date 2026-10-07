import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  MaxFileSizeValidator,
  ParseFilePipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";

import {
  AuthenticatedUser,
  CurrentUser,
} from "../common/decorators/current-user.decorator";
import { AccessTokenGuard } from "../common/guards/auth-token.guard";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { ProfileService } from "./profile.service";
import { RateLimit } from "../common/decorators/rate-limit.decorator";

interface UploadedAvatarFile {
  buffer: Buffer;
  mimetype: string;
}

const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;

@Controller("profile")
@UseGuards(AccessTokenGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Patch("me")
  @RateLimit(20, 60 * 1000)
  updateMyProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.profileService.updateProfile(user.id, dto);
  }

  @Post("me/avatar")
  @RateLimit(10, 60 * 60 * 1000)
  @UseInterceptors(
    FileInterceptor("avatar", {
      limits: { fileSize: MAX_AVATAR_SIZE_BYTES },
    }),
  )
  uploadMyAvatar(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_AVATAR_SIZE_BYTES }),
          new FileTypeValidator({
            fileType: /^image\/(jpeg|png|webp)$/,
          }),
        ],
      }),
    )
    file: UploadedAvatarFile,
  ) {
    return this.profileService.uploadAvatar(user.id, file);
  }

  @Delete("me/avatar")
  @RateLimit(10, 60 * 60 * 1000)
  removeMyAvatar(@CurrentUser() user: AuthenticatedUser) {
    return this.profileService.removeAvatar(user.id);
  }
}
