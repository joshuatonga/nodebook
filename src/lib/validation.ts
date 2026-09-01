import { z } from "zod";
import { createId, nowIso } from "@/lib/ids";
import { WORKSPACE_SCHEMA_VERSION, type WorkspaceDocument } from "@/lib/model";

const id = z.string().min(1).max(160);
const isoDate = z.string().min(10).max(64);
const positionSchema = z.object({ x: z.number().finite(), y: z.number().finite() });
const viewportSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  zoom: z.number().min(0.05).max(8),
});
const evidenceSchema = z.object({
  id,
  kind: z.enum(["source_url", "file", "test", "commit", "note"]),
  label: z.string().min(1).max(240),
  ref: z.string().max(2048),
  note: z.string().max(1000).optional(),
  addedBy: z.enum(["human", "agent", "system"]),
  createdAt: isoDate,
});
const nodeSchema = z.object({
  id,
  mapId: id,
  kind: z.enum(["project", "group", "feature", "step", "code", "concept", "question", "note", "exercise"]),
  title: z.string().min(1).max(120),
  description: z.string().max(1200),
  position: positionSchema,
  scopeState: z.enum(["proposed", "included", "excluded"]).optional(),
  deliveryStatus: z.enum(["not_started", "partial", "complete"]).optional(),
  learningState: z.enum(["unknown", "learning", "known"]).optional(),
  locked: z.boolean(),
  tags: z.array(z.string().min(1).max(48)).max(20),
  evidence: z.array(evidenceSchema).max(100),
  createdAt: isoDate,
  updatedAt: isoDate,
});
const edgeSchema = z.object({
  id,
  mapId: id,
  source: id,
  target: id,
  relation: z.enum(["contains", "implements", "flows_to", "depends_on", "prerequisite", "related_to"]),
  label: z.string().max(120).optional(),
  createdAt: isoDate,
});
const mapSchema = z.object({
  id,
  title: z.string().min(1).max(120),
  kind: z.enum(["build", "trace", "learn"]),
  parentNodeId: id.optional(),
  viewport: viewportSchema,
  createdAt: isoDate,
  updatedAt: isoDate,
});
const activitySchema = z.object({
  id,
  source: z.enum(["human", "agent", "system"]),
  action: z.string().min(1).max(100),
  summary: z.string().min(1).max(400),
  createdAt: isoDate,
});

export const workspaceDocumentSchema = z.object({
  schemaVersion: z.literal(WORKSPACE_SCHEMA_VERSION),
  id,
  name: z.string().min(1).max(120),
  activeMapId: id,
  maps: z.record(z.string(), mapSchema),
  nodes: z.record(z.string(), nodeSchema),
  edges: z.record(z.string(), edgeSchema),
  activity: z.array(activitySchema).max(100),
  createdAt: isoDate,
  updatedAt: isoDate,
});

const legacyWorkspaceDocumentSchema = workspaceDocumentSchema
  .omit({ schemaVersion: true, activity: true })
  .extend({
    schemaVersion: z.literal(0),
    activity: z.array(activitySchema).max(100).optional(),
  });

export function migrateWorkspaceDocument(input: unknown): unknown {
  if (!input || typeof input !== "object" || !("schemaVersion" in input)) return input;
  if ((input as { schemaVersion?: unknown }).schemaVersion !== 0) return input;
  const legacy = legacyWorkspaceDocumentSchema.parse(input);
  const createdAt = nowIso();
  return {
    ...legacy,
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
    activity: legacy.activity ?? [
      {
        id: createId("activity"),
        source: "system",
        action: "workspace_migrated",
        summary: "Migrated this workspace to Nodebook schema version 1.",
        createdAt,
      },
    ],
  };
}

export function parseWorkspaceDocument(input: unknown): WorkspaceDocument {
  const document = workspaceDocumentSchema.parse(migrateWorkspaceDocument(input));
  if (!document.maps[document.activeMapId]) {
    throw new Error("The active map does not exist.");
  }

  for (const [key, node] of Object.entries(document.nodes)) {
    if (key !== node.id) throw new Error(`Node dictionary key mismatch: ${key}`);
    if (!document.maps[node.mapId]) throw new Error(`Node ${node.id} references a missing map.`);
    for (const evidence of node.evidence) {
      if (evidence.kind === "source_url") {
        const url = new URL(evidence.ref);
        if (url.protocol !== "https:") throw new Error(`Source ${evidence.id} must use HTTPS.`);
      }
    }
  }

  for (const [key, edge] of Object.entries(document.edges)) {
    if (key !== edge.id) throw new Error(`Edge dictionary key mismatch: ${key}`);
    const source = document.nodes[edge.source];
    const target = document.nodes[edge.target];
    if (!source || !target) throw new Error(`Edge ${edge.id} references a missing node.`);
    if (source.mapId !== edge.mapId || target.mapId !== edge.mapId) {
      throw new Error(`Edge ${edge.id} crosses map boundaries.`);
    }
  }

  for (const map of Object.values(document.maps)) {
    if (map.parentNodeId && !document.nodes[map.parentNodeId]) {
      throw new Error(`Map ${map.id} references a missing parent node.`);
    }
  }

  return document;
}
