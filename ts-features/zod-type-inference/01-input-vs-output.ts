/**
 * 01-input-vs-output.ts
 *
 * Demonstrates the crucial difference between `z.input<T>` and `z.infer<T>` (`z.output<T>`).
 * - `.default()` makes an input field optional (`undefined`), but guarantees an output value.
 * - `z.coerce.*` accepts broad input representations (strings/numbers) and produces parsed types.
 * - `.transform()` transforms input Type A into output Type B.
 */

import { z } from "zod";

// ============================================================================
// 1. Schema with Defaults, Coercion, and Transforms
// ============================================================================

export const AgentPolicySchema = z.object({
  maxRetries: z.number().int().default(3),
  timeoutMs: z.number().int().default(30000),
  allowedTools: z.array(z.string()).default([]),
});

export const DEFAULT_AGENT_POLICY = AgentPolicySchema.parse({});

export const AgentDefinitionSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  // ✅ ATTENTION: .default() allows callers to omit policy during input
  policy: AgentPolicySchema.default(DEFAULT_AGENT_POLICY),
  // ✅ ATTENTION: z.coerce.date() accepts string, number, or Date as input, produces Date on output
  createdAt: z.coerce.date().default(() => new Date()),
  tags: z
    .string()
    .default("")
    .transform((str) => str.split(",").map((s) => s.trim()).filter(Boolean)),
});

// ============================================================================
// 2. The Type-Level Divergence: z.input vs z.infer (z.output)
// ============================================================================

// 🔒 COMPILE-TIME: The Output Type (what .parse() returns)
// { key: string; name: string; policy: AgentPolicy; createdAt: Date; tags: string[] }
export type AgentDefinition = z.infer<typeof AgentDefinitionSchema>;

// 🔒 COMPILE-TIME: The Input Type (what .parse() accepts)
// { key: string; name: string; policy?: { maxRetries?: number; ... }; createdAt?: string | number | Date; tags?: string }
export type AgentDefinitionInput = z.input<typeof AgentDefinitionSchema>;

// ============================================================================
// 3. Demonstrating Controller Boundaries vs Domain Processing
// ============================================================================

/**
 * Controller accepts raw unvalidated input conforming to `AgentDefinitionInput`.
 */
export function handleCreateAgentEndpoint(payload: AgentDefinitionInput): AgentDefinition {
  // ✅ ATTENTION: Parse boundary translates AgentDefinitionInput -> AgentDefinition
  const validatedAgent: AgentDefinition = AgentDefinitionSchema.parse(payload);

  // In the domain layer, all defaults and parsed dates are guaranteed:
  return validatedAgent;
}

export function demonstrateInputVsOutput(): {
  inputProvided: AgentDefinitionInput;
  outputProduced: AgentDefinition;
  isDateInstance: boolean;
  tagsArray: string[];
} {
  // Minimal input (omitting policy, passing ISO string for date, comma-separated tags)
  const inputProvided: AgentDefinitionInput = {
    key: "agent.planner",
    name: "Requirements Planner",
    createdAt: "2026-08-30T10:00:00.000Z", // Raw string
    tags: "planning, analysis, core",        // Raw string
  };

  const outputProduced = handleCreateAgentEndpoint(inputProvided);

  return {
    inputProvided,
    outputProduced,
    isDateInstance: outputProduced.createdAt instanceof Date,
    tagsArray: outputProduced.tags,
  };
}
