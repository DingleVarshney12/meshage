"use client";

import { io } from "socket.io-client";

export function createRealtimeSocket() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiUrl) {
    throw new Error("API URL is not configured.");
  }

  const parsedApiUrl = new URL(apiUrl);
  const apiPath = parsedApiUrl.pathname.replace(/\/$/, "");

  return io(parsedApiUrl.origin, {
    path: `${apiPath}/socket.io`,
    withCredentials: true,
    autoConnect: false,
  });
}
