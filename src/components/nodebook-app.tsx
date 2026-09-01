"use client";

import { CanvasWorkspace } from "@/components/canvas/canvas-workspace";
import { Inspector } from "@/components/inspector";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { useWebMcp } from "@/hooks/use-webmcp";
import { useWorkspacePersistence } from "@/hooks/use-workspace-persistence";
import { useWorkspaceStore } from "@/lib/store";

export function NodebookApp() {
  useWorkspacePersistence();
  useWebMcp();
  const hydrated = useWorkspaceStore((state) => state.hydrated);

  if (!hydrated) {
    return (
      <div className="boot-screen">
        <span className="skeleton-mark">N</span>
        <p>Opening your local workspace…</p>
      </div>
    );
  }

  return (
    <div className="nodebook-app">
      <Sidebar />
      <section className="workspace-stage">
        <Topbar />
        <CanvasWorkspace />
      </section>
      <Inspector />
    </div>
  );
}
