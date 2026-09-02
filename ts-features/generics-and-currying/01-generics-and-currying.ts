/**
 * 01-generics-and-currying.ts
 *
 * Demonstrates advanced TypeScript generics, curried higher-order functions,
 * const type parameters (`<const T>`), and type-safe functional piping.
 */

// ============================================================================
// 1. Curried Error Code Transformer
// ============================================================================

export const ERROR_CODES = {
  SANDBOX_EXEC_FAILED: "ERR_SANDBOX_EXEC_FAILED",
  AGENT_TIMEOUT: "ERR_AGENT_TIMEOUT",
  INVALID_PAYLOAD: "ERR_INVALID_PAYLOAD",
} as const;

export type ErrorCodeKey = keyof typeof ERROR_CODES;

export class PipelineError extends Error {
  constructor(
    public readonly code: (typeof ERROR_CODES)[ErrorCodeKey],
    public readonly originalCause?: unknown
  ) {
    super(`Pipeline failed with code: ${code}`);
    this.name = "PipelineError";
  }
}

/**
 * Higher-order curried function:
 * ✅ ATTENTION: Binds error code first, returning a reusable catch-handler!
 * Usage: `.catch(toPipelineError("SANDBOX_EXEC_FAILED"))`
 */
export const toPipelineError =
  (codeKey: ErrorCodeKey) =>
  (error: unknown): PipelineError =>
    error instanceof PipelineError
      ? error
      : new PipelineError(ERROR_CODES[codeKey], error);

// ============================================================================
// 2. Generic Agent Execution Session (`runForAgent<TInput, TOutput>`)
// ============================================================================

export class AgentSession {
  /**
   * Type-safe execution:
   * - `TInput` is inferred from caller argument.
   * - `TOutput` is inferred from the return type of `outputParser`.
   */
  public async runForAgent<TInput, TOutput>(
    agentKey: string,
    input: TInput,
    outputParser: (raw: unknown) => TOutput
  ): Promise<{ agentKey: string; inputEcho: TInput; output: TOutput }> {
    // Simulate raw LLM output
    const mockRawOutput = {
      agent: agentKey,
      status: "completed",
      resultData: { timestamp: new Date().toISOString() },
    };

    const output = outputParser(mockRawOutput);

    return {
      agentKey,
      inputEcho: input,
      output,
    };
  }
}

// ============================================================================
// 3. TS 5.0+ Const Type Parameters (`<const T>`)
// ============================================================================

/**
 * 🔒 COMPILE-TIME: `<const T>` tells TypeScript to infer exact literal tuples
 * and deeply readonly structures without needing `as const` at every callsite!
 */
export function defineRouteRegistry<const TRoutes extends readonly { path: string; method: string }[]>(
  routes: TRoutes
): TRoutes {
  return routes;
}

// ============================================================================
// 4. Type-Safe Higher-Order Pipe Utility
// ============================================================================

export function pipe<A, B, C, D>(
  input: A,
  fn1: (a: A) => B,
  fn2: (b: B) => C,
  fn3: (c: C) => D
): D {
  return fn3(fn2(fn1(input)));
}

export function demonstrateGenericsAndCurrying(): {
  transformedError: PipelineError;
  routeLiteralPath: string;
  pipedValue: number;
} {
  // 1. Curried error
  const errHandler = toPipelineError("SANDBOX_EXEC_FAILED");
  const transformedError = errHandler(new Error("Docker container exit 137 (OOM)"));

  // 2. Const type parameter
  const routes = defineRouteRegistry([
    { path: "/api/v1/health", method: "GET" },
    { path: "/api/v1/agents", method: "POST" },
  ]);
  // 🔒 COMPILE-TIME: routes[0].path is literally "/api/v1/health" (not widened to string!)
  const routeLiteralPath = routes[0].path;

  // 3. Pipe
  const pipedValue = pipe(
    "  4200  ",
    (s) => s.trim(),
    (s) => parseInt(s, 10),
    (n) => n * 2 // Result is strictly number (8400)
  );

  return { transformedError, routeLiteralPath, pipedValue };
}
