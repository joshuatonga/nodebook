"use client";

import { useEffect } from "react";
import { registerNodebookTools, type NodebookToolRuntime } from "@/lib/webmcp/tools";
import { useWorkspaceStore } from "@/lib/store";

export function useWebMcp(): void {
  const hydrated = useWorkspaceStore((state) => state.hydrated);

  useEffect(() => {
    if (!hydrated) return;
    const modelContext = document.modelContext;
    if (!modelContext) {
      useWorkspaceStore.getState().setWebMcpStatus("unavailable");
      return;
    }

    const controller = new AbortController();
    const runtime: NodebookToolRuntime = {
      getSnapshot: () => {
        const state = useWorkspaceStore.getState();
        return {
          workspace: state.workspace,
          selectedNodeIds: state.selectedNodeIds,
          pendingIntent: state.pendingIntent,
        };
      },
      commitWorkspace: (workspace, activity) => useWorkspaceStore.getState().commitWorkspace(workspace, activity),
      activateMap: (mapId) => useWorkspaceStore.getState().activateMap(mapId),
      clearIntent: () => useWorkspaceStore.getState().clearIntent(),
      focusNodes: (nodeIds) => useWorkspaceStore.getState().requestFocus(nodeIds),
      setHighlight: (highlight) => useWorkspaceStore.getState().setHighlight(highlight),
    };

    useWorkspaceStore.getState().setWebMcpStatus("checking");
    void registerNodebookTools(modelContext, runtime, controller.signal)
      .then(() => {
        if (!controller.signal.aborted) useWorkspaceStore.getState().setWebMcpStatus("available");
      })
      .catch(() => {
        if (!controller.signal.aborted) useWorkspaceStore.getState().setWebMcpStatus("error");
      });

    return () => controller.abort();
  }, [hydrated]);
}
