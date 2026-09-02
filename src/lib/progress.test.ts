import { describe, expect, it } from "vitest";
import { createDemoWorkspace } from "@/lib/demo";
import { calculateDeliveryProgress } from "@/lib/progress";

describe("calculateDeliveryProgress", () => {
  it("counts only included features and weights partial delivery by half", () => {
    const workspace = createDemoWorkspace();
    for (const node of Object.values(workspace.nodes)) {
      if (node.kind === "feature") node.scopeState = "proposed";
    }
    workspace.nodes["feature-canvas"].scopeState = "included";
    workspace.nodes["feature-canvas"].deliveryStatus = "complete";
    workspace.nodes["feature-fast-capture"].scopeState = "included";
    workspace.nodes["feature-fast-capture"].deliveryStatus = "partial";

    expect(calculateDeliveryProgress(workspace)).toMatchObject({
      included: 2,
      proposed: 27,
      excluded: 0,
      complete: 1,
      partial: 1,
      total: 2,
      score: 1.5,
      percentage: 75,
    });
  });

  it("keeps excluded and proposed features outside the denominator", () => {
    const workspace = createDemoWorkspace();
    for (const node of Object.values(workspace.nodes)) {
      if (node.kind === "feature") node.scopeState = "proposed";
    }
    workspace.nodes["feature-canvas"].scopeState = "excluded";

    expect(calculateDeliveryProgress(workspace)).toMatchObject({ total: 0, percentage: 0 });
  });
});
