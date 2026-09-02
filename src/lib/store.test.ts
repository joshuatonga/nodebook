import { beforeEach, describe, expect, it } from "vitest";
import { createDemoWorkspace } from "@/lib/demo";
import { useWorkspaceStore } from "@/lib/store";

describe("workspace store", () => {
  beforeEach(() => {
    useWorkspaceStore.getState().hydrate(createDemoWorkspace());
    useWorkspaceStore.temporal.getState().clear();
  });

  it("records a human update as one reversible history step", () => {
    useWorkspaceStore.getState().updateNode("feature-fast-capture", { title: "Instant idea capture" });
    expect(useWorkspaceStore.getState().workspace.nodes["feature-fast-capture"].title).toBe("Instant idea capture");
    expect(useWorkspaceStore.temporal.getState().pastStates).toHaveLength(1);

    useWorkspaceStore.temporal.getState().undo();
    expect(useWorkspaceStore.getState().workspace.nodes["feature-fast-capture"].title).toBe("Fast idea capture");
  });

  it("adds a human-attributed node comment as one reversible history step", () => {
    useWorkspaceStore.getState().addHumanComment("feature-evidence", "Please verify the empty state.");
    const comments = useWorkspaceStore.getState().workspace.nodes["feature-evidence"].comments;

    expect(comments).toHaveLength(1);
    expect(comments[0]).toMatchObject({
      body: "Please verify the empty state.",
      authorKind: "human",
      authorName: "You",
    });
    expect(useWorkspaceStore.temporal.getState().pastStates).toHaveLength(1);

    useWorkspaceStore.temporal.getState().undo();
    expect(useWorkspaceStore.getState().workspace.nodes["feature-evidence"].comments).toEqual([]);
  });

  it("creates a positioned node and connection as one reversible history step", () => {
    const id = useWorkspaceStore.getState().addManualNode({
      position: { x: 840, y: 312 },
      connectFrom: "feature-fast-capture",
    });
    const state = useWorkspaceStore.getState();
    const connection = Object.values(state.workspace.edges).find((edge) => edge.target === id);

    expect(id).not.toBeNull();
    expect(state.workspace.nodes[id!].position).toEqual({ x: 840, y: 312 });
    expect(connection).toMatchObject({
      mapId: "map-nodebook-launch",
      source: "feature-fast-capture",
      target: id,
      relation: "related_to",
    });
    expect(state.workspace.activity[0].summary).toContain("connected it to Fast idea capture");
    expect(useWorkspaceStore.temporal.getState().pastStates).toHaveLength(1);

    useWorkspaceStore.temporal.getState().undo();
    expect(useWorkspaceStore.getState().workspace.nodes[id!]).toBeUndefined();
    expect(useWorkspaceStore.getState().workspace.edges[connection!.id]).toBeUndefined();
  });

  it("creates and opens a blank canvas as one reversible history step", () => {
    const previousMapId = useWorkspaceStore.getState().workspace.activeMapId;
    const mapId = useWorkspaceStore.getState().addCanvas("blank");
    const state = useWorkspaceStore.getState();

    expect(state.workspace.activeMapId).toBe(mapId);
    expect(state.workspace.maps[mapId]).toMatchObject({
      title: "Untitled canvas",
      kind: "blank",
      viewport: { x: 0, y: 0, zoom: 0.9 },
    });
    expect(useWorkspaceStore.temporal.getState().pastStates).toHaveLength(1);

    useWorkspaceStore.temporal.getState().undo();
    expect(useWorkspaceStore.getState().workspace.maps[mapId]).toBeUndefined();
    expect(useWorkspaceStore.getState().workspace.activeMapId).toBe(previousMapId);
  });

  it("renames a canvas as one reversible history step", () => {
    useWorkspaceStore.getState().renameCanvas("map-nodebook-launch", "Release plan");
    expect(useWorkspaceStore.getState().workspace.maps["map-nodebook-launch"].title).toBe("Release plan");

    useWorkspaceStore.temporal.getState().undo();
    expect(useWorkspaceStore.getState().workspace.maps["map-nodebook-launch"].title).toBe("Product roadmap");
  });

  it("deletes a canvas and its linked descendants, then restores them on undo", () => {
    useWorkspaceStore.getState().deleteCanvas("map-nodebook-launch");
    const state = useWorkspaceStore.getState();

    expect(Object.values(state.workspace.maps)).toHaveLength(1);
    expect(Object.values(state.workspace.maps)[0].kind).toBe("blank");
    expect(Object.keys(state.workspace.nodes)).toHaveLength(6);
    expect(Object.keys(state.workspace.edges)).toHaveLength(3);
    expect(state.workspace.nodes["research-keyboard"]).toBeDefined();

    useWorkspaceStore.temporal.getState().undo();
    expect(useWorkspaceStore.getState().workspace.maps["map-nodebook-launch"]).toBeDefined();
    expect(useWorkspaceStore.getState().workspace.maps["map-capture-trace"]).toBeDefined();
    expect(useWorkspaceStore.getState().workspace.maps["map-local-first-learn"]).toBeDefined();
  });

  it("deletes linked maps with an originating node and restores them on undo", () => {
    useWorkspaceStore.getState().deleteNodes(["feature-fast-capture"]);
    expect(useWorkspaceStore.getState().workspace.maps["map-capture-trace"]).toBeUndefined();
    expect(useWorkspaceStore.getState().workspace.nodes["capture-open"]).toBeUndefined();

    useWorkspaceStore.temporal.getState().undo();
    expect(useWorkspaceStore.getState().workspace.maps["map-capture-trace"]).toBeDefined();
    expect(useWorkspaceStore.getState().workspace.nodes["capture-open"]).toBeDefined();
  });

  it("deletes connections and restores them on undo", () => {
    useWorkspaceStore.getState().deleteEdges(["edge-foundation-feature-fast-capture"]);

    expect(useWorkspaceStore.getState().workspace.edges["edge-foundation-feature-fast-capture"]).toBeUndefined();
    expect(useWorkspaceStore.getState().workspace.activity[0]).toMatchObject({
      action: "edges_deleted",
      summary: "Deleted 1 connection.",
    });

    useWorkspaceStore.temporal.getState().undo();
    expect(useWorkspaceStore.getState().workspace.edges["edge-foundation-feature-fast-capture"]).toBeDefined();
  });

  it("ignores equivalent selection and viewport feedback", () => {
    let notifications = 0;
    useWorkspaceStore.getState().setSelection(["feature-fast-capture"]);
    const unsubscribe = useWorkspaceStore.subscribe(() => {
      notifications += 1;
    });
    useWorkspaceStore.getState().setSelection(["feature-fast-capture"]);
    useWorkspaceStore.getState().updateMapViewport("map-nodebook-launch", { x: 0, y: 0, zoom: 0.9 });
    unsubscribe();

    expect(notifications).toBe(0);
    expect(useWorkspaceStore.temporal.getState().pastStates).toHaveLength(0);
  });
});
