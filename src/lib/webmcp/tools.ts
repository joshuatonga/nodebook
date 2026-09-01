import type { ModelContext, ModelContextTool } from "@mcp-b/webmcp-types";
import { z } from "zod";
import { createId, nowIso } from "@/lib/ids";
import { layoutNodes } from "@/lib/layout";
import {
  edgesForMap,
  linkedMapsForNode,
  nodesForMap,
  type ActivityDescriptor,
  type CanvasEdge,
  type CanvasMap,
  type CanvasNode,
  type Evidence,
  type HighlightState,
  type PendingIntent,
  type WorkspaceDocument,
} from "@/lib/model";
import { calculateDeliveryProgress } from "@/lib/progress";

const MAX_BATCH_NODES = 100;
const MAX_BATCH_EDGES = 200;
const MAX_EVIDENCE = 20;

const idSchema = z.string().min(1).max(160);
const nodeKindSchema = z.enum(["project", "group", "feature", "step", "code", "concept", "question", "note", "exercise"]);
const relationSchema = z.enum(["contains", "implements", "flows_to", "depends_on", "prerequisite", "related_to"]);
const mapKindSchema = z.enum(["build", "trace", "learn"]);
const evidenceKindSchema = z.enum(["source_url", "file", "test", "commit", "note"]);
const evidenceInputSchema = z
  .object({
    kind: evidenceKindSchema,
    label: z.string().min(1).max(240),
    ref: z.string().max(2048),
    note: z.string().max(1000).optional(),
  })
  .strict();
const nodeInputSchema = z
  .object({
    id: idSchema,
    kind: nodeKindSchema,
    title: z.string().min(1).max(120),
    description: z.string().max(1200).optional(),
    x: z.number().finite().optional(),
    y: z.number().finite().optional(),
    tags: z.array(z.string().min(1).max(48)).max(20).optional(),
    locked: z.boolean().optional(),
    evidence: z.array(evidenceInputSchema).max(MAX_EVIDENCE).optional(),
  })
  .strict();
const edgeInputSchema = z
  .object({
    id: idSchema.optional(),
    source: idSchema,
    target: idSchema,
    relation: relationSchema,
    label: z.string().max(120).optional(),
  })
  .strict();

const jsonEvidenceSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    kind: { type: "string", enum: ["source_url", "file", "test", "commit", "note"] },
    label: { type: "string", minLength: 1, maxLength: 240 },
    ref: { type: "string", maxLength: 2048 },
    note: { type: "string", maxLength: 1000 },
  },
  required: ["kind", "label", "ref"],
} as const;

const jsonNodeSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    id: { type: "string", minLength: 1, maxLength: 160 },
    kind: { type: "string", enum: ["project", "group", "feature", "step", "code", "concept", "question", "note", "exercise"] },
    title: { type: "string", minLength: 1, maxLength: 120 },
    description: { type: "string", maxLength: 1200 },
    x: { type: "number" },
    y: { type: "number" },
    tags: { type: "array", maxItems: 20, items: { type: "string", minLength: 1, maxLength: 48 } },
    locked: { type: "boolean" },
    evidence: { type: "array", maxItems: MAX_EVIDENCE, items: jsonEvidenceSchema },
  },
  required: ["id", "kind", "title"],
} as const;

const jsonEdgeSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    id: { type: "string", minLength: 1, maxLength: 160 },
    source: { type: "string", minLength: 1, maxLength: 160 },
    target: { type: "string", minLength: 1, maxLength: 160 },
    relation: { type: "string", enum: ["contains", "implements", "flows_to", "depends_on", "prerequisite", "related_to"] },
    label: { type: "string", maxLength: 120 },
  },
  required: ["source", "target", "relation"],
} as const;

export interface ToolRuntimeSnapshot {
  workspace: WorkspaceDocument;
  selectedNodeIds: string[];
  pendingIntent: PendingIntent | null;
}

export interface NodebookToolRuntime {
  getSnapshot: () => ToolRuntimeSnapshot;
  commitWorkspace: (workspace: WorkspaceDocument, activity: ActivityDescriptor) => void;
  activateMap: (mapId: string) => void;
  clearIntent: () => void;
  focusNodes: (nodeIds: string[]) => void;
  setHighlight: (highlight: HighlightState | null) => void;
}

type NodebookTool = Omit<ModelContextTool<Record<string, unknown>, unknown, string>, "inputSchema"> & {
  inputSchema: NonNullable<ModelContextTool["inputSchema"]>;
};

interface ToolResult<T> {
  content: Array<{ type: "text"; text: string }>;
  structuredContent: T;
}

function result<T>(payload: T): ToolResult<T> {
  return {
    content: [{ type: "text", text: JSON.stringify(payload) }],
    structuredContent: payload,
  };
}

function cloneDocument(document: WorkspaceDocument): WorkspaceDocument {
  return structuredClone(document);
}

function evidenceFromInput(input: z.infer<typeof evidenceInputSchema>): Evidence {
  if (input.kind === "source_url") {
    const url = new URL(input.ref);
    if (url.protocol !== "https:") throw new Error("Research sources must use HTTPS URLs.");
  }
  return {
    ...input,
    id: createId("evidence"),
    addedBy: "agent",
    createdAt: nowIso(),
  };
}

function nodeFromInput(mapId: string, input: z.infer<typeof nodeInputSchema>): CanvasNode {
  const createdAt = nowIso();
  return {
    id: input.id,
    mapId,
    kind: input.kind,
    title: input.title,
    description: input.description ?? "",
    position: { x: input.x ?? 0, y: input.y ?? 0 },
    scopeState: input.kind === "feature" ? "proposed" : undefined,
    deliveryStatus: input.kind === "feature" ? "not_started" : undefined,
    learningState: input.kind === "concept" || input.kind === "exercise" ? "unknown" : undefined,
    locked: input.locked ?? false,
    tags: input.tags ?? [],
    evidence: (input.evidence ?? []).map(evidenceFromInput),
    createdAt,
    updatedAt: createdAt,
  };
}

function edgeFromInput(mapId: string, input: z.infer<typeof edgeInputSchema>): CanvasEdge {
  return {
    id: input.id ?? createId("edge"),
    mapId,
    source: input.source,
    target: input.target,
    relation: input.relation,
    label: input.label,
    createdAt: nowIso(),
  };
}

function compactNode(node: CanvasNode, includeEvidence = false): Record<string, unknown> {
  return {
    id: node.id,
    kind: node.kind,
    title: node.title,
    description: node.description,
    scopeState: node.scopeState,
    deliveryStatus: node.deliveryStatus,
    learningState: node.learningState,
    locked: node.locked,
    tags: node.tags,
    ...(includeEvidence ? { evidence: node.evidence } : { evidenceCount: node.evidence.length }),
  };
}

function ensureMap(workspace: WorkspaceDocument, mapId?: string): CanvasMap {
  const resolved = mapId ?? workspace.activeMapId;
  const map = workspace.maps[resolved];
  if (!map) throw new Error(`Map ${resolved} does not exist.`);
  return map;
}

function ensureUniqueNodeIds(workspace: WorkspaceDocument, nodes: z.infer<typeof nodeInputSchema>[]): void {
  const seen = new Set<string>();
  for (const node of nodes) {
    if (seen.has(node.id)) throw new Error(`Duplicate node id in request: ${node.id}`);
    if (workspace.nodes[node.id]) throw new Error(`Node id already exists: ${node.id}`);
    seen.add(node.id);
  }
}

function validateEdgesAgainstNodes(edges: CanvasEdge[], nodeIds: Set<string>): void {
  const edgeIds = new Set<string>();
  for (const edge of edges) {
    if (edgeIds.has(edge.id)) throw new Error(`Duplicate edge id: ${edge.id}`);
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      throw new Error(`Edge ${edge.id} references a missing node.`);
    }
    if (edge.source === edge.target) throw new Error(`Edge ${edge.id} cannot connect a node to itself.`);
    edgeIds.add(edge.id);
  }
}

export function createNodebookTools(runtime: NodebookToolRuntime): NodebookTool[] {
  const getWorkspaceSchema = z.object({}).strict();
  const getMapSchema = z.object({ mapId: idSchema.optional(), includeEvidence: z.boolean().optional() }).strict();
  const getNodeSchema = z.object({ nodeId: idSchema }).strict();
  const searchNodesSchema = z
    .object({
      query: z.string().min(1).max(200),
      mapId: idSchema.optional(),
      kinds: z.array(nodeKindSchema).max(9).optional(),
      limit: z.number().int().min(1).max(50).optional(),
    })
    .strict();
  const createMapSchema = z
    .object({
      title: z.string().min(1).max(120),
      kind: mapKindSchema,
      parentNodeId: idSchema.optional(),
      nodes: z.array(nodeInputSchema).min(1).max(MAX_BATCH_NODES),
      edges: z.array(edgeInputSchema).max(MAX_BATCH_EDGES).default([]),
      activate: z.boolean().optional(),
    })
    .strict();
  const upsertGraphSchema = z
    .object({
      mapId: idSchema.optional(),
      nodes: z.array(nodeInputSchema).max(MAX_BATCH_NODES).default([]),
      edges: z.array(edgeInputSchema).max(MAX_BATCH_EDGES).default([]),
      autoLayout: z.boolean().optional(),
    })
    .strict();
  const scopeSchema = z
    .object({
      updates: z
        .array(
          z
            .object({
              nodeId: idSchema,
              state: z.enum(["proposed", "included", "excluded"]),
              rationale: z.string().max(500).optional(),
            })
            .strict(),
        )
        .min(1)
        .max(100),
    })
    .strict();
  const deliverySchema = z
    .object({
      updates: z
        .array(
          z
            .object({
              nodeId: idSchema,
              status: z.enum(["not_started", "partial", "complete"]),
              evidence: z.array(evidenceInputSchema).max(MAX_EVIDENCE).optional(),
            })
            .strict(),
        )
        .min(1)
        .max(100),
    })
    .strict();
  const learningSchema = z
    .object({
      updates: z
        .array(
          z.object({ nodeId: idSchema, state: z.enum(["unknown", "learning", "known"]), locked: z.boolean().optional() }).strict(),
        )
        .min(1)
        .max(100),
    })
    .strict();
  const addEvidenceSchema = z
    .object({ nodeId: idSchema, evidence: z.array(evidenceInputSchema).min(1).max(MAX_EVIDENCE) })
    .strict();
  const focusSchema = z.object({ nodeIds: z.array(idSchema).min(1).max(100) }).strict();
  const highlightSchema = z
    .object({ nodeIds: z.array(idSchema).min(1).max(100), tone: z.enum(["focus", "risk", "success"]) })
    .strict();

  return [
    {
      name: "get_workspace",
      title: "Get Nodebook workspace",
      description: "Return the current workspace, its maps, delivery progress, selection, and pending human intent.",
      inputSchema: { type: "object", additionalProperties: false, properties: {} },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: (raw) => {
        getWorkspaceSchema.parse(raw);
        const snapshot = runtime.getSnapshot();
        const progress = calculateDeliveryProgress(snapshot.workspace);
        return result({
          id: snapshot.workspace.id,
          name: snapshot.workspace.name,
          activeMapId: snapshot.workspace.activeMapId,
          maps: Object.values(snapshot.workspace.maps).map((map) => ({
            id: map.id,
            title: map.title,
            kind: map.kind,
            parentNodeId: map.parentNodeId,
          })),
          progress,
          selectedNodeIds: snapshot.selectedNodeIds,
          pendingIntent: snapshot.pendingIntent,
        });
      },
    },
    {
      name: "get_map",
      title: "Get a Nodebook map",
      description: "Return the requested map or active map with compact nodes and edges.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: { mapId: { type: "string", maxLength: 160 }, includeEvidence: { type: "boolean" } },
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: (raw) => {
        const input = getMapSchema.parse(raw);
        const workspace = runtime.getSnapshot().workspace;
        const map = ensureMap(workspace, input.mapId);
        return result({
          map,
          nodes: nodesForMap(workspace, map.id).map((node) => compactNode(node, input.includeEvidence)),
          edges: edgesForMap(workspace, map.id),
        });
      },
    },
    {
      name: "get_node",
      title: "Get a Nodebook node",
      description: "Return full node details, citations or evidence, and any maps linked from it.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: { nodeId: { type: "string", minLength: 1, maxLength: 160 } },
        required: ["nodeId"],
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: (raw) => {
        const input = getNodeSchema.parse(raw);
        const workspace = runtime.getSnapshot().workspace;
        const node = workspace.nodes[input.nodeId];
        if (!node) throw new Error(`Node ${input.nodeId} does not exist.`);
        return result({ node, linkedMaps: linkedMapsForNode(workspace, node.id) });
      },
    },
    {
      name: "get_selection",
      title: "Get human selection",
      description: "Return the nodes selected by the human and any pending Trace or Learn intent.",
      inputSchema: { type: "object", additionalProperties: false, properties: {} },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: (raw) => {
        getWorkspaceSchema.parse(raw);
        const snapshot = runtime.getSnapshot();
        return result({
          nodes: snapshot.selectedNodeIds.flatMap((id) =>
            snapshot.workspace.nodes[id] ? [compactNode(snapshot.workspace.nodes[id], true)] : [],
          ),
          pendingIntent: snapshot.pendingIntent,
        });
      },
    },
    {
      name: "search_nodes",
      title: "Search Nodebook nodes",
      description: "Search node titles, descriptions, tags, and evidence across the workspace.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          query: { type: "string", minLength: 1, maxLength: 200 },
          mapId: { type: "string", maxLength: 160 },
          kinds: { type: "array", maxItems: 9, items: jsonNodeSchema.properties.kind },
          limit: { type: "integer", minimum: 1, maximum: 50 },
        },
        required: ["query"],
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: (raw) => {
        const input = searchNodesSchema.parse(raw);
        const workspace = runtime.getSnapshot().workspace;
        const query = input.query.toLocaleLowerCase();
        const matches = Object.values(workspace.nodes)
          .filter((node) => !input.mapId || node.mapId === input.mapId)
          .filter((node) => !input.kinds || input.kinds.includes(node.kind))
          .filter((node) =>
            [node.title, node.description, ...node.tags, ...node.evidence.flatMap((item) => [item.label, item.ref, item.note ?? ""])]
              .join(" ")
              .toLocaleLowerCase()
              .includes(query),
          )
          .slice(0, input.limit ?? 20)
          .map((node) => compactNode(node, true));
        return result({ query: input.query, count: matches.length, nodes: matches });
      },
    },
    {
      name: "create_map",
      title: "Create a semantic map",
      description: "Batch-create a source-backed build, trace, or learn map, link it to a node, lay it out, save it, and optionally open it.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string", minLength: 1, maxLength: 120 },
          kind: { type: "string", enum: ["build", "trace", "learn"] },
          parentNodeId: { type: "string", maxLength: 160 },
          nodes: { type: "array", minItems: 1, maxItems: MAX_BATCH_NODES, items: jsonNodeSchema },
          edges: { type: "array", maxItems: MAX_BATCH_EDGES, items: jsonEdgeSchema },
          activate: { type: "boolean" },
        },
        required: ["title", "kind", "nodes"],
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (raw) => {
        const input = createMapSchema.parse(raw);
        const snapshot = runtime.getSnapshot();
        if (input.parentNodeId && !snapshot.workspace.nodes[input.parentNodeId]) {
          throw new Error(`Parent node ${input.parentNodeId} does not exist.`);
        }
        ensureUniqueNodeIds(snapshot.workspace, input.nodes);
        const mapId = createId("map");
        const createdAt = nowIso();
        const rawNodes = input.nodes.map((item) => nodeFromInput(mapId, item));
        const edges = input.edges.map((item) => edgeFromInput(mapId, item));
        validateEdgesAgainstNodes(edges, new Set(rawNodes.map((node) => node.id)));
        const nodes = layoutNodes(rawNodes, edges, input.kind === "learn" ? "TB" : "LR");
        const next = cloneDocument(snapshot.workspace);
        next.maps[mapId] = {
          id: mapId,
          title: input.title,
          kind: input.kind,
          parentNodeId: input.parentNodeId,
          viewport: { x: 0, y: 0, zoom: 0.9 },
          createdAt,
          updatedAt: createdAt,
        };
        for (const node of nodes) next.nodes[node.id] = node;
        for (const edge of edges) next.edges[edge.id] = edge;
        runtime.commitWorkspace(next, {
          source: "agent",
          action: "map_created",
          summary: `Created ${input.title} with ${nodes.length} nodes and ${edges.length} edges.`,
        });
        if (input.activate ?? true) runtime.activateMap(mapId);
        if (input.parentNodeId === snapshot.pendingIntent?.nodeId) runtime.clearIntent();
        return result({ mapId, title: input.title, kind: input.kind, nodeIds: nodes.map((node) => node.id), edgeCount: edges.length });
      },
    },
    {
      name: "upsert_graph",
      title: "Merge graph content",
      description: "Add or update nodes and edges in a map without replacing it. Locked nodes are skipped.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          mapId: { type: "string", maxLength: 160 },
          nodes: { type: "array", maxItems: MAX_BATCH_NODES, items: jsonNodeSchema },
          edges: { type: "array", maxItems: MAX_BATCH_EDGES, items: jsonEdgeSchema },
          autoLayout: { type: "boolean" },
        },
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (raw) => {
        const input = upsertGraphSchema.parse(raw);
        if (input.nodes.length === 0 && input.edges.length === 0) throw new Error("Provide at least one node or edge.");
        const snapshot = runtime.getSnapshot();
        const map = ensureMap(snapshot.workspace, input.mapId);
        const next = cloneDocument(snapshot.workspace);
        const skippedLocked: string[] = [];
        const changed: string[] = [];

        for (const item of input.nodes) {
          const existing = next.nodes[item.id];
          if (existing) {
            if (existing.mapId !== map.id) throw new Error(`Node ${item.id} belongs to another map.`);
            if (existing.locked) {
              skippedLocked.push(item.id);
              continue;
            }
            next.nodes[item.id] = {
              ...existing,
              kind: item.kind,
              title: item.title,
              description: item.description ?? existing.description,
              position: { x: item.x ?? existing.position.x, y: item.y ?? existing.position.y },
              tags: item.tags ?? existing.tags,
              locked: item.locked ?? existing.locked,
              evidence: item.evidence ? [...existing.evidence, ...item.evidence.map(evidenceFromInput)] : existing.evidence,
              updatedAt: nowIso(),
            };
          } else {
            next.nodes[item.id] = nodeFromInput(map.id, item);
          }
          changed.push(item.id);
        }

        for (const item of input.edges) {
          const created = edgeFromInput(map.id, item);
          const source = next.nodes[created.source];
          const target = next.nodes[created.target];
          if (!source || !target || source.mapId !== map.id || target.mapId !== map.id) {
            throw new Error(`Edge ${created.id} references a node outside ${map.title}.`);
          }
          next.edges[created.id] = created;
        }

        if (input.autoLayout) {
          const mapNodes = nodesForMap(next, map.id);
          const mapEdges = edgesForMap(next, map.id);
          for (const laidOut of layoutNodes(mapNodes, mapEdges, map.kind === "learn" ? "TB" : "LR")) {
            next.nodes[laidOut.id] = laidOut;
          }
        }
        runtime.commitWorkspace(next, {
          source: "agent",
          action: "graph_updated",
          summary: `Merged ${changed.length} nodes and ${input.edges.length} edges into ${map.title}.`,
        });
        return result({ mapId: map.id, changedNodeIds: changed, edgeCount: input.edges.length, skippedLocked });
      },
    },
    {
      name: "set_scope_decisions",
      title: "Set feature scope",
      description: "Batch mark features proposed, included, or excluded. Exclusions require a rationale; locked features are skipped.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          updates: {
            type: "array",
            minItems: 1,
            maxItems: 100,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                nodeId: { type: "string", maxLength: 160 },
                state: { type: "string", enum: ["proposed", "included", "excluded"] },
                rationale: { type: "string", maxLength: 500 },
              },
              required: ["nodeId", "state"],
            },
          },
        },
        required: ["updates"],
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (raw) => {
        const input = scopeSchema.parse(raw);
        const snapshot = runtime.getSnapshot();
        const next = cloneDocument(snapshot.workspace);
        const changed: string[] = [];
        const skippedLocked: string[] = [];
        for (const update of input.updates) {
          const node = next.nodes[update.nodeId];
          if (!node || node.kind !== "feature") throw new Error(`Feature ${update.nodeId} does not exist.`);
          if (node.locked) {
            skippedLocked.push(node.id);
            continue;
          }
          if (update.state === "excluded" && !update.rationale?.trim()) {
            throw new Error(`Excluding ${node.title} requires a rationale.`);
          }
          node.scopeState = update.state;
          node.deliveryStatus ??= "not_started";
          if (update.rationale) {
            node.evidence.push(
              evidenceFromInput({ kind: "note", label: "Scope rationale", ref: update.rationale }),
            );
          }
          node.updatedAt = nowIso();
          changed.push(node.id);
        }
        runtime.commitWorkspace(next, {
          source: "agent",
          action: "scope_updated",
          summary: `Updated scope for ${changed.length} ${changed.length === 1 ? "feature" : "features"}.`,
        });
        return result({ changedNodeIds: changed, skippedLocked, progress: calculateDeliveryProgress(next) });
      },
    },
    {
      name: "set_delivery_statuses",
      title: "Set delivery progress",
      description: "Batch update included feature delivery status and optionally attach file, test, commit, URL, or note evidence.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          updates: {
            type: "array",
            minItems: 1,
            maxItems: 100,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                nodeId: { type: "string", maxLength: 160 },
                status: { type: "string", enum: ["not_started", "partial", "complete"] },
                evidence: { type: "array", maxItems: MAX_EVIDENCE, items: jsonEvidenceSchema },
              },
              required: ["nodeId", "status"],
            },
          },
        },
        required: ["updates"],
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (raw) => {
        const input = deliverySchema.parse(raw);
        const snapshot = runtime.getSnapshot();
        const next = cloneDocument(snapshot.workspace);
        const changed: string[] = [];
        const skippedLocked: string[] = [];
        for (const update of input.updates) {
          const node = next.nodes[update.nodeId];
          if (!node || node.kind !== "feature") throw new Error(`Feature ${update.nodeId} does not exist.`);
          if (node.locked) {
            skippedLocked.push(node.id);
            continue;
          }
          if (node.scopeState !== "included") throw new Error(`${node.title} must be included before tracking delivery.`);
          node.deliveryStatus = update.status;
          if (update.evidence) node.evidence.push(...update.evidence.map(evidenceFromInput));
          node.updatedAt = nowIso();
          changed.push(node.id);
        }
        runtime.commitWorkspace(next, {
          source: "agent",
          action: "delivery_updated",
          summary: `Updated delivery status for ${changed.length} ${changed.length === 1 ? "feature" : "features"}.`,
        });
        return result({ changedNodeIds: changed, skippedLocked, progress: calculateDeliveryProgress(next) });
      },
    },
    {
      name: "set_learning_states",
      title: "Set learning state",
      description: "Batch mark concepts unknown, learning, or known; optionally lock the concepts after updating them.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          updates: {
            type: "array",
            minItems: 1,
            maxItems: 100,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                nodeId: { type: "string", maxLength: 160 },
                state: { type: "string", enum: ["unknown", "learning", "known"] },
                locked: { type: "boolean" },
              },
              required: ["nodeId", "state"],
            },
          },
        },
        required: ["updates"],
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (raw) => {
        const input = learningSchema.parse(raw);
        const snapshot = runtime.getSnapshot();
        const next = cloneDocument(snapshot.workspace);
        const changed: string[] = [];
        const skippedLocked: string[] = [];
        for (const update of input.updates) {
          const node = next.nodes[update.nodeId];
          if (!node || !["concept", "exercise", "question"].includes(node.kind)) {
            throw new Error(`Learning node ${update.nodeId} does not exist.`);
          }
          if (node.locked) {
            skippedLocked.push(node.id);
            continue;
          }
          node.learningState = update.state;
          if (typeof update.locked === "boolean") node.locked = update.locked;
          node.updatedAt = nowIso();
          changed.push(node.id);
        }
        runtime.commitWorkspace(next, {
          source: "agent",
          action: "learning_updated",
          summary: `Updated learning state for ${changed.length} ${changed.length === 1 ? "node" : "nodes"}.`,
        });
        return result({ changedNodeIds: changed, skippedLocked });
      },
    },
    {
      name: "add_evidence",
      title: "Add node evidence",
      description: "Attach research source URLs or later file, test, commit, and note evidence to an unlocked node.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          nodeId: { type: "string", maxLength: 160 },
          evidence: { type: "array", minItems: 1, maxItems: MAX_EVIDENCE, items: jsonEvidenceSchema },
        },
        required: ["nodeId", "evidence"],
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (raw) => {
        const input = addEvidenceSchema.parse(raw);
        const snapshot = runtime.getSnapshot();
        const node = snapshot.workspace.nodes[input.nodeId];
        if (!node) throw new Error(`Node ${input.nodeId} does not exist.`);
        if (node.locked) return result({ changed: false, skippedLocked: [node.id] });
        const next = cloneDocument(snapshot.workspace);
        next.nodes[node.id].evidence.push(...input.evidence.map(evidenceFromInput));
        next.nodes[node.id].updatedAt = nowIso();
        runtime.commitWorkspace(next, {
          source: "agent",
          action: "evidence_added",
          summary: `Added ${input.evidence.length} evidence ${input.evidence.length === 1 ? "item" : "items"} to ${node.title}.`,
        });
        return result({ changed: true, nodeId: node.id, evidenceCount: next.nodes[node.id].evidence.length });
      },
    },
    {
      name: "focus_nodes",
      title: "Focus canvas nodes",
      description: "Select nodes and fit the live canvas viewport around them without changing durable workspace data.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: { nodeIds: { type: "array", minItems: 1, maxItems: 100, items: { type: "string", maxLength: 160 } } },
        required: ["nodeIds"],
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (raw) => {
        const input = focusSchema.parse(raw);
        const workspace = runtime.getSnapshot().workspace;
        const existing = input.nodeIds.filter((id) => workspace.nodes[id]);
        if (existing.length === 0) throw new Error("None of the requested nodes exist.");
        runtime.focusNodes(existing);
        return result({ focusedNodeIds: existing });
      },
    },
    {
      name: "highlight_path",
      title: "Highlight a canvas path",
      description: "Highlight an ordered set of nodes using focus, risk, or success styling and fit them in view.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          nodeIds: { type: "array", minItems: 1, maxItems: 100, items: { type: "string", maxLength: 160 } },
          tone: { type: "string", enum: ["focus", "risk", "success"] },
        },
        required: ["nodeIds", "tone"],
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (raw) => {
        const input = highlightSchema.parse(raw);
        const workspace = runtime.getSnapshot().workspace;
        const existing = input.nodeIds.filter((id) => workspace.nodes[id]);
        if (existing.length === 0) throw new Error("None of the requested nodes exist.");
        runtime.setHighlight({ nodeIds: existing, tone: input.tone });
        runtime.focusNodes(existing);
        return result({ highlightedNodeIds: existing, tone: input.tone });
      },
    },
  ];
}

export async function registerNodebookTools(
  modelContext: ModelContext,
  runtime: NodebookToolRuntime,
  signal: AbortSignal,
): Promise<string[]> {
  const tools = createNodebookTools(runtime);
  await Promise.all(tools.map((tool) => modelContext.registerTool(tool, { signal })));
  return tools.map((tool) => tool.name);
}
