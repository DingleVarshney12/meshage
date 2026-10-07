"use client";

import { useRef, useState, type SubmitEvent } from "react";
import Image from "next/image";
import { ImagePlus, LoaderCircle, Settings2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  removeGroupAvatar,
  updateGroupSettings,
  uploadGroupAvatar,
} from "@/lib/api/conversations/conversations.api";
import { DialogMenuTrigger } from "./dialog-menu-trigger";
import { getErrorMessage } from "@/lib/utils/errors";

interface GroupSettingsDialogProps {
  conversationId: string;
  title: string;
  description: string | null;
  avatarUrl: string | null;
  onUpdated: (settings: {
    title: string | null;
    description: string | null;
    avatarUrl: string | null;
  }) => void;
  renderTrigger?: DialogMenuTrigger;
}

export default function GroupSettingsDialog({
  conversationId,
  title: currentTitle,
  description: currentDescription,
  avatarUrl: currentAvatarUrl,
  onUpdated,
  renderTrigger,
}: GroupSettingsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState(currentTitle);
  const [description, setDescription] = useState(currentDescription ?? "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function openDialog() {
    setTitle(currentTitle);
    setDescription(currentDescription ?? "");
    selectAvatarFile(null);
    setError(null);
    setIsOpen(true);
  }

  function selectAvatarFile(file: File | null) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      const settings = await updateGroupSettings(conversationId, {
        title: title.trim(),
        description: description.trim() || null,
      });

      onUpdated({
        ...settings,
        avatarUrl: currentAvatarUrl,
      });
      setIsOpen(false);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUploadAvatar() {
    if (!selectedFile) {
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const result = await uploadGroupAvatar(conversationId, selectedFile);

      onUpdated({
        title: currentTitle,
        description: currentDescription,
        avatarUrl: result.avatarUrl,
      });
      selectAvatarFile(null);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemoveAvatar() {
    setError(null);
    setIsSaving(true);

    try {
      const result = await removeGroupAvatar(conversationId);

      onUpdated({
        title: currentTitle,
        description: currentDescription,
        avatarUrl: result.avatarUrl,
      });
      selectAvatarFile(null);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  }

  const displayedAvatarUrl = previewUrl ?? currentAvatarUrl;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {renderTrigger ? (
        renderTrigger(openDialog)
      ) : (
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Group settings"
          title="Group settings"
          onClick={openDialog}
        >
          <Settings2 />
        </Button>
      )}

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Group settings</DialogTitle>
          <DialogDescription>
            Update the group name, description, or avatar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <section className="flex items-center gap-4">
            <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border bg-muted">
              {displayedAvatarUrl ? (
                <Image
                  src={displayedAvatarUrl}
                  alt="Group avatar preview"
                  width={80}
                  height={80}
                  unoptimized
                  className="size-full object-cover"
                />
              ) : (
                <ImagePlus className="size-7 text-muted-foreground" />
              )}
            </div>

            <div className="min-w-0 space-y-2">
              <p className="text-sm font-medium">Group avatar</p>
              <p className="text-xs text-muted-foreground">
                JPEG, PNG, or WebP. Maximum 5 MB.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => {
                  selectAvatarFile(event.target.files?.[0] ?? null);
                  setError(null);
                }}
              />

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSaving}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImagePlus />
                  Choose image
                </Button>

                {selectedFile ? (
                  <Button
                    type="button"
                    size="sm"
                    disabled={isSaving}
                    onClick={handleUploadAvatar}
                  >
                    {isSaving ? (
                      <LoaderCircle className="animate-spin" />
                    ) : (
                      <ImagePlus />
                    )}
                    Upload
                  </Button>
                ) : currentAvatarUrl ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isSaving}
                    onClick={handleRemoveAvatar}
                  >
                    {isSaving ? (
                      <LoaderCircle className="animate-spin" />
                    ) : (
                      <Trash2 />
                    )}
                    Remove
                  </Button>
                ) : null}
              </div>
            </div>
          </section>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium">Group name</span>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                minLength={2}
                maxLength={100}
                required
                className="h-11 rounded-xl"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium">Description</span>
              <Input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={1000}
                placeholder="What is this group about?"
                className="h-11 rounded-xl"
              />
            </label>

            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isSaving}
              >
                Close
              </Button>
              <Button
                type="submit"
                disabled={isSaving || title.trim().length < 2}
              >
                {isSaving ? (
                  <>
                    <LoaderCircle className="animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
