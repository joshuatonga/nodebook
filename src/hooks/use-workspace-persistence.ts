"use client";

import { useEffect } from "react";
import { loadStoredWorkspace, saveStoredWorkspace } from "@/lib/persistence";
import { useWorkspaceStore } from "@/lib/store";

export function useWorkspacePersistence(): void {
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let unsubscribe: (() => void) | undefined;

    void loadStoredWorkspace()
      .then((workspace) => {
        if (cancelled) return;
        useWorkspaceStore.getState().hydrate(workspace);
        unsubscribe = useWorkspaceStore.subscribe((state, previous) => {
          if (!state.hydrated || state.workspace === previous.workspace) return;
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => {
            void saveStoredWorkspace(useWorkspaceStore.getState().workspace);
          }, 220);
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "IndexedDB could not be opened.";
        useWorkspaceStore.getState().hydrate(null, message);
      });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      unsubscribe?.();
    };
  }, []);
}
