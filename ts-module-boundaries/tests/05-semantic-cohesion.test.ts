import { describe, expect, it } from "bun:test";
import { join } from "node:path";
import { evaluateFileCohesion } from "../src/05-semantic-cohesion/cohesion-evaluator.js";
import { GodInvoiceService, type HttpRequest } from "../src/05-semantic-cohesion/mixed-service.js";
import { InvoiceController } from "../src/05-semantic-cohesion/controller/invoice-controller.js";
import { InMemoryInvoiceRepository } from "../src/05-semantic-cohesion/repository/invoice-repository.js";
import { calculateInvoiceTotals, createInvoice } from "../src/05-semantic-cohesion/domain/invoice.js";

describe("Concept 5: Semantic Cohesion & Advisory Review", () => {
  const baseDir = join(
    import.meta.dir,
    "../src/05-semantic-cohesion"
  );

  it("identifies low cohesion and emits SPLIT verdict on GodInvoiceService", () => {
    const mixedPath = join(baseDir, "mixed-service.ts");
    const result = evaluateFileCohesion(mixedPath);

    expect(result.verdict).toBe("SPLIT");
    expect(result.cohesionScore).toBeLessThanOrEqual(0.40);
    expect(result.detectedConcerns.length).toBe(4);

    const concernTypes = result.detectedConcerns.map(c => c.type);
    expect(concernTypes).toContain("HTTP_TRANSPORT");
    expect(concernTypes).toContain("PERSISTENCE_DB");
    expect(concernTypes).toContain("BUSINESS_DOMAIN");
    expect(concernTypes).toContain("PRESENTATION_FORMAT");

    expect(result.recommendations.length).toBeGreaterThanOrEqual(3);
    expect(result.isAdvisoryOnly).toBe(true);
  });

  it("evaluates decomposed modules with high cohesion and KEEP verdicts", () => {
    const domainPath = join(baseDir, "domain/invoice.ts");
    const repoPath = join(baseDir, "repository/invoice-repository.ts");
    const formatterPath = join(baseDir, "formatter/invoice-formatter.ts");
    const controllerPath = join(baseDir, "controller/invoice-controller.ts");

    const domainEval = evaluateFileCohesion(domainPath);
    expect(domainEval.verdict).toBe("KEEP");
    expect(domainEval.cohesionScore).toBeGreaterThanOrEqual(0.67);

    const repoEval = evaluateFileCohesion(repoPath);
    expect(repoEval.verdict).toBe("KEEP");
    expect(repoEval.cohesionScore).toBeGreaterThanOrEqual(0.67);

    const formatterEval = evaluateFileCohesion(formatterPath);
    expect(formatterEval.verdict).toBe("KEEP");
    expect(formatterEval.cohesionScore).toBeGreaterThanOrEqual(0.67);

    const controllerEval = evaluateFileCohesion(controllerPath);
    expect(controllerEval.verdict).toBe("KEEP");
  });

  it("proves exact functional parity between GodInvoiceService and decomposed architecture", async () => {
    const testRequest: HttpRequest = {
      headers: { "content-type": "application/json" },
      body: {
        customerId: "cust_999",
        items: [
          { description: "Design Pattern Guide", priceCents: 3000, quantity: 2 },
          { description: "Consulting Hour", priceCents: 20000, quantity: 1 },
        ],
        taxExempt: false,
      },
    };

    // 1. Run God Service
    const godService = new GodInvoiceService();
    const godRes = await godService.handleCreateInvoiceHttpRequest(testRequest);
    const godBody = JSON.parse(godRes.body);

    // 2. Run Cohesive Controller + Repository
    const repo = new InMemoryInvoiceRepository();
    const controller = new InvoiceController(repo);
    const cleanRes = await controller.createInvoiceHandler(testRequest);
    const cleanBody = JSON.parse(cleanRes.body);

    expect(godRes.statusCode).toBe(201);
    expect(cleanRes.statusCode).toBe(201);
    expect(godBody.totalCents).toBe(cleanBody.totalCents);
    expect(cleanBody.totalCents).toBe(28145); // (6000 + 20000) * 1.0825 = 26000 + 2145 = 28145

    // Verify persisted record in clean repo
    const saved = await repo.findById(cleanBody.invoiceId);
    expect(saved).not.toBeNull();
    expect(saved?.customerId).toBe("cust_999");
  });

  it("validates domain invariants and business calculation rules", () => {
    const items = [
      { description: "Widget A", priceCents: 1000, quantity: 3 },
    ];

    const standard = calculateInvoiceTotals(items, false);
    expect(standard.subtotalCents).toBe(3000);
    expect(standard.taxCents).toBe(248); // 3000 * 0.0825 = 247.5 -> 248
    expect(standard.totalCents).toBe(3248);

    const exempt = calculateInvoiceTotals(items, true);
    expect(exempt.taxCents).toBe(0);
    expect(exempt.totalCents).toBe(3000);

    expect(() => calculateInvoiceTotals([{ description: "Bad", priceCents: -10, quantity: 1 }])).toThrow("Item price cannot be negative");
    expect(() => calculateInvoiceTotals([{ description: "Bad", priceCents: 10, quantity: 0 }])).toThrow("Item quantity must be positive");
    expect(() => createInvoice("inv-1", "", items)).toThrow("Customer ID is required");
  });
});
