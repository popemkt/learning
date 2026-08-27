import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import {
  checkBarrelHygiene,
  checkConditionalExports,
  checkPackageSurface
} from "./surface-guard.js";
import { publicGuardedApi } from "./lib-guarded/src/index.js";
import { formatPublicMessage } from "./lib-guarded/src/utilities.js";
import * as leakyBarrel from "./barrel-hygiene/leaky-barrel/index.js";
import * as curatedBarrel from "./barrel-hygiene/curated-barrel/index.js";
import { initializeDualEngine, DUAL_PACKAGE_VERSION } from "./conditional-exports/dual-package/src/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

export async function runExportsDemo(): Promise<void> {
  console.log("\n=======================================================");
  console.log("  CONCEPT 1: Package Exports, Barrels & Conditional Maps");
  console.log("  (Restoring .NET 'internal' & Explicit Public Surfaces)");
  console.log("=======================================================\n");

  // ---------------------------------------------------------------------------
  // PART 1: The Package 'exports' Map (Encapsulation Boundary)
  // ---------------------------------------------------------------------------
  console.log("─── PART 1: Package 'exports' Map vs Deep-Import Breaches ───");

  const openLibPath = join(__dirname, "lib-open");
  const guardedLibPath = join(__dirname, "lib-guarded");

  console.log("\n1.1 Inspecting 'example-open-lib' (No exports map):");
  const openReport = checkPackageSurface(openLibPath);
  console.log(`   - Has exports map: ${openReport.hasExportsMap ? "YES" : "NO (All internals reachable!)"}`);
  console.log(`   - Status: ${openReport.isSafe ? "✅ SAFE" : "❌ UNGUARDED"}`);
  console.log(`   - Diagnostics: ${openReport.diagnostics.join(" | ")}`);

  console.log("\n1.2 Inspecting 'example-guarded-lib' (With strict exports map):");
  const guardedReport = checkPackageSurface(guardedLibPath);
  console.log(`   - Has exports map: ${guardedReport.hasExportsMap ? "YES" : "NO"}`);
  console.log(`   - Status: ${guardedReport.isSafe ? "✅ SAFE" : "❌ UNGUARDED"}`);
  console.log(`   - Public subpaths: ${guardedReport.exportedSubpaths.join(", ")}`);
  console.log(`   - Encapsulated internal files: ${guardedReport.internalFilesHidden.join(", ")}`);
  console.log(`   - Diagnostics: ${guardedReport.diagnostics.join(" | ")}`);

  console.log("\n1.3 Testing Runtime Resolution Behavior:");
  console.log(`   [OK] Public Root Import: "${publicGuardedApi}"`);
  console.log(`   [OK] Public Subpath Import: "${formatPublicMessage("hello world")}"`);
  console.log(`   [LIVE RUNTIME EXPERIMENT] Executing dynamic import("example-guarded-lib/src/internal/secret.ts"):`);
  try {
    // Intentionally test module loader boundary resolution
    await import("example-guarded-lib/src/internal/secret.ts");
    console.log("   ❌ UNEXPECTED: Import succeeded (Encapsulation failed!)");
  } catch (err: unknown) {
    const error = err as { code?: string; message: string };
    console.log(`   ✅ BLOCKED BY RUNTIME: Caught native error during module resolution!`);
    console.log(`      ↳ Error Code   : ${error.code ?? "ERR_PACKAGE_PATH_NOT_EXPORTED"}`);
    console.log(`      ↳ Error Message: ${error.message.split("\n")[0]}`);
  }
  // ---------------------------------------------------------------------------
  // PART 2: Barrel Hygiene & Wildcard Re-Export Audits
  // ---------------------------------------------------------------------------
  console.log("\n─── PART 2: Barrel Hygiene & Wildcard Re-Export Auditing ───");

  const leakyPath = join(__dirname, "barrel-hygiene/leaky-barrel/index.ts");
  const curatedPath = join(__dirname, "barrel-hygiene/curated-barrel/index.ts");

  console.log("\n2.1 Auditing Leaky Barrel ('export * from \"./internal-details.js\"'):");
  const leakyAudit = checkBarrelHygiene(leakyPath);
  console.log(`   - Compliant: ${leakyAudit.isCompliant ? "✅ YES" : "❌ NO (Wildcard Detected)"}`);
  console.log(`   - Wildcard exports: ${leakyAudit.wildcardExports.join(", ")}`);
  console.log(`   - Diagnostic: ${leakyAudit.diagnostics.join(" | ")}`);

  const leaky = leakyBarrel as Record<string, unknown>;
  console.log("   - [RUNTIME LEAK OBSERVATION]:");
  console.log(`     * PublicService: ${typeof leaky.PublicService} (Intended public)`);
  console.log(`     * _secretHasher: ${typeof leaky._secretHasher} (🚨 ACCIDENTALLY LEAKED!)`);
  console.log(`     * INTERNAL_SECRET_KEY: "${leaky.INTERNAL_SECRET_KEY}" (🚨 ACCIDENTALLY LEAKED!)`);
  console.log(`     * internalDbConnection: ${typeof leaky.internalDbConnection} (🚨 ACCIDENTALLY LEAKED!)`);

  console.log("\n2.2 Auditing Curated Barrel (Explicit named 'export { ... }' & 'export type { ... }'):");
  const curatedAudit = checkBarrelHygiene(curatedPath);
  console.log(`   - Compliant: ${curatedAudit.isCompliant ? "✅ YES" : "❌ NO"}`);
  console.log(`   - Curated Value Exports: [${curatedAudit.valueExports.join(", ")}]`);
  console.log(`   - Curated Type-Only Exports: [${curatedAudit.typeExports.join(", ")}]`);
  console.log(`   - Diagnostic: ${curatedAudit.diagnostics.join(" | ")}`);

  const curated = curatedBarrel as Record<string, unknown>;
  const service = new curatedBarrel.PublicService();
  console.log("   - [RUNTIME ENCAPSULATION OBSERVATION]:");
  console.log(`     * PublicService instance: "${service.execute("secure payload")}"`);
  console.log(`     * _secretHasher: ${String(curated._secretHasher)} (🔒 Safely hidden)`);
  console.log(`     * INTERNAL_SECRET_KEY: ${String(curated.INTERNAL_SECRET_KEY)} (🔒 Safely hidden)`);
  console.log(`     * UserDTO (TypeScript Type): ${String(curated.UserDTO)} (🔒 Erased at runtime)`);

  // ---------------------------------------------------------------------------
  // PART 3: Conditional Exports & Condition Ordering ('types' first)
  // ---------------------------------------------------------------------------
  console.log("\n─── PART 3: Conditional Dual-Package Exports & Precedence ───");

  const dualPkgDir = join(__dirname, "conditional-exports/dual-package");
  const misorderedPkgDir = join(__dirname, "conditional-exports/misordered-package");

  console.log("\n3.1 Auditing Dual-Package ('types' -> 'import' -> 'require'):");
  const dualAudit = checkConditionalExports(dualPkgDir);
  console.log(`   - Package: ${dualAudit.packageName}`);
  console.log(`   - Compliant: ${dualAudit.isCompliant ? "✅ YES" : "❌ NO"}`);
  console.log(`   - Root Subpath Conditions: [${dualAudit.subpaths[0]?.conditions.join(" -> ")}]`);
  console.log(`   - 'types' condition is first: ${dualAudit.allTypesFirst ? "✅ YES" : "❌ NO"}`);
  console.log(`   - Diagnostic: ${dualAudit.diagnostics.join(" | ")}`);

  // Demonstrate live ESM vs CJS resolution
  const esmStatus = initializeDualEngine({ mode: "esm" });
  const cjsModule = require(join(dualPkgDir, "dist/index.cjs"));
  const cjsStatus = cjsModule.initializeDualEngine({ mode: "cjs" });

  console.log("   - Dual Runtime Execution:");
  console.log(`     * ESM Import (v${DUAL_PACKAGE_VERSION}): runtime="${esmStatus.runtime}", format="${esmStatus.format}"`);
  console.log(`     * CJS Require (v${cjsModule.DUAL_PACKAGE_VERSION}): runtime="${cjsStatus.runtime}", format="${cjsStatus.format}"`);

  console.log("\n3.2 Auditing Misordered Package ('import' before 'types' Anti-Pattern):");
  const misorderedAudit = checkConditionalExports(misorderedPkgDir);
  console.log(`   - Package: ${misorderedAudit.packageName}`);
  console.log(`   - Compliant: ${misorderedAudit.isCompliant ? "✅ YES" : "❌ NO (Ordering Violation)"}`);
  console.log(`   - Root Subpath Conditions: [${misorderedAudit.subpaths[0]?.conditions.join(" -> ")}]`);
  console.log(`   - Diagnostics:`);
  for (const diag of misorderedAudit.diagnostics) {
    console.log(`     * ⚠️  ${diag}`);
  }

  console.log("\n=======================================================");
  console.log("  SUMMARY: LAYER 1 ARCHITECTURAL GUARANTEES");
  console.log("  1. 'exports' Map: Prevents deep file path traversal.");
  console.log("  2. Curated Barrels: Avoids 'export *' wildcard pollution.");
  console.log("  3. Conditional Maps: 'types' key first preserves types.");
  console.log("=======================================================\n");
}

if (process.argv[1] === __filename) {
  runExportsDemo();
}
