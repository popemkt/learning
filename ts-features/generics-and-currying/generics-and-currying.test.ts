/**
 * generics-and-currying.test.ts
 *
 * Automated verification of generics, curried error adapters, and const type parameters.
 */

import { describe, it, expect } from "bun:test";
import {
  toPipelineError,
  PipelineError,
  AgentSession,
  defineRouteRegistry,
  pipe,
  demonstrateGenericsAndCurrying,
} from "./01-generics-and-currying";

describe("Generics and Currying", () => {
  it("transforms raw errors into typed PipelineErrors using curried adapter", () => {
    const handler = toPipelineError("AGENT_TIMEOUT");
    const err = handler(new Error("LLM API timed out after 30000ms"));

    expect(err).toBeInstanceOf(PipelineError);
    expect(err.code).toBe("ERR_AGENT_TIMEOUT");
    expect(err.message).toContain("ERR_AGENT_TIMEOUT");
  });

  it("executes generic runForAgent returning typed output", async () => {
    const session = new AgentSession();
    const result = await session.runForAgent(
      "forge.implementor",
      { file: "main.ts", action: "edit" },
      (raw) => ({
        success: (raw as { status: string }).status === "completed",
        count: 1,
      })
    );

    expect(result.agentKey).toBe("forge.implementor");
    expect(result.inputEcho.action).toBe("edit");
    expect(result.output.success).toBe(true);
    expect(result.output.count).toBe(1);
  });

  it("infers exact literal types with const type parameters (<const T>)", () => {
    const routes = defineRouteRegistry([
      { path: "/auth/login", method: "POST" },
      { path: "/auth/logout", method: "POST" },
    ]);

    expect(routes[0].path).toBe("/auth/login");
    expect(routes[1].path).toBe("/auth/logout");
  });

  it("pipes data through pure functional stages with preserved types", () => {
    const res = pipe(
      "  25  ",
      (s) => s.trim(),
      (s) => parseInt(s, 10),
      (n) => n * 4
    );
    expect(res).toBe(100);
  });

  it("verifies demonstration function returns expected shapes", () => {
    const res = demonstrateGenericsAndCurrying();
    expect(res.transformedError.code).toBe("ERR_SANDBOX_EXEC_FAILED");
    expect(res.routeLiteralPath).toBe("/api/v1/health");
    expect(res.pipedValue).toBe(8400);
  });
});
