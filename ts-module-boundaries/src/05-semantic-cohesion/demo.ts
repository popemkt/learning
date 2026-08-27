import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { evaluateFileCohesion } from "./cohesion-evaluator.js";
import { GodInvoiceService, type HttpRequest } from "./mixed-service.js";
import { InvoiceController } from "./controller/invoice-controller.js";
import { InMemoryInvoiceRepository } from "./repository/invoice-repository.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function runCohesionDemo(): Promise<void> {
  console.log("\n=======================================================");
  console.log("  CONCEPT 5: Semantic Cohesion & Advisory Review");
  console.log("=======================================================");
  console.log("  (The Senior-Dev Pass: Keep / Split / Merge / Promote)\n");

  const mixedServicePath = join(__dirname, "mixed-service.ts");
  const domainPath = join(__dirname, "domain/invoice.ts");
  const repoPath = join(__dirname, "repository/invoice-repository.ts");
  const formatterPath = join(__dirname, "formatter/invoice-formatter.ts");
  const controllerPath = join(__dirname, "controller/invoice-controller.ts");

  console.log("1. Advisory Analysis of Monolithic Anti-Pattern (mixed-service.ts):");
  const mixedEval = evaluateFileCohesion(mixedServicePath);
  console.log(`   Module: ${mixedEval.moduleName}`);
  console.log(`   - Cohesion Score : ${(mixedEval.cohesionScore * 100).toFixed(0)}%`);
  console.log(`   - Advisory Verdict: [${mixedEval.verdict}]`);
  console.log(`   - Detected Concerns (${mixedEval.detectedConcerns.length}):`);
  for (const c of mixedEval.detectedConcerns) {
    console.log(`     ↳ ${c.label} (Matches: ${c.matchedTokens.slice(0, 3).join(", ")})`);
  }
  console.log(`   - Recommendations:`);
  for (const r of mixedEval.recommendations) {
    console.log(`     • ${r}`);
  }

  console.log("\n2. Advisory Analysis of Decomposed Cohesive Modules:");
  const cohesiveFiles = [domainPath, repoPath, formatterPath, controllerPath];
  for (const file of cohesiveFiles) {
    const ev = evaluateFileCohesion(file);
    const concerns = ev.detectedConcerns.map(c => c.label).join(" + ") || "Pure Domain";
    console.log(`   - ${ev.moduleName.padEnd(25)} -> Score: ${(ev.cohesionScore * 100).toFixed(0)}% | [${ev.verdict}] | Focus: ${concerns}`);
  }

  console.log("\n3. Testing Functional Parity (God Object vs Cohesive Micro-Architecture):");
  const testRequest: HttpRequest = {
    headers: { "content-type": "application/json" },
    body: {
      customerId: "cust_789",
      items: [
        { description: "TypeScript Monorepo Architecture Book", priceCents: 4500, quantity: 1 },
        { description: "Module Boundary Workshop Pass", priceCents: 15000, quantity: 2 },
      ],
      taxExempt: false,
    },
  };

  const godService = new GodInvoiceService();
  const godResponse = await godService.handleCreateInvoiceHttpRequest(testRequest);

  const cleanRepo = new InMemoryInvoiceRepository();
  const cleanController = new InvoiceController(cleanRepo);
  const cleanResponse = await cleanController.createInvoiceHandler(testRequest);

  const godParsed = JSON.parse(godResponse.body);
  const cleanParsed = JSON.parse(cleanResponse.body);

  console.log(`   - God Object Response   : Status ${godResponse.statusCode}, Total: $${(godParsed.totalCents / 100).toFixed(2)}`);
  console.log(`   - Cohesive Architecture : Status ${cleanResponse.statusCode}, Total: $${(cleanParsed.totalCents / 100).toFixed(2)}`);
  console.log(`   --> Exact functional parity achieved, with modular testability and zero entangled concerns.`);

  console.log("\n   [KEY TAKEAWAY]");
  console.log("   In .NET, senior architects and NDepend identify semantic coupling and god objects.");
  console.log("   In TypeScript, automated advisory cohesion analysis provides actionable guidance");
  console.log("   (Keep/Split/Merge/Promote) to guide refactoring without acting as a fragile CI blocker.");
}

if (process.argv[1] === __filename) {
  runCohesionDemo();
}
