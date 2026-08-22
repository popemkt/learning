/**
 * Fundamental status returned by any Behavior Tree node on each tick.
 */
export type NodeStatus = "SUCCESS" | "FAILURE" | "RUNNING";

/**
 * Common interface for all Behavior Tree nodes.
 */
export interface BTNode {
  readonly name: string;
  tick(trace?: Map<BTNode, NodeStatus>): NodeStatus;
}

/**
 * Action / Leaf Node
 * Runs a user-defined function. Perfect for executing an action or evaluating a condition.
 */
export class ActionNode implements BTNode {
  constructor(
    public readonly name: string,
    private readonly actionFn: () => NodeStatus
  ) {}

  tick(trace?: Map<BTNode, NodeStatus>): NodeStatus {
    const status = this.actionFn();
    trace?.set(this, status);
    return status;
  }
}

/**
 * Sequence Composite Node (AND logic)
 *
 * Runs children one by one in order:
 * - If a child returns FAILURE -> Immediately stops and returns FAILURE.
 * - If a child returns RUNNING -> Stops and returns RUNNING.
 * - If all children return SUCCESS -> Returns SUCCESS.
 */
export class SequenceNode implements BTNode {
  constructor(
    public readonly name: string,
    public readonly children: BTNode[]
  ) {}

  tick(trace?: Map<BTNode, NodeStatus>): NodeStatus {
    for (const child of this.children) {
      const status = child.tick(trace);
      if (status !== "SUCCESS") {
        trace?.set(this, status);
        return status;
      }
    }
    trace?.set(this, "SUCCESS");
    return "SUCCESS";
  }
}

/**
 * Selector / Fallback Composite Node (OR / Priority logic)
 *
 * Runs children one by one in order:
 * - If a child returns SUCCESS -> Immediately stops and returns SUCCESS.
 * - If a child returns RUNNING -> Stops and returns RUNNING.
 * - If all children return FAILURE -> Returns FAILURE.
 */
export class SelectorNode implements BTNode {
  constructor(
    public readonly name: string,
    public readonly children: BTNode[]
  ) {}

  tick(trace?: Map<BTNode, NodeStatus>): NodeStatus {
    for (const child of this.children) {
      const status = child.tick(trace);
      if (status !== "FAILURE") {
        trace?.set(this, status);
        return status;
      }
    }
    trace?.set(this, "FAILURE");
    return "FAILURE";
  }
}
