import { describe, expect, it } from "bun:test";
import { PnpmWorkspaceEngine, simulateTaskExecution } from "../src/01-pnpm/pnpm-mechanics.ts";

describe("Lesson 1: PNPM Mechanics & Workspace Resolution", () => {
  it("resolves catalog dependencies accurately", () => {
    // ✅ ATTENTION: Catalog serves as central version manifest
    const engine = new PnpmWorkspaceEngine({
      zod: "^4.4.3",
      "@nestjs/core": "^11.1.9",
    });

    engine.registerPackage({
      name: "test-lib",
      version: "1.0.0",
      dependencies: {
        zod: "catalog:",
      },
    });

    const resolved = engine.resolvePackage("test-lib");
    expect(resolved.resolvedDependencies["zod"]).toBeDefined();
    expect(resolved.resolvedDependencies["zod"].version).toBe("^4.4.3");
    expect(resolved.resolvedDependencies["zod"].source).toBe("catalog");
  });

  it("throws when package uses undeclared catalog entry", () => {
    const engine = new PnpmWorkspaceEngine({
      zod: "^4.4.3",
    });

    engine.registerPackage({
      name: "broken-lib",
      version: "1.0.0",
      dependencies: {
        missingDep: "catalog:",
      },
    });

    // ⚠️ CRITICAL: Strict failure on missing catalog keys
    expect(() => engine.resolvePackage("broken-lib")).toThrow(
      'Dependency "missingDep" uses "catalog:" but is not declared in root catalog'
    );
  });

  it("resolves workspace:* internal packages", () => {
    const engine = new PnpmWorkspaceEngine({});

    engine.registerPackage({
      name: "core-domain",
      version: "2.1.0",
    });

    engine.registerPackage({
      name: "api-app",
      version: "1.0.0",
      dependencies: {
        "core-domain": "workspace:*",
      },
    });

    const resolved = engine.resolvePackage("api-app");
    // 🔒 COMPILE-TIME: workspace:* resolves directly to sibling version
    expect(resolved.resolvedDependencies["core-domain"].version).toBe("2.1.0");
    expect(resolved.resolvedDependencies["core-domain"].isInternal).toBe(true);
  });

  it("prevents phantom dependencies under strict pnpm symlink layout", () => {
    const engine = new PnpmWorkspaceEngine({});

    engine.registerPackage({
      name: "shared-utils",
      version: "1.0.0",
      dependencies: { lodash: "^4.17.21" },
    });

    engine.registerPackage({
      name: "rogue-consumer",
      version: "1.0.0",
      dependencies: {}, // forgets to declare lodash!
    });

    // Flat layout resolves phantom dependencies unsafely
    const flatResult = engine.simulateModuleResolution("rogue-consumer", "lodash", { layout: "flat_npm_yarn" });
    expect(flatResult.isResolved).toBe(true);

    // 🔒 COMPILE-TIME / RUNTIME: pnpm strict isolation blocks phantom imports
    const pnpmResult = engine.simulateModuleResolution("rogue-consumer", "lodash", { layout: "strict_pnpm_symlinks" });
    expect(pnpmResult.isResolved).toBe(false);
  });

  it("demonstrates task execution advantage of Nx DAG over pnpm recursive", () => {
    const packages = [
      { name: "lib-a", buildTimeMs: 100, deps: [] },
      { name: "lib-b", buildTimeMs: 100, deps: ["lib-a"] },
    ];

    const pnpmRun = simulateTaskExecution(packages, "pnpm_recursive");
    expect(pnpmRun.cacheHits).toBe(0);
    expect(pnpmRun.totalDurationMs).toBe(200);

    const nxRun = simulateTaskExecution(packages, "nx_dag", new Set(["lib-a"]));
    expect(nxRun.cacheHits).toBe(1);
    expect(nxRun.totalDurationMs).toBe(100);
  });
});
