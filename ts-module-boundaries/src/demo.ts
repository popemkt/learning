#!/usr/bin/env bun
import { runExportsDemo } from "./01-package-exports/demo.js";
import { runTagsAndBoundariesDemo } from "./02-project-tags-and-boundaries/demo.js";
import { runCyclesDemo } from "./03-dependency-cruiser-cycles/demo.js";
import { runComplexityDemo } from "./04-complexity-metrics/demo.js";
import { runCohesionDemo } from "./05-semantic-cohesion/demo.js";

function printHeader(): void {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║         TYPESCRIPT MONOREPO MODULE BOUNDARIES: 5-LAYER DEFENSE MODEL       ║
║            Restoring .NET-Grade Architectural Guarantees in TS             ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝
`);
}

function printSummaryTable(): void {
  console.log(`
================================================================================
  ARCHITECTURE COMPARISON: .NET vs TYPESCRIPT MODULE BOUNDARIES
================================================================================

  Layer   .NET Native Built-in              TypeScript Monorepo Solution
  ─────   ────────────────────────────────  ──────────────────────────────────────────
  1       'internal' keyword / public API   Package 'exports' Map (Node.js native)
  2       <ProjectReference> & ArchUnit     Nx Project Tags + ESLint depConstraints
  3       MSBuild Circular Ref Build Error  dependency-cruiser (no-circular + baseline)
  4       Roslyn Code Metrics / Analyzers   Oxlint / ESLint Complexity (Warn-Only)
  5       Architect / Senior Dev Review     Automated Advisory Cohesion Analysis (LLM)

================================================================================
  ALL 5 MODULE BOUNDARY CONCEPTS DEMONSTRATED SUCCESSFULLY
================================================================================
`);
}

async function main(): Promise<void> {
  printHeader();

  const args = process.argv.slice(2);
  const target = args[0]?.toLowerCase();

  if (target === "1" || target === "exports") {
    await runExportsDemo();
  } else if (target === "2" || target === "tags" || target === "boundaries") {
    await runTagsAndBoundariesDemo();
  } else if (target === "3" || target === "cycles" || target === "cruiser") {
    await runCyclesDemo();
  } else if (target === "4" || target === "complexity" || target === "metrics") {
    await runComplexityDemo();
  } else if (target === "5" || target === "cohesion" || target === "advisory") {
    await runCohesionDemo();
  } else {
    // Default or --all: Run all 5 concepts sequentially
    console.log("Running Full 5-Concept Interactive Architecture Tour...\n");
    await runExportsDemo();
    await runTagsAndBoundariesDemo();
    await runCyclesDemo();
    await runComplexityDemo();
    await runCohesionDemo();
  }

  printSummaryTable();
}

main().catch(err => {
  console.error("Demo failed with error:", err);
  process.exit(1);
});
