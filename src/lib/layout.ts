import dagre from "@dagrejs/dagre";
import type { CanvasEdge, CanvasNode } from "@/lib/model";

const DEFAULT_WIDTH = 236;
const DEFAULT_HEIGHT = 116;

function sizeForNode(node: CanvasNode): { width: number; height: number } {
  if (node.kind === "project") return { width: 260, height: 104 };
  if (node.kind === "group") return { width: 232, height: 92 };
  if (node.kind === "question") {
    const choiceCount = node.quiz?.choices.length ?? 0;
    return { width: 280, height: node.quiz ? 190 + choiceCount * 34 : 116 };
  }
  if (node.kind === "note") return { width: 240, height: 98 };
  return { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
}

export function layoutNodes(
  nodes: CanvasNode[],
  edges: CanvasEdge[],
  direction: "LR" | "TB" = "LR",
): CanvasNode[] {
  if (nodes.length === 0) return [];

  const graph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir: direction,
    ranksep: direction === "LR" ? 92 : 76,
    nodesep: 44,
    edgesep: 28,
    marginx: 32,
    marginy: 32,
  });

  for (const node of nodes) graph.setNode(node.id, sizeForNode(node));
  for (const edge of edges) {
    if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) {
      graph.setEdge(edge.source, edge.target);
    }
  }

  dagre.layout(graph);

  return nodes.map((node) => {
    const point = graph.node(node.id) as { x: number; y: number; width: number; height: number };
    return {
      ...node,
      position: {
        x: Math.round(point.x - point.width / 2),
        y: Math.round(point.y - point.height / 2),
      },
    };
  });
}
