import { beforeEach, describe, expect, it } from "vitest";
import { createDemoWorkspace } from "@/lib/demo";
import { useWorkspaceStore } from "@/lib/store";

describe("workspace store", () => {
  beforeEach(() => {
    useWorkspaceStore.getState().hydrate(createDemoWorkspace());
    useWorkspaceStore.temporal.getState().clear();
  });

  it("records a human update as one reversible history step", () => {
    useWorkspaceStore.getState().updateNode("feature-food", { title: "Fast food logging" });
    expect(useWorkspaceStore.getState().workspace.nodes["feature-food"].title).toBe("Fast food logging");
    expect(useWorkspaceStore.temporal.getState().pastStates).toHaveLength(1);

    useWorkspaceStore.temporal.getState().undo();
    expect(useWorkspaceStore.getState().workspace.nodes["feature-food"].title).toBe("Food diary");
  });

  it("adds a human-attributed node comment as one reversible history step", () => {
    useWorkspaceStore.getState().addHumanComment("feature-food", "Please verify the empty state.");
    const comments = useWorkspaceStore.getState().workspace.nodes["feature-food"].comments;

    expect(comments).toHaveLength(1);
    expect(comments[0]).toMatchObject({
      body: "Please verify the empty state.",
      authorKind: "human",
      authorName: "You",
    });
    expect(useWorkspaceStore.temporal.getState().pastStates).toHaveLength(1);

    useWorkspaceStore.temporal.getState().undo();
    expect(useWorkspaceStore.getState().workspace.nodes["feature-food"].comments).toEqual([]);
  });

  it("creates a positioned node and connection as one reversible history step", () => {
    const id = useWorkspaceStore.getState().addManualNode({
      position: { x: 840, y: 312 },
      connectFrom: "feature-food",
    });
    const state = useWorkspaceStore.getState();
    const connection = Object.values(state.workspace.edges).find((edge) => edge.target === id);

    expect(id).not.toBeNull();
    expect(state.workspace.nodes[id!].position).toEqual({ x: 840, y: 312 });
    expect(connection).toMatchObject({
      mapId: "map-myfitnesspal-build",
      source: "feature-food",
      target: id,
      relation: "related_to",
    });
    expect(state.workspace.activity[0].summary).toContain("connected it to Food diary");
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
    useWorkspaceStore.getState().renameCanvas("map-myfitnesspal-build", "Release plan");
    expect(useWorkspaceStore.getState().workspace.maps["map-myfitnesspal-build"].title).toBe("Release plan");

    useWorkspaceStore.temporal.getState().undo();
    expect(useWorkspaceStore.getState().workspace.maps["map-myfitnesspal-build"].title).toBe("Feature scope");
  });

  it("deletes a canvas and its linked descendants, then restores them on undo", () => {
    useWorkspaceStore.getState().deleteCanvas("map-myfitnesspal-build");
    const state = useWorkspaceStore.getState();

    expect(Object.values(state.workspace.maps)).toHaveLength(1);
    expect(Object.values(state.workspace.maps)[0].kind).toBe("blank");
    expect(Object.keys(state.workspace.nodes)).toHaveLength(0);
    expect(Object.keys(state.workspace.edges)).toHaveLength(0);

    useWorkspaceStore.temporal.getState().undo();
    expect(useWorkspaceStore.getState().workspace.maps["map-myfitnesspal-build"]).toBeDefined();
    expect(useWorkspaceStore.getState().workspace.maps["map-food-logging-trace"]).toBeDefined();
    expect(useWorkspaceStore.getState().workspace.maps["map-macros-learn"]).toBeDefined();
  });

  it("deletes linked maps with an originating node and restores them on undo", () => {
    useWorkspaceStore.getState().deleteNodes(["feature-food"]);
    expect(useWorkspaceStore.getState().workspace.maps["map-food-logging-trace"]).toBeUndefined();
    expect(useWorkspaceStore.getState().workspace.nodes["trace-open"]).toBeUndefined();

    useWorkspaceStore.temporal.getState().undo();
    expect(useWorkspaceStore.getState().workspace.maps["map-food-logging-trace"]).toBeDefined();
    expect(useWorkspaceStore.getState().workspace.nodes["trace-open"]).toBeDefined();
  });

  it("deletes connections and restores them on undo", () => {
    useWorkspaceStore.getState().deleteEdges(["edge-log-food"]);

    expect(useWorkspaceStore.getState().workspace.edges["edge-log-food"]).toBeUndefined();
    expect(useWorkspaceStore.getState().workspace.activity[0]).toMatchObject({
      action: "edges_deleted",
      summary: "Deleted 1 connection.",
    });

    useWorkspaceStore.temporal.getState().undo();
    expect(useWorkspaceStore.getState().workspace.edges["edge-log-food"]).toBeDefined();
  });

  it("ignores equivalent selection and viewport feedback", () => {
    let notifications = 0;
    useWorkspaceStore.getState().setSelection(["feature-food"]);
    const unsubscribe = useWorkspaceStore.subscribe(() => {
      notifications += 1;
    });
    useWorkspaceStore.getState().setSelection(["feature-food"]);
    useWorkspaceStore.getState().updateMapViewport("map-myfitnesspal-build", { x: 0, y: 0, zoom: 0.9 });
    unsubscribe();

    expect(notifications).toBe(0);
    expect(useWorkspaceStore.temporal.getState().pastStates).toHaveLength(0);
  });
});
