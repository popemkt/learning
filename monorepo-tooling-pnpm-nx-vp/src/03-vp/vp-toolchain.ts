/**
 * Vite-Plus (vp) Toolchain Model
 * Demonstrates:
 * 1. The VoidZero Unified Binary (Oxfmt, Oxlint, Vite/Rolldown, Vitest)
 * 2. 2-Tier Linter Architecture (Oxlint for Speed + ESLint for Nx Boundaries)
 * 3. Complexity & Cohesion Sensors in .oxlintrc.json
 * 4. Test Execution Models: Direct TS Execution (`vp test`) vs Compiled dist/ (`node --test`)
 */

export interface LintRuleResult {
  readonly file: string;
  readonly line: number;
  readonly rule: string;
  readonly severity: "error" | "warn";
  readonly message: string;
}

export interface OxlintReport {
  readonly tool: "oxlint_vp";
  readonly filesScanned: number;
  readonly durationMs: number;
  readonly errors: LintRuleResult[];
  readonly warnings: LintRuleResult[];
  readonly exitCode: number;
}

export interface FormatResult {
  readonly file: string;
  readonly changed: boolean;
  readonly formattedDurationMs: number;
}

export class VpToolchainEngine {
  private oxlintConfig: {
    categories: { correctness: "error" | "warn" };
    rules: Record<string, "error" | "warn" | ["warn" | "error", number]>;
  };

  constructor(
    oxlintConfig: {
      categories: { correctness: "error" | "warn" };
      rules: Record<string, "error" | "warn" | ["warn" | "error", number]>;
    } = {
      categories: { correctness: "warn" as const },
      rules: {
        "typescript/no-unused-vars": "error" as const,
        "max-lines": ["warn", 900] as ["warn", number],
        "max-lines-per-function": ["warn", 120] as ["warn", number],
        "complexity": ["warn", 20] as ["warn", number],
        "max-params": ["warn", 5] as ["warn", number],
      },
    }
  ) {
    // ✅ ATTENTION: .oxlintrc.json centralizes code-quality & complexity rules
    this.oxlintConfig = oxlintConfig;
  }

  /**
   * Simulates Oxfmt (`vp fmt`) fast AST-based formatter
   */
  public formatFile(filePath: string, content: string): FormatResult {
    // ✅ ATTENTION: Oxfmt formats files in microseconds (C++/Rust speed)
    const hasMessyFormatting =
      content.includes("  \n") || content.includes(" ;") || content.includes(";;") || content.includes("\t");
    return {
      file: filePath,
      changed: hasMessyFormatting,
      formattedDurationMs: 0.8, // ~0.8ms vs Prettier's 40-100ms per file
    };
  }

  /**
   * Simulates Oxlint (`vp lint`) code quality & complexity scan
   */
  public lintFile(filePath: string, linesOfCode: number, maxFunctionComplexity: number): OxlintReport {
    const start = performance.now();
    const errors: LintRuleResult[] = [];
    const warnings: LintRuleResult[] = [];

    // Check max-lines
    const maxLinesLimit = Array.isArray(this.oxlintConfig.rules["max-lines"])
      ? (this.oxlintConfig.rules["max-lines"][1] as number)
      : 900;

    if (linesOfCode > maxLinesLimit) {
      // ⚠️ CRITICAL: Cohesion & god-file sensor triggers a warning
      warnings.push({
        file: filePath,
        line: 1,
        rule: "max-lines",
        severity: "warn",
        message: `File has ${linesOfCode} lines (maximum allowed is ${maxLinesLimit}). Consider splitting into cohesive sub-modules.`,
      });
    }

    // Check complexity
    const complexityLimit = Array.isArray(this.oxlintConfig.rules["complexity"])
      ? (this.oxlintConfig.rules["complexity"][1] as number)
      : 20;

    if (maxFunctionComplexity > complexityLimit) {
      warnings.push({
        file: filePath,
        line: 42,
        rule: "complexity",
        severity: "warn",
        message: `Function cyclomatic complexity is ${maxFunctionComplexity} (threshold is ${complexityLimit}).`,
      });
    }

    const duration = performance.now() - start + 1.2; // ~1-2ms per scan in Rust
    return {
      tool: "oxlint_vp",
      filesScanned: 1,
      durationMs: Number(duration.toFixed(2)),
      errors,
      warnings,
      exitCode: errors.length > 0 ? 1 : 0,
    };
  }

  /**
   * Comparison between `vp test` (direct TS) vs `node --test` (requires tsc dist/)
   */
  public compareTestStrategies(
    testFilesCount: number,
    totalLoc: number
  ): {
    directTsStrategy: { runner: string; steps: string[]; durationMs: number; staleOrphanRisk: boolean };
    compiledDistStrategy: { runner: string; steps: string[]; durationMs: number; staleOrphanRisk: boolean };
  } {
    // Strategy A: vp test / Vitest (in-memory TS transpile via Rolldown/esbuild)
    // ✅ ATTENTION: Direct TS execution eliminates `clean:dist` and `tsc -p` bottlenecks before testing
    const directTs = {
      runner: "vp test (Vitest inside vite-plus)",
      steps: ["1. Read TS files into memory", "2. On-the-fly transform via esbuild/Rolldown", "3. Execute test suite"],
      durationMs: Math.round(testFilesCount * 8 + totalLoc * 0.02),
      staleOrphanRisk: false, // 🔒 COMPILE-TIME: No dist/ artifacts left on disk!
    };

    // Strategy B: node --test against dist/
    // ⚠️ CRITICAL: Requires clean:dist + tsc -p before running, risking stale artifacts if cleaned improperly
    const compilationMs = Math.round(totalLoc * 0.35 + 400);
    const compiledDist = {
      runner: "node --test dist/**/*.spec.js",
      steps: [
        "1. Wipe dist/ (clean:dist)",
        "2. Run tsc compiler to emit JS & d.ts (tsc -p tsconfig.json)",
        "3. node --test executes emitted dist/*.spec.js",
      ],
      durationMs: compilationMs + Math.round(testFilesCount * 6),
      staleOrphanRisk: true, // ⚠️ Deleted source files stay in dist/ if clean:dist is skipped
    };

    return { directTsStrategy: directTs, compiledDistStrategy: compiledDist };
  }
}
