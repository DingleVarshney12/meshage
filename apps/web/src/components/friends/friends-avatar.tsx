import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface FriendsAvatarProps {
  name: string;
  avatarUrl: string | null;
  size?: "default" | "sm" | "lg";
}

export function FriendsAvatar({
  name,
  avatarUrl,
  size = "default",
}: FriendsAvatarProps) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <Avatar size={size} className="ring-2 ring-background">
      {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
      <AvatarFallback className="bg-primary/10 font-semibold text-primary">
        {initials || "M"}
      </AvatarFallback>
    </Avatar>
  );
}
