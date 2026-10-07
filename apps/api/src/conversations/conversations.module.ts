import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { DatabaseModule } from "../database/database.module";
import { ProfileModule } from "../profile/profile.module";
import { ConversationsController } from "./conversations.controller";
import { ConversationsGateway } from "./conversations.gateway";
import { ConversationsService } from "./conversations.service";
import { PresenceService } from "./presence.service";
import { ConversationMediaService } from "./conversation-media.service";
import { GroupAvatarService } from "./group-avatar.service";
@Module({
  imports: [DatabaseModule, AuthModule, ProfileModule],
  controllers: [ConversationsController],
  providers: [
    ConversationsService,
    ConversationsGateway,
    PresenceService,
    ConversationMediaService,
    GroupAvatarService,
  ],
  exports: [ConversationsGateway],
})
export class ConversationsModule {}
