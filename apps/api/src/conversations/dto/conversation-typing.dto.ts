import { IsBoolean, IsUUID } from "class-validator";

export class ConversationTypingDto {
  @IsUUID()
  conversationId!: string;

  @IsBoolean()
  isTyping!: boolean;
}
