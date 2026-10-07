"use client";

import Image from "next/image";
import { Download, FileText, Music2 } from "lucide-react";

import type { ConversationMessageAttachment } from "@/lib/api/conversations/conversations.types";
import VoiceMessagePlayer from "./voice-message-player";
interface MessageAttachmentContentProps {
  attachments: ConversationMessageAttachment[];
}

function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MessageAttachmentContent({
  attachments,
}: MessageAttachmentContentProps) {
  const images = attachments.filter(
    (attachment) => attachment.type === "image",
  );
  const otherAttachments = attachments.filter(
    (attachment) => attachment.type !== "image",
  );

  return (
    <div className="flex max-w-full flex-col gap-2">
      {images.length > 0 ? (
        <div
          className={[
            "overflow-hidden rounded-2xl border border-border/70 bg-neutral-950 shadow-sm",
            images.length === 1 ? "max-w-full" : "w-[min(78vw,24rem)]",
          ].join(" ")}
        >
          {images.length === 1 ? (
            <a
              href={images[0].url}
              target="_blank"
              rel="noreferrer"
              aria-label={`Open ${images[0].originalName}`}
              className="grid max-h-[min(65vh,32rem)] max-w-full place-items-center bg-neutral-950"
            >
              <Image
                src={images[0].url}
                alt={images[0].originalName}
                width={1200}
                height={900}
                unoptimized
                loading="lazy"
                className="block max-h-[min(65vh,32rem)] max-w-full object-contain"
              />
            </a>
          ) : (
            <div className="grid grid-cols-2 gap-0.5 bg-neutral-950">
              {images.map((attachment) => (
                <a
                  key={attachment.id}
                  href={attachment.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Open ${attachment.originalName}`}
                  className="grid aspect-square place-items-center overflow-hidden bg-neutral-950"
                >
                  <Image
                    src={attachment.url}
                    alt={attachment.originalName}
                    width={400}
                    height={400}
                    unoptimized
                    loading="lazy"
                    className="size-full object-contain"
                  />
                </a>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {otherAttachments.map((attachment) => {
        if (attachment.type === "video") {
          return (
            <div
              key={attachment.id}
              className="max-w-[min(78vw,32rem)] overflow-hidden rounded-2xl border bg-neutral-950 shadow-sm"
            >
              <video
                controls
                preload="metadata"
                className="max-h-[min(65vh,32rem)] w-full bg-neutral-950"
              >
                <source src={attachment.url} type={attachment.mimeType} />
                Your browser does not support video playback.
              </video>
              <p className="truncate px-3 py-2 text-xs text-white/80">
                {attachment.originalName}
              </p>
            </div>
          );
        }

        if (attachment.type === "audio") {
          return (
            <div
              key={attachment.id}
              className="flex w-full min-w-0 max-w-[min(78vw,24rem)] items-center gap-2 rounded-2xl border bg-card p-2 sm:gap-3 sm:p-3"
            >
              <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <Music2 className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">
                  {attachment.originalName}
                </p>
                {attachment.waveform?.length === 48 ? (
                  <VoiceMessagePlayer
                    src={attachment.url}
                    waveform={attachment.waveform}
                  />
                ) : (
                  <audio
                    controls
                    preload="metadata"
                    className="mt-2 h-9 w-full"
                  >
                    <source src={attachment.url} type={attachment.mimeType} />
                    Your browser does not support audio playback.
                  </audio>
                )}
              </div>
            </div>
          );
        }

        return (
          <a
            key={attachment.id}
            href={attachment.url}
            target="_blank"
            rel="noreferrer"
            className="flex max-w-[min(78vw,24rem)] items-center gap-3 rounded-2xl border bg-card p-3 transition-colors hover:bg-muted/70"
          >
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <FileText className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {attachment.originalName}
              </p>
              <p className="text-xs text-muted-foreground">
                PDF · {formatFileSize(attachment.sizeBytes)}
              </p>
            </div>
            <Download className="size-4 shrink-0 text-muted-foreground" />
          </a>
        );
      })}
    </div>
  );
}
