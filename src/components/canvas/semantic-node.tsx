"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { ExternalLink, GitBranch, LockKeyhole } from "lucide-react";
import { memo } from "react";
import type { CanvasNode } from "@/lib/model";

export interface SemanticNodeData extends Record<string, unknown> {
  node: CanvasNode;
  linkedMapCount: number;
  highlighted?: "focus" | "risk" | "success";
  appSelected?: boolean;
}

export type SemanticFlowNode = Node<SemanticNodeData, "semantic">;

function labelForNode(node: CanvasNode): string | null {
  if (node.kind === "feature" && node.scopeState) return node.scopeState.replace("_", " ");
  if (node.kind === "concept" && node.learningState) return node.learningState;
  if (node.deliveryStatus && node.deliveryStatus !== "not_started") return node.deliveryStatus.replace("_", " ");
  return null;
}

function SemanticNodeView({ data, selected }: NodeProps<SemanticFlowNode>) {
  const { node, linkedMapCount, highlighted } = data;
  const stateLabel = labelForNode(node);

  return (
    <article
      className={`semantic-node kind-${node.kind} ${selected || data.appSelected ? "selected" : ""} ${node.locked ? "locked" : ""} ${highlighted ? `highlight-${highlighted}` : ""}`}
    >
      <Handle className="node-handle" position={Position.Left} type="target" />
      <div className="node-card-header">
        <span className="node-kind">{node.kind}</span>
        <span className="node-card-icons">
          {node.evidence.length > 0 ? <ExternalLink aria-label={`${node.evidence.length} evidence items`} size={12} /> : null}
          {linkedMapCount > 0 ? <GitBranch aria-label={`${linkedMapCount} linked maps`} size={12} /> : null}
          {node.locked ? <LockKeyhole aria-label="Locked" size={12} /> : null}
        </span>
      </div>
      <h3>{node.title}</h3>
      {node.description ? <p>{node.description}</p> : <p className="node-placeholder">Add a description</p>}
      <div className="node-card-footer">
        {stateLabel ? <span className={`state-chip ${node.scopeState ?? node.learningState ?? node.deliveryStatus}`}>{stateLabel}</span> : <span />}
        {node.evidence.length > 0 ? <span>{node.evidence.length} {node.evidence.length === 1 ? "source" : "sources"}</span> : null}
      </div>
      <Handle className="node-handle" position={Position.Right} type="source" />
    </article>
  );
}

export const SemanticNode = memo(SemanticNodeView);
