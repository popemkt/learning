import { describe, expect, it } from "bun:test";
import { join } from "node:path";
import { scanFileMetrics } from "../src/04-complexity-metrics/metric-scanner.js";
import {
  calculateTangledDiscount,
  createUserWithBloatedParameters,
  parseNestedCustomerEmail,
} from "../src/04-complexity-metrics/complex-samples.js";
import {
  calculateCleanDiscount,
  createCleanUser,
  parseCleanCustomerEmail,
} from "../src/04-complexity-metrics/clean-samples.js";

describe("Concept 4: Complexity Metrics & Warn-Only Philosophy", () => {
  const baseDir = join(
    import.meta.dir,
    "../src/04-complexity-metrics"
  );

  it("detects cyclomatic complexity violations in branchy code", () => {
    const complexPath = join(baseDir, "complex-samples.ts");
    const result = scanFileMetrics(complexPath);

    const discountReport = result.functionReports.find(
      f => f.functionName === "calculateTangledDiscount"
    );
    expect(discountReport).toBeDefined();
    expect(discountReport!.cyclomaticComplexity).toBeGreaterThan(5);
    expect(discountReport!.warnings.some(w => w.includes("complexity"))).toBe(true);
    expect(discountReport!.isCompliant).toBe(false);
  });

  it("detects deep nesting violations in deeply nested conditionals", () => {
    const complexPath = join(baseDir, "complex-samples.ts");
    const result = scanFileMetrics(complexPath);

    const nestingReport = result.functionReports.find(
      f => f.functionName === "parseNestedCustomerEmail"
    );
    expect(nestingReport).toBeDefined();
    expect(nestingReport!.maxDepth).toBeGreaterThan(3);
    expect(nestingReport!.warnings.some(w => w.includes("max-depth"))).toBe(true);
  });

  it("detects parameter bloat in functions with excessive positional arguments", () => {
    const complexPath = join(baseDir, "complex-samples.ts");
    const result = scanFileMetrics(complexPath);

    const paramsReport = result.functionReports.find(
      f => f.functionName === "createUserWithBloatedParameters"
    );
    expect(paramsReport).toBeDefined();
    expect(paramsReport!.parameterCount).toBeGreaterThan(3);
    expect(paramsReport!.warnings.some(w => w.includes("max-params"))).toBe(true);
  });

  it("enforces warn-only philosophy with exit code 0 despite warnings", () => {
    const complexPath = join(baseDir, "complex-samples.ts");
    const result = scanFileMetrics(complexPath);

    expect(result.totalWarnings).toBeGreaterThan(0);
    expect(result.exitCode).toBe(0);
  });

  it("verifies clean refactored alternatives pass all metric checks with 0 warnings", () => {
    const cleanPath = join(baseDir, "clean-samples.ts");
    const result = scanFileMetrics(cleanPath);

    expect(result.totalWarnings).toBe(0);
    for (const fn of result.functionReports) {
      expect(fn.cyclomaticComplexity).toBeLessThanOrEqual(5);
      expect(fn.maxDepth).toBeLessThanOrEqual(3);
      expect(fn.parameterCount).toBeLessThanOrEqual(3);
      expect(fn.isCompliant).toBe(true);
    }
  });

  it("ensures runtime execution parity between complex and clean functions", () => {
    // Discount parity
    const complexDiscount = calculateTangledDiscount(600, "platinum", null, 0, false);
    const cleanDiscount = calculateCleanDiscount(600, "platinum");
    expect(complexDiscount).toBe(0.25);
    expect(cleanDiscount).toBe(0.25);

    // Email extraction parity
    const data = { profile: { personal: { contact: { email: "Dev@Test.org", isEmailVerified: true } } } };
    expect(parseNestedCustomerEmail(data)).toBe("dev@test.org");
    expect(parseCleanCustomerEmail(data)).toBe("dev@test.org");

    // Options construction
    const user = createCleanUser({ id: "1", email: "a@b.com", firstName: "Alice", lastName: "Smith" });
    expect(user.fullName).toBe("Alice Smith");
    expect(user.isActive).toBe(true);
  });
});
