import { describe, expect, it } from "bun:test";
import { NxWorkspaceGraph } from "../src/02-nx/nx-task-graph.ts";
import { NxModuleBoundaryValidator } from "../src/02-nx/boundary-enforcer.ts";

describe("Lesson 2: Nx Task Graph, Caching & Module Boundaries", () => {
  it("executes tasks in topological order and populates computation cache", () => {
    const graph = new NxWorkspaceGraph({
      build: { dependsOn: ["^build"], cache: true },
    });

    graph.addProject({
      name: "domain",
      path: "libs/domain",
      dependencies: [],
      tags: ["scope:shared"],
      files: { "src/index.ts": "v1" },
    });

    graph.addProject({
      name: "app",
      path: "apps/app",
      dependencies: ["domain"],
      tags: ["scope:app"],
      files: { "src/main.ts": "v1" },
    });

    // Cold run
    const cold = graph.runMany("build");
    expect(cold.results.length).toBe(2);
    expect(cold.results[0].project).toBe("domain"); // Topological order: domain first!
    expect(cold.results[1].project).toBe("app");
    expect(cold.results[0].status).toBe("executed");

    // Warm run: instant cache hit
    // ✅ ATTENTION: Computation cache hits return in 0ms
    const warm = graph.runMany("build");
    expect(warm.results[0].status).toBe("cache_hit");
    expect(warm.results[1].status).toBe("cache_hit");
    expect(warm.totalTimeMs).toBe(0);
  });

  it("calculates affected projects correctly across reverse dependency graph", () => {
    const graph = new NxWorkspaceGraph({});

    graph.addProject({
      name: "leaf-domain",
      path: "libs/domain",
      dependencies: [],
      tags: [],
      files: {},
    });

    graph.addProject({
      name: "swimlane-a",
      path: "libs/swimlanes/a",
      dependencies: ["leaf-domain"],
      tags: [],
      files: {},
    });

    graph.addProject({
      name: "swimlane-b",
      path: "libs/swimlanes/b",
      dependencies: [],
      tags: [],
      files: {},
    });

    graph.addProject({
      name: "api",
      path: "apps/api",
      dependencies: ["swimlane-a"],
      tags: [],
      files: {},
    });

    // When leaf-domain changes, swimlane-a and api are affected, but swimlane-b is untouched
    const affected = graph.getAffectedProjects(["libs/domain/src/index.ts"]);
    expect(affected.affectedProjects).toContain("leaf-domain");
    expect(affected.affectedProjects).toContain("swimlane-a");
    expect(affected.affectedProjects).toContain("api");
    expect(affected.affectedProjects).not.toContain("swimlane-b");
  });

  it("enforces module boundary rules on scope and layer axes", () => {
    const validator = new NxModuleBoundaryValidator();

    validator.registerProject("domain", ["scope:shared", "layer:domain"]);
    validator.registerProject("atlas", ["scope:swimlane", "layer:application"]);
    validator.registerProject("forge", ["scope:swimlane", "layer:application"]);
    validator.registerProject("database", ["scope:shared", "layer:infrastructure"]);

    // 1. Legal import: swimlane -> shared domain
    expect(validator.validateImport("atlas", "domain")).toBeNull();

    // 2. Illegal import: sibling swimlane (atlas -> forge)
    // ⚠️ CRITICAL: Swimlanes may not import each other directly
    const siblingViolation = validator.validateImport("atlas", "forge");
    expect(siblingViolation).not.toBeNull();
    expect(siblingViolation?.violatedRule).toContain("scope:swimlane -> scope:swimlane");

    // 3. Illegal layer inversion: domain -> database
    // 🔒 COMPILE-TIME: Pure domain layer cannot depend on infrastructure
    const layerViolation = validator.validateImport("domain", "database");
    expect(layerViolation).not.toBeNull();
    expect(layerViolation?.violatedRule).toContain("layer:domain -> layer:infrastructure");
  });
});
