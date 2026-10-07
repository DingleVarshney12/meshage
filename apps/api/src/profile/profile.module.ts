import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { DatabaseModule } from "../database/database.module";
import { ProfileController } from "./profile.controller";
import { ProfileService } from "./profile.service";
import { ProfileVisibilityService } from "./profile-visibility.service";

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [ProfileController],
  providers: [ProfileService, ProfileVisibilityService],
  exports: [ProfileVisibilityService],
})
export class ProfileModule {}
