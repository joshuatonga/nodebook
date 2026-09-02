import type { MapKind } from "@/lib/model";

export interface CanvasEmptyState {
  eyebrow: string;
  title: string;
  description: string;
  examplePrompt: string;
  addLabel: string;
}

export const canvasEmptyStates = {
  blank: {
    eyebrow: "Blank canvas",
    title: "Start with any idea.",
    description: "Add a freeform note, or ask your agent to organize the ideas and questions you want to explore.",
    examplePrompt: "Map open questions and research notes for a MyFitnessPal clone.",
    addLabel: "Add your first note",
  },
  build: {
    eyebrow: "Build canvas",
    title: "Plan what to build.",
    description: "Ask your agent to research a product or problem, then map the features, scope, and delivery status.",
    examplePrompt: "Research MyFitnessPal and map the features we’d need for a clone.",
    addLabel: "Add your first feature",
  },
  trace: {
    eyebrow: "Trace canvas",
    title: "Trace a journey step by step.",
    description: "Ask your agent to map a user journey, workflow, or system sequence and connect each step in order.",
    examplePrompt: "Trace the end-to-end food logging journey in MyFitnessPal, including friction points.",
    addLabel: "Add your first step",
  },
  learn: {
    eyebrow: "Learn canvas",
    title: "Turn a topic into a learning path.",
    description: "Ask your agent to organize concepts, exercises, and questions from fundamentals to mastery.",
    examplePrompt: "Create a learning path for understanding macronutrients, with exercises and a short quiz.",
    addLabel: "Add your first concept",
  },
} satisfies Record<MapKind, CanvasEmptyState>;

