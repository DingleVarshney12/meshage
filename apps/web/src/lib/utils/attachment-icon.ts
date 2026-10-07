import { FileText, Music2, Video, type LucideIcon } from "lucide-react";

export function getAttachmentIcon(mimeType: string): LucideIcon {
  if (mimeType.startsWith("video/")) {
    return Video;
  }

  if (mimeType.startsWith("audio/")) {
    return Music2;
  }

  return FileText;
}
