import { describe, expect, it } from "vitest";
import { createDemoWorkspace } from "@/lib/demo";
import { layoutNodes } from "@/lib/layout";
import { edgesForMap, nodesForMap } from "@/lib/model";

describe("layoutNodes", () => {
  it("returns finite, non-overlapping coordinates without mutating input", () => {
    const workspace = createDemoWorkspace();
    const nodes = nodesForMap(workspace, "map-food-logging-trace");
    const original = structuredClone(nodes);
    const laidOut = layoutNodes(nodes, edgesForMap(workspace, "map-food-logging-trace"));

    expect(nodes).toEqual(original);
    expect(laidOut.every((node) => Number.isFinite(node.position.x) && Number.isFinite(node.position.y))).toBe(true);
    expect(new Set(laidOut.map((node) => `${node.position.x}:${node.position.y}`)).size).toBe(laidOut.length);
  });
});
