import { describe, expect, it } from "vitest";
import { createDemoWorkspace } from "@/lib/demo";
import { buildBreadcrumbs } from "@/lib/navigation";

describe("buildBreadcrumbs", () => {
  it("describes a linked map using its originating nodes", () => {
    const workspace = createDemoWorkspace();
    expect(buildBreadcrumbs(workspace, "map-macros-learn").map((item) => item.label)).toEqual([
      "MyFitnessPal clone research",
      "Food diary",
      "Update macro totals",
      "Understanding macronutrients",
    ]);
  });
});
