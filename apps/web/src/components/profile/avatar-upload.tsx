"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { ImagePlus, LoaderCircle, Trash2 } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  removeProfileAvatar,
  uploadProfileAvatar,
} from "@/lib/api/profile/profile.api";
import { getErrorMessage } from "@/lib/utils/errors";

const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function AvatarUpload() {
  const { user, setAuthenticatedUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!previewUrl) {
      return;
    }

    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !user) {
      return;
    }

    setError(null);
    setNotice(null);

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError("Choose a JPEG, PNG, or WebP image.");
      return;
    }

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      setError("Avatar image must be 5 MB or smaller.");
      return;
    }

    setPreviewUrl(URL.createObjectURL(file));
    setIsUploading(true);

    try {
      const updatedProfile = await uploadProfileAvatar(file);

      setAuthenticatedUser({
        ...user,
        ...updatedProfile,
      });

      setPreviewUrl(null);
      setNotice("Profile photo updated.");
    } catch (uploadError) {
      setError(getErrorMessage(uploadError, "Could not update avatar."));
    } finally {
      setIsUploading(false);
    }
  }

  async function handleRemoveAvatar() {
    if (!user) {
      return;
    }

    setError(null);
    setNotice(null);
    setIsUploading(true);

    try {
      const updatedProfile = await removeProfileAvatar();

      setAuthenticatedUser({
        ...user,
        ...updatedProfile,
      });

      setPreviewUrl(null);
      setNotice("Profile photo removed.");
    } catch (removeError) {
      setError(getErrorMessage(removeError, "Could not update avatar."));
    } finally {
      setIsUploading(false);
    }
  }

  const avatarUrl = previewUrl ?? user?.avatarUrl ?? null;
  const initials = user?.displayName?.trim().charAt(0).toUpperCase() || "M";

  return (
    <section className="flex flex-col gap-4 rounded-2xl border bg-card p-5 sm:flex-row sm:items-center">
      <Avatar className="size-20 ring-4 ring-primary/10">
        {avatarUrl ? <AvatarImage src={avatarUrl} alt="Profile photo" /> : null}
        <AvatarFallback className="text-xl font-semibold">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1 space-y-1">
        <h2 className="font-medium">Profile photo</h2>
        <p className="text-sm text-muted-foreground">
          JPEG, PNG, or WebP. Maximum size 5 MB.
        </p>

        {error ? (
          <p role="alert" className="pt-1 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {notice ? (
          <p role="status" className="pt-1 text-sm text-emerald-600">
            {notice}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />

        <Button
          type="button"
          variant="outline"
          className="rounded-xl"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {isUploading ? (
            <LoaderCircle className="animate-spin" />
          ) : (
            <ImagePlus />
          )}
          {user?.avatarUrl ? "Change photo" : "Upload photo"}
        </Button>

        {user?.avatarUrl ? (
          <Button
            type="button"
            variant="ghost"
            className="rounded-xl text-destructive hover:text-destructive"
            disabled={isUploading}
            onClick={handleRemoveAvatar}
            aria-label="Remove profile photo"
          >
            <Trash2 />
            Remove
          </Button>
        ) : null}
      </div>
    </section>
  );
}
