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

  it("creates and opens a blank build canvas as one reversible history step", () => {
    const previousMapId = useWorkspaceStore.getState().workspace.activeMapId;
    const mapId = useWorkspaceStore.getState().addCanvas();
    const state = useWorkspaceStore.getState();

    expect(state.workspace.activeMapId).toBe(mapId);
    expect(state.workspace.maps[mapId]).toMatchObject({
      title: "Untitled canvas",
      kind: "build",
      viewport: { x: 0, y: 0, zoom: 0.9 },
    });
    expect(useWorkspaceStore.temporal.getState().pastStates).toHaveLength(1);

    useWorkspaceStore.temporal.getState().undo();
    expect(useWorkspaceStore.getState().workspace.maps[mapId]).toBeUndefined();
    expect(useWorkspaceStore.getState().workspace.activeMapId).toBe(previousMapId);
  });

  it("deletes linked maps with an originating node and restores them on undo", () => {
    useWorkspaceStore.getState().deleteNodes(["feature-food"]);
    expect(useWorkspaceStore.getState().workspace.maps["map-food-logging-trace"]).toBeUndefined();
    expect(useWorkspaceStore.getState().workspace.nodes["trace-open"]).toBeUndefined();

    useWorkspaceStore.temporal.getState().undo();
    expect(useWorkspaceStore.getState().workspace.maps["map-food-logging-trace"]).toBeDefined();
    expect(useWorkspaceStore.getState().workspace.nodes["trace-open"]).toBeDefined();
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
