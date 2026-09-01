"use client";

import {
  ArrowRight,
  BookOpenCheck,
  ExternalLink,
  GitBranch,
  GraduationCap,
  Link2,
  LockKeyhole,
  PanelRight,
  Plus,
  Trash2,
  UnlockKeyhole,
} from "lucide-react";
import { useMemo, useState } from "react";
import { createId, nowIso } from "@/lib/ids";
import { linkedMapsForNode } from "@/lib/model";
import { useWorkspaceStore } from "@/lib/store";

export function Inspector() {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const selectedNodeIds = useWorkspaceStore((state) => state.selectedNodeIds);
  const pendingIntent = useWorkspaceStore((state) => state.pendingIntent);
  const updateNode = useWorkspaceStore((state) => state.updateNode);
  const deleteNodes = useWorkspaceStore((state) => state.deleteNodes);
  const requestIntent = useWorkspaceStore((state) => state.requestIntent);
  const clearIntent = useWorkspaceStore((state) => state.clearIntent);
  const activateMap = useWorkspaceStore((state) => state.activateMap);
  const addHumanEvidence = useWorkspaceStore((state) => state.addHumanEvidence);
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceLabel, setEvidenceLabel] = useState("");
  const selectedNodes = useMemo(
    () => selectedNodeIds.flatMap((id) => (workspace.nodes[id] ? [workspace.nodes[id]] : [])),
    [selectedNodeIds, workspace.nodes],
  );

  if (selectedNodes.length === 0) {
    return (
      <aside className="inspector empty" aria-label="Inspector">
        <span className="inspector-empty-icon"><PanelRight size={20} /></span>
        <h2>Inspector</h2>
        <p>Select a node to review its scope, evidence, status, and linked maps.</p>
        <div className="inspector-hint">
          <strong>Human control stays visible</strong>
          <span>Lock decisions before the agent’s next pass. Every tool call is one undo step.</span>
        </div>
      </aside>
    );
  }

  if (selectedNodes.length > 1) {
    return (
      <aside className="inspector" aria-label="Inspector">
        <div className="inspector-title"><span>{selectedNodes.length} nodes selected</span></div>
        <p className="muted">Use the canvas to move or delete the selection. Choose one node for semantic controls.</p>
        <button className="danger-button" onClick={() => deleteNodes(selectedNodes.map((node) => node.id))} type="button">
          <Trash2 size={15} /> Delete selected
        </button>
      </aside>
    );
  }

  const node = selectedNodes[0];
  return (
    <aside className="inspector" aria-label="Inspector" key={node.id}>
      <div className="inspector-title">
        <div>
          <span className="eyebrow">{node.kind}</span>
          <h2>{node.title}</h2>
        </div>
        <button
          aria-label={node.locked ? "Unlock node" : "Lock node"}
          className={`icon-button ${node.locked ? "locked-control" : ""}`}
          onClick={() => updateNode(node.id, { locked: !node.locked })}
          title={node.locked ? "Unlock for agent edits" : "Protect from agent edits"}
          type="button"
        >
          {node.locked ? <LockKeyhole size={16} /> : <UnlockKeyhole size={16} />}
        </button>
      </div>

      {pendingIntent?.nodeId === node.id ? (
        <div className="intent-banner">
          <span><strong>{pendingIntent.type === "trace" ? "Trace" : "Learn"} intent is ready.</strong> Your agent can see it with get_selection.</span>
          <button onClick={clearIntent} type="button">Clear</button>
        </div>
      ) : null}

      <section className="inspector-section">
        <label className="field-label" htmlFor="node-title">Title</label>
        <input
          className="text-input"
          defaultValue={node.title}
          id="node-title"
          maxLength={120}
          onBlur={(event) => event.target.value !== node.title && updateNode(node.id, { title: event.target.value.trim() || node.title })}
        />
        <label className="field-label" htmlFor="node-description">Description</label>
        <textarea
          className="text-area"
          defaultValue={node.description}
          id="node-description"
          maxLength={1200}
          onBlur={(event) => event.target.value !== node.description && updateNode(node.id, { description: event.target.value })}
          placeholder="What matters about this node?"
          rows={4}
        />
      </section>

      {node.kind === "feature" ? (
        <section className="inspector-section two-column-fields">
          <label>
            <span className="field-label">Scope</span>
            <select
              className="select-input"
              onChange={(event) => {
                const scopeState = event.target.value as NonNullable<typeof node.scopeState>;
                if (scopeState === "excluded") {
                  const rationale = window.prompt("Why is this feature excluded? The rationale will be attached as evidence.");
                  if (!rationale?.trim()) {
                    event.target.value = node.scopeState ?? "proposed";
                    return;
                  }
                  updateNode(node.id, {
                    scopeState,
                    evidence: [
                      ...node.evidence,
                      {
                        id: createId("evidence"),
                        kind: "note",
                        label: "Exclusion rationale",
                        ref: rationale.trim(),
                        addedBy: "human",
                        createdAt: nowIso(),
                      },
                    ],
                  });
                  return;
                }
                updateNode(node.id, { scopeState });
              }}
              value={node.scopeState ?? "proposed"}
            >
              <option value="proposed">Proposed</option>
              <option value="included">Included</option>
              <option value="excluded">Excluded</option>
            </select>
          </label>
          <label>
            <span className="field-label">Delivery</span>
            <select
              className="select-input"
              onChange={(event) => updateNode(node.id, { deliveryStatus: event.target.value as NonNullable<typeof node.deliveryStatus> })}
              value={node.deliveryStatus ?? "not_started"}
            >
              <option value="not_started">Not started</option>
              <option value="partial">Partial</option>
              <option value="complete">Complete</option>
            </select>
          </label>
        </section>
      ) : null}

      {(node.kind === "concept" || node.kind === "exercise" || node.kind === "question") ? (
        <section className="inspector-section">
          <label>
            <span className="field-label">Learning state</span>
            <select
              className="select-input"
              onChange={(event) => updateNode(node.id, { learningState: event.target.value as NonNullable<typeof node.learningState> })}
              value={node.learningState ?? "unknown"}
            >
              <option value="unknown">Unknown</option>
              <option value="learning">Learning</option>
              <option value="known">Known</option>
            </select>
          </label>
          {node.learningState === "known" && !node.locked ? (
            <button className="inline-action" onClick={() => updateNode(node.id, { locked: true })} type="button">
              <BookOpenCheck size={14} /> Mark understood and lock
            </button>
          ) : null}
        </section>
      ) : null}

      <section className="inspector-section">
        <div className="section-heading">
          <span>Agent intents</span>
          <small>Visible via get_selection</small>
        </div>
        <div className="intent-actions">
          <button onClick={() => requestIntent("trace", node.id)} type="button"><GitBranch size={15} /> Trace</button>
          <button onClick={() => requestIntent("learn", node.id)} type="button"><GraduationCap size={15} /> Learn</button>
        </div>
      </section>

      <LinkedMaps nodeId={node.id} onOpen={activateMap} workspace={workspace} />

      <section className="inspector-section evidence-section">
        <div className="section-heading">
          <span>Evidence</span>
          <small>{node.evidence.length}</small>
        </div>
        <div className="evidence-list">
          {node.evidence.map((evidence) =>
            evidence.kind === "source_url" ? (
              <a href={evidence.ref} key={evidence.id} rel="noreferrer" target="_blank">
                <span><ExternalLink size={13} /> {evidence.label}</span>
                <small>{new URL(evidence.ref).hostname}</small>
              </a>
            ) : (
              <div className="evidence-note" key={evidence.id}>
                <span><Link2 size={13} /> {evidence.label}</span>
                <small>{evidence.ref}</small>
              </div>
            ),
          )}
          {node.evidence.length === 0 ? <p className="muted">No evidence attached yet.</p> : null}
        </div>
        <div className="evidence-form">
          <input
            className="text-input"
            onChange={(event) => setEvidenceLabel(event.target.value)}
            placeholder="Source label"
            value={evidenceLabel}
          />
          <input
            className="text-input"
            onChange={(event) => setEvidenceUrl(event.target.value)}
            placeholder="https://…"
            type="url"
            value={evidenceUrl}
          />
          <button
            className="inline-action"
            disabled={!evidenceLabel.trim() || !evidenceUrl.startsWith("https://")}
            onClick={() => {
              addHumanEvidence(node.id, { kind: "source_url", label: evidenceLabel.trim(), ref: evidenceUrl.trim() });
              setEvidenceLabel("");
              setEvidenceUrl("");
            }}
            type="button"
          >
            <Plus size={14} /> Add source
          </button>
        </div>
      </section>

      <button className="danger-button inspector-delete" onClick={() => deleteNodes([node.id])} type="button">
        <Trash2 size={15} /> Delete node
      </button>
    </aside>
  );
}

function LinkedMaps({
  nodeId,
  onOpen,
  workspace,
}: {
  nodeId: string;
  onOpen: (mapId: string) => void;
  workspace: ReturnType<typeof useWorkspaceStore.getState>["workspace"];
}) {
  const maps = linkedMapsForNode(workspace, nodeId);
  if (maps.length === 0) return null;
  return (
    <section className="inspector-section">
      <div className="section-heading"><span>Linked maps</span><small>{maps.length}</small></div>
      <div className="linked-map-list">
        {maps.map((map) => (
          <button key={map.id} onClick={() => onOpen(map.id)} type="button">
            <span><GitBranch size={14} /> {map.title}</span>
            <ArrowRight size={14} />
          </button>
        ))}
      </div>
    </section>
  );
}
