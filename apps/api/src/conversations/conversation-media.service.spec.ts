import "reflect-metadata";
import { jest } from "@jest/globals";

import { BadRequestException } from "@nestjs/common";
import type { DataSource } from "typeorm";
import { AttachmentType } from "../database/entities/message-attachment.entity";
import type { SupabaseStorageService } from "../infrastructure/supabase-storage.service";
import type { ConversationUploadFile } from "./conversation-media.service";
import { ConversationMediaService } from "./conversation-media.service";

describe("ConversationMediaService", () => {
  function createService(storageService: {
    uploadObject: jest.Mock;
    deleteObject: jest.Mock;
  }) {
    return new ConversationMediaService(
      {} as DataSource,
      storageService as unknown as SupabaseStorageService,
    );
  }

  function pngFile(originalname = "photo.png"): ConversationUploadFile {
    return {
      buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      mimetype: "image/png",
      originalname,
      size: 8,
    };
  }

  it("accepts an image with a valid signature and stores a safe attachment record", async () => {
    const storageService = {
      uploadObject: jest
        .fn<(...args: any[]) => any>()
        .mockResolvedValue(undefined),
      deleteObject: jest
        .fn<(...args: any[]) => any>()
        .mockResolvedValue(undefined),
    };
    const service = createService(storageService);

    const attachments = await service.uploadMedia("conversation-1", "user-1", [
      pngFile("family/photo.png"),
    ]);

    expect(storageService.uploadObject).toHaveBeenCalledTimes(1);
    expect(storageService.uploadObject).toHaveBeenCalledWith(
      expect.stringMatching(
        /^conversation-media\/conversation-1\/user-1\/[0-9a-f-]+\.png$/,
      ),
      expect.any(Buffer),
      "image/png",
    );
    expect(attachments).toEqual([
      expect.objectContaining({
        type: AttachmentType.IMAGE,
        originalName: "family_photo.png",
        mimeType: "image/png",
        sizeBytes: 8,
      }),
    ]);
  });

  it("rejects an image whose bytes do not match its declared MIME type", async () => {
    const storageService = {
      uploadObject: jest.fn<(...args: any[]) => any>(),
      deleteObject: jest.fn<(...args: any[]) => any>(),
    };
    const service = createService(storageService);

    await expect(
      service.uploadMedia("conversation-1", "user-1", [
        { ...pngFile(), buffer: Buffer.from("not a png") },
      ]),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storageService.uploadObject).not.toHaveBeenCalled();
  });

  it("rejects unsupported file types", async () => {
    const storageService = {
      uploadObject: jest.fn<(...args: any[]) => any>(),
      deleteObject: jest.fn<(...args: any[]) => any>(),
    };
    const service = createService(storageService);

    await expect(
      service.uploadMedia("conversation-1", "user-1", [
        {
          buffer: Buffer.from("executable"),
          mimetype: "application/x-msdownload",
          originalname: "app.exe",
          size: 10,
        },
      ]),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storageService.uploadObject).not.toHaveBeenCalled();
  });

  it("cleans up earlier uploads if a later attachment upload fails", async () => {
    const storageService = {
      uploadObject: jest
        .fn<(...args: any[]) => any>()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error("storage unavailable")),
      deleteObject: jest
        .fn<(...args: any[]) => any>()
        .mockResolvedValue(undefined),
    };
    const service = createService(storageService);
    const pdfFile: ConversationUploadFile = {
      buffer: Buffer.from("%PDF-"),
      mimetype: "application/pdf",
      originalname: "document.pdf",
      size: 5,
    };

    await expect(
      service.uploadMedia("conversation-1", "user-1", [pngFile(), pdfFile]),
    ).rejects.toThrow("storage unavailable");

    expect(storageService.uploadObject).toHaveBeenCalledTimes(2);
    expect(storageService.deleteObject).toHaveBeenCalledTimes(1);
    expect(storageService.deleteObject).toHaveBeenCalledWith(
      expect.stringMatching(/\.png$/),
    );
  });
});
