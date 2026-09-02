"use client";

import {
  CheckCheck,
  ChevronRight,
  Download,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Pencil,
  Plus,
  Redo2,
  Undo2,
  Upload,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useStore } from "zustand";
import { buildBreadcrumbs } from "@/lib/navigation";
import { deserializeWorkspace, downloadWorkspace } from "@/lib/persistence";
import { calculateDeliveryProgress } from "@/lib/progress";
import { useWorkspaceStore } from "@/lib/store";

const statusLabel = {
  checking: "Connecting",
  available: "WebMCP ready",
  unavailable: "WebMCP unavailable",
  error: "WebMCP error",
} as const;

interface TopbarProps {
  isInspectorOpen: boolean;
  isSidebarOpen: boolean;
  onToggleInspector: () => void;
  onToggleSidebar: () => void;
}

export function Topbar({ isInspectorOpen, isSidebarOpen, onToggleInspector, onToggleSidebar }: TopbarProps) {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const webmcpStatus = useWorkspaceStore((state) => state.webmcpStatus);
  const acceptAllProposed = useWorkspaceStore((state) => state.acceptAllProposed);
  const addManualNode = useWorkspaceStore((state) => state.addManualNode);
  const renameCanvas = useWorkspaceStore((state) => state.renameCanvas);
  const importWorkspace = useWorkspaceStore((state) => state.importWorkspace);
  const canUndo = useStore(useWorkspaceStore.temporal, (state) => state.pastStates.length > 0);
  const canRedo = useStore(useWorkspaceStore.temporal, (state) => state.futureStates.length > 0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [editingMapId, setEditingMapId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const progress = useMemo(() => calculateDeliveryProgress(workspace), [workspace]);
  const breadcrumbs = useMemo(
    () => buildBreadcrumbs(workspace, workspace.activeMapId),
    [workspace],
  );

  async function handleImport(file?: File) {
    if (!file) return;
    try {
      importWorkspace(deserializeWorkspace(await file.text()));
      setImportError(null);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "That file is not a valid Nodebook workspace.");
    }
  }

  function startRenaming(mapId: string, title: string) {
    setEditingMapId(mapId);
    setTitleDraft(title);
  }

  function finishRenaming() {
    if (!editingMapId) return;
    renameCanvas(editingMapId, titleDraft);
    setEditingMapId(null);
  }

  return (
    <header className="topbar">
      <div className="topbar-primary">
        <div className="topbar-leading">
          <button
            aria-controls="workspace-sidebar"
            aria-expanded={isSidebarOpen}
            aria-label={isSidebarOpen ? "Close navigation" : "Open navigation"}
            className="icon-button sidebar-toggle"
            onClick={onToggleSidebar}
            title={isSidebarOpen ? "Close navigation" : "Open navigation"}
            type="button"
          >
            {isSidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
          </button>
          <div className="breadcrumbs" aria-label="Map breadcrumbs">
            {breadcrumbs.map((crumb, index) => (
              <span className="breadcrumb-segment" key={crumb.id}>
                {index > 0 ? <ChevronRight size={13} /> : null}
                {crumb.mapId && editingMapId === crumb.mapId ? (
                  <input
                    aria-label="Edit canvas title"
                    autoFocus
                    className="breadcrumb-title-editor"
                    maxLength={120}
                    onBlur={finishRenaming}
                    onChange={(event) => setTitleDraft(event.target.value)}
                    onFocus={(event) => event.currentTarget.select()}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        finishRenaming();
                      }
                      if (event.key === "Escape") {
                        event.preventDefault();
                        setEditingMapId(null);
                      }
                    }}
                    value={titleDraft}
                  />
                ) : (
                  <button
                    disabled={!crumb.mapId}
                    onClick={() => crumb.mapId && startRenaming(crumb.mapId, crumb.label)}
                    title={crumb.mapId ? "Rename canvas" : crumb.label}
                    type="button"
                  >
                    <span>{crumb.label}</span>
                    {crumb.mapId ? <Pencil aria-hidden="true" className="breadcrumb-edit-icon" size={11} /> : null}
                  </button>
                )}
              </span>
            ))}
          </div>
        </div>
        <div className="topbar-actions">
          <div className={`webmcp-status ${webmcpStatus}`} title="External agents discover Nodebook tools through the browser">
            <span /> {statusLabel[webmcpStatus]}
          </div>
          <button
            aria-label="Undo"
            className="icon-button"
            disabled={!canUndo}
            onClick={() => useWorkspaceStore.temporal.getState().undo()}
            type="button"
          >
            <Undo2 size={16} />
          </button>
          <button
            aria-label="Redo"
            className="icon-button"
            disabled={!canRedo}
            onClick={() => useWorkspaceStore.temporal.getState().redo()}
            type="button"
          >
            <Redo2 size={16} />
          </button>
          <button aria-label="Import workspace" className="icon-button" onClick={() => inputRef.current?.click()} type="button">
            <Upload size={16} />
          </button>
          <input
            accept="application/json,.json"
            className="visually-hidden"
            onChange={(event) => void handleImport(event.target.files?.[0])}
            ref={inputRef}
            type="file"
          />
          <button aria-label="Export workspace" className="icon-button" onClick={() => downloadWorkspace(workspace)} type="button">
            <Download size={16} />
          </button>
          <button
            aria-controls="inspector-panel"
            aria-expanded={isInspectorOpen}
            aria-label={isInspectorOpen ? "Close inspector" : "Open inspector"}
            className="icon-button inspector-toggle"
            onClick={onToggleInspector}
            title={isInspectorOpen ? "Close inspector" : "Open inspector"}
            type="button"
          >
            {isInspectorOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
          </button>
        </div>
      </div>

      <div className="topbar-secondary">
        <div className="progress-summary">
          <span><strong>{progress.included}</strong> in scope</span>
          <span><strong>{progress.proposed}</strong> proposed</span>
          <div className="progress-track" title={`${progress.percentage}% delivery progress`}>
            <span style={{ width: `${progress.percentage}%` }} />
          </div>
          <span><strong>{progress.percentage}%</strong> delivered</span>
        </div>
        <div className="map-actions">
          {progress.proposed > 0 ? (
            <button className="toolbar-button" onClick={acceptAllProposed} type="button">
              <CheckCheck size={15} /> Accept all proposed
            </button>
          ) : null}
          <button className="toolbar-button primary" onClick={() => addManualNode()} type="button">
            <Plus size={15} /> Add node
          </button>
        </div>
      </div>
      {importError ? <div className="topbar-error" role="alert">{importError}</div> : null}
    </header>
  );
}
