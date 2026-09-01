import type { WorkspaceDocument } from "@/lib/model";

export interface DeliveryProgress {
  proposed: number;
  included: number;
  excluded: number;
  notStarted: number;
  partial: number;
  complete: number;
  score: number;
  total: number;
  percentage: number;
}

export function calculateDeliveryProgress(document: WorkspaceDocument): DeliveryProgress {
  const features = Object.values(document.nodes).filter((node) => node.kind === "feature");
  let proposed = 0;
  let included = 0;
  let excluded = 0;
  let notStarted = 0;
  let partial = 0;
  let complete = 0;

  for (const feature of features) {
    if (feature.scopeState === "proposed") {
      proposed += 1;
      continue;
    }
    if (feature.scopeState === "excluded") {
      excluded += 1;
      continue;
    }
    if (feature.scopeState !== "included") continue;

    included += 1;
    if (feature.deliveryStatus === "complete") complete += 1;
    else if (feature.deliveryStatus === "partial") partial += 1;
    else notStarted += 1;
  }

  const score = complete + partial * 0.5;
  return {
    proposed,
    included,
    excluded,
    notStarted,
    partial,
    complete,
    score,
    total: included,
    percentage: included === 0 ? 0 : Math.round((score / included) * 100),
  };
}
