/**
 * Interactive Demo: Lesson 3 - vp (Vite-Plus Unified Toolchain)
 */
import { VpToolchainEngine } from "./vp-toolchain.ts";

export function runVpDemo(): void {
  console.log("\n========================================================");
  console.log("  ⚡ LESSON 3: vp (Vite-Plus Developer Toolchain)");
  console.log("========================================================\n");

  const vp = new VpToolchainEngine();

  // 1. Oxfmt formatting speed
  console.log("1️⃣ FAST AST FORMATTING (`vp fmt` via Oxfmt)");
  console.log("--------------------------------------------");
  const formatSample = vp.formatFile("libs/swimlanes/forge/src/forge.plugin.ts", "const x = 1; ; \n");
  console.log(`Formatted ${formatSample.file}: changed=${formatSample.changed} in ${formatSample.formattedDurationMs}ms`);
  console.log("💡 Key Insight: Pre-commit hooks format 350+ files in <100ms without blocking commits!\n");

  // 2. Oxlint complexity & line sensors
  console.log("2️⃣ CODE QUALITY & COMPLEXITY SENSORS (`vp lint` via Oxlint)");
  console.log("------------------------------------------------------------");
  // Simulating large god-file
  const report = vp.lintFile("libs/swimlanes/forge/src/forge.plugin.ts", 2394, 28);
  console.log(`Scanned: ${report.filesScanned} file in ${report.durationMs}ms (Exit Code: ${report.exitCode})`);
  console.log(`Warnings detected (${report.warnings.length}):`);
  for (const w of report.warnings) {
    console.log(`  ⚠️ [${w.rule}] line ${w.line}: ${w.message}`);
  }
  console.log("💡 Key Insight: Oxlint acts as an advisory quality ratchet, flagging bloat in real-time.\n");

  // 3. 2-Tier Linter Strategy: Oxlint vs ESLint
  console.log("3️⃣ THE 2-TIER LINTER ARCHITECTURE (Why draiver uses BOTH)");
  console.log("----------------------------------------------------------");
  console.log("┌───────────────────────────┬───────────────────────────┐");
  console.log("│ Tier 1: vp lint (Oxlint)  │ Tier 2: ESLint            │");
  console.log("├───────────────────────────┼───────────────────────────┤");
  console.log("│ • 50-100x faster (Rust)   │ • Monorepo AST & Graph    │");
  console.log("│ • Syntax & Best Practices │ • @nx/enforce-module-     │");
  console.log("│ • React Hooks rules       │   boundaries rule         │");
  console.log("│ • Complexity sensors      │ • Scoped & focused        │");
  console.log("│ • Runs on EVERY file      │ • Runs as architectural   │");
  console.log("│   in local dev loop       │   gate in PR/CI           │");
  console.log("└───────────────────────────┴───────────────────────────┘\n");

  // 4. Test Runner Paradigms: vp test vs node --test
  console.log("4️⃣ TEST RUNNER COMPARISON (vp test vs node --test on dist/)");
  console.log("-------------------------------------------------------------");
  const testComparison = vp.compareTestStrategies(45, 12000);
  console.log(`Strategy A: ${testComparison.directTsStrategy.runner}`);
  console.log(`  Steps: ${testComparison.directTsStrategy.steps.join(" -> ")}`);
  console.log(`  Estimated Duration: ${testComparison.directTsStrategy.durationMs}ms`);
  console.log(`  Stale Dist Orphan Hazard: ${testComparison.directTsStrategy.staleOrphanRisk ? "YES ⚠️" : "NO 🔒"}\n`);

  console.log(`Strategy B: ${testComparison.compiledDistStrategy.runner}`);
  console.log(`  Steps: ${testComparison.compiledDistStrategy.steps.join(" -> ")}`);
  console.log(`  Estimated Duration: ${testComparison.compiledDistStrategy.durationMs}ms`);
  console.log(`  Stale Dist Orphan Hazard: ${testComparison.compiledDistStrategy.staleOrphanRisk ? "YES ⚠️" : "NO 🔒"}`);
  console.log("💡 Key Insight: Running tests on source TS via `vp test` or `tsx --test` eliminates the compile-before-test bottleneck!\n");
}

if (import.meta.main) {
  runVpDemo();
}
