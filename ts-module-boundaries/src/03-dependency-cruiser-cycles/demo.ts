import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { scanDirectoryForCycles } from "./cycle-detector.js";
import { getRuntimeCycleSnapshot } from "./circular-basic/a.js";
import { getFeatureSummary } from "./circular-barrel/feature.js";
import { formatServiceAMessage, formatServiceBMessage } from "./clean/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function runCyclesDemo(): Promise<void> {
  console.log("\n=======================================================");
  console.log("  CONCEPT 3: Dependency Cruiser & Cycle Traps");
  console.log("=======================================================\n");

  const cyclesDir = __dirname;

  console.log("1. Demonstrating Direct Circular Dependency Trap (a.ts <-> b.ts):");
  const basicDir = join(cyclesDir, "circular-basic");
  const basicScan = scanDirectoryForCycles(basicDir);
  for (const c of basicScan.detectedCycles) {
    console.log(`   [DETECTED CYCLE] ${c.formattedChain}`);
    console.log(`   Rule: ${c.ruleName} | Severity: ${c.severity.toUpperCase()}`);
  }
  const snapshot = getRuntimeCycleSnapshot();
  console.log(`   Runtime Snapshot: A_NAME="${snapshot.aName}", B_VALUE="${snapshot.bValue}"`);
  console.log("   --> Notice: Cyclic imports cause partial initialization / undefined traps at runtime.\n");

  console.log("2. Demonstrating Barrel File Re-Export Cycle Trap (feature <-> barrel <-> helper):");
  const barrelDir = join(cyclesDir, "circular-barrel");
  const barrelScan = scanDirectoryForCycles(barrelDir);
  for (const c of barrelScan.detectedCycles) {
    console.log(`   [DETECTED BARREL CYCLE] ${c.formattedChain}`);
    console.log(`   Explanation: ${c.explanation}`);
  }
  console.log(`   Runtime Call: ${getFeatureSummary()}`);
  console.log("   --> Notice: Single-project tools miss barrel cycles; file-level graph tools catch them.\n");

  console.log("3. Demonstrating Legacy Cycle Freezing (Baselining Tech Debt):");
  const fullScanWithBaseline = scanDirectoryForCycles(cyclesDir, {
    legacyExceptionPattern: /circular-legacy/,
  });
  console.log(`   - Total Files Analyzed: ${fullScanWithBaseline.totalFilesScanned}`);
  console.log(`   - Active Unhandled Cycle Errors: ${fullScanWithBaseline.activeErrorsCount}`);
  console.log(`   - Frozen Legacy Exceptions: ${fullScanWithBaseline.frozenLegacyCount}`);
  for (const c of fullScanWithBaseline.detectedCycles.filter(c => c.isLegacyException)) {
    console.log(`   [FROZEN LEGACY] ${c.formattedChain} (Allowed via pathNot exception in .dependency-cruiser.cjs)`);
  }
  console.log("   --> Strategy: Freeze legacy cycles in config; new cycles fail the build immediately.\n");

  console.log("4. Demonstrating Clean Acyclic Architecture (clean/):");
  const cleanDir = join(cyclesDir, "clean");
  const cleanScan = scanDirectoryForCycles(cleanDir);
  console.log(`   - Files Scanned: ${cleanScan.totalFilesScanned}`);
  console.log(`   - Cycles Found: ${cleanScan.detectedCycles.length}`);
  console.log(`   - Output A: ${formatServiceAMessage()}`);
  console.log(`   - Output B: ${formatServiceBMessage()}`);
  console.log(`   --> ${cleanScan.summary}`);

  console.log("\n   [KEY TAKEAWAY]");
  console.log("   In .NET, MSBuild refuses circular project references outright.");
  console.log("   In TypeScript, dependency-cruiser provides strict file-level cycle detection");
  console.log("   and architecture layer verification that prevents catastrophic runtime bugs.");
}

if (process.argv[1] === __filename) {
  runCyclesDemo();
}
