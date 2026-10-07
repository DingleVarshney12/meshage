"use client";

import { useSyncExternalStore } from "react";

function subscribeToLocationChanges(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
}

export function useQueryParam(name: string) {
  return useSyncExternalStore(
    subscribeToLocationChanges,
    () => new URLSearchParams(window.location.search).get(name),
    () => null,
  );
}
