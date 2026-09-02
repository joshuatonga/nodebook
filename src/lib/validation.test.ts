import { describe, expect, it } from "vitest";
import { createDemoWorkspace } from "@/lib/demo";
import { deserializeWorkspace, serializeWorkspace } from "@/lib/persistence";
import { parseWorkspaceDocument } from "@/lib/validation";

describe("workspace imports and migrations", () => {
  it("round-trips the current document format", () => {
    const workspace = createDemoWorkspace();
    expect(deserializeWorkspace(serializeWorkspace(workspace))).toEqual(workspace);
  });

  it("accepts a blank canvas type", () => {
    const workspace = createDemoWorkspace();
    workspace.maps["map-myfitnesspal-build"].kind = "blank";
    expect(parseWorkspaceDocument(workspace).maps["map-myfitnesspal-build"].kind).toBe("blank");
  });

  it("migrates a version zero document and restores missing activity", () => {
    const workspace = createDemoWorkspace();
    const legacy = { ...workspace, schemaVersion: 0 } as Record<string, unknown>;
    delete legacy.activity;
    const migrated = parseWorkspaceDocument(legacy);

    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.nodes["feature-food"].comments).toEqual([]);
    expect(migrated.activity[0].action).toBe("workspace_migrated");
  });

  it("migrates version one documents with an empty comment history", () => {
    const workspace = createDemoWorkspace();
    const nodes = structuredClone(workspace.nodes) as Record<string, { comments?: unknown }>;
    for (const node of Object.values(nodes)) delete node.comments;
    const migrated = parseWorkspaceDocument({ ...workspace, schemaVersion: 1, nodes });

    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.nodes["feature-food"].comments).toEqual([]);
  });

  it("rejects unsafe source URLs and broken graph references", () => {
    const unsafe = createDemoWorkspace();
    unsafe.nodes["feature-food"].evidence[0].ref = "http://example.com/source";
    expect(() => parseWorkspaceDocument(unsafe)).toThrow(/HTTPS/);

    const broken = createDemoWorkspace();
    broken.edges["edge-project-log"].target = "missing";
    expect(() => parseWorkspaceDocument(broken)).toThrow(/missing node/);
  });

  it("rejects invalid quiz answers and quiz content on non-question nodes", () => {
    const invalidAnswer = createDemoWorkspace();
    invalidAnswer.nodes["learn-quiz"].quiz!.correctChoiceIndex = 12;
    expect(() => parseWorkspaceDocument(invalidAnswer)).toThrow(/correct choice index/i);

    const misplacedQuiz = createDemoWorkspace();
    misplacedQuiz.nodes["feature-food"].quiz = {
      choices: ["One", "Two"],
      correctChoiceIndex: 0,
    };
    expect(() => parseWorkspaceDocument(misplacedQuiz)).toThrow(/not a question/i);
  });
});
