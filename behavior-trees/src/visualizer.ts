import { BTNode, NodeStatus, SelectorNode, SequenceNode } from "./core";

export interface RenderOptions {
  trace?: Map<BTNode, NodeStatus>;
  title?: string;
}

/**
 * Returns a short symbol representing the node type.
 */
function getNodeTypeSymbol(node: BTNode): string {
  if (node instanceof SelectorNode) return "?";
  if (node instanceof SequenceNode) return "->";
  return "⚡";
}

/**
 * Generates a clean ASCII tree representation of the Behavior Tree.
 */
export function toAscii(root: BTNode, options: RenderOptions = {}): string {
  const lines: string[] = [];
  if (options.title) {
    lines.push(`=== ${options.title} ===`);
  }

  function printNode(node: BTNode, prefix = "", isLast = true, isRoot = true): void {
    const symbol = getNodeTypeSymbol(node);
    const status = options.trace?.get(node);

    let statusBadge = "";
    if (status === "SUCCESS") statusBadge = " [✅ SUCCESS]";
    else if (status === "FAILURE") statusBadge = " [❌ FAILURE]";
    else if (status === "RUNNING") statusBadge = " [⏳ RUNNING]";
    else if (options.trace) statusBadge = " [⚪ SKIPPED]";

    const branch = isRoot ? "" : isLast ? "└── " : "├── ";
    lines.push(`${prefix}${branch}[${symbol}] ${node.name}${statusBadge}`);

    const nextPrefix = isRoot ? "" : prefix + (isLast ? "    " : "│   ");
    const children = "children" in node && Array.isArray(node.children) ? (node.children as BTNode[]) : [];

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const isChildLast = i === children.length - 1;
      printNode(child, nextPrefix, isChildLast, false);
    }
  }

  printNode(root, "", true, true);
  return lines.join("\n");
}

/**
 * Generates a Mermaid flowchart diagram of the Behavior Tree.
 */
export function toMermaid(root: BTNode, options: RenderOptions = {}): string {
  const lines: string[] = ["```mermaid", "graph TD"];
  const nodeIds = new Map<BTNode, string>();
  let counter = 0;

  function getNodeId(node: BTNode): string {
    let id = nodeIds.get(node);
    if (!id) {
      counter += 1;
      id = `node_${counter}`;
      nodeIds.set(node, id);
    }
    return id;
  }

  // Traverse tree to generate node declarations and links
  function traverse(node: BTNode): void {
    const currentId = getNodeId(node);
    const label = escapeMermaidText(node.name);

    if (node instanceof SelectorNode) {
      lines.push(`  ${currentId}["<b>? Selector</b><br/>${label}"]`);
    } else if (node instanceof SequenceNode) {
      lines.push(`  ${currentId}["<b>&rarr; Sequence</b><br/>${label}"]`);
    } else {
      lines.push(`  ${currentId}(["${label}"])`);
    }

    const children = "children" in node && Array.isArray(node.children) ? (node.children as BTNode[]) : [];
    for (const child of children) {
      const childId = getNodeId(child);
      lines.push(`  ${currentId} --> ${childId}`);
      traverse(child);
    }
  }

  traverse(root);

  // Apply styling classes if trace is provided
  if (options.trace && options.trace.size > 0) {
    lines.push("");
    lines.push("  classDef statusSuccess fill:#22c55e,stroke:#15803d,color:#ffffff,stroke-width:2px;");
    lines.push("  classDef statusFailure fill:#ef4444,stroke:#b91c1c,color:#ffffff,stroke-width:2px;");
    lines.push("  classDef statusRunning fill:#eab308,stroke:#a16207,color:#ffffff,stroke-width:2px;");
    lines.push("  classDef statusSkipped fill:#334155,stroke:#475569,color:#94a3b8,stroke-dasharray: 4 4;");

    for (const [node, id] of nodeIds.entries()) {
      const status = options.trace.get(node);
      if (status === "SUCCESS") lines.push(`  class ${id} statusSuccess;`);
      else if (status === "FAILURE") lines.push(`  class ${id} statusFailure;`);
      else if (status === "RUNNING") lines.push(`  class ${id} statusRunning;`);
      else lines.push(`  class ${id} statusSkipped;`);
    }
  }

  lines.push("```");
  return lines.join("\n");
}

function escapeMermaidText(text: string): string {
  return text.replace(/["\\]/g, "\\$&");
}
