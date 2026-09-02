import { describe, expect, it } from "vitest";
import { canvasEmptyStates } from "@/lib/canvas-empty-state";
import type { MapKind } from "@/lib/model";

describe("canvas empty states", () => {
  const expectedAddLabels: Record<MapKind, string> = {
    blank: "Add your first note",
    build: "Add your first feature",
    trace: "Add your first step",
    learn: "Add your first concept",
  };

  it.each(Object.entries(expectedAddLabels) as Array<[MapKind, string]>)(
    "provides type-specific guidance for a %s canvas",
    (kind, addLabel) => {
      const emptyState = canvasEmptyStates[kind];

      expect(emptyState.eyebrow).toBe(`${kind[0].toUpperCase()}${kind.slice(1)} canvas`);
      expect(emptyState.addLabel).toBe(addLabel);
      expect(emptyState.description).not.toHaveLength(0);
      expect(emptyState.examplePrompt).not.toHaveLength(0);
    },
  );

  it("keeps example prompts distinct across canvas types", () => {
    const prompts = Object.values(canvasEmptyStates).map((emptyState) => emptyState.examplePrompt);

    expect(new Set(prompts).size).toBe(prompts.length);
  });
});
