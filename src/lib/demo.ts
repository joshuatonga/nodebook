import { createId, nowIso } from "@/lib/ids";
import { layoutNodes } from "@/lib/layout";
import type {
  CanvasEdge,
  CanvasMap,
  CanvasNode,
  DeliveryStatus,
  Evidence,
  LearningState,
  MapKind,
  NodeKind,
  ScopeState,
  WorkspaceDocument,
} from "@/lib/model";

const SOURCES = {
  freeFeatures:
    "https://support.myfitnesspal.com/hc/en-us/articles/15457546881805-What-is-included-in-the-free-version",
  today:
    "https://support.myfitnesspal.com/hc/en-us/articles/39985611667341-Your-Today-tab",
  premium:
    "https://support.myfitnesspal.com/hc/en-us/articles/34889191368077-What-s-the-difference-between-Free-Premium-and-Premium",
  coach:
    "https://support.myfitnesspal.com/hc/en-us/articles/45212266254221-Introducing-Nutrition-Coach-Your-Nutrition-Assistant",
  progress:
    "https://support.myfitnesspal.com/hc/en-us/articles/45246617814669-Introducing-Progress-Overview-Your-Progress-Personalized",
  planner:
    "https://support.myfitnesspal.com/hc/en-us/articles/34603055097869-How-to-use-the-Meal-Planner",
  goals:
    "https://support.myfitnesspal.com/hc/en-us/articles/360032274432-Customize-your-nutritional-goals",
} as const;

function sourceEvidence(id: string, label: string, ref: string, createdAt: string): Evidence {
  return {
    id: `evidence-${id}`,
    kind: "source_url",
    label,
    ref,
    addedBy: "agent",
    createdAt,
  };
}

interface NodeOptions {
  scopeState?: ScopeState;
  deliveryStatus?: DeliveryStatus;
  learningState?: LearningState;
  locked?: boolean;
  tags?: string[];
  evidence?: Evidence[];
}

function node(
  mapId: string,
  id: string,
  kind: NodeKind,
  title: string,
  description: string,
  createdAt: string,
  options: NodeOptions = {},
): CanvasNode {
  return {
    id,
    mapId,
    kind,
    title,
    description,
    position: { x: 0, y: 0 },
    scopeState: options.scopeState,
    deliveryStatus: options.deliveryStatus,
    learningState: options.learningState,
    locked: options.locked ?? false,
    tags: options.tags ?? [],
    evidence: options.evidence ?? [],
    createdAt,
    updatedAt: createdAt,
  };
}

function edge(
  mapId: string,
  id: string,
  source: string,
  target: string,
  createdAt: string,
  relation: CanvasEdge["relation"] = "contains",
): CanvasEdge {
  return { id, mapId, source, target, relation, createdAt };
}

function map(
  id: string,
  title: string,
  kind: MapKind,
  createdAt: string,
  parentNodeId?: string,
): CanvasMap {
  return {
    id,
    title,
    kind,
    parentNodeId,
    viewport: { x: 0, y: 0, zoom: 0.9 },
    createdAt,
    updatedAt: createdAt,
  };
}

function dictionary<T extends { id: string }>(items: T[]): Record<string, T> {
  return Object.fromEntries(items.map((item) => [item.id, item]));
}

export function createBlankWorkspace(): WorkspaceDocument {
  const createdAt = nowIso();
  const mapId = createId("map");
  return {
    schemaVersion: 1,
    id: createId("workspace"),
    name: "New workspace",
    activeMapId: mapId,
    maps: dictionary([map(mapId, "Untitled build map", "build", createdAt)]),
    nodes: {},
    edges: {},
    activity: [
      {
        id: createId("activity"),
        source: "system",
        action: "workspace_created",
        summary: "Blank local workspace created.",
        createdAt,
      },
    ],
    createdAt,
    updatedAt: createdAt,
  };
}

export function createDemoWorkspace(): WorkspaceDocument {
  const createdAt = nowIso();
  const buildMapId = "map-myfitnesspal-build";
  const traceMapId = "map-food-logging-trace";
  const learnMapId = "map-macros-learn";

  const buildNodes = [
    node(buildMapId, "project-mfp", "project", "MyFitnessPal-style tracker", "A researched scope for a nutrition and habit-tracking product.", createdAt),
    node(buildMapId, "group-log", "group", "Daily logging", "The everyday capture loop.", createdAt),
    node(buildMapId, "group-goals", "group", "Goals & progress", "Targets, trends, and accountability.", createdAt),
    node(buildMapId, "group-premium", "group", "Advanced experiences", "Ideas to review instead of blindly copying.", createdAt),
    node(buildMapId, "feature-food", "feature", "Food diary", "Log foods by meal, adjust servings, and update the daily diary.", createdAt, {
      scopeState: "included",
      deliveryStatus: "not_started",
      evidence: [sourceEvidence("food", "MyFitnessPal free feature overview", SOURCES.freeFeatures, createdAt)],
      tags: ["core", "logging"],
    }),
    node(buildMapId, "feature-macros", "feature", "Calories & macros", "Show consumed and remaining calories with protein, carbohydrate, and fat totals.", createdAt, {
      scopeState: "included",
      deliveryStatus: "not_started",
      evidence: [sourceEvidence("macros", "MyFitnessPal Today tab", SOURCES.today, createdAt)],
      tags: ["core", "nutrition"],
    }),
    node(buildMapId, "feature-exercise", "feature", "Exercise, water & steps", "Capture healthy habits alongside food.", createdAt, {
      scopeState: "proposed",
      deliveryStatus: "not_started",
      evidence: [sourceEvidence("exercise", "MyFitnessPal Today tab", SOURCES.today, createdAt)],
    }),
    node(buildMapId, "feature-custom-food", "feature", "Foods, meals & recipes", "Create reusable personal foods, meals, and recipes.", createdAt, {
      scopeState: "proposed",
      deliveryStatus: "not_started",
      evidence: [sourceEvidence("recipes", "MyFitnessPal free feature overview", SOURCES.freeFeatures, createdAt)],
    }),
    node(buildMapId, "feature-goals", "feature", "Calorie & macro goals", "Set calorie targets and customize macro balance.", createdAt, {
      scopeState: "proposed",
      deliveryStatus: "not_started",
      evidence: [sourceEvidence("goals", "MyFitnessPal nutrition goal guide", SOURCES.goals, createdAt)],
    }),
    node(buildMapId, "feature-progress", "feature", "Progress insights", "Compare weekly calorie and macro patterns against goals.", createdAt, {
      scopeState: "proposed",
      deliveryStatus: "not_started",
      evidence: [sourceEvidence("progress", "MyFitnessPal Progress Overview", SOURCES.progress, createdAt)],
    }),
    node(buildMapId, "feature-sharing", "feature", "Diary sharing", "Share a diary with coaches, friends, or family.", createdAt, {
      scopeState: "proposed",
      deliveryStatus: "not_started",
      evidence: [sourceEvidence("sharing", "MyFitnessPal free feature overview", SOURCES.freeFeatures, createdAt)],
    }),
    node(buildMapId, "feature-scanners", "feature", "Barcode & meal scan", "Accelerate logging with packaged-food and camera-assisted capture.", createdAt, {
      scopeState: "proposed",
      deliveryStatus: "not_started",
      evidence: [sourceEvidence("scanners", "MyFitnessPal plan comparison", SOURCES.premium, createdAt)],
    }),
    node(buildMapId, "feature-coach", "feature", "Nutrition coach", "Answer questions using diary history, targets, and saved foods.", createdAt, {
      scopeState: "proposed",
      deliveryStatus: "not_started",
      evidence: [sourceEvidence("coach", "MyFitnessPal Nutrition Coach", SOURCES.coach, createdAt)],
    }),
    node(buildMapId, "feature-planner", "feature", "Meal planner", "Build goal-aware weekly plans around diets, allergies, and preferences.", createdAt, {
      scopeState: "proposed",
      deliveryStatus: "not_started",
      evidence: [sourceEvidence("planner", "MyFitnessPal Meal Planner", SOURCES.planner, createdAt)],
    }),
  ];

  const buildEdges = [
    edge(buildMapId, "edge-project-log", "project-mfp", "group-log", createdAt),
    edge(buildMapId, "edge-project-goals", "project-mfp", "group-goals", createdAt),
    edge(buildMapId, "edge-project-premium", "project-mfp", "group-premium", createdAt),
    edge(buildMapId, "edge-log-food", "group-log", "feature-food", createdAt),
    edge(buildMapId, "edge-log-macros", "group-log", "feature-macros", createdAt),
    edge(buildMapId, "edge-log-exercise", "group-log", "feature-exercise", createdAt),
    edge(buildMapId, "edge-log-custom", "group-log", "feature-custom-food", createdAt),
    edge(buildMapId, "edge-goals-goals", "group-goals", "feature-goals", createdAt),
    edge(buildMapId, "edge-goals-progress", "group-goals", "feature-progress", createdAt),
    edge(buildMapId, "edge-goals-sharing", "group-goals", "feature-sharing", createdAt),
    edge(buildMapId, "edge-premium-scanners", "group-premium", "feature-scanners", createdAt),
    edge(buildMapId, "edge-premium-coach", "group-premium", "feature-coach", createdAt),
    edge(buildMapId, "edge-premium-planner", "group-premium", "feature-planner", createdAt),
  ];

  const traceNodes = [
    node(traceMapId, "trace-open", "step", "Open Today", "Start from the daily diary surface.", createdAt),
    node(traceMapId, "trace-add", "step", "Choose Add Food", "Select a meal and logging method.", createdAt),
    node(traceMapId, "trace-find", "step", "Search or scan", "Find a matching food in the database.", createdAt),
    node(traceMapId, "trace-serving", "step", "Adjust serving", "Confirm quantity and serving unit.", createdAt),
    node(traceMapId, "trace-diary", "step", "Add to diary", "Persist the entry under the selected meal.", createdAt),
    node(traceMapId, "trace-macros", "concept", "Update macro totals", "Recalculate calories, protein, carbohydrates, and fat.", createdAt, {
      learningState: "learning",
    }),
  ];
  const traceEdges = traceNodes.slice(0, -1).map((current, index) =>
    edge(traceMapId, `edge-trace-${index}`, current.id, traceNodes[index + 1].id, createdAt, "flows_to"),
  );

  const learnNodes = [
    node(learnMapId, "learn-macros", "concept", "Macronutrients", "The nutrients the body needs in larger amounts.", createdAt, { learningState: "learning" }),
    node(learnMapId, "learn-protein", "concept", "Protein", "Supports tissue repair and provides 4 calories per gram.", createdAt, { learningState: "unknown" }),
    node(learnMapId, "learn-carbs", "concept", "Carbohydrates", "A primary energy source providing 4 calories per gram.", createdAt, { learningState: "unknown" }),
    node(learnMapId, "learn-fat", "concept", "Fat", "Supports hormones and nutrient absorption; provides 9 calories per gram.", createdAt, { learningState: "unknown" }),
    node(learnMapId, "learn-example", "exercise", "Read a nutrition label", "Calculate calories contributed by each macro for one serving.", createdAt, { learningState: "unknown" }),
  ];
  const learnEdges = [
    edge(learnMapId, "edge-learn-protein", "learn-macros", "learn-protein", createdAt, "contains"),
    edge(learnMapId, "edge-learn-carbs", "learn-macros", "learn-carbs", createdAt, "contains"),
    edge(learnMapId, "edge-learn-fat", "learn-macros", "learn-fat", createdAt, "contains"),
    edge(learnMapId, "edge-learn-example", "learn-macros", "learn-example", createdAt, "contains"),
  ];

  const laidOutBuildNodes = layoutNodes(buildNodes, buildEdges, "LR");
  const laidOutTraceNodes = layoutNodes(traceNodes, traceEdges, "LR");
  const laidOutLearnNodes = layoutNodes(learnNodes, learnEdges, "TB");

  return {
    schemaVersion: 1,
    id: "workspace-myfitnesspal-demo",
    name: "MyFitnessPal clone research",
    activeMapId: buildMapId,
    maps: dictionary([
      map(buildMapId, "Feature scope", "build", createdAt),
      map(traceMapId, "Food logging journey", "trace", createdAt, "feature-food"),
      map(learnMapId, "Understanding macronutrients", "learn", createdAt, "trace-macros"),
    ]),
    nodes: dictionary([...laidOutBuildNodes, ...laidOutTraceNodes, ...laidOutLearnNodes]),
    edges: dictionary([...buildEdges, ...traceEdges, ...learnEdges]),
    activity: [
      {
        id: createId("activity"),
        source: "system",
        action: "demo_loaded",
        summary: "Loaded a source-backed MyFitnessPal research example.",
        createdAt,
      },
    ],
    createdAt,
    updatedAt: createdAt,
  };
}
