import { describe, expect, it } from "bun:test";
import { join } from "node:path";
import { scanDirectoryForCycles } from "../src/03-dependency-cruiser-cycles/cycle-detector.js";
import { getRuntimeCycleSnapshot } from "../src/03-dependency-cruiser-cycles/circular-basic/a.js";
import { getFeatureSummary } from "../src/03-dependency-cruiser-cycles/circular-barrel/feature.js";
import { computeLegacyA } from "../src/03-dependency-cruiser-cycles/circular-legacy/legacy-service-a.js";
import { formatServiceAMessage, formatServiceBMessage } from "../src/03-dependency-cruiser-cycles/clean/index.js";

describe("Concept 3: Dependency Cruiser & Cycles", () => {
  const baseDir = join(
    import.meta.dir,
    "../src/03-dependency-cruiser-cycles"
  );

  it("detects direct circular dependency between a.ts and b.ts", () => {
    const basicDir = join(baseDir, "circular-basic");
    const result = scanDirectoryForCycles(basicDir);

    expect(result.detectedCycles.length).toBeGreaterThan(0);
    const cycle = result.detectedCycles[0];
    expect(cycle.formattedChain).toContain("a.ts");
    expect(cycle.formattedChain).toContain("b.ts");
    expect(cycle.ruleName).toBe("no-circular");
    expect(cycle.severity).toBe("error");

    // Runtime behavior check
    const snapshot = getRuntimeCycleSnapshot();
    expect(snapshot.aName).toBe("ModuleA");
    expect(snapshot.bValue).toContain("ModuleB");
  });

  it("detects hidden barrel file re-export cycles", () => {
    const barrelDir = join(baseDir, "circular-barrel");
    const result = scanDirectoryForCycles(barrelDir);

    expect(result.detectedCycles.length).toBeGreaterThan(0);
    const cycle = result.detectedCycles[0];
    expect(cycle.formattedChain).toContain("feature.ts");
    expect(cycle.formattedChain).toContain("index.ts");
    expect(cycle.formattedChain).toContain("helper.ts");

    // Runtime call succeeds but is structurally fragile
    const summary = getFeatureSummary();
    expect(summary).toBe("Feature Summary: [LABEL: FEAT_CORE_100]");
  });

  it("freezes legacy cycles with baseline exceptions", () => {
    const legacyDir = join(baseDir, "circular-legacy");
    const scanWithoutBaseline = scanDirectoryForCycles(legacyDir);
    expect(scanWithoutBaseline.activeErrorsCount).toBe(1);
    expect(scanWithoutBaseline.isCompliant).toBe(false);

    const scanWithBaseline = scanDirectoryForCycles(legacyDir, {
      legacyExceptionPattern: /circular-legacy/,
    });
    expect(scanWithBaseline.activeErrorsCount).toBe(0);
    expect(scanWithBaseline.frozenLegacyCount).toBe(1);
    expect(scanWithBaseline.isCompliant).toBe(true);

    // Legacy calculation executes
    expect(computeLegacyA(3)).toBeGreaterThan(0);
  });

  it("validates that clean architecture modules have zero cycles", () => {
    const cleanDir = join(baseDir, "clean");
    const result = scanDirectoryForCycles(cleanDir);

    expect(result.detectedCycles.length).toBe(0);
    expect(result.activeErrorsCount).toBe(0);
    expect(result.isCompliant).toBe(true);

    expect(formatServiceAMessage()).toContain("acyclic-app");
    expect(formatServiceBMessage()).toContain("acyclic-app");
  });
});
