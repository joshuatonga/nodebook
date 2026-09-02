"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { CheckCircle2, ExternalLink, GitBranch, LockKeyhole, PanelRightOpen, RotateCcw, XCircle } from "lucide-react";
import { memo, useLayoutEffect, useRef, useState } from "react";
import type { CanvasNode, QuizContent } from "@/lib/model";
import { useWorkspaceStore } from "@/lib/store";

export interface SemanticNodeData extends Record<string, unknown> {
  node: CanvasNode;
  linkedMapCount: number;
  highlighted?: "focus" | "risk" | "success";
  appSelected?: boolean;
  inspectorOpen?: boolean;
  onOpenDetails?: () => void;
  onOpenEvidence?: (nodeId: string) => void;
}

export type SemanticFlowNode = Node<SemanticNodeData, "semantic">;

function labelForNode(node: CanvasNode): string | null {
  if (node.kind === "feature" && node.scopeState) return node.scopeState.replace("_", " ");
  if (["concept", "exercise", "question"].includes(node.kind) && node.learningState) return node.learningState;
  if (node.deliveryStatus && node.deliveryStatus !== "not_started") return node.deliveryStatus.replace("_", " ");
  return null;
}

function NodeEvidenceAction({
  compact = false,
  node,
  onOpenEvidence,
}: {
  compact?: boolean;
  node: CanvasNode;
  onOpenEvidence?: (nodeId: string) => void;
}) {
  if (node.evidence.length === 0) return null;
  const singleSource =
    node.evidence.length === 1 && node.evidence[0].kind === "source_url" ? node.evidence[0] : null;
  const allSources = node.evidence.every((evidence) => evidence.kind === "source_url");
  const countLabel = allSources
    ? `${node.evidence.length} ${node.evidence.length === 1 ? "source" : "sources"}`
    : `${node.evidence.length} evidence`;
  const className = `${compact ? "node-source-action" : "node-evidence-action"} nodrag nopan`;

  if (singleSource) {
    return (
      <a
        aria-label={compact ? `Open ${countLabel} for ${node.title}: ${singleSource.label}` : `Open source: ${singleSource.label}`}
        className={className}
        href={singleSource.ref}
        onClick={(event) => event.stopPropagation()}
        rel="noopener noreferrer"
        target="_blank"
        title={`Open ${singleSource.label} in a new tab`}
      >
        {compact ? countLabel : <ExternalLink aria-hidden="true" size={12} />}
      </a>
    );
  }

  return (
    <button
      aria-controls="inspector-panel"
      aria-label={compact ? `View ${countLabel} for ${node.title}` : `View evidence for ${node.title}`}
      className={className}
      onClick={(event) => {
        event.stopPropagation();
        onOpenEvidence?.(node.id);
      }}
      title="View evidence in Details"
      type="button"
    >
      {compact ? countLabel : <ExternalLink aria-hidden="true" size={12} />}
    </button>
  );
}

function SemanticNodeView({ data, selected }: NodeProps<SemanticFlowNode>) {
  const { node, linkedMapCount, highlighted } = data;
  const stateLabel = labelForNode(node);
  const isSelected = selected || data.appSelected;
  const updateNode = useWorkspaceStore((state) => state.updateNode);
  const [editingField, setEditingField] = useState<"title" | "description" | null>(null);
  const [draftTitle, setDraftTitle] = useState(node.title);
  const [draftDescription, setDraftDescription] = useState(node.description);
  const descriptionEditorRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    if (editingField !== "description" || !descriptionEditorRef.current) return;
    descriptionEditorRef.current.style.height = "0";
    descriptionEditorRef.current.style.height = `${descriptionEditorRef.current.scrollHeight}px`;
  }, [editingField]);

  function beginEditing(field: "title" | "description") {
    setDraftTitle(node.title);
    setDraftDescription(node.description);
    setEditingField(field);
  }

  function commitTitle() {
    const title = draftTitle.trim() || node.title;
    setDraftTitle(title);
    setEditingField(null);
    if (title !== node.title) updateNode(node.id, { title });
  }

  function commitDescription() {
    setEditingField(null);
    if (draftDescription !== node.description) updateNode(node.id, { description: draftDescription });
  }

  return (
    <article
      aria-label={node.kind === "question" ? `Quiz: ${node.title}` : undefined}
      className={`semantic-node kind-${node.kind} ${isSelected ? "selected" : ""} ${node.locked ? "locked" : ""} ${highlighted ? `highlight-${highlighted}` : ""}`}
    >
      <Handle className="node-handle" position={Position.Left} type="target" />
      <div className="node-card-header">
        <span className="node-kind">{node.kind === "question" ? "quiz" : node.kind}</span>
        <span className="node-card-icons">
          <NodeEvidenceAction node={node} onOpenEvidence={data.onOpenEvidence} />
          {linkedMapCount > 0 ? <GitBranch aria-label={`${linkedMapCount} linked maps`} size={12} /> : null}
          {node.locked ? <LockKeyhole aria-label="Locked" size={12} /> : null}
          {isSelected ? (
            <button
              aria-controls="inspector-panel"
              aria-expanded={data.inspectorOpen}
              aria-label={`Open details for ${node.title}`}
              className={`node-details-button nodrag nopan ${data.inspectorOpen ? "active" : ""}`}
              onClick={(event) => {
                event.stopPropagation();
                data.onOpenDetails?.();
              }}
              type="button"
            >
              <PanelRightOpen aria-hidden="true" size={10} /> Details
            </button>
          ) : null}
        </span>
      </div>
      <h3 aria-label={node.title}>
        {isSelected && editingField === "title" ? (
          <input
            aria-label="Edit node title"
            autoFocus
            className="node-inline-editor node-title-editor nodrag nopan"
            maxLength={120}
            onBlur={commitTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            onKeyDown={(event) => {
              event.stopPropagation();
              if (event.key === "Enter") event.currentTarget.blur();
              if (event.key === "Escape") {
                setDraftTitle(node.title);
                setEditingField(null);
              }
            }}
            value={draftTitle}
          />
        ) : isSelected ? (
          <button
            aria-label="Edit title"
            className="node-inline-trigger nodrag nopan"
            onClick={() => beginEditing("title")}
            type="button"
          >
            {node.title}
          </button>
        ) : (
          node.title
        )}
      </h3>
      {isSelected && editingField === "description" ? (
        <textarea
          aria-label="Edit node description"
          autoFocus
          className="node-description node-inline-editor node-description-editor nodrag nopan"
          maxLength={1200}
          onBlur={commitDescription}
          onChange={(event) => setDraftDescription(event.target.value)}
          onInput={(event) => {
            event.currentTarget.style.height = "0";
            event.currentTarget.style.height = `${event.currentTarget.scrollHeight}px`;
          }}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === "Escape") {
              setDraftDescription(node.description);
              setEditingField(null);
            }
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) event.currentTarget.blur();
          }}
          placeholder="Add a description"
          ref={descriptionEditorRef}
          rows={1}
          value={draftDescription}
        />
      ) : isSelected ? (
        <button
          aria-label="Edit description"
          className={`node-description node-inline-trigger nodrag nopan ${node.description ? "" : "node-placeholder"}`}
          onClick={() => beginEditing("description")}
          type="button"
        >
          {node.description || "Add a description"}
        </button>
      ) : node.description ? (
        <p>{node.description}</p>
      ) : (
        <p className="node-placeholder">Add a description</p>
      )}
      {node.kind === "question" && node.quiz ? <QuizChoices quiz={node.quiz} /> : null}
      <div className="node-card-footer">
        {stateLabel ? <span className={`state-chip ${node.scopeState ?? node.learningState ?? node.deliveryStatus}`}>{stateLabel}</span> : <span />}
        <NodeEvidenceAction compact node={node} onOpenEvidence={data.onOpenEvidence} />
      </div>
      <Handle className="node-handle" position={Position.Right} type="source" />
    </article>
  );
}

function QuizChoices({ quiz }: { quiz: QuizContent }) {
  const quizKey = JSON.stringify(quiz);
  const [answer, setAnswer] = useState<{ choiceIndex: number; quizKey: string } | null>(null);
  const selectedChoiceIndex = answer?.quizKey === quizKey ? answer.choiceIndex : null;
  const isAnswered = selectedChoiceIndex !== null;
  const isCorrect = selectedChoiceIndex === quiz.correctChoiceIndex;

  return (
    <div className="quiz-interaction nodrag nopan" aria-label="Answer choices">
      <div className="quiz-options">
        {quiz.choices.map((choice, index) => {
          const isCorrectChoice = isAnswered && index === quiz.correctChoiceIndex;
          const isIncorrectChoice = isAnswered && index === selectedChoiceIndex && !isCorrectChoice;
          return (
            <button
              aria-pressed={selectedChoiceIndex === index}
              className={`quiz-option ${isCorrectChoice ? "correct" : ""} ${isIncorrectChoice ? "incorrect" : ""}`}
              disabled={isAnswered}
              key={`${index}-${choice}`}
              onClick={() => setAnswer({ choiceIndex: index, quizKey })}
              type="button"
            >
              <span aria-hidden="true">{String.fromCharCode(65 + index)}</span>
              {choice}
            </button>
          );
        })}
      </div>
      {isAnswered ? (
        <div className={`quiz-feedback ${isCorrect ? "correct" : "incorrect"}`} role="status">
          <div>
            {isCorrect ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
            <strong>{isCorrect ? "Correct" : "Not quite"}</strong>
          </div>
          <span>Correct answer: {quiz.choices[quiz.correctChoiceIndex]}</span>
          {quiz.explanation ? <span>{quiz.explanation}</span> : null}
          <button className="nodrag nopan" onClick={() => setAnswer(null)} type="button">
            <RotateCcw size={12} /> Try again
          </button>
        </div>
      ) : null}
    </div>
  );
}

export const SemanticNode = memo(SemanticNodeView);
