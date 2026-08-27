import { describe, expect, it } from "bun:test";
import { createRequire } from "node:module";
import { join } from "node:path";
import {
  checkBarrelHygiene,
  checkConditionalExports,
  checkPackageSurface
} from "../src/01-package-exports/surface-guard.js";
import { publicGuardedApi } from "../src/01-package-exports/lib-guarded/src/index.js";
import { formatPublicMessage } from "../src/01-package-exports/lib-guarded/src/utilities.js";
import * as leakyBarrel from "../src/01-package-exports/barrel-hygiene/leaky-barrel/index.js";
import * as curatedBarrel from "../src/01-package-exports/barrel-hygiene/curated-barrel/index.js";
import { initializeDualEngine, DUAL_PACKAGE_VERSION } from "../src/01-package-exports/conditional-exports/dual-package/src/index.js";

const require = createRequire(import.meta.url);

describe("Concept 1: Package exports map & Export Hygiene", () => {
  const baseDir = join(import.meta.dir, "../src/01-package-exports");

  describe("1. Package Encapsulation & Surface Guard", () => {
    it("identifies missing exports map as unsafe (lib-open)", () => {
      const report = checkPackageSurface(join(baseDir, "lib-open"));
      expect(report.hasExportsMap).toBe(false);
      expect(report.isSafe).toBe(false);
      expect(report.diagnostics[0]).toContain("MISSING_EXPORTS_MAP");
    });

    it("verifies safe and guarded exports map (lib-guarded)", () => {
      const report = checkPackageSurface(join(baseDir, "lib-guarded"));
      expect(report.hasExportsMap).toBe(true);
      expect(report.hasWildcardLeak).toBe(false);
      expect(report.hasBarrelWildcardLeak).toBe(false);
      expect(report.exportedSubpaths).toContain(".");
      expect(report.exportedSubpaths).toContain("./utilities");
      expect(report.isSafe).toBe(true);
      expect(report.internalFilesHidden.length).toBeGreaterThan(0);
    });

    it("allows importing public symbols from guarded package", () => {
      expect(publicGuardedApi).toBe("GuardedLib: Secure public feature ready!");
      expect(formatPublicMessage("test")).toBe("[PUBLIC FORMATTER]: TEST");
    });

    it("rejects unexported private subpaths with runtime error when imported dynamically", async () => {
      let threwError = false;
      try {
        await import("example-guarded-lib/src/internal/secret.ts");
      } catch (err: unknown) {
        threwError = true;
        const error = err as { code?: string; message: string };
        expect(error).toBeDefined();
        expect(error.message).toBeTruthy();
      }
      expect(threwError).toBe(true);
    });
  });

  describe("2. Barrel Hygiene & Wildcard Re-Export Audits", () => {
    const leakyBarrelPath = join(baseDir, "barrel-hygiene/leaky-barrel/index.ts");
    const curatedBarrelPath = join(baseDir, "barrel-hygiene/curated-barrel/index.ts");

    it("detects and flags wildcard export leak in leaky-barrel", () => {
      const result = checkBarrelHygiene(leakyBarrelPath);
      expect(result.hasWildcardExport).toBe(true);
      expect(result.isCompliant).toBe(false);
      expect(result.wildcardExports.length).toBe(1);
      expect(result.wildcardExports[0]).toContain('export * from "./internal-details.js"');
      expect(result.diagnostics[0]).toContain("WILDCARD_BARREL_EXPORT");
    });

    it("demonstrates accidental private symbol pollution at runtime from leaky barrel", () => {
      // In leaky barrel, export * blindly exposed private helpers and keys
      const leaky = leakyBarrel as Record<string, unknown>;
      expect(leaky.PublicService).toBeDefined();
      expect(leaky._secretHasher).toBeDefined();
      expect(typeof leaky._secretHasher).toBe("function");
      expect(leaky.INTERNAL_SECRET_KEY).toBe("DEV_SYS_KEY_PRIVATE_9981");
      expect(typeof leaky.internalDbConnection).toBe("function");
    });

    it("verifies curated barrel passes hygiene check with explicit named exports", () => {
      const result = checkBarrelHygiene(curatedBarrelPath);
      expect(result.hasWildcardExport).toBe(false);
      expect(result.isCompliant).toBe(true);
      expect(result.valueExports).toEqual(["PublicService"]);
      expect(result.typeExports).toEqual(["UserDTO"]);
      expect(result.diagnostics[0]).toContain("OK: Barrel");
    });

    it("verifies private symbols are encapsulated and NOT exposed in curated barrel", () => {
      const curated = curatedBarrel as Record<string, unknown>;
      expect(curated.PublicService).toBeDefined();
      const serviceInstance = new curatedBarrel.PublicService();
      expect(serviceInstance.execute("sample")).toContain("[PublicService] Processed: sample");

      // Internal secrets are strictly encapsulated
      expect(curated._secretHasher).toBeUndefined();
      expect(curated.INTERNAL_SECRET_KEY).toBeUndefined();
      expect(curated.internalDbConnection).toBeUndefined();
    });

    it("demonstrates type export erasure for explicit type-only exports", () => {
      const curated = curatedBarrel as Record<string, unknown>;
      // UserDTO is declared as `export type { UserDTO }` so it is erased at runtime in JS
      expect(curated.UserDTO).toBeUndefined();

      const result = checkBarrelHygiene(curatedBarrelPath);
      const userDtoExport = result.explicitExports.find(e => e.name === "UserDTO");
      expect(userDtoExport).toBeDefined();
      expect(userDtoExport?.isTypeOnly).toBe(true);
    });
  });

  describe("3. Conditional Exports & Condition Ordering", () => {
    const dualPackageDir = join(baseDir, "conditional-exports/dual-package");
    const misorderedPackageDir = join(baseDir, "conditional-exports/misordered-package");

    it("validates dual-package conditional exports with 'types' prioritized first", () => {
      const report = checkConditionalExports(dualPackageDir);
      expect(report.isConditional).toBe(true);
      expect(report.allTypesFirst).toBe(true);
      expect(report.isCompliant).toBe(true);
      expect(report.missingTargets).toHaveLength(0);

      const rootSubpath = report.subpaths.find(s => s.subpath === ".");
      expect(rootSubpath).toBeDefined();
      expect(rootSubpath?.conditions).toEqual(["types", "import", "require"]);
      expect(rootSubpath?.isTypesFirst).toBe(true);
      expect(rootSubpath?.typesTarget).toBe("./src/index.d.ts");
      expect(rootSubpath?.importTarget).toBe("./src/index.ts");
      expect(rootSubpath?.requireTarget).toBe("./dist/index.cjs");
    });

    it("detects invalid condition ordering when 'import' precedes 'types'", () => {
      const report = checkConditionalExports(misorderedPackageDir);
      expect(report.isConditional).toBe(true);
      expect(report.allTypesFirst).toBe(false);
      expect(report.isCompliant).toBe(false);
      expect(report.diagnostics.some(d => d.includes("INVALID_CONDITION_ORDER"))).toBe(true);
      expect(report.diagnostics.some(d => d.includes("Condition 'types' must precede 'import' and 'require'"))).toBe(true);
    });

    it("demonstrates dual ESM and CommonJS module execution", () => {
      // 1. ESM resolution
      expect(DUAL_PACKAGE_VERSION).toBe("2.4.0");
      const esmStatus = initializeDualEngine({ mode: "esm" });
      expect(esmStatus.format).toBe("ESM");
      expect(esmStatus.runtime).toContain("ESM");

      // 2. CommonJS resolution via require
      const cjsPath = join(dualPackageDir, "dist/index.cjs");
      const cjsModule = require(cjsPath);
      expect(cjsModule.DUAL_PACKAGE_VERSION).toBe("2.4.0");
      const cjsStatus = cjsModule.initializeDualEngine({ mode: "cjs" });
      expect(cjsStatus.format).toBe("CommonJS");
      expect(cjsStatus.runtime).toContain("CommonJS");
    });
  });
});
