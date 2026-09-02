"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  applyNodeChanges,
  useReactFlow,
  type Connection,
  type Edge,
  type NodeChange,
  type OnMoveEnd,
} from "@xyflow/react";
import { Focus, LayoutDashboard, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SemanticNode, type SemanticFlowNode } from "@/components/canvas/semantic-node";
import { layoutNodes } from "@/lib/layout";
import { linkedMapsForNode } from "@/lib/model";
import { useWorkspaceStore } from "@/lib/store";

const nodeTypes = { semantic: SemanticNode };

function colorForKind(kind: string): string {
  if (kind === "project") return "var(--chart-5)";
  if (kind === "group") return "var(--chart-1)";
  if (kind === "feature") return "var(--chart-4)";
  if (kind === "step") return "var(--chart-2)";
  if (kind === "concept") return "var(--chart-3)";
  if (kind === "question") return "var(--chart-1)";
  return "var(--ring)";
}

function colorForHighlight(tone: "focus" | "risk" | "success"): string {
  if (tone === "risk") return "var(--destructive)";
  if (tone === "success") return "var(--status-positive)";
  return "var(--chart-2)";
}

interface CanvasWorkspaceProps {
  isInspectorOpen: boolean;
  onOpenInspector: () => void;
}

function CanvasInner({ isInspectorOpen, onOpenInspector }: CanvasWorkspaceProps) {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const selectedNodeIds = useWorkspaceStore((state) => state.selectedNodeIds);
  const highlight = useWorkspaceStore((state) => state.highlight);
  const viewportCommand = useWorkspaceStore((state) => state.viewportCommand);
  const setSelection = useWorkspaceStore((state) => state.setSelection);
  const connectNodes = useWorkspaceStore((state) => state.connectNodes);
  const deleteNodes = useWorkspaceStore((state) => state.deleteNodes);
  const updateNodePositions = useWorkspaceStore((state) => state.updateNodePositions);
  const updateMapViewport = useWorkspaceStore((state) => state.updateMapViewport);
  const requestFocus = useWorkspaceStore((state) => state.requestFocus);
  const setHighlight = useWorkspaceStore((state) => state.setHighlight);
  const loadDemoWorkspace = useWorkspaceStore((state) => state.loadDemoWorkspace);
  const activeMap = workspace.maps[workspace.activeMapId];
  const documentNodes = workspace.nodes;
  const documentEdges = workspace.edges;
  const activeMapId = workspace.activeMapId;
  const mapNodes = useMemo(
    () => Object.values(documentNodes).filter((node) => node.mapId === activeMapId),
    [activeMapId, documentNodes],
  );
  const mapEdges = useMemo(
    () => Object.values(documentEdges).filter((edge) => edge.mapId === activeMapId),
    [activeMapId, documentEdges],
  );
  const highlightedNodeIds = useMemo(() => new Set(highlight?.nodeIds ?? []), [highlight]);
  const hasVisibleHighlight = useMemo(
    () => mapNodes.some((node) => highlightedNodeIds.has(node.id)),
    [highlightedNodeIds, mapNodes],
  );
  const mapLinksFingerprint = Object.values(workspace.maps)
    .map((map) => `${map.id}:${map.parentNodeId ?? ""}`)
    .sort()
    .join("|");

  const projectedNodes = useMemo<SemanticFlowNode[]>(
    () =>
      mapNodes.map((node) => ({
        id: node.id,
        type: "semantic",
        position: node.position,
        className: hasVisibleHighlight
          ? highlightedNodeIds.has(node.id)
            ? "path-highlighted"
            : "path-dimmed"
          : undefined,
        data: {
          node,
          linkedMapCount: linkedMapsForNode(workspace, node.id).length,
          highlighted: highlightedNodeIds.has(node.id) ? highlight?.tone : undefined,
          appSelected: selectedNodeIds.includes(node.id),
          inspectorOpen: isInspectorOpen,
          onOpenDetails: onOpenInspector,
        },
        draggable: true,
      })),
    // The primitive link fingerprint deliberately ignores viewport-only map updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hasVisibleHighlight, highlight?.tone, highlightedNodeIds, isInspectorOpen, mapLinksFingerprint, mapNodes, onOpenInspector, selectedNodeIds],
  );
  const [flowNodes, setFlowNodes] = useState<SemanticFlowNode[]>(projectedNodes);

  useEffect(() => {
    // React Flow keeps drag positions locally; durable workspace changes can also arrive from WebMCP.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFlowNodes(projectedNodes);
  }, [projectedNodes]);

  const flowEdges = useMemo<Edge[]>(
    () =>
      mapEdges.map((edge) => {
        const isHighlighted =
          hasVisibleHighlight && highlightedNodeIds.has(edge.source) && highlightedNodeIds.has(edge.target);
        const highlightColor = highlight ? colorForHighlight(highlight.tone) : "var(--border-strong)";

        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          label: edge.label,
          type: "smoothstep",
          animated: isHighlighted,
          className: hasVisibleHighlight ? (isHighlighted ? "path-highlighted" : "path-dimmed") : undefined,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 14,
            height: 14,
            color: isHighlighted ? highlightColor : "var(--muted-foreground)",
          },
          style: {
            stroke: isHighlighted ? highlightColor : "var(--border-strong)",
            strokeWidth: isHighlighted ? 2.25 : 1.35,
          },
          labelStyle: {
            fontSize: 10,
            fill: isHighlighted ? highlightColor : "var(--muted-foreground)",
            fontWeight: isHighlighted ? 650 : 400,
          },
        };
      }),
    [hasVisibleHighlight, highlight, highlightedNodeIds, mapEdges],
  );

  const onNodesChange = useCallback((changes: NodeChange<SemanticFlowNode>[]) => {
    setFlowNodes((current) => applyNodeChanges(changes, current));
  }, []);

  const onNodeDragStop = useCallback(
    (_event: MouseEvent | TouchEvent, node: SemanticFlowNode) =>
      updateNodePositions([{ id: node.id, position: node.position }]),
    [updateNodePositions],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) connectNodes(connection.source, connection.target);
    },
    [connectNodes],
  );

  const onMoveEnd: OnMoveEnd = useCallback(
    (_event, viewport) => {
      if (activeMap) updateMapViewport(activeMap.id, viewport);
    },
    [activeMap, updateMapViewport],
  );

  function autoLayout() {
    const direction = activeMap?.kind === "learn" ? "TB" : "LR";
    const laidOut = layoutNodes(mapNodes, mapEdges, direction);
    updateNodePositions(laidOut.map((node) => ({ id: node.id, position: node.position })));
    window.setTimeout(() => requestFocus(laidOut.map((node) => node.id)), 60);
  }

  if (!activeMap) {
    return <div className="canvas-error">This map no longer exists. Undo the last change or import a valid workspace.</div>;
  }

  return (
    <ReactFlow
      colorMode="light"
      defaultViewport={activeMap.viewport}
      deleteKeyCode={["Backspace", "Delete"]}
      edges={flowEdges}
      fitViewOptions={{ padding: 0.22, maxZoom: 1.25, duration: 500 }}
      minZoom={0.18}
      nodeTypes={nodeTypes}
      nodes={flowNodes}
      nodesConnectable
      onConnect={onConnect}
      onMoveEnd={onMoveEnd}
      onNodeClick={(_event, node) => setSelection([node.id])}
      onNodeDragStop={onNodeDragStop}
      onNodesChange={onNodesChange}
      onNodesDelete={(nodes) => deleteNodes(nodes.map((node) => node.id))}
      onPaneClick={() => setSelection([])}
      selectionOnDrag
      snapGrid={[12, 12]}
      snapToGrid
    >
      <Background color="var(--border)" gap={22} size={1} variant={BackgroundVariant.Dots} />
      <MiniMap
        maskColor="color-mix(in oklch, var(--background) 82%, transparent)"
        nodeColor={(node) => colorForKind((node.data as SemanticFlowNode["data"]).node.kind)}
        nodeStrokeWidth={2}
        pannable
        zoomable
      />
      <Controls position="bottom-center" showInteractive={false} />
      <Panel className="canvas-tools" position="top-right">
        <button onClick={autoLayout} title="Auto-layout this map" type="button">
          <LayoutDashboard size={15} /> Layout
        </button>
        {mapNodes.length > 0 ? (
          <button onClick={() => requestFocus(mapNodes.map((node) => node.id))} title="Fit this map" type="button">
            <Focus size={15} /> Fit
          </button>
        ) : null}
        {highlight ? (
          <button onClick={() => setHighlight(null)} title="Clear path highlight" type="button">
            <X size={15} /> Clear
          </button>
        ) : null}
      </Panel>
      {mapNodes.length === 0 ? (
        <Panel className="empty-canvas" position="top-center">
          <span className="eyebrow">Blank workspace</span>
          <h1>Map a product with your agent.</h1>
          <p>Ask your external agent to research the product, then let it create a durable, cited map here through WebMCP.</p>
          <code>Research MyFitnessPal and map the features we’d need for a clone.</code>
          <div>
            <button className="toolbar-button primary" onClick={loadDemoWorkspace} type="button">Load source-backed demo</button>
          </div>
        </Panel>
      ) : null}
      <ViewportCommander commandId={viewportCommand?.id} nodeIds={viewportCommand?.nodeIds ?? []} />
    </ReactFlow>
  );
}

function ViewportCommander({ commandId, nodeIds }: { commandId?: string; nodeIds: string[] }) {
  const { fitView } = useReactFlow();

  useEffect(() => {
    if (!commandId || nodeIds.length === 0) return;
    void fitView({ nodes: nodeIds.map((id) => ({ id })), padding: 0.28, duration: 500, maxZoom: 1.35 });
  }, [commandId, fitView, nodeIds]);
  return null;
}

export function CanvasWorkspace({ isInspectorOpen, onOpenInspector }: CanvasWorkspaceProps) {
  const activeMapId = useWorkspaceStore((state) => state.workspace.activeMapId);
  return (
    <div className="canvas-shell">
      <ReactFlowProvider key={activeMapId}>
        <CanvasInner isInspectorOpen={isInspectorOpen} onOpenInspector={onOpenInspector} />
      </ReactFlowProvider>
    </div>
  );
}
