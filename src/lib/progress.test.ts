import { describe, expect, it } from "vitest";
import { createDemoWorkspace } from "@/lib/demo";
import { calculateDeliveryProgress } from "@/lib/progress";

describe("calculateDeliveryProgress", () => {
  it("counts only included features and weights partial delivery by half", () => {
    const workspace = createDemoWorkspace();
    workspace.nodes["feature-food"].deliveryStatus = "complete";
    workspace.nodes["feature-macros"].deliveryStatus = "partial";

    expect(calculateDeliveryProgress(workspace)).toMatchObject({
      included: 2,
      proposed: 8,
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
    workspace.nodes["feature-food"].scopeState = "excluded";
    workspace.nodes["feature-macros"].scopeState = "proposed";

    expect(calculateDeliveryProgress(workspace)).toMatchObject({ total: 0, percentage: 0 });
  });
});
