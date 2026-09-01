import type { ModelContext } from "@mcp-b/webmcp-types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDemoWorkspace } from "@/lib/demo";
import type { HighlightState, PendingIntent, WorkspaceDocument } from "@/lib/model";
import {
  createNodebookTools,
  registerNodebookTools,
  type NodebookToolRuntime,
} from "@/lib/webmcp/tools";

function createRuntime() {
  let workspace: WorkspaceDocument = createDemoWorkspace();
  let activeMapId = workspace.activeMapId;
  let pendingIntent: PendingIntent | null = null;
  let focused: string[] = [];
  let highlight: HighlightState | null = null;
  const commitWorkspace = vi.fn((next: WorkspaceDocument) => {
    workspace = next;
  });
  const runtime: NodebookToolRuntime = {
    getSnapshot: () => ({ workspace: { ...workspace, activeMapId }, selectedNodeIds: ["feature-food"], pendingIntent }),
    commitWorkspace,
    activateMap: (mapId) => {
      activeMapId = mapId;
    },
    clearIntent: () => {
      pendingIntent = null;
    },
    focusNodes: (ids) => {
      focused = ids;
    },
    setHighlight: (value) => {
      highlight = value;
    },
  };
  return {
    runtime,
    commitWorkspace,
    getWorkspace: () => workspace,
    getFocused: () => focused,
    getHighlight: () => highlight,
    setIntent: (intent: PendingIntent) => {
      pendingIntent = intent;
    },
  };
}

function getTool(runtime: NodebookToolRuntime, name: string) {
  const tool = createNodebookTools(runtime).find((candidate) => candidate.name === name);
  if (!tool) throw new Error(`Missing tool ${name}`);
  return tool;
}

describe("Nodebook WebMCP tools", () => {
  let fixture: ReturnType<typeof createRuntime>;

  beforeEach(() => {
    fixture = createRuntime();
  });

  it("registers the complete tool contract with strict schemas, annotations, and one lifecycle signal", async () => {
    const calls: Array<{ tool: ReturnType<typeof createNodebookTools>[number]; signal?: AbortSignal }> = [];
    const modelContext = {
      registerTool: vi.fn(async (tool, options) => {
        calls.push({ tool, signal: options?.signal });
      }),
    } as unknown as ModelContext;
    const controller = new AbortController();
    const names = await registerNodebookTools(modelContext, fixture.runtime, controller.signal);

    expect(names).toEqual([
      "get_workspace",
      "get_map",
      "get_node",
      "get_selection",
      "search_nodes",
      "create_map",
      "upsert_graph",
      "set_scope_decisions",
      "set_delivery_statuses",
      "set_learning_states",
      "add_evidence",
      "focus_nodes",
      "highlight_path",
    ]);
    expect(calls).toHaveLength(13);
    expect(calls.every(({ tool }) => tool.inputSchema.additionalProperties === false)).toBe(true);
    expect(calls.filter(({ tool }) => tool.name.startsWith("get_")).every(({ tool }) => tool.annotations?.readOnlyHint)).toBe(true);
    expect(calls.every(({ signal }) => signal === controller.signal)).toBe(true);
    controller.abort();
    expect(calls.every(({ signal }) => signal?.aborted)).toBe(true);
  });

  it("returns text and structured output for read tools", () => {
    const output = getTool(fixture.runtime, "get_workspace").execute({}) as {
      content: Array<{ text: string }>;
      structuredContent: { name: string; selectedNodeIds: string[] };
    };
    expect(output.structuredContent.name).toBe("MyFitnessPal clone research");
    expect(output.structuredContent.selectedNodeIds).toEqual(["feature-food"]);
    expect(JSON.parse(output.content[0].text)).toEqual(output.structuredContent);
  });

  it("creates and activates a linked trace map as one committed mutation", () => {
    const intent: PendingIntent = {
      id: "intent-1",
      type: "trace",
      nodeId: "feature-food",
      createdAt: new Date().toISOString(),
    };
    fixture.setIntent(intent);
    const output = getTool(fixture.runtime, "create_map").execute({
      title: "Food logging v2",
      kind: "trace",
      parentNodeId: "feature-food",
      nodes: [
        { id: "step-one", kind: "step", title: "Choose a meal" },
        { id: "step-two", kind: "step", title: "Save entry" },
      ],
      edges: [{ source: "step-one", target: "step-two", relation: "flows_to" }],
      activate: true,
    }) as { structuredContent: { mapId: string } };

    expect(fixture.commitWorkspace).toHaveBeenCalledOnce();
    expect(fixture.getWorkspace().maps[output.structuredContent.mapId]).toMatchObject({ parentNodeId: "feature-food", kind: "trace" });
    expect(fixture.runtime.getSnapshot().pendingIntent).toBeNull();
    expect(fixture.runtime.getSnapshot().workspace.activeMapId).toBe(output.structuredContent.mapId);
  });

  it("skips locked nodes and does not overwrite their content", () => {
    fixture.getWorkspace().nodes["feature-food"].locked = true;
    const output = getTool(fixture.runtime, "upsert_graph").execute({
      mapId: "map-myfitnesspal-build",
      nodes: [{ id: "feature-food", kind: "feature", title: "Overwritten" }],
    }) as { structuredContent: { skippedLocked: string[] } };

    expect(output.structuredContent.skippedLocked).toEqual(["feature-food"]);
    expect(fixture.getWorkspace().nodes["feature-food"].title).toBe("Food diary");
  });

  it("requires exclusion rationale and validates malformed, duplicate, oversized, and unsafe inputs", () => {
    expect(() =>
      getTool(fixture.runtime, "set_scope_decisions").execute({
        updates: [{ nodeId: "feature-food", state: "excluded" }],
      }),
    ).toThrow(/requires a rationale/);

    expect(() => getTool(fixture.runtime, "get_workspace").execute({ unknown: true })).toThrow();
    expect(() =>
      getTool(fixture.runtime, "create_map").execute({
        title: "Duplicate map",
        kind: "build",
        nodes: [
          { id: "duplicate", kind: "feature", title: "One" },
          { id: "duplicate", kind: "feature", title: "Two" },
        ],
      }),
    ).toThrow(/Duplicate node id/);
    expect(() =>
      getTool(fixture.runtime, "upsert_graph").execute({
        nodes: Array.from({ length: 101 }, (_, index) => ({ id: `node-${index}`, kind: "note", title: "Oversized" })),
      }),
    ).toThrow();
    expect(() =>
      getTool(fixture.runtime, "add_evidence").execute({
        nodeId: "feature-food",
        evidence: [{ kind: "source_url", label: "Unsafe", ref: "http://example.com" }],
      }),
    ).toThrow(/HTTPS/);
  });

  it("focuses nodes and highlights ordered paths without changing workspace data", () => {
    const original = structuredClone(fixture.getWorkspace());
    getTool(fixture.runtime, "highlight_path").execute({
      nodeIds: ["trace-open", "trace-add", "trace-find"],
      tone: "success",
    });

    expect(fixture.getFocused()).toEqual(["trace-open", "trace-add", "trace-find"]);
    expect(fixture.getHighlight()).toEqual({ nodeIds: ["trace-open", "trace-add", "trace-find"], tone: "success" });
    expect(fixture.getWorkspace()).toEqual(original);
  });
});
