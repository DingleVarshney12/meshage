import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { DatabaseModule } from "../database/database.module";
import { FriendsController } from "./friends.controller";
import { FriendsService } from "./friends.service";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [DatabaseModule, AuthModule, NotificationsModule],
  controllers: [FriendsController],
  providers: [FriendsService],
})
export class FriendsModule {}
