import { describe, expect, it } from "bun:test";
import { ActionNode, BTNode, NodeStatus, SelectorNode, SequenceNode, toAscii, toMermaid } from "../src";

describe("Visualizer", () => {
  const isHungry = new ActionNode("Is Hungry?", () => "SUCCESS");
  const eat = new ActionNode("Eat Food", () => "SUCCESS");
  const eatSeq = new SequenceNode("Eat Sequence", [isHungry, eat]);
  const sleep = new ActionNode("Sleep", () => "SUCCESS");
  const root = new SelectorNode("Daily Routine", [eatSeq, sleep]);

  it("renders an ASCII tree structure", () => {
    const ascii = toAscii(root);
    expect(ascii).toContain("[?] Daily Routine");
    expect(ascii).toContain("├── [->] Eat Sequence");
    expect(ascii).toContain("│   ├── [⚡] Is Hungry?");
    expect(ascii).toContain("│   └── [⚡] Eat Food");
    expect(ascii).toContain("└── [⚡] Sleep");
  });

  it("renders a Mermaid diagram", () => {
    const mermaid = toMermaid(root);
    expect(mermaid).toContain("```mermaid");
    expect(mermaid).toContain("graph TD");
    expect(mermaid).toContain("? Selector");
    expect(mermaid).toContain("&rarr; Sequence");
    expect(mermaid).toContain("Sleep");
  });

  it("applies trace classes in Mermaid when trace provided", () => {
    const trace = new Map<BTNode, NodeStatus>();
    root.tick(trace);
    const mermaid = toMermaid(root, { trace });

    expect(mermaid).toContain("classDef statusSuccess");
    expect(mermaid).toContain("classDef statusSkipped");
  });
});
