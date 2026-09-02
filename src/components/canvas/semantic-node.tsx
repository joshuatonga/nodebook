"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { CheckCircle2, ExternalLink, GitBranch, LockKeyhole, RotateCcw, XCircle } from "lucide-react";
import { memo, useState } from "react";
import type { CanvasNode, QuizContent } from "@/lib/model";

export interface SemanticNodeData extends Record<string, unknown> {
  node: CanvasNode;
  linkedMapCount: number;
  highlighted?: "focus" | "risk" | "success";
  appSelected?: boolean;
}

export type SemanticFlowNode = Node<SemanticNodeData, "semantic">;

function labelForNode(node: CanvasNode): string | null {
  if (node.kind === "feature" && node.scopeState) return node.scopeState.replace("_", " ");
  if (["concept", "exercise", "question"].includes(node.kind) && node.learningState) return node.learningState;
  if (node.deliveryStatus && node.deliveryStatus !== "not_started") return node.deliveryStatus.replace("_", " ");
  return null;
}

function SemanticNodeView({ data, selected }: NodeProps<SemanticFlowNode>) {
  const { node, linkedMapCount, highlighted } = data;
  const stateLabel = labelForNode(node);

  return (
    <article
      aria-label={node.kind === "question" ? `Quiz: ${node.title}` : undefined}
      className={`semantic-node kind-${node.kind} ${selected || data.appSelected ? "selected" : ""} ${node.locked ? "locked" : ""} ${highlighted ? `highlight-${highlighted}` : ""}`}
    >
      <Handle className="node-handle" position={Position.Left} type="target" />
      <div className="node-card-header">
        <span className="node-kind">{node.kind === "question" ? "quiz" : node.kind}</span>
        <span className="node-card-icons">
          {node.evidence.length > 0 ? <ExternalLink aria-label={`${node.evidence.length} evidence items`} size={12} /> : null}
          {linkedMapCount > 0 ? <GitBranch aria-label={`${linkedMapCount} linked maps`} size={12} /> : null}
          {node.locked ? <LockKeyhole aria-label="Locked" size={12} /> : null}
        </span>
      </div>
      <h3>{node.title}</h3>
      {node.description ? <p>{node.description}</p> : <p className="node-placeholder">Add a description</p>}
      {node.kind === "question" && node.quiz ? <QuizChoices quiz={node.quiz} /> : null}
      <div className="node-card-footer">
        {stateLabel ? <span className={`state-chip ${node.scopeState ?? node.learningState ?? node.deliveryStatus}`}>{stateLabel}</span> : <span />}
        {node.evidence.length > 0 ? <span>{node.evidence.length} {node.evidence.length === 1 ? "source" : "sources"}</span> : null}
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
