import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase("keyval-store");
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => resolve();
    });
  });
  await page.reload();
});

test("first launch is a blank agent-ready workspace with an unsupported fallback", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Plan what to build." })).toBeVisible();
  await expect(page.getByText("Map the v1 scope, delivery status, risks, and evidence for my product.")).toBeVisible();
  await expect(page.getByText("WebMCP unavailable")).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Workspace navigation" })).toBeVisible();

  await page.getByRole("button", { name: "Close navigation" }).click();
  await expect(page.getByRole("complementary", { name: "Workspace navigation" })).not.toBeVisible();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByRole("complementary", { name: "Workspace navigation" })).toBeVisible();
});

test("creates and opens a canvas from the sidebar", async ({ page }) => {
  const sidebar = page.getByRole("complementary", { name: "Workspace navigation" });

  await sidebar.getByRole("button", { name: "New canvas" }).click();
  await expect(page.getByRole("menuitem", { name: /Blank canvas/ })).toBeVisible();
  await page.getByRole("menuitem", { name: /Blank canvas/ }).click();

  const newCanvas = sidebar.getByRole("button", { name: "Untitled canvas" });
  await expect(newCanvas).toHaveAttribute("data-map-kind", "blank");
  await expect(sidebar.locator(".map-link").first()).toContainText("Untitled canvas");
  await expect(newCanvas).toHaveClass(/active/);
  await expect(page.getByRole("heading", { name: "Start with any idea." })).toBeVisible();

  await page.getByLabel("Map breadcrumbs").getByRole("button", { name: "Untitled canvas" }).click();
  const titleEditor = page.getByRole("textbox", { name: "Edit canvas title" });
  await titleEditor.fill("Ideas");
  await titleEditor.press("Enter");
  await expect(sidebar.getByRole("button", { name: "Ideas" })).toBeVisible();

  await page.waitForTimeout(350);
  await page.reload();
  await expect(sidebar.locator(".map-link").first()).toContainText("Ideas");
  await expect(sidebar.getByRole("button", { name: "Ideas" })).toHaveAttribute("data-map-kind", "blank");
});

test("creates connected nodes beside a selection or at a clicked canvas position", async ({ page }) => {
  await page.getByRole("button", { name: "Add your first feature" }).click();
  const canvas = page.getByRole("application");
  const firstNode = canvas.getByRole("heading", { name: "New feature", exact: true });
  await expect(firstNode).toBeVisible();

  await canvas.getByRole("button", { name: "Add a connected node after New feature" }).click();
  await expect(canvas.getByRole("heading", { name: "New feature", exact: true })).toHaveCount(2);
  await expect(page.locator(".react-flow__edge")).toHaveCount(1);

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(canvas.getByRole("heading", { name: "New feature", exact: true })).toHaveCount(1);
  await firstNode.click();

  await page.locator(".react-flow__pane").click({ position: { x: 600, y: 440 } });
  const createMenu = page.getByRole("dialog", { name: "Create node" });
  await expect(createMenu).toBeVisible();
  await createMenu.getByRole("button", { name: /Add & connect.*From New feature/ }).click();

  await expect(canvas.getByRole("heading", { name: "New feature", exact: true })).toHaveCount(2);
  await expect(page.locator(".react-flow__edge")).toHaveCount(1);
});

test("deletes a canvas from its hover action and supports undo", async ({ page }) => {
  await page.getByRole("button", { name: "Load demo" }).click();
  const sidebar = page.getByRole("complementary", { name: "Workspace navigation" });
  const canvas = sidebar.getByRole("button", { name: "Fast capture journey" });

  await canvas.hover();
  const deleteButton = canvas.locator("..").getByRole("button", { name: "Delete canvas" });
  await expect(deleteButton).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await deleteButton.click();
  await expect(canvas).not.toBeVisible();

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(sidebar.getByRole("button", { name: "Fast capture journey" })).toBeVisible();
});

test("clearly selects a connection and deletes it by mouse or keyboard with undo", async ({ page }) => {
  await page.getByRole("button", { name: "Load demo" }).click();
  await page.getByRole("button", { name: "Fit", exact: true }).click();
  const connection = page.locator('[data-testid="rf__edge-edge-foundation-feature-fast-capture"]');

  await expect(connection).toBeVisible();
  await connection.click();
  await expect(connection).toHaveClass(/selected/);
  await expect(connection.locator(".react-flow__edge-path")).toHaveCSS("stroke-width", "3.25px");
  await page.getByRole("button", { name: "Delete connection" }).click();
  await expect(connection).toHaveCount(0);

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(connection).toBeVisible();

  await connection.click();
  await page.keyboard.press("Delete");
  await expect(connection).toHaveCount(0);

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(connection).toBeVisible();
});

test("demo supports scope review, trace intent, linked maps, undo, and reload persistence", async ({ page }) => {
  await page.getByRole("button", { name: "Load demo" }).click();
  await expect(page.getByText("Ship Nodebook v1")).toBeVisible();
  await expect(page.getByRole("button", { name: "Accept all proposed" })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Inspector" })).not.toBeVisible();

  await page.getByText("In-product feedback", { exact: true }).click();
  await page.getByRole("button", { name: "Open inspector" }).click();
  await expect(page.getByRole("complementary", { name: "Inspector" })).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept("Feedback capture can follow the first release."));
  await page.getByLabel("Scope").selectOption("excluded");
  const feedbackNode = page.locator(".semantic-node").filter({
    has: page.getByRole("heading", { name: "In-product feedback", exact: true }),
  });
  await expect(feedbackNode.getByText("excluded", { exact: true })).toBeVisible();

  await page.getByText("Fast idea capture", { exact: true }).click();
  await page.getByRole("button", { name: "Trace", exact: true }).click();
  await expect(page.getByText("Trace intent is ready.")).toBeVisible();
  await page.getByLabel("Workspace navigation").getByRole("button", { name: "Fast capture journey" }).click();
  await expect(page.getByText("A thought arrives", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Add node" }).click();
  const newStep = page.getByRole("application").getByRole("heading", { name: "New step", exact: true });
  await expect(newStep).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(newStep).not.toBeVisible();
  await page.getByRole("button", { name: "Redo" }).click();
  await expect(newStep).toBeVisible();

  await page.waitForTimeout(350);
  await page.reload();
  await expect(
    page.getByLabel("Workspace navigation").getByRole("button", { name: "Fast capture journey", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("application").getByRole("heading", { name: "New step", exact: true })).toBeVisible();
});

test("exports a valid workspace JSON file", async ({ page }) => {
  await page.getByRole("button", { name: "Load demo" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export workspace" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("nodebook-v1-launch-plan.json");
});

test("nodes expand to show their entire description", async ({ page }) => {
  await page.getByRole("button", { name: "Load demo" }).click();
  const node = page.locator(".semantic-node").filter({
    has: page.getByRole("heading", { name: "Infinite semantic canvas", exact: true }),
  });
  const description = node.locator("p");
  await description.evaluate((element) => {
    element.textContent = "A long node description that should remain fully visible without clipping. ".repeat(8);
  });

  await expect.poll(() => description.evaluate((element) => element.clientHeight)).toBeGreaterThan(100);
  expect(await description.evaluate((element) => element.scrollHeight)).toBe(
    await description.evaluate((element) => element.clientHeight),
  );
});

test("selected nodes support direct title and description editing", async ({ page }) => {
  await page.getByRole("button", { name: "Load demo" }).click();
  const node = page.locator(".semantic-node").filter({
    has: page.getByRole("heading", { name: "Fast idea capture", exact: true }),
  });

  await node.getByRole("heading", { name: "Fast idea capture", exact: true }).click();
  await expect(node.getByRole("button", { name: "Edit title" })).toBeVisible();
  await expect(node.getByRole("textbox", { name: "Edit node title" })).toHaveCount(0);

  await node.getByRole("button", { name: "Edit title" }).click();
  const titleEditor = node.getByRole("textbox", { name: "Edit node title" });
  await titleEditor.fill("Instant capture");
  await titleEditor.press("Enter");
  const updatedNode = page.locator(".semantic-node").filter({
    has: page.getByRole("heading", { name: "Instant capture", exact: true }),
  });
  await expect(updatedNode.getByRole("heading", { name: "Instant capture", exact: true })).toBeVisible();

  await updatedNode.getByRole("button", { name: "Edit description" }).click();
  const descriptionEditor = updatedNode.getByRole("textbox", { name: "Edit node description" });
  await descriptionEditor.fill("Capture and connect an idea without leaving the canvas.");
  await descriptionEditor.press("Control+Enter");
  await expect(updatedNode.getByText("Capture and connect an idea without leaving the canvas.", { exact: true })).toBeVisible();

  await page.waitForTimeout(350);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Instant capture", exact: true })).toBeVisible();
  await expect(page.getByText("Capture and connect an idea without leaving the canvas.", { exact: true })).toBeVisible();
});

test("selected nodes expose a contextual details action", async ({ page }) => {
  await page.getByRole("button", { name: "Load demo" }).click();
  const node = page.locator(".semantic-node").filter({
    has: page.getByRole("heading", { name: "Agent handoff", exact: true }),
  });

  await expect(node.getByRole("button", { name: "Open details for Agent handoff" })).toHaveCount(0);
  await node.getByRole("heading", { name: "Agent handoff", exact: true }).click();
  const detailsButton = node.getByRole("button", { name: "Open details for Agent handoff" });
  await expect(detailsButton).toBeVisible();
  await expect(detailsButton).toHaveText(/Details/);

  await detailsButton.click();
  await expect(detailsButton).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("complementary", { name: "Inspector" })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Inspector" }).getByRole("heading", { name: "Agent handoff" })).toBeVisible();
});

test("node evidence opens a single source externally and aggregates multiple sources in Details", async ({ page }) => {
  await page.getByRole("button", { name: "Load demo" }).click();
  await page.getByLabel("Workspace navigation").getByRole("button", { name: "Local-first foundations" }).click();
  const node = page.locator(".semantic-node").filter({
    has: page.getByRole("heading", { name: "Local-first software", exact: true }),
  });
  const sourceLink = node.getByRole("link", { name: "Open source: MDN IndexedDB guide" });

  await expect(sourceLink).toHaveAttribute("target", "_blank");
  await expect(sourceLink).toHaveAttribute("rel", "noopener noreferrer");
  await expect(
    node.getByRole("link", { name: "Open 1 source for Local-first software: MDN IndexedDB guide" }),
  ).toBeVisible();
  const popupPromise = page.waitForEvent("popup");
  await sourceLink.click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL(/developer\.mozilla\.org/);
  await popup.close();

  await node.getByRole("heading", { name: "Local-first software", exact: true }).click();
  await node.getByRole("button", { name: "Open details for Local-first software" }).click();
  const inspector = page.getByRole("complementary", { name: "Inspector" });
  await inspector.getByPlaceholder("Source label").fill("Supporting research");
  await inspector.getByPlaceholder("https://…").fill("https://example.com/research");
  await inspector.getByRole("button", { name: "Add source" }).click();
  await page.getByRole("button", { name: "Close inspector", exact: true }).click({ force: true });

  await expect(node.getByRole("button", { name: "View 2 sources for Local-first software" })).toBeVisible();
  await page.getByRole("heading", { name: "Atomic mutations", exact: true }).click({ force: true });
  await node.getByRole("button", { name: "View evidence for Local-first software" }).click({ force: true });
  await expect(inspector).toBeVisible();
  await expect(inspector.getByRole("heading", { name: "Local-first software", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Evidence" })).toBeVisible();
});

test("quiz nodes reveal the correct answer after a learner chooses", async ({ page }) => {
  await page.getByRole("button", { name: "Load demo" }).click();
  await page.getByLabel("Workspace navigation").getByRole("button", { name: "Local-first foundations" }).click();
  const quiz = page.getByLabel("Quiz: Architecture check");
  await expect(quiz.getByRole("button", { name: "React Flow nodes" })).toBeVisible();
  await expect(quiz.getByRole("button", { name: "The workspace document" })).toBeVisible();
  await expect(quiz.getByRole("button", { name: "The minimap" })).toBeVisible();
  await expect(quiz.getByRole("button", { name: "Browser history" })).toBeVisible();

  await quiz.getByRole("button", { name: "React Flow nodes" }).click();
  const incorrectFeedback = quiz.getByRole("status");
  await expect(incorrectFeedback).toContainText("Not quite");
  await expect(incorrectFeedback).toContainText("Correct answer: The workspace document");
  await expect(incorrectFeedback).toContainText("The workspace document owns durable maps");

  await quiz.getByRole("button", { name: "Try again" }).click();
  await expect(incorrectFeedback).not.toBeVisible();
  await quiz.getByRole("button", { name: "The workspace document", exact: true }).click();
  await expect(quiz.getByRole("status")).toContainText("Correct");
});

test("agent highlights dim the rest of the canvas until cleared", async ({ page }) => {
  await page.addInitScript(() => {
    const tools: Record<string, { execute: (input: unknown) => unknown }> = {};
    Object.defineProperty(window, "__nodebookTools", { value: tools });
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: {
        registerTool(tool: { name: string; execute: (input: unknown) => unknown }) {
          tools[tool.name] = tool;
          return Promise.resolve();
        },
      },
    });
  });
  await page.reload();
  await expect(page.getByText("WebMCP ready")).toBeVisible();
  await page.getByRole("button", { name: "Load demo" }).click();

  await page.evaluate(async () => {
    const tools = (window as unknown as {
      __nodebookTools: Record<string, { execute: (input: unknown) => unknown }>;
    }).__nodebookTools;
    await tools.highlight_path.execute({
      nodeIds: ["project-nodebook", "group-foundation", "feature-fast-capture"],
      tone: "risk",
    });
  });

  const highlightedNodes = page.locator(".react-flow__node.path-highlighted");
  const dimmedNodes = page.locator(".react-flow__node.path-dimmed");
  await expect(highlightedNodes).toHaveCount(3);
  await expect(dimmedNodes.first()).toHaveCSS("opacity", "0.2");
  await expect(page.locator(".react-flow__edge.path-highlighted")).toHaveCount(2);
  await expect(page.locator(".react-flow__edge.path-dimmed").first()).toHaveCSS("opacity", "0.12");

  await page.getByRole("button", { name: "Clear" }).click();
  await expect(highlightedNodes).toHaveCount(0);
  await expect(dimmedNodes).toHaveCount(0);
});

test("people and named agents can comment on a node", async ({ page }) => {
  await page.addInitScript(() => {
    const tools: Record<string, { execute: (input: unknown) => unknown }> = {};
    Object.defineProperty(window, "__nodebookTools", { value: tools });
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: {
        registerTool(tool: { name: string; execute: (input: unknown) => unknown }) {
          tools[tool.name] = tool;
          return Promise.resolve();
        },
      },
    });
  });
  await page.reload();
  await expect(page.getByText("WebMCP ready")).toBeVisible();
  await page.getByRole("button", { name: "Load demo" }).click();

  const node = page.locator(".semantic-node", {
    has: page.getByRole("heading", { name: "Evidence on decisions", exact: true }),
  });
  await node.getByRole("button", { name: "Add comment to Evidence on decisions" }).click();
  const inspector = page.getByRole("complementary", { name: "Inspector" });
  await inspector.getByRole("textbox", { name: "Comment" }).fill("Please verify the empty state.");
  await inspector.getByRole("button", { name: "Comment", exact: true }).click();
  await expect(inspector.getByText("Please verify the empty state.")).toBeVisible();
  await expect(inspector.getByText("You", { exact: true })).toBeVisible();

  await page.evaluate(() => {
    const tools = (window as unknown as {
      __nodebookTools: Record<string, { execute: (input: unknown) => unknown }>;
    }).__nodebookTools;
    tools.add_comment.execute({
      nodeId: "feature-evidence",
      body: "I checked it; the fallback copy needs a revision.",
      agentName: "Codex",
    });
  });

  await expect(inspector.getByText("I checked it; the fallback copy needs a revision.")).toBeVisible();
  await expect(inspector.getByText("Codex", { exact: true })).toBeVisible();
  await expect(node.getByRole("button", { name: "View 2 comments on Evidence on decisions" })).toBeVisible();
});
