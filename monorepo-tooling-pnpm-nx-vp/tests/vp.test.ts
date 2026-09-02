import { describe, expect, it } from "bun:test";
import { VpToolchainEngine } from "../src/03-vp/vp-toolchain.ts";

describe("Lesson 3: Vite-Plus (vp) Toolchain Engine", () => {
  it("formats code with Oxfmt speed and detects whitespace adjustments", () => {
    const vp = new VpToolchainEngine();
    // ✅ ATTENTION: Fast formatting check
    const cleanResult = vp.formatFile("src/index.ts", "const a = 1;\n");
    expect(cleanResult.changed).toBe(false);

    const dirtyResult = vp.formatFile("src/index.ts", "const a = 1; ; \n");
    expect(dirtyResult.changed).toBe(true);
    expect(dirtyResult.formattedDurationMs).toBeLessThan(5);
  });

  it("evaluates file length and complexity sensors via Oxlint", () => {
    const vp = new VpToolchainEngine();

    // Small clean file -> 0 warnings
    const cleanReport = vp.lintFile("src/clean.ts", 150, 5);
    expect(cleanReport.warnings.length).toBe(0);
    expect(cleanReport.exitCode).toBe(0);

    // Large god-file -> triggers max-lines and complexity warning
    // ⚠️ CRITICAL: Cohesion sensors warn developers before bloat worsens
    const bloatedReport = vp.lintFile("src/god-file.ts", 1200, 35);
    expect(bloatedReport.warnings.length).toBe(2);
    expect(bloatedReport.warnings.some((w) => w.rule === "max-lines")).toBe(true);
    expect(bloatedReport.warnings.some((w) => w.rule === "complexity")).toBe(true);
  });

  it("compares test execution strategies showing advantages of direct TS execution", () => {
    const vp = new VpToolchainEngine();
    const comparison = vp.compareTestStrategies(50, 15000);

    // 🔒 COMPILE-TIME: Direct TS avoids dist/ compilation step entirely
    expect(comparison.directTsStrategy.staleOrphanRisk).toBe(false);
    expect(comparison.compiledDistStrategy.staleOrphanRisk).toBe(true);
    expect(comparison.directTsStrategy.durationMs).toBeLessThan(comparison.compiledDistStrategy.durationMs);
  });
});
