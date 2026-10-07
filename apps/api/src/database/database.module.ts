import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { User } from "./entities/user.entity";
import { AuthAccount } from "./entities/auth-account.entity";
import { RefreshToken } from "./entities/refresh-token.entity";
import { FriendRequest } from "./entities/friend-request.entity";
import { Friendship } from "./entities/friendship.entity";
import { Conversation } from "./entities/conversation.entity";
import { ConversationMember } from "./entities/conversation-member.entity";
import { Message } from "./entities/message.entity";
import { MessageAttachment } from "./entities/message-attachment.entity";
import { MessageReaction } from "./entities/message-reaction.entity";
import { AuthToken } from "./entities/auth-token.entity";
import { Notification } from "./entities/notification.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      AuthAccount,
      RefreshToken,
      FriendRequest,
      Friendship,
      Conversation,
      ConversationMember,
      Message,
      MessageAttachment,
      MessageReaction,
      AuthToken,
      Notification,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
