import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Meshage",
    short_name: "Meshage",
    description: "A modern chat app for friends, groups, and communities.",
    start_url: "/chat",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      {
        src: "/meshage-logo.png",
        sizes: "any",
        type: "image/png",
      },
    ],
  };
}
