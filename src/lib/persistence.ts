import { del, get, set } from "idb-keyval";
import type { WorkspaceDocument } from "@/lib/model";
import { parseWorkspaceDocument } from "@/lib/validation";

const STORAGE_KEY = "nodebook.workspace.v1";

export async function loadStoredWorkspace(): Promise<WorkspaceDocument | null> {
  try {
    const value = await get<unknown>(STORAGE_KEY);
    return value ? parseWorkspaceDocument(value) : null;
  } catch {
    return null;
  }
}

export async function saveStoredWorkspace(document: WorkspaceDocument): Promise<void> {
  await set(STORAGE_KEY, document);
}

export async function removeStoredWorkspace(): Promise<void> {
  await del(STORAGE_KEY);
}

export function serializeWorkspace(document: WorkspaceDocument): string {
  return JSON.stringify(document, null, 2);
}

export function deserializeWorkspace(value: string): WorkspaceDocument {
  return parseWorkspaceDocument(JSON.parse(value) as unknown);
}

export function downloadWorkspace(document: WorkspaceDocument): void {
  const blob = new Blob([serializeWorkspace(document)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = `${document.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "nodebook"}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
