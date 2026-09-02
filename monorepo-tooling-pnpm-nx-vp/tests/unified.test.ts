import { describe, expect, it } from "bun:test";
import { UnifiedMonorepoEngine } from "../src/04-unified/unified-orchestrator.ts";
import { DRAIVER_AUDIT_FINDINGS, getDraiverBeforeAfterConfig } from "../src/04-unified/draiver-case-study.ts";

describe("Lesson 4: Unified Architecture & Draiver Case Study", () => {
  it("executes unified pipeline cleanly across all 3 layers with zero conflicts", () => {
    const engine = new UnifiedMonorepoEngine({
      catalog: {
        zod: "^4.4.3",
        typescript: "~6.0.2",
      },
      projects: [
        {
          manifest: { name: "domain", version: "1.0.0", dependencies: { zod: "catalog:" } },
          path: "libs/domain",
          tags: ["scope:shared", "layer:domain"],
          files: { "src/index.ts": "v1" },
        },
        {
          manifest: { name: "api", version: "1.0.0", dependencies: { domain: "workspace:*" } },
          path: "apps/api",
          tags: ["scope:app", "layer:app"],
          files: { "src/main.ts": "v1" },
        },
      ],
    });

    const reports = engine.executeFullPipeline();
    expect(reports.length).toBe(5);

    // ✅ ATTENTION: Each phase uses its designated specialized tool
    expect(reports.find((r) => r.phase === "install")?.toolUsed).toBe("pnpm");
    expect(reports.find((r) => r.phase === "boundary_lint")?.toolUsed).toBe("eslint_nx");
    expect(reports.find((r) => r.phase === "code_quality_lint")?.toolUsed).toBe("vp_oxlint");
    expect(reports.find((r) => r.phase === "build")?.toolUsed).toBe("nx");
    expect(reports.find((r) => r.phase === "test")?.toolUsed).toBe("nx");

    // All phases pass
    for (const r of reports) {
      expect(r.status).toBe("PASS");
    }
  });

  it("validates Draiver audit recommendations and before/after config diffs", () => {
    expect(DRAIVER_AUDIT_FINDINGS.length).toBeGreaterThan(3);

    const taskOrchAudit = DRAIVER_AUDIT_FINDINGS.find((a) => a.area.includes("Task Orchestration"));
    expect(taskOrchAudit).toBeDefined();
    expect(taskOrchAudit?.primaryTool).toBe("nx");

    const diffs = getDraiverBeforeAfterConfig();
    expect(diffs.rootPackageJsonAfter).toContain('"build": "nx run-many -t build"');
    expect(diffs.rootPackageJsonAfter).toContain('"test": "nx run-many -t test && pnpm run harness:check"');
    expect(diffs.subPackageJsonAfter).not.toContain("pnpm run build &&");
  });
});
