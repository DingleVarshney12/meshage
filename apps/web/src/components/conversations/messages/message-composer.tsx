"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type SubmitEvent,
} from "react";
import { LoaderCircle, Paperclip, Reply, Send, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import VoiceMessageRecorder from "./voice-message-recorder";
import type { ConversationMessage } from "@/lib/api/conversations/conversations.types";
import MessageAttachmentPreview, {
  type SelectedConversationAttachment,
} from "./message-attachment-preview";

interface MessageComposerProps {
  isSending: boolean;
  replyTo: ConversationMessage | null;
  onSend: (
    body: string,
    replyToMessageId?: string,
    attachments?: File[],
    audioWaveform?: number[],
  ) => Promise<void>;
  onTyping: (isTyping: boolean) => void;
  onCancelReply: () => void;
}

type SelectedAttachment = SelectedConversationAttachment;

const TYPING_IDLE_DELAY = 2500;
const TYPING_REFRESH_INTERVAL = 1000;
const MAX_ATTACHMENTS_PER_MESSAGE = 5;
const MB = 1024 * 1024;

const MAX_SIZE_BY_TYPE: Record<string, number> = {
  "image/jpeg": 5 * MB,
  "image/png": 5 * MB,
  "image/webp": 5 * MB,
  "video/mp4": 25 * MB,
  "video/webm": 25 * MB,
  "audio/mpeg": 10 * MB,
  "audio/mp4": 10 * MB,
  "audio/wav": 10 * MB,
  "audio/ogg": 10 * MB,
  "audio/webm": 10 * MB,
  "application/pdf": 10 * MB,
};

export default function MessageComposer({
  isSending,
  replyTo,
  onSend,
  onTyping,
  onCancelReply,
}: MessageComposerProps) {
  const [body, setBody] = useState("");
  const [selectedAttachments, setSelectedAttachments] = useState<
    SelectedAttachment[]
  >([]);
  const previewUrlsRef = useRef(new Set<string>());
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const lastTypingEventAtRef = useRef(0);

  useEffect(() => {
    const previewUrls = previewUrlsRef.current;
    return () => {
      for (const previewUrl of previewUrls) {
        URL.revokeObjectURL(previewUrl);
      }

      previewUrls.clear();
      clearTypingTimeout();
    };
  }, []);

  function clearTypingTimeout() {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }

  function stopTyping() {
    clearTypingTimeout();

    if (isTypingRef.current) {
      isTypingRef.current = false;
      lastTypingEventAtRef.current = 0;
      onTyping(false);
    }
  }

  function handleBodyChange(value: string) {
    setBody(value);

    if (!value.trim()) {
      stopTyping();
      return;
    }

    const now = Date.now();
    const shouldRefreshTyping =
      !isTypingRef.current ||
      now - lastTypingEventAtRef.current >= TYPING_REFRESH_INTERVAL;

    if (shouldRefreshTyping) {
      isTypingRef.current = true;
      lastTypingEventAtRef.current = now;
      onTyping(true);
    }

    clearTypingTimeout();

    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      lastTypingEventAtRef.current = 0;
      typingTimeoutRef.current = null;
      onTyping(false);
    }, TYPING_IDLE_DELAY);
  }

  function handleAttachmentSelection(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    setAttachmentError(null);

    if (
      selectedAttachments.length + files.length >
      MAX_ATTACHMENTS_PER_MESSAGE
    ) {
      setAttachmentError("You can attach up to 5 files to one message.");
      return;
    }

    for (const file of files) {
      const maxSize = MAX_SIZE_BY_TYPE[file.type];

      if (!maxSize) {
        setAttachmentError(
          "Supported files: JPEG, PNG, WebP, MP4, WebM, MP3, M4A, WAV, OGG, and PDF.",
        );
        return;
      }

      if (file.size > maxSize) {
        setAttachmentError(
          `${file.name} is too large. The limit is ${Math.floor(maxSize / MB)} MB.`,
        );
        return;
      }
    }

    const nextAttachments = files.map((file) => {
      if (!file.type.startsWith("image/")) {
        return { file };
      }

      const previewUrl = URL.createObjectURL(file);
      previewUrlsRef.current.add(previewUrl);

      return { file, previewUrl };
    });

    setSelectedAttachments((current) => [...current, ...nextAttachments]);
  }

  function removeAttachment(fileToRemove: File) {
    setSelectedAttachments((current) => {
      const removedAttachment = current.find(
        (attachment) => attachment.file === fileToRemove,
      );

      if (removedAttachment?.previewUrl) {
        URL.revokeObjectURL(removedAttachment.previewUrl);
        previewUrlsRef.current.delete(removedAttachment.previewUrl);
      }

      return current.filter((attachment) => attachment.file !== fileToRemove);
    });
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const messageBody = body.trim();

    if ((!messageBody && selectedAttachments.length === 0) || isSending) {
      return;
    }

    stopTyping();

    try {
      await onSend(
        messageBody,
        replyTo?.id,
        selectedAttachments.map((attachment) => attachment.file),
      );

      setBody("");
      for (const attachment of selectedAttachments) {
        if (attachment.previewUrl) {
          URL.revokeObjectURL(attachment.previewUrl);
          previewUrlsRef.current.delete(attachment.previewUrl);
        }
      }
      setSelectedAttachments([]);
      setAttachmentError(null);
    } catch {
      // Keep the draft and selected files if the request fails.
    }
  }

  const acceptTypes = Object.keys(MAX_SIZE_BY_TYPE).join(",");

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t bg-background/90 p-3 sm:px-6 sm:py-4"
    >
      {replyTo ? (
        <div className="mx-auto mb-3 flex max-w-4xl items-center gap-3 rounded-xl border bg-card px-3 py-2.5">
          <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <Reply className="size-4" />
          </div>

          <div className="min-w-0 flex-1 border-l-2 border-primary/40 pl-3">
            <p className="text-xs font-semibold text-primary">
              Replying to {replyTo.sender?.displayName ?? "message"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {replyTo.body ?? "Attachment"}
            </p>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Cancel reply"
            onClick={onCancelReply}
            className="size-8 shrink-0"
          >
            <X />
          </Button>
        </div>
      ) : null}

      <MessageAttachmentPreview
        attachments={selectedAttachments}
        onRemove={removeAttachment}
      />

      {attachmentError ? (
        <p
          role="alert"
          className="mx-auto mb-2 max-w-4xl text-sm text-destructive"
        >
          {attachmentError}
        </p>
      ) : null}

      <div className="mx-auto flex max-w-4xl items-end gap-2 rounded-2xl border bg-card p-2 shadow-sm focus-within:ring-2 focus-within:ring-ring/30 sm:gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptTypes}
          multiple
          className="hidden"
          onChange={handleAttachmentSelection}
        />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Attach files"
          title="Attach images, videos, audio, or PDF"
          disabled={
            isSending ||
            selectedAttachments.length >= MAX_ATTACHMENTS_PER_MESSAGE
          }
          onClick={() => fileInputRef.current?.click()}
          className="mb-0.5 size-10 shrink-0 rounded-xl text-muted-foreground"
        >
          <Paperclip />
        </Button>

        <VoiceMessageRecorder
          disabled={
            isSending ||
            body.trim().length > 0 ||
            selectedAttachments.length > 0
          }
          onSend={async (file, waveform) => {
            await onSend("", replyTo?.id, [file], waveform);
          }}
        />
        <label className="sr-only" htmlFor="message-input">
          Write a message
        </label>

        <textarea
          id="message-input"
          value={body}
          onChange={(event) => handleBodyChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder="Write a message…"
          rows={1}
          maxLength={5000}
          className="max-h-36 min-h-10 flex-1 resize-y bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground sm:px-3"
        />

        <Button
          type="submit"
          aria-label="Send message"
          disabled={
            (!body.trim() && selectedAttachments.length === 0) || isSending
          }
          className="mb-0.5 size-10 shrink-0 rounded-xl"
        >
          {isSending ? <LoaderCircle className="animate-spin" /> : <Send />}
        </Button>
      </div>

      <p className="mx-auto mt-2 max-w-4xl px-2 text-[11px] text-muted-foreground">
        Up to 5 files · Images 5 MB · Video 25 MB · Audio/PDF 10 MB each
      </p>
    </form>
  );
}
