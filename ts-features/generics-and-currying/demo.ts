/**
 * demo.ts
 *
 * Interactive tour demonstrating Generics, Currying, and Const Type Parameters with inline code.
 */

import {
  demonstrateGenericsAndCurrying,
  AgentSession,
} from "./01-generics-and-currying";

const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
};

function codeSnippet(title: string, code: string): void {
  console.log(`  ${colors.dim}┌─ 💻 ${colors.cyan}${title}${colors.dim} ──────────────────────────────────────────${colors.reset}`);
  for (const line of code.trim().split("\n")) {
    console.log(`  ${colors.dim}│${colors.reset}  ${line}`);
  }
  console.log(`  ${colors.dim}└─────────────────────────────────────────────────────────────${colors.reset}\n`);
}

export async function runDemo(): Promise<void> {
  console.log(`\n${colors.bold}${colors.cyan}╔════════════════════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}║  Generics, Currying & Const Type Parameters (<const T>)                    ║${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}╚════════════════════════════════════════════════════════════════════════════╝${colors.reset}\n`);

  // 1. Curried Error Handler
  codeSnippet("1. Curried Error Handler (toPipelineError)", `
const toPipelineError = (codeKey: ErrorCodeKey) => (err: unknown): PipelineError =>
  err instanceof PipelineError ? err : new PipelineError(ERROR_CODES[codeKey], err);

// Usage in async chains:
// await docker.exec(cmd).catch(toPipelineError("SANDBOX_EXEC_FAILED"));
  `);
  const { transformedError, routeLiteralPath, pipedValue } = demonstrateGenericsAndCurrying();
  console.log(`  ${colors.green}✔ Transformed Error:${colors.reset} ${transformedError.code} - ${transformedError.message}\n`);

  // 2. Const Type Parameters
  codeSnippet("2. Const Type Parameters (<const T> in TS 5.0+)", `
function defineRoutes<const TRoutes extends readonly { path: string }[]>(routes: TRoutes): TRoutes {
  return routes;
}
const routes = defineRoutes([{ path: "/api/v1/health" }]); // path inferred as literal "/api/v1/health"!
  `);
  console.log(`  ${colors.green}✔ Exact Literal Inference:${colors.reset} '${routeLiteralPath}'\n`);

  // 3. Higher-Order Pipe
  codeSnippet("3. Type-Safe Higher-Order Pipe", `
const result = pipe("  4200  ", s => s.trim(), s => parseInt(s, 10), n => n * 2); // strictly number
  `);
  console.log(`  ${colors.green}✔ Piped Result:${colors.reset} "  4200  " -> ${pipedValue}\n`);

  // 4. Generic Agent Session
  codeSnippet("4. Generic Session Dispatch (runForAgent<TInput, TOutput>)", `
const session = new AgentSession();
const result = await session.runForAgent(
  "planner.agent",
  { focusArea: "architecture" }, // TInput inferred
  (raw) => ({ status: raw.status, parsedAt: new Date() }) // TOutput inferred
);
  `);
  const session = new AgentSession();
  const agentRun = await session.runForAgent(
    "planner.agent",
    { focusArea: "architecture" },
    (raw) => ({ status: (raw as { status: string }).status, parsedAt: new Date() })
  );
  console.log(`  ${colors.green}✔ Generic Execution Result:${colors.reset} Agent='${agentRun.agentKey}', Status='${agentRun.output.status}'\n`);

  console.log(`${colors.bold}${colors.green}✔ Generics and currying verified!${colors.reset}\n`);
}

if (import.meta.main) {
  void runDemo();
}
