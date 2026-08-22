import { describe, expect, it } from "bun:test";
import { ActionNode, SelectorNode, SequenceNode } from "../src";

describe("Behavior Tree Primitives", () => {
  describe("ActionNode", () => {
    it("returns SUCCESS when action returns SUCCESS", () => {
      const node = new ActionNode("SuccessAction", () => "SUCCESS");
      expect(node.tick()).toBe("SUCCESS");
    });

    it("returns FAILURE when action returns FAILURE", () => {
      const node = new ActionNode("FailAction", () => "FAILURE");
      expect(node.tick()).toBe("FAILURE");
    });
  });

  describe("SequenceNode (AND)", () => {
    it("returns SUCCESS only if all children succeed", () => {
      const executed: string[] = [];
      const seq = new SequenceNode("AllSuccess", [
        new ActionNode("Step1", () => {
          executed.push("1");
          return "SUCCESS";
        }),
        new ActionNode("Step2", () => {
          executed.push("2");
          return "SUCCESS";
        })
      ]);

      expect(seq.tick()).toBe("SUCCESS");
      expect(executed).toEqual(["1", "2"]);
    });

    it("stops and returns FAILURE at the first failing child", () => {
      const executed: string[] = [];
      const seq = new SequenceNode("ShortCircuitOnFailure", [
        new ActionNode("Step1", () => {
          executed.push("1");
          return "SUCCESS";
        }),
        new ActionNode("Step2", () => {
          executed.push("2");
          return "FAILURE";
        }),
        new ActionNode("Step3", () => {
          executed.push("3");
          return "SUCCESS";
        })
      ]);

      expect(seq.tick()).toBe("FAILURE");
      expect(executed).toEqual(["1", "2"]); // Step 3 never executed
    });
  });

  describe("SelectorNode (OR / Fallback)", () => {
    it("stops and returns SUCCESS at the first succeeding child", () => {
      const executed: string[] = [];
      const sel = new SelectorNode("ShortCircuitOnSuccess", [
        new ActionNode("Choice1", () => {
          executed.push("1");
          return "FAILURE";
        }),
        new ActionNode("Choice2", () => {
          executed.push("2");
          return "SUCCESS";
        }),
        new ActionNode("Choice3", () => {
          executed.push("3");
          return "SUCCESS";
        })
      ]);

      expect(sel.tick()).toBe("SUCCESS");
      expect(executed).toEqual(["1", "2"]); // Choice 3 never executed
    });

    it("returns FAILURE if all children fail", () => {
      const executed: string[] = [];
      const sel = new SelectorNode("AllFail", [
        new ActionNode("Choice1", () => {
          executed.push("1");
          return "FAILURE";
        }),
        new ActionNode("Choice2", () => {
          executed.push("2");
          return "FAILURE";
        })
      ]);

      expect(sel.tick()).toBe("FAILURE");
      expect(executed).toEqual(["1", "2"]);
    });
  });
});
