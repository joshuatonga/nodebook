import { describe, expect, it } from "vitest";
import { createDemoWorkspace } from "@/lib/demo";
import { buildBreadcrumbs } from "@/lib/navigation";

describe("buildBreadcrumbs", () => {
  it("describes a linked map using its originating nodes", () => {
    const workspace = createDemoWorkspace();
    expect(buildBreadcrumbs(workspace, "map-local-first-learn").map((item) => item.label)).toEqual([
      "Nodebook v1 launch plan",
      "Fast idea capture",
      "Local-first commit boundary",
      "Local-first foundations",
    ]);
  });
});
