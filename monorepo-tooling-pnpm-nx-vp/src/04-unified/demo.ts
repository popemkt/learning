/**
 * Interactive Demo: Lesson 4 - Unified Architecture & Draiver Case Study
 */
import { UnifiedMonorepoEngine } from "./unified-orchestrator.ts";
import { DRAIVER_AUDIT_FINDINGS, getDraiverBeforeAfterConfig } from "./draiver-case-study.ts";

export function runUnifiedDemo(): void {
  console.log("\n========================================================");
  console.log("  🏆 LESSON 4: The Golden Monorepo Triangle (Unified Model)");
  console.log("========================================================\n");

  console.log("📐 THE 3-LAYER SEPARATION OF CONCERNS");
  console.log("--------------------------------------");
  console.log("1. PNPM : Package & Workspace Manager (Identity, Catalogs, Symlink Isolation)");
  console.log("2. NX   : Task Graph & Computation Cache (DAG Scheduling, Cache, Affected, Boundaries)");
  console.log("3. VP   : Inner-Loop Fast Toolchain (Oxfmt, Oxlint, Vite, Vitest Engine)\n");

  // Run unified simulation
  const engine = new UnifiedMonorepoEngine({
    catalog: {
      "@nestjs/core": "^11.1.9",
      "zod": "^4.4.3",
      "typescript": "~6.0.2",
    },
    projects: [
      {
        manifest: { name: "draiver-domain", version: "1.0.0", dependencies: { zod: "catalog:" } },
        path: "libs/draiver-domain",
        tags: ["scope:shared", "layer:domain"],
        files: { "src/schemas.ts": "v1" },
      },
      {
        manifest: { name: "swimlane-atlas", version: "1.0.0", dependencies: { "draiver-domain": "workspace:*" } },
        path: "libs/swimlanes/atlas",
        tags: ["scope:swimlane", "layer:application"],
        files: { "src/atlas.plugin.ts": "v1" },
      },
      {
        manifest: { name: "swimlane-forge", version: "1.0.0", dependencies: { "draiver-domain": "workspace:*" } },
        path: "libs/swimlanes/forge",
        tags: ["scope:swimlane", "layer:application"],
        files: { "src/forge.plugin.ts": "v1" },
      },
      {
        manifest: {
          name: "draiver-api",
          version: "1.0.0",
          dependencies: { "@nestjs/core": "catalog:", "swimlane-atlas": "workspace:*", "swimlane-forge": "workspace:*" },
        },
        path: "apps/draiver-api",
        tags: ["scope:app", "layer:app"],
        files: { "src/main.ts": "v1" },
      },
    ],
  });

  console.log("🚀 SIMULATING UNIFIED REPOSITORY EXECUTION PIPELINE");
  console.log("---------------------------------------------------");
  const reports = engine.executeFullPipeline();
  for (const r of reports) {
    console.log(`[${r.phase.toUpperCase()}] (${r.toolUsed}) ${r.status} in ${r.durationMs}ms`);
    console.log(`  └─ ${r.summary}`);
  }
  console.log("");

  // Draiver Monorepo Audit Findings
  console.log("🔍 DRAIVER WORKTREE AUDIT: ARE WE MIXING THEM TOO MUCH?");
  console.log("-------------------------------------------------------");
  for (const audit of DRAIVER_AUDIT_FINDINGS) {
    console.log(`📌 Area: ${audit.area} [Primary Tool: ${audit.primaryTool.toUpperCase()}]`);
    console.log(`   ❌ Current: ${audit.currentState}`);
    console.log(`   ⚠️  Problem: ${audit.problem}`);
    console.log(`   ✅ Unified Fix: ${audit.unifiedFix}\n`);
  }

  // Before & After Config Comparison
  console.log("📋 EXACT BEFORE vs AFTER BLUEPRINT FOR DRAIVER");
  console.log("-----------------------------------------------");
  const diffs = getDraiverBeforeAfterConfig();
  console.log("Root package.json BEFORE:");
  console.log(diffs.rootPackageJsonBefore);
  console.log("\nRoot package.json AFTER (Clean Unified Cutover):");
  console.log(diffs.rootPackageJsonAfter);
  console.log("\nPackage package.json (e.g. libs/draiver-domain) AFTER (Atomic Script):");
  console.log(diffs.subPackageJsonAfter);
  console.log("\n💡 Key Benefits: 0 redundant builds, full computation caching on tests, clear team mental model!\n");
}

if (import.meta.main) {
  runUnifiedDemo();
}
