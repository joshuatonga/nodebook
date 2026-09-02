"use client";

import { BookOpen, Boxes, GitBranch, GraduationCap, Plus, Square, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MapKind } from "@/lib/model";
import { useWorkspaceStore } from "@/lib/store";

const mapMeta: Record<MapKind, { label: string; optionLabel: string; description: string; icon: typeof Boxes }> = {
  blank: { label: "Blank", optionLabel: "Blank canvas", description: "Start without a preset structure", icon: Square },
  build: { label: "Build", optionLabel: "Build", description: "Plan features and scope", icon: Boxes },
  trace: { label: "Trace", optionLabel: "Trace", description: "Map a journey or sequence", icon: GitBranch },
  learn: { label: "Learn", optionLabel: "Learn", description: "Organize concepts and exercises", icon: GraduationCap },
};

const canvasKinds: MapKind[] = ["blank", "build", "trace", "learn"];

export function Sidebar() {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const addCanvas = useWorkspaceStore((state) => state.addCanvas);
  const activateMap = useWorkspaceStore((state) => state.activateMap);
  const deleteCanvas = useWorkspaceStore((state) => state.deleteCanvas);
  const createNewWorkspace = useWorkspaceStore((state) => state.createNewWorkspace);
  const loadDemoWorkspace = useWorkspaceStore((state) => state.loadDemoWorkspace);
  const [isTypePickerOpen, setIsTypePickerOpen] = useState(false);
  const newCanvasRef = useRef<HTMLDivElement>(null);
  const maps = useMemo(
    () => Object.values(workspace.maps).sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    [workspace.maps],
  );

  useEffect(() => {
    if (!isTypePickerOpen) return;

    function closeOnOutsideClick(event: PointerEvent) {
      if (!newCanvasRef.current?.contains(event.target as Node)) setIsTypePickerOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsTypePickerOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isTypePickerOpen]);

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
        <div className="new-canvas-control" ref={newCanvasRef}>
          <button
            aria-expanded={isTypePickerOpen}
            aria-haspopup="menu"
            className="new-canvas-button"
            onClick={() => setIsTypePickerOpen((isOpen) => !isOpen)}
            type="button"
          >
            <Plus size={16} strokeWidth={1.8} />
            <span>New canvas</span>
          </button>
          {isTypePickerOpen ? (
            <div aria-label="Choose canvas type" className="canvas-type-menu" role="menu">
              {canvasKinds.map((kind) => {
                const { description, icon: Icon, optionLabel } = mapMeta[kind];
                return (
                  <button
                    key={kind}
                    onClick={() => {
                      addCanvas(kind);
                      setIsTypePickerOpen(false);
                    }}
                    role="menuitem"
                    type="button"
                  >
                    <span aria-hidden="true" className={`map-kind-indicator ${kind}`}>
                      <Icon size={14} strokeWidth={1.9} />
                    </span>
                    <span>
                      <strong>{optionLabel}</strong>
                      <small>{description}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
        <div className="map-list-heading">
          <span>Canvases</span>
          <small>{maps.length}</small>
        </div>
        <div className="map-list">
          {maps.map((map) => {
            const { icon: Icon, label } = mapMeta[map.kind];
            return (
              <div className="map-row" key={map.id}>
                <button
                  className={`map-link ${workspace.activeMapId === map.id ? "active" : ""}`}
                  data-map-kind={map.kind}
                  onClick={() => activateMap(map.id)}
                  type="button"
                >
                  <span aria-hidden="true" className={`map-kind-indicator ${map.kind}`} title={`${label} canvas`}>
                    <Icon size={14} strokeWidth={1.9} />
                  </span>
                  <span className="map-link-copy">
                    <span className="map-link-title" id={`map-title-${map.id}`}>{map.title}</span>
                    <span aria-hidden="true" className="map-link-kind">{label}</span>
                  </span>
                </button>
                <button
                  aria-describedby={`map-title-${map.id}`}
                  aria-label="Delete canvas"
                  className="map-delete-button"
                  onClick={() => {
                    if (window.confirm(`Delete “${map.title}”? Its nodes and linked canvases will also be deleted.`)) {
                      deleteCanvas(map.id);
                    }
                  }}
                  title={`Delete ${map.title}`}
                  type="button"
                >
                  <Trash2 size={14} strokeWidth={1.8} />
                </button>
              </div>
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
          Load complete demo
        </button>
      </div>
      <div className="local-note">
        <BookOpen size={14} />
        <span>Saved privately in this browser</span>
      </div>
    </aside>
  );
}
