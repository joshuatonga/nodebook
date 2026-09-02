# Nodebook

Nodebook is a local-first infinite canvas where a person and an external agent can research, scope, trace, and learn a product together. It contributes durable visual state and deterministic WebMCP tools—there is no embedded chatbot, search backend, account, or server-side data store.

The challenge demo starts from a blank canvas with:

> Research MyFitnessPal and map the features we’d need for a clone.

**Live app:** [nodebook.tinyinternet.dev](https://nodebook.tinyinternet.dev/)

An agent researches with its own capabilities and uses Nodebook’s WebMCP tools to create the cited feature map. The human then reviews scope, locks decisions, and asks the agent to expand selected nodes into linked trace and learning maps.

## What is included

- Infinite semantic canvas powered by React Flow
- Linked `build`, `trace`, and `learn` maps with breadcrumbs
- Human-controlled scope, delivery, learning, evidence, and lock states
- Trace/Learn selection intents that agents discover with `get_selection`
- Deterministic Dagre layout, path highlighting, selection, minimap, and fit view
- One undo step and one activity entry for every agent mutation
- IndexedDB persistence plus JSON import/export
- Source-backed MyFitnessPal example available through **Load demo**
- Graceful “WebMCP unavailable” state in unsupported browsers
- No accounts, environment variables, API routes, cookies, analytics, or cloud database

## Run locally

Requirements: Node.js 20.9 or newer and pnpm 11.

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). A WebMCP-enabled browser or ChatGPT’s in-app browser can discover the tools. Standard browsers still provide the full human editing experience and show an explicit fallback status.

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm exec playwright install chromium # first E2E run only
pnpm test:e2e
pnpm build
```

Unit tests cover progress calculations, navigation, layout, import validation and migration, cascade deletion, history, lock enforcement, schemas, lifecycle cleanup, and every WebMCP tool. Playwright covers blank launch, the unsupported-browser fallback, scope review, trace navigation, persistence, undo/redo, and export.

## Architecture

The Next.js App Router renders a small server shell. The browser-only application is dynamically loaded so React Flow and IndexedDB never participate in server hydration.

```text
External agent
    │ document.modelContext.registerTool()
    ▼
WebMCP registry ── validates input and commits one atomic mutation
    │
    ▼
Zustand + zundo ── WorkspaceDocument ── IndexedDB
    │                       │
    ├── React Flow canvas   ├── linked maps + viewports
    ├── inspector           ├── nodes + edges + evidence
    └── activity / undo     └── last 100 activity entries
```

Core choices:

- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4
- `@xyflow/react` for the canvas
- `@dagrejs/dagre` for deterministic agent-created layout
- Zustand and zundo for state and undo/redo
- `idb-keyval` for local IndexedDB persistence
- `@mcp-b/webmcp-types` for canonical browser API declarations
- Zod for runtime tool and import validation

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the document format, mutation boundary, and safety model.

## WebMCP tools

| Tool | Purpose |
| --- | --- |
| `get_workspace` | Workspace metadata, maps, progress, selection, and pending intent |
| `get_map` | Compact nodes and edges for one map |
| `get_node` | Full node, citations/evidence, and linked maps |
| `get_selection` | Selected nodes plus pending Trace/Learn intent |
| `search_nodes` | Search titles, descriptions, tags, and evidence |
| `create_map` | Batch-create, validate, lay out, link, persist, and optionally open a map |
| `upsert_graph` | Merge nodes and edges while skipping locked nodes |
| `set_scope_decisions` | Include/exclude proposed features; exclusions require rationale |
| `set_delivery_statuses` | Update included-feature delivery progress and attach evidence |
| `set_learning_states` | Mark learning state and optionally lock known concepts |
| `add_evidence` | Attach source, file, test, commit, or note evidence |
| `focus_nodes` | Select and fit nodes on the live canvas |
| `highlight_path` | Emphasize an ordered path with focus, risk, or success styling |

All schemas reject unknown properties, unsafe research URLs, missing IDs, overlong text, oversized batches, duplicates, and broken graph references. Question nodes require 2–6 choices and a valid correct-answer index. Agent tools cannot hard-delete nodes. Locked nodes reject agent changes and report their IDs as skipped.

## Demo prompts

1. `Research MyFitnessPal and map the features we’d need for a clone. Cite every researched feature.`
2. Select **Food diary**, press **Trace**, then ask: `Create an end-to-end trace map for the selected feature.`
3. Select **Update macro totals**, press **Learn**, then ask: `Create a learning map for the selected concept with prerequisites, examples, an exercise, and a multiple-choice quiz.`
4. `Highlight the critical food logging path and focus it on the canvas.`

The optional **Load demo** button creates the same kind of source-backed workspace without waiting for live research.

## Privacy

Nodebook stores the workspace only in the current browser’s IndexedDB. JSON leaves the browser only when a human explicitly exports it. The app has no API routes, accounts, telemetry, analytics, cloud sync, secrets, or environment variables. External agents receive only data returned by a tool they call; source content is treated as untrusted text and React never injects returned HTML.

Clearing site data removes the saved workspace. Export a JSON backup first if you want to keep it.

## Deployment

Nodebook is a static, Git-connected Vercel deployment. Every pull request can receive an automatic preview and the default branch deploys production. No Vercel environment variables or server routes are required.

## License

[MIT](LICENSE)
