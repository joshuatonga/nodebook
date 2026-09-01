"use client";

import { BookOpen, Boxes, Clock3, GitBranch, GraduationCap, Plus, Sparkles } from "lucide-react";
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
          <span>Agent-readable canvas</span>
        </div>
      </div>

      <div className="workspace-card">
        <span className="eyebrow">Local workspace</span>
        <strong title={workspace.name}>{workspace.name}</strong>
        <span>{maps.length} linked {maps.length === 1 ? "map" : "maps"}</span>
      </div>

      <nav className="map-navigation">
        {(["build", "trace", "learn"] as const).map((kind) => {
          const groupMaps = maps.filter((map) => map.kind === kind);
          const Icon = mapMeta[kind].icon;
          return (
            <div className="map-group" key={kind}>
              <div className="map-group-label">
                <Icon size={14} />
                <span>{mapMeta[kind].label}</span>
                <small>{groupMaps.length}</small>
              </div>
              {groupMaps.length === 0 ? (
                <p className="map-empty">Created when you or your agent drills in.</p>
              ) : (
                groupMaps.map((map) => (
                  <button
                    className={`map-link ${workspace.activeMapId === map.id ? "active" : ""}`}
                    key={map.id}
                    onClick={() => activateMap(map.id)}
                    type="button"
                  >
                    <span>{map.title}</span>
                    {map.parentNodeId ? <GitBranch size={12} /> : null}
                  </button>
                ))
              )}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-activity">
        <div className="map-group-label">
          <Clock3 size={14} />
          <span>Recent activity</span>
        </div>
        <div className="activity-list">
          {workspace.activity.slice(0, 4).map((entry) => (
            <div className="activity-item" key={entry.id}>
              <span className={`activity-dot ${entry.source}`} />
              <p>{entry.summary}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="sidebar-actions">
        <button
          className="quiet-button"
          onClick={() => {
            if (window.confirm("Start a new blank workspace? You can undo this action.")) createNewWorkspace();
          }}
          type="button"
        >
          <Plus size={15} /> New
        </button>
        <button className="quiet-button accent" onClick={loadDemoWorkspace} type="button">
          <Sparkles size={15} /> Load demo
        </button>
      </div>
      <div className="local-note">
        <BookOpen size={14} />
        <span>Saved privately in this browser</span>
      </div>
    </aside>
  );
}
