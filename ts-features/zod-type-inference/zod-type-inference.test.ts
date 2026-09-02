/**
 * zod-type-inference.test.ts
 *
 * Automated verification of input vs output type divergence in Zod.
 */

import { describe, it, expect } from "bun:test";
import {
  AgentDefinitionSchema,
  handleCreateAgentEndpoint,
  demonstrateInputVsOutput,
  AgentDefinitionInput,
} from "./01-input-vs-output";

describe("Zod Type Inference (z.input vs z.infer)", () => {
  it("populates defaults and converts coerced types on parse", () => {
    const { outputProduced, isDateInstance, tagsArray } = demonstrateInputVsOutput();

    expect(outputProduced.key).toBe("agent.planner");
    expect(outputProduced.policy.maxRetries).toBe(3);
    expect(outputProduced.policy.timeoutMs).toBe(30000);
    expect(isDateInstance).toBe(true);
    expect(tagsArray).toEqual(["planning", "analysis", "core"]);
  });

  it("accepts minimal input matching z.input type without compile errors", () => {
    const minimalInput: AgentDefinitionInput = {
      key: "agent.builder",
      name: "Builder Agent",
    };

    const parsed = handleCreateAgentEndpoint(minimalInput);
    expect(parsed.key).toBe("agent.builder");
    expect(parsed.policy.maxRetries).toBe(3);
    expect(parsed.tags).toEqual([]);
    expect(parsed.createdAt).toBeInstanceOf(Date);
  });
});
