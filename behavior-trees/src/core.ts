/**
 * Fundamental status returned by any Behavior Tree node on each tick.
 */
export type NodeStatus = "SUCCESS" | "FAILURE" | "RUNNING";

/**
 * Common interface for all Behavior Tree nodes.
 */
export interface BTNode {
  readonly name: string;
  tick(): NodeStatus;
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

  tick(): NodeStatus {
    return this.actionFn();
  }
}

/**
 * Sequence Composite Node (AND logic)
 *
 * Runs children one by one in order:
 * - If a child returns FAILURE -> Immediately stops and returns FAILURE.
 * - If a child returns RUNNING -> Stops and returns RUNNING.
 * - If all children return SUCCESS -> Returns SUCCESS.
 *
 * Use case: "Step 1 AND Step 2 AND Step 3" (e.g. Find Enemy -> Aim -> Shoot)
 */
export class SequenceNode implements BTNode {
  constructor(
    public readonly name: string,
    public readonly children: BTNode[]
  ) {}

  tick(): NodeStatus {
    for (const child of this.children) {
      const status = child.tick();
      if (status !== "SUCCESS") {
        return status;
      }
    }
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
 *
 * Use case: "Try Plan A OR fallback to Plan B OR fallback to Plan C"
 * (e.g. Flee if low HP -> Attack if enemy nearby -> Patrol)
 */
export class SelectorNode implements BTNode {
  constructor(
    public readonly name: string,
    public readonly children: BTNode[]
  ) {}

  tick(): NodeStatus {
    for (const child of this.children) {
      const status = child.tick();
      if (status !== "FAILURE") {
        return status;
      }
    }
    return "FAILURE";
  }
}
