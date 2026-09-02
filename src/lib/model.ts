export const WORKSPACE_SCHEMA_VERSION = 1 as const;

export type MapKind = "build" | "trace" | "learn";
export type NodeKind =
  | "project"
  | "group"
  | "feature"
  | "step"
  | "code"
  | "concept"
  | "question"
  | "note"
  | "exercise";
export type ScopeState = "proposed" | "included" | "excluded";
export type DeliveryStatus = "not_started" | "partial" | "complete";
export type LearningState = "unknown" | "learning" | "known";
export type EvidenceKind = "source_url" | "file" | "test" | "commit" | "note";
export type EdgeRelation =
  | "contains"
  | "implements"
  | "flows_to"
  | "depends_on"
  | "prerequisite"
  | "related_to";
export type ActivitySource = "human" | "agent" | "system";
export type HighlightTone = "focus" | "risk" | "success";
export type WebMcpStatus = "checking" | "available" | "unavailable" | "error";

export interface CanvasPosition {
  x: number;
  y: number;
}

export interface MapViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface Evidence {
  id: string;
  kind: EvidenceKind;
  label: string;
  ref: string;
  note?: string;
  addedBy: ActivitySource;
  createdAt: string;
}

export interface QuizContent {
  choices: string[];
  correctChoiceIndex: number;
  explanation?: string;
}

export interface CanvasNode {
  id: string;
  mapId: string;
  kind: NodeKind;
  title: string;
  description: string;
  position: CanvasPosition;
  scopeState?: ScopeState;
  deliveryStatus?: DeliveryStatus;
  learningState?: LearningState;
  quiz?: QuizContent;
  locked: boolean;
  tags: string[];
  evidence: Evidence[];
  createdAt: string;
  updatedAt: string;
}

export interface CanvasEdge {
  id: string;
  mapId: string;
  source: string;
  target: string;
  relation: EdgeRelation;
  label?: string;
  createdAt: string;
}

export interface CanvasMap {
  id: string;
  title: string;
  kind: MapKind;
  parentNodeId?: string;
  viewport: MapViewport;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityEntry {
  id: string;
  source: ActivitySource;
  action: string;
  summary: string;
  createdAt: string;
}

export interface WorkspaceDocument {
  schemaVersion: typeof WORKSPACE_SCHEMA_VERSION;
  id: string;
  name: string;
  activeMapId: string;
  maps: Record<string, CanvasMap>;
  nodes: Record<string, CanvasNode>;
  edges: Record<string, CanvasEdge>;
  activity: ActivityEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface PendingIntent {
  id: string;
  type: "trace" | "learn";
  nodeId: string;
  createdAt: string;
}

export interface HighlightState {
  nodeIds: string[];
  tone: HighlightTone;
}

export interface ViewportCommand {
  id: string;
  nodeIds: string[];
}

export interface ActivityDescriptor {
  source: ActivitySource;
  action: string;
  summary: string;
}

export function nodesForMap(document: WorkspaceDocument, mapId: string): CanvasNode[] {
  return Object.values(document.nodes).filter((node) => node.mapId === mapId);
}

export function edgesForMap(document: WorkspaceDocument, mapId: string): CanvasEdge[] {
  return Object.values(document.edges).filter((edge) => edge.mapId === mapId);
}

export function linkedMapsForNode(document: WorkspaceDocument, nodeId: string): CanvasMap[] {
  return Object.values(document.maps).filter((map) => map.parentNodeId === nodeId);
}
