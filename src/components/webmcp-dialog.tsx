"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import type { WebMcpStatus } from "@/lib/model";

const webMcpTools = [
  ["get_workspace", "Review the workspace, its maps, delivery progress, selection, and pending intent."],
  ["get_map", "Read the active or requested map with its nodes and connections."],
  ["get_node", "Inspect a node’s details, evidence, comments, and linked maps."],
  ["get_selection", "See the nodes you selected and any pending Trace or Learn intent."],
  ["search_nodes", "Search titles, descriptions, tags, evidence, and comments."],
  ["create_map", "Create and open a structured build, trace, or learn map."],
  ["upsert_graph", "Add or update nodes and connections without replacing a map."],
  ["set_scope_decisions", "Mark features proposed, included, or excluded in a batch."],
  ["set_delivery_statuses", "Update delivery progress and attach supporting evidence."],
  ["set_learning_states", "Mark concepts unknown, learning, or known."],
  ["add_evidence", "Attach a source, file, test, commit, or note to a node."],
  ["list_comments", "Review comments across a node or map."],
  ["add_comment", "Leave an agent comment on a node."],
  ["focus_nodes", "Select nodes and fit the live canvas around them."],
  ["highlight_path", "Highlight a focus, risk, or success path on the canvas."],
] as const;

const examplePrompts = [
  "Create a build map for this feature with scope, dependencies, and delivery steps.",
  "Trace how the selected behavior works from the interface through state and persistence, adding source evidence.",
  "Turn the selected concept into a learning map with an explanation, exercise, and quiz.",
  "Review the active map, flag delivery risks, and highlight the riskiest path.",
] as const;

const statusContent: Record<WebMcpStatus, { heading: string; detail: string }> = {
  checking: {
    heading: "Checking for tools",
    detail: "Nodebook is checking whether this browser can share its local workspace with compatible AI agents.",
  },
  available: {
    heading: `${webMcpTools.length} tools are available`,
    detail: "Agents can access this browser’s local workspace only while this page is open and access is granted.",
  },
  unavailable: {
    heading: "A compatible browser is required",
    detail: "This browser does not currently expose WebMCP, but you can still explore the tools Nodebook provides.",
  },
  error: {
    heading: "Tools could not be registered",
    detail: "Nodebook found WebMCP, but tool registration failed. Reload the page to try again.",
  },
};

interface WebMcpDialogProps {
  isOpen: boolean;
  onClose: () => void;
  status: WebMcpStatus;
}

export function WebMcpDialog({ isOpen, onClose, status }: WebMcpDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  const currentStatus = statusContent[status];

  return (
    <dialog
      aria-describedby="webmcp-description"
      aria-labelledby="webmcp-title"
      className="webmcp-dialog"
      id="webmcp-dialog"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onClose={onClose}
      ref={dialogRef}
    >
      <div className="webmcp-dialog-panel">
        <header className="webmcp-dialog-header">
          <div>
            <h2 id="webmcp-title">WebMCP</h2>
            <p id="webmcp-description">Structured website tools that compatible AI agents can discover and use.</p>
          </div>
          <button aria-label="Close WebMCP information" className="webmcp-dialog-close" onClick={onClose} type="button">
            <X aria-hidden="true" size={22} />
          </button>
        </header>

        <div className="webmcp-dialog-content">
          <section className="webmcp-intro" aria-labelledby="what-is-webmcp">
            <h3 id="what-is-webmcp">What is WebMCP?</h3>
            <p>
              WebMCP lets websites expose clear, structured actions to AI agents. In Nodebook, those actions let an
              agent understand and work with your maps, nodes, evidence, and comments directly in this browser.
            </p>
          </section>

          <div className={`webmcp-availability ${status}`} role="status">
            <span aria-hidden="true" />
            <div>
              <strong>{currentStatus.heading}</strong>
              <p>{currentStatus.detail}</p>
            </div>
          </div>

          <section aria-labelledby="webmcp-tools-heading">
            <h3 className="visually-hidden" id="webmcp-tools-heading">Available Nodebook tools</h3>
            <ul className="webmcp-tool-grid">
              {webMcpTools.map(([name, description]) => (
                <li key={name}>
                  <code>{name}</code>
                  <p>{description}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="webmcp-examples" aria-labelledby="webmcp-examples-heading">
            <h3 id="webmcp-examples-heading">Try asking</h3>
            <ul>
              {examplePrompts.map((prompt) => <li key={prompt}>“{prompt}”</li>)}
            </ul>
          </section>
        </div>
      </div>
    </dialog>
  );
}
