import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  FileTypeValidator,
  MaxFileSizeValidator,
  ParseFilePipe,
  UploadedFile,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { GroupAvatarFile, GroupAvatarService } from "./group-avatar.service";
import {
  AuthenticatedUser,
  CurrentUser,
} from "../common/decorators/current-user.decorator";
import { AccessTokenGuard } from "../common/guards/auth-token.guard";
import { CreateDirectConversationDto } from "./dto/create-direct-conversation.dto";
import { CreateMessageDto } from "./dto/create-message.dto";
import { GetMessagesQueryDto } from "./dto/get-messages-query.dto";
import { CreateGroupConversationDto } from "./dto/create-group-conversation.dto";
import { ConversationsService } from "./conversations.service";
import { UpdateGroupSettingsDto } from "./dto/update-group-settings.dto";
import { AddGroupMembersDto } from "./dto/add-group-members.dto";
import { ToggleMessageReactionDto } from "./dto/toggle-message-reaction.dto";
import { FilesInterceptor } from "@nestjs/platform-express";
import {
  ConversationUploadFile,
  MAX_UPLOAD_SIZE_BYTES,
  MAX_ATTACHMENTS_PER_MESSAGE,
} from "./conversation-media.service";
import { UpdateMessageDto } from "./dto/update-message.dto";
import { SearchMessagesQueryDto } from "./dto/search-messages-query.dto";
import { RateLimit } from "../common/decorators/rate-limit.decorator";

@Controller("conversations")
@UseGuards(AccessTokenGuard)
export class ConversationsController {
  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly groupAvatarService: GroupAvatarService,
  ) {}

  @Post("world/join")
  @RateLimit(5, 60 * 60 * 1000)
  joinWorldChat(@CurrentUser() user: AuthenticatedUser) {
    return this.conversationsService.joinWorldChat(user.id);
  }

  @Get()
  listForCurrentUser(@CurrentUser() user: AuthenticatedUser) {
    return this.conversationsService.listForUser(user.id);
  }
  @Post(":conversationId/read")
  markConversationAsRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId", ParseUUIDPipe) conversationId: string,
  ) {
    return this.conversationsService.markConversationAsRead(
      user.id,
      conversationId,
    );
  }

  @Post("direct")
  @RateLimit(10, 60 * 1000)
  createDirectConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDirectConversationDto,
  ) {
    return this.conversationsService.createDirectConversation(user.id, dto);
  }

  @Get(":conversationId/messages")
  getMessages(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId", ParseUUIDPipe) conversationId: string,
    @Query() query: GetMessagesQueryDto,
  ) {
    return this.conversationsService.getMessages(
      user.id,
      conversationId,
      query,
    );
  }

  @Get(":conversationId/messages/search")
  @RateLimit(30, 60 * 1000)
  searchMessages(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId", ParseUUIDPipe) conversationId: string,
    @Query() query: SearchMessagesQueryDto,
  ) {
    return this.conversationsService.searchMessages(
      user.id,
      conversationId,
      query.q,
    );
  }

  @Get(":conversationId/messages/:messageId/context")
  getMessageContext(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId", ParseUUIDPipe) conversationId: string,
    @Param("messageId", ParseUUIDPipe) messageId: string,
  ) {
    return this.conversationsService.getMessageContext(
      user.id,
      conversationId,
      messageId,
    );
  }

  @Post(":conversationId/messages")
  @RateLimit(30, 60 * 1000)
  @UseInterceptors(
    FilesInterceptor("attachments", MAX_ATTACHMENTS_PER_MESSAGE, {
      limits: { fileSize: MAX_UPLOAD_SIZE_BYTES },
    }),
  )
  sendMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId", ParseUUIDPipe) conversationId: string,
    @Body() dto: CreateMessageDto,
    @UploadedFiles() files: ConversationUploadFile[],
  ) {
    return this.conversationsService.sendMessage(
      user.id,
      conversationId,
      dto,
      files ?? [],
    );
  }
  @Post("group")
  @RateLimit(5, 60 * 60 * 1000)
  createGroupConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateGroupConversationDto,
  ) {
    return this.conversationsService.createGroupConversation(user.id, dto);
  }
  @Patch(":conversationId/group-settings")
  @RateLimit(20, 60 * 1000)
  updateGroupSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId", ParseUUIDPipe) conversationId: string,
    @Body() dto: UpdateGroupSettingsDto,
  ) {
    return this.conversationsService.updateGroupSettings(
      user.id,
      conversationId,
      dto,
    );
  }
  @Post(":conversationId/group-avatar")
  @RateLimit(10, 60 * 60 * 1000)
  @UseInterceptors(
    FileInterceptor("avatar", {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadGroupAvatar(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId", ParseUUIDPipe) conversationId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({
            fileType: /^image\/(jpeg|png|webp)$/,
          }),
        ],
      }),
    )
    file: GroupAvatarFile,
  ) {
    return this.groupAvatarService.upload(user.id, conversationId, file);
  }

  @Delete(":conversationId/group-avatar")
  removeGroupAvatar(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId", ParseUUIDPipe) conversationId: string,
  ) {
    return this.groupAvatarService.remove(user.id, conversationId);
  }
  @Post(":conversationId/members")
  @RateLimit(10, 60 * 60 * 1000)
  addGroupMembers(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId", ParseUUIDPipe) conversationId: string,
    @Body() dto: AddGroupMembersDto,
  ) {
    return this.conversationsService.addGroupMembers(
      user.id,
      conversationId,
      dto,
    );
  }
  @Delete(":conversationId/members/:memberId")
  removeGroupMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId", ParseUUIDPipe) conversationId: string,
    @Param("memberId", ParseUUIDPipe) memberId: string,
  ) {
    return this.conversationsService.removeGroupMember(
      user.id,
      conversationId,
      memberId,
    );
  }

  @Post(":conversationId/leave")
  leaveGroup(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId", ParseUUIDPipe) conversationId: string,
  ) {
    return this.conversationsService.leaveGroup(user.id, conversationId);
  }
  @Delete(":conversationId/history")
  clearConversationHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId", ParseUUIDPipe) conversationId: string,
  ) {
    return this.conversationsService.clearConversationHistory(
      user.id,
      conversationId,
    );
  }
  @Delete(":conversationId/everyone")
  deleteGroupForEveryone(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId", ParseUUIDPipe) conversationId: string,
  ) {
    return this.conversationsService.deleteGroupForEveryone(
      user.id,
      conversationId,
    );
  }
  @Delete(":conversationId")
  deleteConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId", ParseUUIDPipe) conversationId: string,
  ) {
    return this.conversationsService.deleteConversation(
      user.id,
      conversationId,
    );
  }
  @Post(":conversationId/messages/:messageId/reactions")
  @RateLimit(60, 60 * 1000)
  toggleMessageReaction(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId", ParseUUIDPipe) conversationId: string,
    @Param("messageId", ParseUUIDPipe) messageId: string,
    @Body() dto: ToggleMessageReactionDto,
  ) {
    return this.conversationsService.toggleMessageReaction(
      user.id,
      conversationId,
      messageId,
      dto.emoji,
    );
  }
  @Patch(":conversationId/messages/:messageId")
  @RateLimit(20, 60 * 1000)
  updateMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId", ParseUUIDPipe) conversationId: string,
    @Param("messageId", ParseUUIDPipe) messageId: string,
    @Body() dto: UpdateMessageDto,
  ) {
    return this.conversationsService.updateMessage(
      user.id,
      conversationId,
      messageId,
      dto,
    );
  }

  @Delete(":conversationId/messages/:messageId")
  @RateLimit(20, 60 * 1000)
  deleteMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param("conversationId", ParseUUIDPipe) conversationId: string,
    @Param("messageId", ParseUUIDPipe) messageId: string,
  ) {
    return this.conversationsService.deleteMessage(
      user.id,
      conversationId,
      messageId,
    );
  }
}
