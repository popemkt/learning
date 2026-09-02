/**
 * Master Tour: Monorepo Tooling Architecture (PNPM, Nx, VP)
 * Run via `bun run src/demo.ts` or `bun run demo`
 */

import { runPnpmDemo } from "./01-pnpm/demo.ts";
import { runNxDemo } from "./02-nx/demo.ts";
import { runVpDemo } from "./03-vp/demo.ts";
import { runUnifiedDemo } from "./04-unified/demo.ts";

export function runMasterTour(): void {
  const args = process.argv.slice(2);

  console.log("\n╔══════════════════════════════════════════════════════════════════════════════╗");
  console.log("║           🏗️  MONOREPO TOOLING ARCHITECTURE & UNIFICATION GUIDE               ║");
  console.log("║                    pnpm  ×  Nx  ×  vp (Vite-Plus)                            ║");
  console.log("╚══════════════════════════════════════════════════════════════════════════════╝");

  if (args.includes("--pnpm")) {
    runPnpmDemo();
    return;
  }
  if (args.includes("--nx")) {
    runNxDemo();
    return;
  }
  if (args.includes("--vp")) {
    runVpDemo();
    return;
  }
  if (args.includes("--unified")) {
    runUnifiedDemo();
    return;
  }

  // Run all lessons in sequence
  runPnpmDemo();
  runNxDemo();
  runVpDemo();
  runUnifiedDemo();

  console.log("================================================================================");
  console.log("  🏁 Master Tour Complete! Run individual lessons via:");
  console.log("     bun run demo:pnpm    |  bun run demo:nx");
  console.log("     bun run demo:vp      |  bun run demo:unified");
  console.log("     bun test             (to run the automated test suite)");
  console.log("================================================================================\n");
}

if (import.meta.main) {
  runMasterTour();
}
