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
  await expect(page.getByRole("heading", { name: "Map a product with your agent." })).toBeVisible();
  await expect(page.getByText("Research MyFitnessPal and map the features we’d need for a clone.")).toBeVisible();
  await expect(page.getByText("WebMCP unavailable")).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Workspace navigation" })).toBeVisible();

  await page.getByRole("button", { name: "Close navigation" }).click();
  await expect(page.getByRole("complementary", { name: "Workspace navigation" })).not.toBeVisible();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByRole("complementary", { name: "Workspace navigation" })).toBeVisible();
});

test("demo supports scope review, trace intent, linked maps, undo, and reload persistence", async ({ page }) => {
  await page.getByRole("button", { name: "Load source-backed demo" }).click();
  await expect(page.getByText("MyFitnessPal-style tracker")).toBeVisible();
  await expect(page.getByRole("button", { name: "Accept all proposed" })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Inspector" })).not.toBeVisible();

  await page.getByText("Meal planner", { exact: true }).click();
  await page.getByRole("button", { name: "Open inspector" }).click();
  await expect(page.getByRole("complementary", { name: "Inspector" })).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept("A weekly planner is outside the first release."));
  await page.getByLabel("Scope").selectOption("excluded");
  await expect(page.getByText("excluded", { exact: true })).toBeVisible();

  await page.getByText("Food diary", { exact: true }).click();
  await page.getByRole("button", { name: "Trace", exact: true }).click();
  await expect(page.getByText("Trace intent is ready.")).toBeVisible();
  await page.getByLabel("Workspace navigation").getByRole("button", { name: "Food logging journey" }).click();
  await expect(page.getByText("Open Today", { exact: true })).toBeVisible();

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
    page.getByLabel("Workspace navigation").getByRole("button", { name: "Food logging journey", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("application").getByRole("heading", { name: "New step", exact: true })).toBeVisible();
});

test("exports a valid workspace JSON file", async ({ page }) => {
  await page.getByRole("button", { name: "Load source-backed demo" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export workspace" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("myfitnesspal-clone-research.json");
});

test("nodes expand to show their entire description", async ({ page }) => {
  await page.getByRole("button", { name: "Load source-backed demo" }).click();
  const node = page.locator(".semantic-node").filter({
    has: page.getByRole("heading", { name: "Calories & macros", exact: true }),
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

test("quiz nodes reveal the correct answer after a learner chooses", async ({ page }) => {
  await page.getByRole("button", { name: "Load source-backed demo" }).click();
  await page.getByLabel("Workspace navigation").getByRole("button", { name: "Understanding macronutrients" }).click();
  const quiz = page.getByLabel("Quiz: Quick check");
  await expect(quiz.getByRole("button", { name: "Protein" })).toBeVisible();
  await expect(quiz.getByRole("button", { name: "Carbohydrate" })).toBeVisible();
  await expect(quiz.getByRole("button", { name: "Fat", exact: true })).toBeVisible();
  await expect(quiz.getByRole("button", { name: "Water" })).toBeVisible();

  await quiz.getByRole("button", { name: "Protein" }).click();
  const incorrectFeedback = quiz.getByRole("status");
  await expect(incorrectFeedback).toContainText("Not quite");
  await expect(incorrectFeedback).toContainText("Correct answer: Fat");
  await expect(incorrectFeedback).toContainText("Fat provides 9 calories per gram");

  await quiz.getByRole("button", { name: "Try again" }).click();
  await expect(incorrectFeedback).not.toBeVisible();
  await quiz.getByRole("button", { name: "Fat", exact: true }).click();
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
  await page.getByRole("button", { name: "Load source-backed demo" }).click();

  await page.evaluate(async () => {
    const tools = (window as unknown as {
      __nodebookTools: Record<string, { execute: (input: unknown) => unknown }>;
    }).__nodebookTools;
    await tools.highlight_path.execute({
      nodeIds: ["project-mfp", "group-log", "feature-food"],
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
