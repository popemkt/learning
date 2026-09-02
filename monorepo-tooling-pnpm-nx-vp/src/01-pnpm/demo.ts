/**
 * Interactive Demo: Lesson 1 - PNPM (The Package & Workspace Manager)
 */
import { PnpmWorkspaceEngine, simulateTaskExecution } from "./pnpm-mechanics.ts";

export function runPnpmDemo(): void {
  console.log("\n========================================================");
  console.log("  📦 LESSON 1: PNPM (The Package & Workspace Manager)");
  console.log("========================================================\n");

  // 1. Version Catalogs Demo
  console.log("1️⃣ CENTRALIZED DEPENDENCY CATALOGS (`catalog:`)");
  console.log("------------------------------------------------");
  const catalog = {
    "@nestjs/core": "^11.1.9",
    "zod": "^4.4.3",
    "typescript": "~6.0.2",
    "vite-plus": "0.1.22",
  };

  const engine = new PnpmWorkspaceEngine(catalog);

  engine.registerPackage({
    name: "draiver-domain",
    version: "1.0.0",
    dependencies: {
      "zod": "catalog:",
    },
  });

  engine.registerPackage({
    name: "draiver-api",
    version: "1.0.0",
    dependencies: {
      "@nestjs/core": "catalog:",
      "zod": "catalog:",
      "draiver-domain": "workspace:*",
    },
  });

  const resolvedApi = engine.resolvePackage("draiver-api");
  console.log(`✅ Resolved "draiver-api":`);
  console.dir(resolvedApi.resolvedDependencies, { depth: null });
  console.log("💡 Key Insight: All 20+ packages inherit exact pinned versions without manual sync!\n");

  // 2. Strict Symlinked node_modules vs Phantom Dependencies
  console.log("2️⃣ STRICT ISOLATION & PHANTOM DEPENDENCY PREVENTION");
  console.log("----------------------------------------------------");
  
  // Suppose draiver-domain uses zod, and draiver-api imports zod without declaring it
  engine.registerPackage({
    name: "rogue-subpackage",
    version: "1.0.0",
    dependencies: {}, // forgets to declare zod in package.json!
  });

  const flatResult = engine.simulateModuleResolution("rogue-subpackage", "zod", { layout: "flat_npm_yarn" });
  console.log(`❌ Flat npm/yarn resolution: isResolved=${flatResult.isResolved}`);
  console.log(`   ${flatResult.reason}`);

  const pnpmResult = engine.simulateModuleResolution("rogue-subpackage", "zod", { layout: "strict_pnpm_symlinks" });
  console.log(`🔒 pnpm strict symlinks:   isResolved=${pnpmResult.isResolved}`);
  console.log(`   ${pnpmResult.reason}\n`);

  // 3. Why pnpm is NOT for Task Orchestration
  console.log("3️⃣ TASK ORCHESTRATION COMPARISON (pnpm -r vs Nx DAG)");
  console.log("-----------------------------------------------------");

  const packages = [
    { name: "draiver-domain", buildTimeMs: 400, deps: [] },
    { name: "plugin-contracts", buildTimeMs: 300, deps: ["draiver-domain"] },
    { name: "swimlane-atlas", buildTimeMs: 500, deps: ["plugin-contracts"] },
    { name: "swimlane-forge", buildTimeMs: 500, deps: ["plugin-contracts"] },
    { name: "draiver-api", buildTimeMs: 600, deps: ["swimlane-atlas", "swimlane-forge"] },
  ];

  const pnpmRun = simulateTaskExecution(packages, "pnpm_recursive");
  console.log(`[pnpm -r run build]: Total Time = ${pnpmRun.totalDurationMs}ms, Cache Hits = ${pnpmRun.cacheHits}`);
  console.log(`  -> ${pnpmRun.description}`);

  const nxRunWarm = simulateTaskExecution(packages, "nx_dag", new Set(["draiver-domain", "plugin-contracts"]));
  console.log(`\n[nx run-many -t build] (with warm cache for upstream): Total Time = ${nxRunWarm.totalDurationMs}ms, Cache Hits = ${nxRunWarm.cacheHits}`);
  console.log(`  -> ${nxRunWarm.description}`);
  console.log(`  -> Executed tasks:\n     ${nxRunWarm.executedTasks.join("\n     ")}\n`);
}

if (import.meta.main) {
  runPnpmDemo();
}
