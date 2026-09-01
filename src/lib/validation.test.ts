import { describe, expect, it } from "vitest";
import { createDemoWorkspace } from "@/lib/demo";
import { deserializeWorkspace, serializeWorkspace } from "@/lib/persistence";
import { parseWorkspaceDocument } from "@/lib/validation";

describe("workspace imports and migrations", () => {
  it("round-trips the current document format", () => {
    const workspace = createDemoWorkspace();
    expect(deserializeWorkspace(serializeWorkspace(workspace))).toEqual(workspace);
  });

  it("migrates a version zero document and restores missing activity", () => {
    const workspace = createDemoWorkspace();
    const legacy = { ...workspace, schemaVersion: 0 } as Record<string, unknown>;
    delete legacy.activity;
    const migrated = parseWorkspaceDocument(legacy);

    expect(migrated.schemaVersion).toBe(1);
    expect(migrated.activity[0].action).toBe("workspace_migrated");
  });

  it("rejects unsafe source URLs and broken graph references", () => {
    const unsafe = createDemoWorkspace();
    unsafe.nodes["feature-food"].evidence[0].ref = "http://example.com/source";
    expect(() => parseWorkspaceDocument(unsafe)).toThrow(/HTTPS/);

    const broken = createDemoWorkspace();
    broken.edges["edge-project-log"].target = "missing";
    expect(() => parseWorkspaceDocument(broken)).toThrow(/missing node/);
  });
});
