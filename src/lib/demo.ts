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
  NodeComment,
  NodeKind,
  QuizContent,
  ScopeState,
  WorkspaceDocument,
} from "@/lib/model";
import { WORKSPACE_SCHEMA_VERSION } from "@/lib/model";

const INDEXED_DB_GUIDE = "https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API";

interface NodeOptions {
  scopeState?: ScopeState;
  deliveryStatus?: DeliveryStatus;
  learningState?: LearningState;
  quiz?: QuizContent;
  locked?: boolean;
  tags?: string[];
  evidence?: Evidence[];
  comments?: NodeComment[];
}

function evidence(
  id: string,
  kind: Evidence["kind"],
  label: string,
  ref: string,
  createdAt: string,
): Evidence {
  return { id: `evidence-${id}`, kind, label, ref, addedBy: "agent", createdAt };
}

function comment(
  id: string,
  body: string,
  authorKind: NodeComment["authorKind"],
  authorName: string,
  createdAt: string,
): NodeComment {
  return { id: `comment-${id}`, body, authorKind, authorName, createdAt };
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
    quiz: options.quiz,
    locked: options.locked ?? false,
    tags: options.tags ?? [],
    evidence: options.evidence ?? [],
    comments: options.comments ?? [],
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
  label?: string,
): CanvasEdge {
  return { id, mapId, source, target, relation, label, createdAt };
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
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
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
  const buildMapId = "map-nodebook-launch";
  const captureMapId = "map-capture-trace";
  const agentMapId = "map-agent-collaboration";
  const learnMapId = "map-local-first-learn";
  const releaseMapId = "map-release-readiness";
  const researchMapId = "map-research-parking-lot";

  const buildNodes = [
    node(buildMapId, "project-nodebook", "project", "Ship Nodebook v1", "Turn a promising infinite canvas into a dependable local-first workspace people can use with an external agent every day.", createdAt, {
      evidence: [evidence("product-brief", "file", "Product brief", "README.md", createdAt)],
      comments: [comment("product-goal", "The release should feel useful before an agent connects.", "human", "You", createdAt)],
    }),
    node(buildMapId, "group-foundation", "group", "Workspace foundation", "Fast capture, durable local state, and safe recovery.", createdAt),
    node(buildMapId, "group-workflows", "group", "Core workflows", "The planning and collaboration loops people repeat most.", createdAt),
    node(buildMapId, "group-trust", "group", "Trust & quality", "Make every action understandable, reversible, and accessible.", createdAt),
    node(buildMapId, "group-launch", "group", "Launch & adoption", "Help new users reach value and confidently share the product.", createdAt),

    node(buildMapId, "feature-canvas", "feature", "Infinite semantic canvas", "Create, connect, drag, and auto-layout meaningful nodes without losing context.", createdAt, {
      scopeState: "included", deliveryStatus: "complete", locked: true, tags: ["core", "canvas", "p0"],
      evidence: [evidence("canvas-e2e", "test", "Canvas interaction coverage", "e2e/nodebook.spec.ts", createdAt)],
    }),
    node(buildMapId, "feature-local-persistence", "feature", "Local-first persistence", "Persist the complete workspace in IndexedDB and restore it without an account or network request.", createdAt, {
      scopeState: "included", deliveryStatus: "complete", locked: true, tags: ["core", "privacy", "offline"],
      evidence: [
        evidence("indexeddb", "source_url", "MDN IndexedDB guide", INDEXED_DB_GUIDE, createdAt),
        evidence("persistence-hook", "file", "Workspace persistence hook", "src/hooks/use-workspace-persistence.ts", createdAt),
        evidence("persistence-tests", "test", "Persistence tests", "src/lib/validation.test.ts", createdAt),
      ],
      comments: [comment("persistence-risk", "Document storage eviction and keep export prominent.", "agent", "Codex", createdAt)],
    }),
    node(buildMapId, "feature-portability", "feature", "Portable workspaces", "Export a readable JSON backup and safely import compatible workspaces with migrations.", createdAt, {
      scopeState: "included", deliveryStatus: "complete", tags: ["data", "recovery", "p0"],
      evidence: [evidence("validation-tests", "test", "Import and migration coverage", "src/lib/validation.test.ts", createdAt)],
    }),
    node(buildMapId, "feature-fast-capture", "feature", "Fast idea capture", "Add a node exactly where you are thinking, then connect it to the current thread in one action.", createdAt, {
      scopeState: "included", deliveryStatus: "partial", tags: ["capture", "interaction", "p0"],
      evidence: [evidence("capture-e2e", "test", "Connected-node interaction test", "e2e/nodebook.spec.ts", createdAt)],
      comments: [comment("capture-shortcut", "Add a keyboard-first path after the pointer flow is stable.", "human", "You", createdAt)],
    }),
    node(buildMapId, "feature-offline-recovery", "feature", "Crash-safe recovery", "Recover from malformed saved data and explain what happened without trapping the user.", createdAt, {
      scopeState: "included", deliveryStatus: "partial", tags: ["resilience", "offline", "p1"],
      evidence: [evidence("validation", "file", "Workspace validation boundary", "src/lib/validation.ts", createdAt)],
    }),

    node(buildMapId, "feature-linked-maps", "feature", "Linked maps", "Expand one node into a focused build, trace, or learn canvas while preserving breadcrumb context.", createdAt, {
      scopeState: "included", deliveryStatus: "complete", locked: true, tags: ["navigation", "structure", "p0"],
      evidence: [evidence("navigation-tests", "test", "Linked-map breadcrumb coverage", "src/lib/navigation.test.ts", createdAt)],
    }),
    node(buildMapId, "feature-agent-handoff", "feature", "Agent handoff", "Expose selection, intents, comments, evidence, and graph mutations through deterministic browser tools.", createdAt, {
      scopeState: "included", deliveryStatus: "complete", tags: ["agents", "webmcp", "p0"],
      evidence: [evidence("webmcp-tests", "test", "WebMCP contract tests", "src/lib/webmcp/tools.test.ts", createdAt)],
      comments: [comment("agent-safety", "Keep destructive deletion human-only; agent changes should stay reviewable.", "agent", "Codex", createdAt)],
    }),
    node(buildMapId, "feature-evidence", "feature", "Evidence on decisions", "Keep URLs, files, tests, commits, and notes beside the feature or concept they support.", createdAt, {
      scopeState: "included", deliveryStatus: "complete", tags: ["research", "provenance", "p0"],
      evidence: [evidence("evidence-model", "file", "Evidence data model", "src/lib/model.ts", createdAt)],
    }),
    node(buildMapId, "feature-comments", "feature", "Human–agent comments", "Discuss a node in place, preserve authorship, and let agents discover the conversation later.", createdAt, {
      scopeState: "included", deliveryStatus: "complete", tags: ["collaboration", "review", "p1"],
      evidence: [evidence("comments-e2e", "test", "Comment workflow coverage", "e2e/nodebook.spec.ts", createdAt)],
    }),
    node(buildMapId, "feature-search", "feature", "Workspace search", "Find nodes by title, description, tags, evidence, or comments and jump directly to the result.", createdAt, {
      scopeState: "proposed", deliveryStatus: "not_started", tags: ["navigation", "scale", "p1"],
      comments: [comment("search-scope", "Start with a command palette; advanced filtering can wait.", "human", "You", createdAt)],
    }),

    node(buildMapId, "feature-undo", "feature", "Reversible history", "Treat each human or agent mutation as one reversible step, including compound graph changes.", createdAt, {
      scopeState: "included", deliveryStatus: "complete", locked: true, tags: ["trust", "history", "p0"],
      evidence: [evidence("store-tests", "test", "Reversible mutation coverage", "src/lib/store.test.ts", createdAt)],
    }),
    node(buildMapId, "feature-validation", "feature", "Strict validation", "Reject unsafe URLs, unknown fields, broken references, invalid quizzes, and oversized batches.", createdAt, {
      scopeState: "included", deliveryStatus: "complete", locked: true, tags: ["trust", "safety", "p0"],
      evidence: [evidence("validation-source", "file", "Validation schemas", "src/lib/validation.ts", createdAt)],
    }),
    node(buildMapId, "feature-accessibility", "feature", "Keyboard & screen readers", "Keep controls named, focus visible, panels navigable, and core workflows usable without precise pointer input.", createdAt, {
      scopeState: "included", deliveryStatus: "partial", tags: ["accessibility", "quality", "p0"],
      comments: [comment("a11y-audit", "Complete a keyboard-only pass before the release candidate.", "human", "You", createdAt)],
    }),
    node(buildMapId, "feature-performance", "feature", "Large-map performance", "Keep pan, zoom, selection, and editing responsive as a workspace grows past one hundred nodes.", createdAt, {
      scopeState: "proposed", deliveryStatus: "not_started", tags: ["performance", "scale", "p1"],
    }),
    node(buildMapId, "feature-snapshots", "feature", "Named snapshots", "Save milestones that survive a restart and restore one without overwriting the current draft.", createdAt, {
      scopeState: "proposed", deliveryStatus: "not_started", tags: ["history", "recovery", "p2"],
    }),

    node(buildMapId, "feature-guided-demo", "feature", "Useful guided demo", "Load a realistic workspace with statuses, sources, comments, linked maps, and a quiz immediately.", createdAt, {
      scopeState: "included", deliveryStatus: "partial", tags: ["onboarding", "demo", "p0"],
      evidence: [evidence("demo-source", "file", "Demo workspace seed", "src/lib/demo.ts", createdAt)],
    }),
    node(buildMapId, "feature-documentation", "feature", "Task-focused docs", "Explain core workflows, the agent contract, data ownership, and workspace recovery.", createdAt, {
      scopeState: "included", deliveryStatus: "partial", tags: ["docs", "adoption", "p0"],
      evidence: [evidence("readme", "file", "Project documentation", "README.md", createdAt)],
    }),
    node(buildMapId, "feature-release-readiness", "feature", "Release readiness", "Track build quality, browser behavior, documentation, and launch assets in one linked checklist.", createdAt, {
      scopeState: "included", deliveryStatus: "partial", tags: ["release", "quality", "p0"],
      evidence: [evidence("package-scripts", "file", "Verification scripts", "package.json", createdAt)],
    }),
    node(buildMapId, "feature-feedback", "feature", "In-product feedback", "Capture friction with workspace context and an optional exported diagnostic bundle.", createdAt, {
      scopeState: "proposed", deliveryStatus: "not_started", tags: ["feedback", "adoption", "p2"],
    }),
    node(buildMapId, "feature-cloud-sync", "feature", "Cloud accounts & sync", "Multi-device accounts, hosted storage, permissions, and shared live workspaces.", createdAt, {
      scopeState: "excluded", deliveryStatus: "not_started", tags: ["cloud", "future"],
      evidence: [evidence("sync-rationale", "note", "Scope decision", "Excluded from v1 to preserve the local-first, no-account promise.", createdAt)],
    }),
  ];

  const buildEdges = [
    edge(buildMapId, "edge-project-foundation", "project-nodebook", "group-foundation", createdAt),
    edge(buildMapId, "edge-project-workflows", "project-nodebook", "group-workflows", createdAt),
    edge(buildMapId, "edge-project-trust", "project-nodebook", "group-trust", createdAt),
    edge(buildMapId, "edge-project-launch", "project-nodebook", "group-launch", createdAt),
    ...["feature-canvas", "feature-local-persistence", "feature-portability", "feature-fast-capture", "feature-offline-recovery"].map((target) => edge(buildMapId, `edge-foundation-${target}`, "group-foundation", target, createdAt)),
    ...["feature-linked-maps", "feature-agent-handoff", "feature-evidence", "feature-comments", "feature-search"].map((target) => edge(buildMapId, `edge-workflows-${target}`, "group-workflows", target, createdAt)),
    ...["feature-undo", "feature-validation", "feature-accessibility", "feature-performance", "feature-snapshots"].map((target) => edge(buildMapId, `edge-trust-${target}`, "group-trust", target, createdAt)),
    ...["feature-guided-demo", "feature-documentation", "feature-release-readiness", "feature-feedback", "feature-cloud-sync"].map((target) => edge(buildMapId, `edge-launch-${target}`, "group-launch", target, createdAt)),
    edge(buildMapId, "edge-persistence-recovery", "feature-local-persistence", "feature-offline-recovery", createdAt, "depends_on", "enables"),
    edge(buildMapId, "edge-validation-handoff", "feature-validation", "feature-agent-handoff", createdAt, "depends_on", "guards"),
  ];

  const captureNodes = [
    node(captureMapId, "capture-thought", "step", "A thought arrives", "A decision, task, question, or reference appears before the surrounding context disappears.", createdAt),
    node(captureMapId, "capture-open", "step", "Open the canvas", "Return to the current workspace and keep the surrounding map in view.", createdAt),
    node(captureMapId, "capture-place", "step", "Click where it belongs", "Choose an empty spot near the current thread so position carries meaning.", createdAt),
    node(captureMapId, "capture-connect", "step", "Add & connect", "Create the node and link it to the selected idea in one action.", createdAt),
    node(captureMapId, "capture-describe", "step", "Name the useful detail", "Write a specific title and enough context for a person or agent to act later.", createdAt),
    node(captureMapId, "capture-evidence", "step", "Attach support", "Add the source, file, test, commit, or note that makes the claim inspectable.", createdAt),
    node(captureMapId, "capture-commit", "concept", "Local-first commit boundary", "Validate and commit the complete workspace mutation as one history entry, then persist it locally.", createdAt, {
      learningState: "learning", evidence: [evidence("persistence-architecture", "file", "Persistence architecture", "docs/ARCHITECTURE.md", createdAt)],
    }),
    node(captureMapId, "capture-confirm", "step", "See it settle", "The canvas updates immediately and the new node remains after reload.", createdAt),
    node(captureMapId, "capture-recover", "note", "Recovery path", "If persistence fails, preserve the in-memory workspace, explain the problem, and keep export available.", createdAt),
  ];
  const captureEdges = [
    edge(captureMapId, "edge-capture-1", "capture-thought", "capture-open", createdAt, "flows_to"),
    edge(captureMapId, "edge-capture-2", "capture-open", "capture-place", createdAt, "flows_to"),
    edge(captureMapId, "edge-capture-3", "capture-place", "capture-connect", createdAt, "flows_to"),
    edge(captureMapId, "edge-capture-4", "capture-connect", "capture-describe", createdAt, "flows_to"),
    edge(captureMapId, "edge-capture-5", "capture-describe", "capture-evidence", createdAt, "flows_to"),
    edge(captureMapId, "edge-capture-6", "capture-evidence", "capture-commit", createdAt, "flows_to"),
    edge(captureMapId, "edge-capture-7", "capture-commit", "capture-confirm", createdAt, "flows_to"),
    edge(captureMapId, "edge-capture-recovery", "capture-commit", "capture-recover", createdAt, "related_to", "on failure"),
  ];

  const agentNodes = [
    node(agentMapId, "agent-select", "step", "Select the decision", "Select the nodes that define the agent's working context.", createdAt),
    node(agentMapId, "agent-intent", "step", "Request Trace or Learn", "An explicit intent communicates the desired expansion without a fragile prompt.", createdAt),
    node(agentMapId, "agent-read", "step", "Agent reads context", "The agent discovers the active map, selection, linked maps, comments, and pending intent.", createdAt),
    node(agentMapId, "agent-propose", "step", "Prepare a graph", "Express the answer as semantic nodes, typed edges, evidence, and comments.", createdAt),
    node(agentMapId, "agent-validate", "step", "Validate the mutation", "Reject unsafe, oversized, duplicate, or structurally invalid input before state changes.", createdAt),
    node(agentMapId, "agent-commit", "step", "Commit atomically", "A valid batch becomes one activity entry and one undo step.", createdAt),
    node(agentMapId, "agent-review", "step", "Review in context", "Focus the result so scope, evidence, and relationships are easy to inspect.", createdAt),
    node(agentMapId, "agent-lock", "step", "Lock the decision", "Lock accepted nodes so later agent calls cannot silently rewrite them.", createdAt),
    node(agentMapId, "agent-guardrail", "note", "Human-owned deletion", "Agents may enrich the workspace, but hard deletion stays a direct human action.", createdAt),
  ];
  const agentEdges = [
    ...agentNodes.slice(0, 8).slice(0, -1).map((current, index) => edge(agentMapId, `edge-agent-${index + 1}`, current.id, agentNodes[index + 1].id, createdAt, "flows_to")),
    edge(agentMapId, "edge-agent-guardrail", "agent-validate", "agent-guardrail", createdAt, "related_to", "enforces"),
  ];

  const learnNodes = [
    node(learnMapId, "learn-local-first", "concept", "Local-first software", "The user's device holds the primary working copy, so core work stays fast and available without a server round trip.", createdAt, {
      learningState: "learning", evidence: [evidence("indexeddb-learn", "source_url", "MDN IndexedDB guide", INDEXED_DB_GUIDE, createdAt)],
    }),
    node(learnMapId, "learn-source-truth", "concept", "One source of truth", "A single workspace document contains maps, nodes, edges, activity, and the active location.", createdAt, {
      learningState: "known", locked: true, evidence: [evidence("workspace-model", "file", "Workspace document model", "src/lib/model.ts", createdAt)],
    }),
    node(learnMapId, "learn-transactions", "concept", "Atomic mutations", "Validate a complete change first, then commit it once so partial graph updates never leak.", createdAt, { learningState: "learning" }),
    node(learnMapId, "learn-history", "concept", "Undo history", "Store meaningful document transitions rather than every selection, pan, or viewport event.", createdAt, {
      learningState: "learning", evidence: [evidence("history-tests", "test", "Undo boundary tests", "src/lib/store.test.ts", createdAt)],
    }),
    node(learnMapId, "learn-persistence", "concept", "Async persistence", "Write the latest validated document to IndexedDB without blocking interaction.", createdAt, { learningState: "unknown" }),
    node(learnMapId, "learn-migrations", "concept", "Schema migrations", "Upgrade older exports and saved documents before the UI consumes them.", createdAt, {
      learningState: "unknown", evidence: [evidence("migration-tests", "test", "Schema migration tests", "src/lib/validation.test.ts", createdAt)],
    }),
    node(learnMapId, "learn-failure", "concept", "Failure recovery", "Keep usable memory state, surface the error, and preserve manual export when a local write fails.", createdAt, { learningState: "unknown" }),
    node(learnMapId, "learn-exercise", "exercise", "Design an atomic rename", "Trace a canvas rename through validation, history, persistence, reload, and undo.", createdAt, { learningState: "unknown" }),
    node(learnMapId, "learn-quiz", "question", "Architecture check", "Which object should be Nodebook's durable source of truth?", createdAt, {
      learningState: "unknown",
      quiz: {
        choices: ["React Flow nodes", "The workspace document", "The minimap", "Browser history"],
        correctChoiceIndex: 1,
        explanation: "The workspace document owns durable maps, nodes, edges, activity, and viewports; React Flow is a projection.",
      },
    }),
  ];
  const learnEdges = [
    edge(learnMapId, "edge-learn-source", "learn-local-first", "learn-source-truth", createdAt),
    edge(learnMapId, "edge-learn-transactions", "learn-source-truth", "learn-transactions", createdAt, "prerequisite"),
    edge(learnMapId, "edge-learn-history", "learn-transactions", "learn-history", createdAt),
    edge(learnMapId, "edge-learn-persistence", "learn-transactions", "learn-persistence", createdAt),
    edge(learnMapId, "edge-learn-migrations", "learn-persistence", "learn-migrations", createdAt, "prerequisite"),
    edge(learnMapId, "edge-learn-failure", "learn-persistence", "learn-failure", createdAt),
    edge(learnMapId, "edge-learn-exercise", "learn-transactions", "learn-exercise", createdAt),
    edge(learnMapId, "edge-learn-quiz", "learn-local-first", "learn-quiz", createdAt),
  ];

  const releaseNodes = [
    node(releaseMapId, "release-project", "project", "Release candidate", "A focused readiness board for the first dependable public build.", createdAt),
    node(releaseMapId, "release-quality", "group", "Quality gates", "Automated checks that must remain green.", createdAt),
    node(releaseMapId, "release-experience", "group", "Experience review", "Human checks for clarity, confidence, and polish.", createdAt),
    node(releaseMapId, "release-story", "group", "Launch story", "Materials that help someone understand and try Nodebook.", createdAt),
    node(releaseMapId, "release-unit", "feature", "Unit test suite", "Run model, store, navigation, validation, layout, progress, and WebMCP tests.", createdAt, { scopeState: "included", deliveryStatus: "complete", locked: true, tags: ["automated", "gate"] }),
    node(releaseMapId, "release-types", "feature", "Type safety", "Compile the application without emitting files and resolve every type error.", createdAt, { scopeState: "included", deliveryStatus: "complete", locked: true, tags: ["automated", "gate"] }),
    node(releaseMapId, "release-e2e", "feature", "Critical browser journeys", "Verify launch, editing, persistence, undo, evidence, comments, linked maps, and agent actions.", createdAt, { scopeState: "included", deliveryStatus: "partial", tags: ["automated", "browser", "gate"], evidence: [evidence("e2e-suite", "test", "Playwright journeys", "e2e/nodebook.spec.ts", createdAt)] }),
    node(releaseMapId, "release-build", "feature", "Production build", "Generate an optimized bundle with no blocking framework errors.", createdAt, { scopeState: "included", deliveryStatus: "partial", tags: ["automated", "gate"] }),
    node(releaseMapId, "release-keyboard", "feature", "Keyboard-only pass", "Complete capture, edit, review, navigation, and recovery without a pointer.", createdAt, { scopeState: "included", deliveryStatus: "not_started", tags: ["manual", "accessibility"] }),
    node(releaseMapId, "release-storage", "feature", "Persistence recovery drill", "Corrupt saved data, confirm safe fallback, then restore a valid export.", createdAt, { scopeState: "included", deliveryStatus: "not_started", tags: ["manual", "resilience"] }),
    node(releaseMapId, "release-demo", "feature", "Demo content review", "Confirm the seed feels substantial, coherent, and exposes every major interaction.", createdAt, {
      scopeState: "included", deliveryStatus: "partial", tags: ["manual", "onboarding"], comments: [comment("demo-density", "The first canvas should feel active without becoming an unreadable wall.", "agent", "Codex", createdAt)],
    }),
    node(releaseMapId, "release-docs", "feature", "README & walkthrough", "Keep the product story, demo prompts, privacy model, and checks accurate.", createdAt, { scopeState: "included", deliveryStatus: "partial", tags: ["docs", "launch"] }),
    node(releaseMapId, "release-preview", "feature", "Shareable preview", "Publish a stable preview and verify metadata, iconography, and first-run behavior.", createdAt, { scopeState: "proposed", deliveryStatus: "not_started", tags: ["deploy", "launch"] }),
  ];
  const releaseEdges = [
    edge(releaseMapId, "edge-release-quality", "release-project", "release-quality", createdAt),
    edge(releaseMapId, "edge-release-experience", "release-project", "release-experience", createdAt),
    edge(releaseMapId, "edge-release-story", "release-project", "release-story", createdAt),
    ...["release-unit", "release-types", "release-e2e", "release-build"].map((target) => edge(releaseMapId, `edge-quality-${target}`, "release-quality", target, createdAt)),
    ...["release-keyboard", "release-storage", "release-demo"].map((target) => edge(releaseMapId, `edge-experience-${target}`, "release-experience", target, createdAt)),
    ...["release-docs", "release-preview"].map((target) => edge(releaseMapId, `edge-story-${target}`, "release-story", target, createdAt)),
    edge(releaseMapId, "edge-release-build-preview", "release-build", "release-preview", createdAt, "depends_on", "before"),
  ];

  const researchNodes = [
    node(researchMapId, "research-keyboard", "note", "Keyboard capture", "What shortcut set speeds up capture without competing with browser and canvas controls?", createdAt, { tags: ["question", "accessibility"] }),
    node(researchMapId, "research-scale", "note", "Map scale thresholds", "Measure where cards, edges, minimap updates, and persistence become noticeably slow.", createdAt, { tags: ["experiment", "performance"] }),
    node(researchMapId, "research-storage", "note", "Storage eviction copy", "Draft plain-language recovery guidance for browsers that clear local data under pressure.", createdAt, { tags: ["copy", "recovery"], evidence: [evidence("storage-source", "source_url", "MDN IndexedDB guide", INDEXED_DB_GUIDE, createdAt)] }),
    node(researchMapId, "research-templates", "note", "Workspace templates", "Test whether opinionated starter maps help people begin faster than one generic demo.", createdAt, { tags: ["onboarding", "experiment"] }),
    node(researchMapId, "research-sharing", "note", "Sharing without accounts", "Explore static read-only snapshots before committing to cloud collaboration.", createdAt, { tags: ["sharing", "future"] }),
    node(researchMapId, "research-agent", "note", "Agent activity digest", "Summarize recent agent mutations so a returning person can review what changed.", createdAt, { tags: ["agents", "trust"] }),
  ];
  const researchEdges = [
    edge(researchMapId, "edge-research-scale-storage", "research-scale", "research-storage", createdAt, "related_to"),
    edge(researchMapId, "edge-research-templates-agent", "research-templates", "research-agent", createdAt, "related_to"),
    edge(researchMapId, "edge-research-sharing-agent", "research-sharing", "research-agent", createdAt, "related_to"),
  ];

  return {
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
    id: "workspace-nodebook-launch-demo",
    name: "Nodebook v1 launch plan",
    activeMapId: buildMapId,
    maps: dictionary([
      map(buildMapId, "Product roadmap", "build", createdAt),
      map(captureMapId, "Fast capture journey", "trace", createdAt, "feature-fast-capture"),
      map(agentMapId, "Agent collaboration loop", "trace", createdAt, "feature-agent-handoff"),
      map(learnMapId, "Local-first foundations", "learn", createdAt, "capture-commit"),
      map(releaseMapId, "Release readiness", "build", createdAt, "feature-release-readiness"),
      map(researchMapId, "Research parking lot", "blank", createdAt),
    ]),
    nodes: dictionary([
      ...layoutNodes(buildNodes, buildEdges, "LR"),
      ...layoutNodes(captureNodes, captureEdges, "LR"),
      ...layoutNodes(agentNodes, agentEdges, "LR"),
      ...layoutNodes(learnNodes, learnEdges, "TB"),
      ...layoutNodes(releaseNodes, releaseEdges, "LR"),
      ...layoutNodes(researchNodes, researchEdges, "TB"),
    ]),
    edges: dictionary([...buildEdges, ...captureEdges, ...agentEdges, ...learnEdges, ...releaseEdges, ...researchEdges]),
    activity: [
      { id: "activity-demo-review", source: "human", action: "scope_reviewed", summary: "Kept cloud accounts and sync outside the first release.", createdAt },
      { id: "activity-demo-agent", source: "agent", action: "workspace_enriched", summary: "Added journeys, evidence, comments, learning material, and release gates.", createdAt },
      { id: "activity-demo-loaded", source: "system", action: "demo_loaded", summary: "Loaded a complete Nodebook launch workspace.", createdAt },
    ],
    createdAt,
    updatedAt: createdAt,
  };
}
