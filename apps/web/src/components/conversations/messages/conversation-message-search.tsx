"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getConversationMessageContext,
  searchConversationMessages,
} from "@/lib/api/conversations/conversations.api";
import type { ConversationMessage } from "@/lib/api/conversations/conversations.types";

interface ConversationMessageSearchProps {
  conversationId: string;
  onSelect: (messages: ConversationMessage[], messageId: string) => void;
}

function formatSearchDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function ConversationMessageSearch({
  conversationId,
  onSelect,
}: ConversationMessageSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ConversationMessage[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openingMessageId, setOpeningMessageId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || query.trim().length < 2) {
      return;
    }

    let cancelled = false;
    const timeout = setTimeout(async () => {
      setIsSearching(true);
      setError(null);
      try {
        const response = await searchConversationMessages(
          conversationId,
          query.trim(),
        );
        if (!cancelled) setResults(response.items);
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Search failed.",
          );
          setResults([]);
        }
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [conversationId, open, query]);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setQuery("");
      setResults([]);
      setIsSearching(false);
      setError(null);
    }
  }

  async function selectMessage(messageId: string) {
    setOpeningMessageId(messageId);
    setError(null);
    try {
      const response = await getConversationMessageContext(
        conversationId,
        messageId,
      );
      onSelect(response.items, messageId);
      setOpen(false);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not open that message.",
      );
    } finally {
      setOpeningMessageId(null);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Search messages"
        title="Search messages"
        onClick={() => setOpen(true)}
      >
        <Search />
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[min(80dvh,42rem)] gap-4 overflow-hidden sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Search messages</DialogTitle>
            <DialogDescription>
              Search text in this conversation.
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(event) => {
                const nextQuery = event.target.value;
                setQuery(nextQuery);
                if (nextQuery.trim().length < 2) {
                  setResults([]);
                  setIsSearching(false);
                  setError(null);
                }
              }}
              placeholder="Search at least 2 characters…"
              className="h-10 pl-9"
              maxLength={100}
            />
          </div>
          <div className="max-h-[50dvh] min-h-24 space-y-1 overflow-y-auto">
            {isSearching ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" /> Searching…
              </div>
            ) : error ? (
              <p
                role="alert"
                className="px-3 py-6 text-center text-sm text-destructive"
              >
                {error}
              </p>
            ) : query.trim().length < 2 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                Type at least 2 characters to search.
              </p>
            ) : results.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                No matching messages found.
              </p>
            ) : (
              results.map((message) => (
                <button
                  key={message.id}
                  type="button"
                  disabled={openingMessageId !== null}
                  onClick={() => void selectMessage(message.id)}
                  className="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-muted disabled:opacity-60"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm font-semibold">
                        {message.sender?.displayName ?? "Former member"}
                      </span>
                      <time className="shrink-0 text-[11px] text-muted-foreground">
                        {formatSearchDate(message.createdAt)}
                      </time>
                    </span>
                    <span className="mt-1 block line-clamp-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                      {message.body ?? "Attachment"}
                    </span>
                  </span>
                  {openingMessageId === message.id ? (
                    <LoaderCircle className="mt-1 size-4 animate-spin" />
                  ) : null}
                </button>
              ))
            )}
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Showing up to 20 newest matches
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
