# Architecture

## Rendering boundary

`src/app/page.tsx` is a lightweight server component. `NodebookAppLoader` creates a client boundary and dynamically imports the browser application with server rendering disabled. React Flow, `document.modelContext`, and IndexedDB are therefore initialized only in the browser.

## Durable document

`WorkspaceDocument` is the only durable application value. It contains versioned workspace metadata, maps, nodes, edges, per-map viewports, evidence, and the latest 100 activity records. Selection, pending intent, highlights, and focus commands are transient UI state.

Each map has one semantic purpose:

- `build`: researched features, human scope, and delivery status
- `trace`: journeys, system flows, and implementation paths
- `learn`: concepts, prerequisites, examples, interactive multiple-choice quizzes, and exercises

A child map points to its originating node with `parentNodeId`. That relationship produces both sidebar navigation and semantic breadcrumbs without crowding everything onto one graph.

## State and persistence

Zustand owns the live document. Zundo snapshots only the durable workspace and limits history to 50 states. Viewport changes and navigation pause temporal history; semantic human or agent mutations create history.

The persistence hook hydrates once from IndexedDB and then debounces writes. Import validation performs schema parsing, migration (including adding comment histories to version-one nodes), dictionary-key checks, map/node/edge referential integrity, graph-boundary checks, and HTTPS validation for research sources.

## WebMCP boundary

`src/lib/webmcp/tools.ts` is deliberately independent from React. Each tool has:

1. A strict JSON Schema for browser discovery.
2. A matching Zod schema for runtime validation.
3. A small runtime adapter for snapshots, atomic commits, navigation, and ephemeral focus.
4. Text content plus structured content in its response.

Tools register with the current `document.modelContext.registerTool()` API and share one `AbortController` signal. Unmounting the application aborts the registrations. Read tools declare `readOnlyHint`; all tools declare how returned content should be treated.

Agent mutations clone the current document, validate the whole requested batch, apply it synchronously, and call `commitWorkspace` once. That creates one visible update, one activity entry, one IndexedDB save, and one undo step per tool call.

Comments live on stable node IDs rather than mutable title or description text. Human comments are attributed as `You`; `add_comment` requires the calling agent to provide its display identity when it wants a specific name. `list_comments` returns authorship together with node context.

## Human control and safety

- Agent graph tools merge; they never replace an entire map.
- No agent deletion tool is registered.
- Locked nodes are skipped and returned to the caller.
- Scope exclusion requires a rationale.
- Delivery status is valid only for included features.
- Research citations must use HTTPS.
- Edges cannot cross map boundaries or reference missing nodes.
- Batches, strings, tags, and evidence arrays are bounded.
- All UI content is rendered as React text, never injected HTML.

## Progress

Only `feature` nodes with `scopeState: included` enter the delivery denominator:

- complete = 1
- partial = 0.5
- not started = 0

Proposed and excluded features remain visible in scope counts but do not dilute delivery progress.
