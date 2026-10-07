import "reflect-metadata";
import { jest } from "@jest/globals";
import type { DataSource } from "typeorm";
import { ConversationMember } from "../database/entities/conversation-member.entity";
import { Message } from "../database/entities/message.entity";
import { ConversationsService } from "./conversations.service";

describe("ConversationsService message reactions", () => {
  const userId = "user-1";
  const conversationId = "conversation-1";
  const messageId = "message-1";

  function createService(existingEmoji: string | null) {
    const existingReaction = existingEmoji
      ? { id: "reaction-1", messageId, userId, emoji: existingEmoji }
      : null;

    const membershipRepository = {
      findOne: jest.fn<(...args: any[]) => any>().mockResolvedValue({
        id: "membership-1",
        historyClearedAt: null,
      }),
    };
    const messageRepository = {
      findOne: jest.fn<(...args: any[]) => any>().mockResolvedValue({
        id: messageId,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      }),
    };
    const reactionRepository = {
      findOne: jest
        .fn<(...args: any[]) => any>()
        .mockResolvedValue(existingReaction),
      create: jest.fn<(...args: any[]) => any>((values) => values),
      save: jest
        .fn<(...args: any[]) => any>()
        .mockImplementation(async (reaction) => reaction),
      remove: jest
        .fn<(...args: any[]) => any>()
        .mockImplementation(async (reaction) => reaction),
      find: jest
        .fn<(...args: any[]) => any>()
        .mockImplementation(async () =>
          existingReaction ? [existingReaction] : [],
        ),
    };
    const manager = {
      getRepository: jest.fn<(...args: any[]) => any>((entity) => {
        if (entity === ConversationMember) return membershipRepository;
        if (entity === Message) return messageRepository;
        return reactionRepository;
      }),
    };
    const dataSource = {
      transaction: jest
        .fn<(...args: any[]) => any>()
        .mockImplementation((callback) => callback(manager)),
    };
    const gateway = { emitReactionUpdated: jest.fn<(...args: any[]) => any>() };
    const service = new ConversationsService(
      dataSource as unknown as DataSource,
      gateway as never,
      {} as never,
      {} as never,
      {} as never,
    );

    return { service, reactionRepository, existingReaction, gateway };
  }

  it("replaces the user's previous emoji when they choose another", async () => {
    const { service, reactionRepository, existingReaction } =
      createService("👍");

    const result = await service.toggleMessageReaction(
      userId,
      conversationId,
      messageId,
      "❤️",
    );

    expect(reactionRepository.findOne).toHaveBeenCalledWith({
      where: { messageId, userId },
    });
    expect(existingReaction).toMatchObject({ emoji: "❤️" });
    expect(reactionRepository.save).toHaveBeenCalledWith(existingReaction);
    expect(reactionRepository.remove).not.toHaveBeenCalled();
    expect(result.reactions).toEqual([
      { emoji: "❤️", count: 1, reactedByMe: true },
    ]);
  });

  it("removes the user's reaction when they choose the same emoji again", async () => {
    const { service, reactionRepository, existingReaction } =
      createService("👍");
    reactionRepository.find.mockResolvedValueOnce([]);

    const result = await service.toggleMessageReaction(
      userId,
      conversationId,
      messageId,
      "👍",
    );

    expect(reactionRepository.remove).toHaveBeenCalledWith(existingReaction);
    expect(reactionRepository.save).not.toHaveBeenCalled();
    expect(result.reactions).toEqual([]);
  });
});
