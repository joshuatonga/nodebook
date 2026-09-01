import { create } from "zustand";
import { temporal } from "zundo";
import { createBlankWorkspace, createDemoWorkspace } from "@/lib/demo";
import { createId, nowIso } from "@/lib/ids";
import type {
  ActivityDescriptor,
  CanvasEdge,
  CanvasMap,
  CanvasNode,
  Evidence,
  HighlightState,
  PendingIntent,
  ViewportCommand,
  WebMcpStatus,
  WorkspaceDocument,
} from "@/lib/model";

interface WorkspaceStore {
  workspace: WorkspaceDocument;
  hydrated: boolean;
  selectedNodeIds: string[];
  pendingIntent: PendingIntent | null;
  highlight: HighlightState | null;
  viewportCommand: ViewportCommand | null;
  webmcpStatus: WebMcpStatus;
  hydrationError: string | null;
  hydrate: (workspace?: WorkspaceDocument | null, error?: string) => void;
  createNewWorkspace: () => void;
  loadDemoWorkspace: () => void;
  importWorkspace: (workspace: WorkspaceDocument) => void;
  commitWorkspace: (workspace: WorkspaceDocument, activity: ActivityDescriptor) => void;
  activateMap: (mapId: string) => void;
  updateMapViewport: (mapId: string, viewport: CanvasMap["viewport"]) => void;
  setSelection: (nodeIds: string[]) => void;
  requestIntent: (type: PendingIntent["type"], nodeId: string) => void;
  clearIntent: () => void;
  setHighlight: (highlight: HighlightState | null) => void;
  requestFocus: (nodeIds: string[]) => void;
  setWebMcpStatus: (status: WebMcpStatus) => void;
  updateNode: (nodeId: string, patch: Partial<CanvasNode>) => void;
  updateNodePositions: (updates: Array<{ id: string; position: CanvasNode["position"] }>) => void;
  addManualNode: () => string | null;
  connectNodes: (source: string, target: string) => void;
  deleteNodes: (nodeIds: string[]) => void;
  acceptAllProposed: () => void;
  addHumanEvidence: (nodeId: string, evidence: Omit<Evidence, "id" | "addedBy" | "createdAt">) => void;
}

function cloneDocument(document: WorkspaceDocument): WorkspaceDocument {
  return structuredClone(document);
}

function withActivity(document: WorkspaceDocument, activity: ActivityDescriptor): WorkspaceDocument {
  const createdAt = nowIso();
  return {
    ...document,
    updatedAt: createdAt,
    activity: [
      {
        id: createId("activity"),
        ...activity,
        createdAt,
      },
      ...document.activity,
    ].slice(0, 100),
  };
}

function cascadeDelete(document: WorkspaceDocument, initialNodeIds: string[]): WorkspaceDocument {
  const nodeIds = new Set(initialNodeIds);
  const mapIds = new Set<string>();
  let changed = true;

  while (changed) {
    changed = false;
    for (const map of Object.values(document.maps)) {
      if (map.parentNodeId && nodeIds.has(map.parentNodeId) && !mapIds.has(map.id)) {
        mapIds.add(map.id);
        changed = true;
      }
    }
    for (const node of Object.values(document.nodes)) {
      if (mapIds.has(node.mapId) && !nodeIds.has(node.id)) {
        nodeIds.add(node.id);
        changed = true;
      }
    }
  }

  const next = cloneDocument(document);
  for (const nodeId of nodeIds) delete next.nodes[nodeId];
  for (const mapId of mapIds) delete next.maps[mapId];
  for (const [edgeId, edge] of Object.entries(next.edges)) {
    if (mapIds.has(edge.mapId) || nodeIds.has(edge.source) || nodeIds.has(edge.target)) {
      delete next.edges[edgeId];
    }
  }

  if (!next.maps[next.activeMapId]) {
    next.activeMapId = Object.keys(next.maps)[0] ?? document.activeMapId;
  }
  return next;
}

function pauseHistory(action: () => void): void {
  const temporalStore = useWorkspaceStore.temporal.getState();
  temporalStore.pause();
  action();
  temporalStore.resume();
}

export const useWorkspaceStore = create<WorkspaceStore>()(
  temporal(
    (set, get) => ({
      workspace: createBlankWorkspace(),
      hydrated: false,
      selectedNodeIds: [],
      pendingIntent: null,
      highlight: null,
      viewportCommand: null,
      webmcpStatus: "checking",
      hydrationError: null,

      hydrate: (workspace, error) => {
        pauseHistory(() =>
          set({
            workspace: workspace ?? get().workspace,
            hydrated: true,
            hydrationError: error ?? null,
            selectedNodeIds: [],
            pendingIntent: null,
            highlight: null,
          }),
        );
        useWorkspaceStore.temporal.getState().clear();
      },

      createNewWorkspace: () => {
        set({
          workspace: createBlankWorkspace(),
          selectedNodeIds: [],
          pendingIntent: null,
          highlight: null,
        });
      },

      loadDemoWorkspace: () => {
        set({
          workspace: createDemoWorkspace(),
          selectedNodeIds: [],
          pendingIntent: null,
          highlight: null,
        });
      },

      importWorkspace: (workspace) => {
        set({
          workspace: withActivity(workspace, {
            source: "human",
            action: "workspace_imported",
            summary: `Imported ${workspace.name}.`,
          }),
          selectedNodeIds: [],
          pendingIntent: null,
          highlight: null,
        });
      },

      commitWorkspace: (workspace, activity) => {
        set({ workspace: withActivity(workspace, activity) });
      },

      activateMap: (mapId) => {
        if (!get().workspace.maps[mapId]) return;
        pauseHistory(() =>
          set((state) => ({
            workspace: { ...state.workspace, activeMapId: mapId },
            selectedNodeIds: [],
            pendingIntent: null,
            highlight: null,
          })),
        );
      },

      updateMapViewport: (mapId, viewport) => {
        const existing = get().workspace.maps[mapId];
        if (!existing) return;
        if (
          Math.abs(existing.viewport.x - viewport.x) < 0.01 &&
          Math.abs(existing.viewport.y - viewport.y) < 0.01 &&
          Math.abs(existing.viewport.zoom - viewport.zoom) < 0.0001
        ) {
          return;
        }
        pauseHistory(() =>
          set((state) => ({
            workspace: {
              ...state.workspace,
              maps: {
                ...state.workspace.maps,
                [mapId]: { ...state.workspace.maps[mapId], viewport },
              },
            },
          })),
        );
      },

      setSelection: (nodeIds) => {
        const next = [...new Set(nodeIds)];
        const current = get().selectedNodeIds;
        if (next.length === current.length && next.every((id, index) => id === current[index])) return;
        set({ selectedNodeIds: next });
      },

      requestIntent: (type, nodeId) => {
        if (!get().workspace.nodes[nodeId]) return;
        set({
          selectedNodeIds: [nodeId],
          pendingIntent: { id: createId("intent"), type, nodeId, createdAt: nowIso() },
        });
      },

      clearIntent: () => set({ pendingIntent: null }),
      setHighlight: (highlight) => set({ highlight }),
      requestFocus: (nodeIds) =>
        set({
          selectedNodeIds: nodeIds,
          viewportCommand: { id: createId("viewport"), nodeIds },
        }),
      setWebMcpStatus: (status) => set({ webmcpStatus: status }),

      updateNode: (nodeId, patch) => {
        const existing = get().workspace.nodes[nodeId];
        if (!existing) return;
        const next = cloneDocument(get().workspace);
        next.nodes[nodeId] = {
          ...existing,
          ...patch,
          id: existing.id,
          mapId: existing.mapId,
          updatedAt: nowIso(),
        };
        set({
          workspace: withActivity(next, {
            source: "human",
            action: "node_updated",
            summary: `Updated ${next.nodes[nodeId].title}.`,
          }),
        });
      },

      updateNodePositions: (updates) => {
        if (updates.length === 0) return;
        const next = cloneDocument(get().workspace);
        let changedCount = 0;
        for (const update of updates) {
          const existing = next.nodes[update.id];
          if (!existing) continue;
          existing.position = update.position;
          existing.updatedAt = nowIso();
          changedCount += 1;
        }
        if (changedCount === 0) return;
        set({
          workspace: withActivity(next, {
            source: "human",
            action: "nodes_moved",
            summary: `Repositioned ${changedCount} ${changedCount === 1 ? "node" : "nodes"}.`,
          }),
        });
      },

      addManualNode: () => {
        const workspace = get().workspace;
        const activeMap = workspace.maps[workspace.activeMapId];
        if (!activeMap) return null;
        const createdAt = nowIso();
        const id = createId("node");
        const mapNodeCount = Object.values(workspace.nodes).filter((item) => item.mapId === activeMap.id).length;
        const kind = activeMap.kind === "build" ? "feature" : activeMap.kind === "trace" ? "step" : "concept";
        const next = cloneDocument(workspace);
        next.nodes[id] = {
          id,
          mapId: activeMap.id,
          kind,
          title: activeMap.kind === "build" ? "New feature" : activeMap.kind === "trace" ? "New step" : "New concept",
          description: "",
          position: { x: 72 + mapNodeCount * 18, y: 72 + mapNodeCount * 12 },
          scopeState: activeMap.kind === "build" ? "included" : undefined,
          deliveryStatus: activeMap.kind === "build" ? "not_started" : undefined,
          learningState: activeMap.kind === "learn" ? "unknown" : undefined,
          locked: false,
          tags: [],
          evidence: [],
          createdAt,
          updatedAt: createdAt,
        };
        set({
          workspace: withActivity(next, {
            source: "human",
            action: "node_created",
            summary: `Added ${next.nodes[id].title}.`,
          }),
          selectedNodeIds: [id],
        });
        return id;
      },

      connectNodes: (source, target) => {
        const workspace = get().workspace;
        const sourceNode = workspace.nodes[source];
        const targetNode = workspace.nodes[target];
        if (!sourceNode || !targetNode || sourceNode.mapId !== targetNode.mapId || source === target) return;
        const next = cloneDocument(workspace);
        const createdAt = nowIso();
        const id = createId("edge");
        const relation: CanvasEdge["relation"] = workspace.maps[sourceNode.mapId].kind === "trace" ? "flows_to" : "related_to";
        next.edges[id] = { id, mapId: sourceNode.mapId, source, target, relation, createdAt };
        set({
          workspace: withActivity(next, {
            source: "human",
            action: "nodes_connected",
            summary: `Connected ${sourceNode.title} to ${targetNode.title}.`,
          }),
        });
      },

      deleteNodes: (nodeIds) => {
        const existing = nodeIds.filter((id) => get().workspace.nodes[id]);
        if (existing.length === 0) return;
        const next = cascadeDelete(get().workspace, existing);
        set({
          workspace: withActivity(next, {
            source: "human",
            action: "nodes_deleted",
            summary: `Deleted ${existing.length} ${existing.length === 1 ? "node" : "nodes"} and linked maps.`,
          }),
          selectedNodeIds: [],
          pendingIntent: null,
        });
      },

      acceptAllProposed: () => {
        const next = cloneDocument(get().workspace);
        let count = 0;
        for (const node of Object.values(next.nodes)) {
          if (node.kind === "feature" && node.scopeState === "proposed" && !node.locked) {
            node.scopeState = "included";
            node.deliveryStatus ??= "not_started";
            node.updatedAt = nowIso();
            count += 1;
          }
        }
        if (count === 0) return;
        set({
          workspace: withActivity(next, {
            source: "human",
            action: "scope_accepted",
            summary: `Included ${count} proposed ${count === 1 ? "feature" : "features"}.`,
          }),
        });
      },

      addHumanEvidence: (nodeId, evidence) => {
        const existing = get().workspace.nodes[nodeId];
        if (!existing) return;
        const next = cloneDocument(get().workspace);
        next.nodes[nodeId].evidence.push({
          ...evidence,
          id: createId("evidence"),
          addedBy: "human",
          createdAt: nowIso(),
        });
        next.nodes[nodeId].updatedAt = nowIso();
        set({
          workspace: withActivity(next, {
            source: "human",
            action: "evidence_added",
            summary: `Added evidence to ${existing.title}.`,
          }),
        });
      },
    }),
    {
      limit: 50,
      partialize: (state) => ({ workspace: state.workspace }),
      equality: (past, current) => past.workspace === current.workspace,
    },
  ),
);

export function getSelectedNodes(): CanvasNode[] {
  const state = useWorkspaceStore.getState();
  return state.selectedNodeIds.flatMap((id) => (state.workspace.nodes[id] ? [state.workspace.nodes[id]] : []));
}

export function getActiveMap(): CanvasMap | undefined {
  const state = useWorkspaceStore.getState();
  return state.workspace.maps[state.workspace.activeMapId];
}

export function getActiveMapNodes(): CanvasNode[] {
  const state = useWorkspaceStore.getState();
  return Object.values(state.workspace.nodes).filter((node) => node.mapId === state.workspace.activeMapId);
}

export function getActiveMapEdges(): CanvasEdge[] {
  const state = useWorkspaceStore.getState();
  return Object.values(state.workspace.edges).filter((edge) => edge.mapId === state.workspace.activeMapId);
}
