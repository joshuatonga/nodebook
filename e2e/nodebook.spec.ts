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
