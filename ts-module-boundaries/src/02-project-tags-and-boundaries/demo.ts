import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  DEFAULT_DEP_CONSTRAINTS,
  checkModuleBoundaries,
  loadMonorepoPackages,
} from "./boundary-engine.js";
import { runReferencesComparison } from "./references-comparison/comparator.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function runTagsAndBoundariesDemo(): Promise<void> {
  console.log("\n=======================================================");
  console.log("  CONCEPT 2: Project Tags & Module Boundaries (@nx)");
  console.log("=======================================================\n");

  const packagesDir = join(__dirname, "packages");
  const projects = loadMonorepoPackages(packagesDir);

  console.log("1. Discovered Monorepo Packages and Tags:");
  for (const [name, meta] of projects.entries()) {
    console.log(`   - ${name.padEnd(26)} -> [${meta.tags.join(", ")}]`);
  }

  console.log("\n2. Validating Legal Architecture Edges (Compliant Flow):");
  const legalEdges = [
    { from: "@monorepo/feature-billing", to: "@monorepo/application" },
    { from: "@monorepo/feature-billing", to: "@monorepo/domain" },
    { from: "@monorepo/feature-analytics", to: "@monorepo/domain" },
    { from: "@monorepo/infrastructure", to: "@monorepo/application" },
    { from: "@monorepo/infrastructure", to: "@monorepo/domain" },
    { from: "@monorepo/application", to: "@monorepo/domain" },
  ];

  const legalResult = checkModuleBoundaries(projects, legalEdges, DEFAULT_DEP_CONSTRAINTS);
  for (const edge of legalEdges) {
    console.log(`   [PASS] Allowed: ${edge.from} --> ${edge.to}`);
  }
  console.log(`   --> ${legalResult.summary}`);

  console.log("\n3. Testing Forbidden Boundary Violations:");

  // Case A: Layer Inversion (Domain importing Infrastructure)
  const illegalLayerEdges = [
    { from: "@monorepo/domain", to: "@monorepo/infrastructure" },
  ];
  const layerResult = checkModuleBoundaries(projects, illegalLayerEdges, DEFAULT_DEP_CONSTRAINTS);
  console.log("\n   Case A: Layer Inversion (Domain importing Infrastructure)");
  console.log(`   [BLOCKED] ${illegalLayerEdges[0].from} --> ${illegalLayerEdges[0].to}`);
  for (const v of layerResult.violations) {
    console.log(`   Reason: ${v.reason}`);
  }

  // Case B: Scope / Swimlane Crossing (Feature Billing importing Feature Analytics)
  const illegalScopeEdges = [
    { from: "@monorepo/feature-billing", to: "@monorepo/feature-analytics" },
  ];
  const scopeResult = checkModuleBoundaries(projects, illegalScopeEdges, DEFAULT_DEP_CONSTRAINTS);
  console.log("\n   Case B: Scope Crossing (Billing importing Analytics directly)");
  console.log(`   [BLOCKED] ${illegalScopeEdges[0].from} --> ${illegalScopeEdges[0].to}`);
  for (const v of scopeResult.violations) {
    console.log(`   Reason: ${v.reason}`);
  }
  console.log("\n4. Comparing Declared Reference Mechanisms:");
  const comparisons = runReferencesComparison(__dirname);

  for (const comp of comparisons) {
    console.log(`\n   ─── ${comp.title} ───`);
    console.log(`   * Source of Truth : ${comp.sourceOfTruth}`);
    console.log(`   * Dual Maintenance: ${comp.duplicateConfigRequired ? "⚠️ YES (package.json + tsconfig.json)" : "✅ NO (package.json only)"}`);
    console.log(`   * Happy Path Output: ${comp.successResult.output}`);
    console.log(`   * Failure Scenario : ${comp.failureDemo.scenario}`);
    console.log(`   * Caught By        : ${comp.failureDemo.caughtBy}`);
    const firstLineErr = comp.failureDemo.errorMessage.split("\n").find(l => l.includes("error")) || comp.failureDemo.errorMessage.split("\n")[0];
    console.log(`   * Error Caught     : ${firstLineErr.trim()}`);
  }

  console.log("\n   [KEY TAKEAWAYS]");
  console.log("   1. In .NET, <ProjectReference> enforces assembly boundaries.");
  console.log("   2. In TS Monorepos, Level 1+2 (pnpm + ESLint enforceBuildableLibDependency) provides");
  console.log("      a single source of truth in package.json without duplicating references in tsconfig.");
  console.log("   3. Level 3 (composite: true + tsconfig references) provides native tsc -b DAG builds");
  console.log("      but introduces dual-maintenance overhead.");
}

if (process.argv[1] === __filename) {
  runTagsAndBoundariesDemo();
}
