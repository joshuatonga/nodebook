import type { CanvasMap, CanvasNode, WorkspaceDocument } from "@/lib/model";

export interface BreadcrumbItem {
  id: string;
  label: string;
  mapId?: string;
}

export function buildBreadcrumbs(workspace: WorkspaceDocument, mapId: string): BreadcrumbItem[] {
  const chain: Array<{ map: CanvasMap; parentTitle?: string }> = [];
  const seen = new Set<string>();
  let current: CanvasMap | undefined = workspace.maps[mapId];

  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    const parentNode: CanvasNode | undefined = current.parentNodeId
      ? workspace.nodes[current.parentNodeId]
      : undefined;
    chain.unshift({ map: current, parentTitle: parentNode?.title });
    current = parentNode ? workspace.maps[parentNode.mapId] : undefined;
  }

  const crumbs: BreadcrumbItem[] = [{ id: workspace.id, label: workspace.name }];
  for (const entry of chain) {
    if (entry.parentTitle) {
      crumbs.push({ id: `node-${entry.map.id}`, label: entry.parentTitle });
    }
  }
  const active = workspace.maps[mapId];
  if (active) crumbs.push({ id: active.id, label: active.title, mapId: active.id });
  return crumbs;
}
