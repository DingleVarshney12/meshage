"use client";

import { useEffect, useState, type FormEvent } from "react";
import { LoaderCircle, Save } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile } from "@/lib/api/profile/profile.api";
import type { ProfileVisibility } from "@/lib/api/profile/profile.types";
import { getErrorMessage } from "@/lib/utils/errors";
import AvatarUpload from "./avatar-upload";

export default function ProfileSettingsForm() {
  const { user, setAuthenticatedUser } = useAuth();

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [profileVisibility, setProfileVisibility] = useState<ProfileVisibility>(
    user?.profileVisibility ?? "public",
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    // The authenticated profile arrives asynchronously; sync the form to that user.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDisplayName(user.displayName);
    setBio(user.bio ?? "");
    setProfileVisibility(user.profileVisibility ?? "public");
  }, [user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setNotice(null);

    try {
      const updatedProfile = await updateProfile({
        displayName,
        bio: bio.trim() || null,
        profileVisibility,
      });

      setAuthenticatedUser({
        ...user,
        ...updatedProfile,
      });
      setNotice("Profile updated successfully.");
    } catch (submitError) {
      setError(getErrorMessage(submitError, "Could not update profile."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <AvatarUpload />
      <div className="space-y-2">
        <Label htmlFor="profile-display-name">Display name</Label>
        <Input
          id="profile-display-name"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          maxLength={80}
          required
          className="h-11 rounded-xl"
        />
        <p className="text-xs text-muted-foreground">
          This is the name people see in chats.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="profile-bio">Bio</Label>
        <textarea
          id="profile-bio"
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          maxLength={280}
          rows={4}
          placeholder="A little about you…"
          className="flex w-full resize-y rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
        />
        <p className="text-right text-xs text-muted-foreground">
          {bio.length}/280
        </p>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Profile visibility</legend>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors hover:bg-muted/50">
          <input
            type="radio"
            name="profileVisibility"
            value="public"
            checked={profileVisibility === "public"}
            onChange={() => setProfileVisibility("public")}
            className="mt-1 accent-primary"
          />
          <span>
            <span className="block text-sm font-medium">Public</span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">
              Your display name and avatar can appear in people search.
            </span>
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors hover:bg-muted/50">
          <input
            type="radio"
            name="profileVisibility"
            value="private"
            checked={profileVisibility === "private"}
            onChange={() => setProfileVisibility("private")}
            className="mt-1 accent-primary"
          />
          <span>
            <span className="block text-sm font-medium">Private</span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">
              People search will hide your display name and avatar.
            </span>
          </span>
        </label>
      </fieldset>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {notice ? (
        <p role="status" className="text-sm text-emerald-600">
          {notice}
        </p>
      ) : null}

      <Button type="submit" disabled={isSaving} className="rounded-xl">
        {isSaving ? <LoaderCircle className="animate-spin" /> : <Save />}
        Save profile
      </Button>
    </form>
  );
}
