/**
 * Interactive Demo: Lesson 2 - Nx (Task Graph & Computation Cache Orchestrator)
 */
import { NxWorkspaceGraph, type ProjectNode } from "./nx-task-graph.ts";
import { NxModuleBoundaryValidator } from "./boundary-enforcer.ts";

export function runNxDemo(): void {
  console.log("\n========================================================");
  console.log("  ⚡ LESSON 2: Nx (Task Graph & Computation Cache)");
  console.log("========================================================\n");

  const graph = new NxWorkspaceGraph({
    build: {
      dependsOn: ["^build"],
      inputs: ["{projectRoot}/**/*", "{workspaceRoot}/pnpm-lock.yaml"],
      outputs: ["{projectRoot}/dist"],
      cache: true,
    },
    test: {
      dependsOn: ["^build"],
      cache: true,
    },
  });

  graph.addProject({
    name: "draiver-domain",
    path: "libs/draiver-domain",
    dependencies: [],
    tags: ["scope:shared", "layer:domain"],
    files: { "src/schemas.ts": "v1_content", "src/index.ts": "v1_content" },
  });

  graph.addProject({
    name: "swimlane-atlas",
    path: "libs/swimlanes/atlas",
    dependencies: ["draiver-domain"],
    tags: ["scope:swimlane", "layer:application"],
    files: { "src/atlas.plugin.ts": "v1_content" },
  });

  graph.addProject({
    name: "swimlane-forge",
    path: "libs/swimlanes/forge",
    dependencies: ["draiver-domain"],
    tags: ["scope:swimlane", "layer:application"],
    files: { "src/forge.plugin.ts": "v1_content" },
  });

  graph.addProject({
    name: "draiver-api",
    path: "apps/draiver-api",
    dependencies: ["swimlane-atlas", "swimlane-forge"],
    tags: ["scope:app", "layer:app"],
    files: { "src/main.ts": "v1_content" },
  });

  // 1. Cold Build vs Warm Cache Run
  console.log("1️⃣ COMPUTATION CACHING (Cold Run vs Warm Re-execution)");
  console.log("-----------------------------------------------------");
  const coldRun = graph.runMany("build");
  console.log(`Cold build: ${coldRun.results.length} tasks in ${coldRun.totalTimeMs}ms`);
  coldRun.results.forEach((r) => console.log(`  - ${r.taskId} -> ${r.status} (${r.durationMs}ms, ${r.hash})`));

  const warmRun = graph.runMany("build");
  console.log(`\nWarm build: ${warmRun.results.length} tasks in ${warmRun.totalTimeMs}ms`);
  warmRun.results.forEach((r) => console.log(`  - ${r.taskId} -> ${r.status} (${r.durationMs}ms)`));
  console.log("💡 Key Insight: Cached tasks replay outputs in 0ms without re-running tsc!\n");

  // 2. Affected Analysis
  console.log("2️⃣ AFFECTED ANALYSIS (`nx affected`)");
  console.log("-------------------------------------");
  const changedFile = "libs/swimlanes/forge/src/forge.plugin.ts";
  const affected = graph.getAffectedProjects([changedFile]);
  console.log(`File changed: "${changedFile}"`);
  console.log(`Directly affected & dependents:`, affected.affectedProjects);
  console.log(`Unchanged projects (skipped entirely in CI): draiver-domain, swimlane-atlas\n`);

  // 3. Sub-package Script Self-Building Anti-Pattern
  console.log("3️⃣ SUB-PACKAGE SCRIPT ANTI-PATTERN (Self-Chained Builds)");
  console.log("--------------------------------------------------------");
  // Fresh graphs without warm cache to measure execution penalty
  const graphClean = new NxWorkspaceGraph({ test: { dependsOn: ["^build"], cache: false } });
  const graphRedundant = new NxWorkspaceGraph({ test: { dependsOn: ["^build"], cache: false } });
  const sampleProjects: ProjectNode[] = [
    { name: "draiver-domain", path: "libs/draiver-domain", dependencies: [], tags: ["scope:shared", "layer:domain"], files: { "src/schemas.ts": "v1" } },
    { name: "swimlane-atlas", path: "libs/swimlanes/atlas", dependencies: ["draiver-domain"], tags: ["scope:swimlane", "layer:application"], files: { "src/atlas.plugin.ts": "v1" } },
    { name: "draiver-api", path: "apps/draiver-api", dependencies: ["swimlane-atlas"], tags: ["scope:app", "layer:app"], files: { "src/main.ts": "v1" } },
  ];
  for (const p of sampleProjects) {
    graphClean.addProject(p);
    graphRedundant.addProject(p);
  }
  const testRunClean = graphClean.runMany("test", { simulateSubPackageSelfBuild: false });
  const testRunRedundant = graphRedundant.runMany("test", { simulateSubPackageSelfBuild: true });

  console.log(`✅ Clean Nx-orchestrated tests: Total Time = ${testRunClean.totalTimeMs}ms (Nx builds dependencies once)`);
  console.log(`❌ Redundant sub-package builds: Total Time = ${testRunRedundant.totalTimeMs}ms (+${testRunRedundant.redundantTimeMs}ms wasted by self-rebuilding in package.json)`);
  console.log("💡 Fix: Remove 'pnpm run build &&' from package test scripts; let Nx handle dependsOn: [\"^build\"]\n");

  // 4. Module Boundary Enforcement
  console.log("4️⃣ ARCHITECTURAL BOUNDARY ENFORCEMENT (@nx/enforce-module-boundaries)");
  console.log("---------------------------------------------------------------------");
  const validator = new NxModuleBoundaryValidator();
  validator.registerProject("draiver-domain", ["scope:shared", "layer:domain"]);
  validator.registerProject("swimlane-atlas", ["scope:swimlane", "layer:application"]);
  validator.registerProject("swimlane-forge", ["scope:swimlane", "layer:application"]);
  validator.registerProject("database", ["scope:shared", "layer:infrastructure"]);

  // Test illegal cross-swimlane import
  const illegalCrossSwimlane = validator.validateImport("swimlane-atlas", "swimlane-forge");
  console.log(`❌ Illegal sibling swimlane import (atlas -> forge):`);
  console.log(`   Rule: ${illegalCrossSwimlane?.violatedRule}`);
  console.log(`   Detail: ${illegalCrossSwimlane?.explanation}\n`);

  // Test illegal layer inversion
  const illegalLayerInversion = validator.validateImport("draiver-domain", "database");
  console.log(`❌ Illegal layer inversion (domain -> database):`);
  console.log(`   Rule: ${illegalLayerInversion?.violatedRule}`);
  console.log(`   Detail: ${illegalLayerInversion?.explanation}\n`);
}

if (import.meta.main) {
  runNxDemo();
}
