"use client";

import { BookOpen, Boxes, GitBranch, GraduationCap, Plus } from "lucide-react";
import { useMemo } from "react";
import type { MapKind } from "@/lib/model";
import { useWorkspaceStore } from "@/lib/store";

const mapMeta: Record<MapKind, { label: string; icon: typeof Boxes }> = {
  build: { label: "Build", icon: Boxes },
  trace: { label: "Trace", icon: GitBranch },
  learn: { label: "Learn", icon: GraduationCap },
};

export function Sidebar() {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const addCanvas = useWorkspaceStore((state) => state.addCanvas);
  const activateMap = useWorkspaceStore((state) => state.activateMap);
  const createNewWorkspace = useWorkspaceStore((state) => state.createNewWorkspace);
  const loadDemoWorkspace = useWorkspaceStore((state) => state.loadDemoWorkspace);
  const maps = useMemo(() => Object.values(workspace.maps), [workspace.maps]);

  return (
    <aside className="sidebar" aria-label="Workspace navigation">
      <div className="brand-lockup">
        <span className="brand-mark">N</span>
        <div>
          <strong>Nodebook</strong>
          <span title={workspace.name}>{workspace.name}</span>
        </div>
      </div>

      <nav aria-label="Canvases" className="map-navigation">
        <button className="new-canvas-button" onClick={() => addCanvas()} type="button">
          <Plus size={16} strokeWidth={1.8} />
          <span>New canvas</span>
        </button>
        <div className="map-list-heading">
          <span>Canvases</span>
          <small>{maps.length}</small>
        </div>
        <div className="map-list">
          {maps.map((map) => {
            const { icon: Icon, label } = mapMeta[map.kind];
            return (
              <button
                className={`map-link ${workspace.activeMapId === map.id ? "active" : ""}`}
                data-map-kind={map.kind}
                key={map.id}
                onClick={() => activateMap(map.id)}
                type="button"
              >
                <span aria-hidden="true" className={`map-kind-indicator ${map.kind}`} title={`${label} canvas`}>
                  <Icon size={14} strokeWidth={1.9} />
                </span>
                <span className="map-link-copy">
                  <span className="map-link-title">{map.title}</span>
                  <span aria-hidden="true" className="map-link-kind">{label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <div className="sidebar-actions">
        <button
          className="quiet-button"
          onClick={() => {
            if (window.confirm("Start a new blank workspace? You can undo this action.")) createNewWorkspace();
          }}
          type="button"
        >
          <Plus size={15} /> New workspace
        </button>
        <button className="quiet-button accent" onClick={loadDemoWorkspace} type="button">
          Load demo
        </button>
      </div>
      <div className="local-note">
        <BookOpen size={14} />
        <span>Saved privately in this browser</span>
      </div>
    </aside>
  );
}
