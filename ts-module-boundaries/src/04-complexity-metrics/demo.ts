import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { scanFileMetrics } from "./metric-scanner.js";
import {
  calculateTangledDiscount,
  createUserWithBloatedParameters,
  parseNestedCustomerEmail,
} from "./complex-samples.js";
import {
  calculateCleanDiscount,
  createCleanUser,
  parseCleanCustomerEmail,
} from "./clean-samples.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function runComplexityDemo(): Promise<void> {
  console.log("\n=======================================================");
  console.log("  CONCEPT 4: Complexity Metrics & Warn-Only Philosophy");
  console.log("=======================================================\n");

  const complexPath = join(__dirname, "complex-samples.ts");
  const cleanPath = join(__dirname, "clean-samples.ts");

  console.log("1. Scanning Complex Anti-Pattern Hotspots (complex-samples.ts):");
  const complexReport = scanFileMetrics(complexPath);
  for (const fn of complexReport.functionReports) {
    const status = fn.isCompliant ? "[PASS]" : "[WARN]";
    console.log(`   ${status} ${fn.functionName.padEnd(32)} -> Complexity: ${fn.cyclomaticComplexity}, Max Depth: ${fn.maxDepth}, Params: ${fn.parameterCount}`);
    for (const w of fn.warnings) {
      console.log(`          ↳ ${w}`);
    }
  }
  console.log(`\n   Linter Exit Code: ${complexReport.exitCode} (Build stays GREEN)`);
  console.log(`   Philosophy: ${complexReport.philosophyExplanation}\n`);

  console.log("2. Scanning Clean Refactored Alternatives (clean-samples.ts):");
  const cleanReport = scanFileMetrics(cleanPath);
  for (const fn of cleanReport.functionReports) {
    const status = fn.isCompliant ? "[PASS]" : "[WARN]";
    console.log(`   ${status} ${fn.functionName.padEnd(32)} -> Complexity: ${fn.cyclomaticComplexity}, Max Depth: ${fn.maxDepth}, Params: ${fn.parameterCount}`);
  }
  console.log(`   Total Warnings: ${cleanReport.totalWarnings}`);

  console.log("\n3. Testing Functional Parity (Both Versions Execute Correctly):");
  const discountComplex = calculateTangledDiscount(600, "platinum", "SAVE20", 3, false);
  const discountClean = calculateCleanDiscount(600, "platinum", 0.20);
  console.log(`   - Discount Calculation -> Complex: ${discountComplex * 100}%, Clean: ${discountClean * 100}%`);

  const rawData = { profile: { personal: { contact: { email: "User@Domain.COM", isEmailVerified: true } } } };
  const emailComplex = parseNestedCustomerEmail(rawData);
  const emailClean = parseCleanCustomerEmail(rawData);
  console.log(`   - Email Extraction     -> Complex: "${emailComplex}", Clean: "${emailClean}"`);

  const userComplex = createUserWithBloatedParameters("u1", "a@b.com", "John", "Doe", "admin", true, true, "REF123");
  const userClean = createCleanUser({ id: "u1", email: "a@b.com", firstName: "John", lastName: "Doe", role: "admin", referralCode: "REF123" });
  console.log(`   - User Construction    -> Complex: "${userComplex.fullName}", Clean: "${userClean.fullName}"`);

  console.log("\n   [KEY TAKEAWAY]");
  console.log("   In .NET, Visual Studio Code Metrics provide maintainability index analysis.");
  console.log("   In TypeScript, Oxlint/ESLint warn-only complexity metrics flag code growth");
  console.log("   without forcing artificial fragmentation or blocking emergency hotfixes.");
}

if (process.argv[1] === __filename) {
  runComplexityDemo();
}
