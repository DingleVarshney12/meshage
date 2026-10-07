"use client";

import Image from "next/image";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getAttachmentIcon } from "@/lib/utils/attachment-icon";

export interface SelectedConversationAttachment {
  file: File;
  previewUrl?: string;
}

interface MessageAttachmentPreviewProps {
  attachments: SelectedConversationAttachment[];
  onRemove: (file: File) => void;
}

export default function MessageAttachmentPreview({
  attachments,
  onRemove,
}: MessageAttachmentPreviewProps) {
  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className="mx-auto mb-3 flex max-w-4xl flex-wrap gap-2">
      {attachments.map(({ file, previewUrl }) => {
        const FileIcon = getAttachmentIcon(file.type);

        return (
          <div
            key={`${file.name}-${file.lastModified}`}
            className="relative flex h-16 max-w-56 items-center gap-2 overflow-hidden rounded-xl border bg-card pr-8"
          >
            {previewUrl ? (
              <Image
                src={previewUrl}
                alt={file.name}
                width={64}
                height={64}
                unoptimized
                className="size-16 shrink-0 bg-neutral-950 object-contain"
              />
            ) : (
              <div className="grid size-16 shrink-0 place-items-center bg-muted text-muted-foreground">
                <FileIcon className="size-6" />
              </div>
            )}

            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{file.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {(file.size / (1024 * 1024)).toFixed(1)} MB
              </p>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Remove ${file.name}`}
              onClick={() => onRemove(file)}
              className="absolute right-1 top-1 size-6"
            >
              <X className="size-3.5" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
