import { describe, expect, it } from "bun:test";
import { join } from "node:path";
import {
  DEFAULT_DEP_CONSTRAINTS,
  checkModuleBoundaries,
  loadMonorepoPackages,
} from "../src/02-project-tags-and-boundaries/boundary-engine.js";
import { InMemoryUserRepository } from "../src/02-project-tags-and-boundaries/packages/infrastructure/src/index.js";
import { DefaultUserUseCase } from "../src/02-project-tags-and-boundaries/packages/application/src/index.js";
import { BillingManager } from "../src/02-project-tags-and-boundaries/packages/feature-billing/src/index.js";
import { AnalyticsTracker } from "../src/02-project-tags-and-boundaries/packages/feature-analytics/src/index.js";
import type { User } from "../src/02-project-tags-and-boundaries/packages/domain/src/index.js";

describe("Concept 2: Project Tags & Module Boundaries", () => {
  const packagesDir = join(
    import.meta.dir,
    "../src/02-project-tags-and-boundaries/packages"
  );
  const projects = loadMonorepoPackages(packagesDir);

  it("loads all 5 monorepo packages with their respective tags", () => {
    expect(projects.size).toBe(5);

    const domain = projects.get("@monorepo/domain");
    expect(domain).toBeDefined();
    expect(domain?.tags).toContain("layer:domain");
    expect(domain?.tags).toContain("scope:shared");

    const app = projects.get("@monorepo/application");
    expect(app?.tags).toContain("layer:application");

    const infra = projects.get("@monorepo/infrastructure");
    expect(infra?.tags).toContain("layer:infrastructure");

    const billing = projects.get("@monorepo/feature-billing");
    expect(billing?.tags).toContain("layer:feature");
    expect(billing?.tags).toContain("scope:billing");

    const analytics = projects.get("@monorepo/feature-analytics");
    expect(analytics?.tags).toContain("layer:feature");
    expect(analytics?.tags).toContain("scope:analytics");
  });

  it("allows compliant Clean Architecture dependencies", () => {
    const validEdges = [
      { from: "@monorepo/application", to: "@monorepo/domain" },
      { from: "@monorepo/infrastructure", to: "@monorepo/application" },
      { from: "@monorepo/infrastructure", to: "@monorepo/domain" },
      { from: "@monorepo/feature-billing", to: "@monorepo/application" },
      { from: "@monorepo/feature-billing", to: "@monorepo/domain" },
      { from: "@monorepo/feature-analytics", to: "@monorepo/domain" },
    ];

    const result = checkModuleBoundaries(projects, validEdges, DEFAULT_DEP_CONSTRAINTS);
    expect(result.isValid).toBe(true);
    expect(result.violations.length).toBe(0);
    expect(result.checkedEdgesCount).toBe(6);
  });

  it("blocks layer inversions (e.g. Domain depending on Infrastructure)", () => {
    const invalidEdges = [
      { from: "@monorepo/domain", to: "@monorepo/infrastructure" },
    ];

    const result = checkModuleBoundaries(projects, invalidEdges, DEFAULT_DEP_CONSTRAINTS);
    expect(result.isValid).toBe(false);
    expect(result.violations.length).toBe(1);
    expect(result.violations[0].sourceProject).toBe("@monorepo/domain");
    expect(result.violations[0].targetProject).toBe("@monorepo/infrastructure");
    expect(result.violations[0].reason).toContain("NOT allowed to depend on");
  });

  it("blocks scope crossings between independent features", () => {
    const crossScopeEdges = [
      { from: "@monorepo/feature-billing", to: "@monorepo/feature-analytics" },
    ];

    const result = checkModuleBoundaries(projects, crossScopeEdges, DEFAULT_DEP_CONSTRAINTS);
    expect(result.isValid).toBe(false);
    expect(result.violations.length).toBe(1);
    expect(result.violations[0].sourceTag).toBe("scope:billing");
  });

  it("executes runtime implementations across bounded packages", async () => {
    const initialUser: User = { id: "u-101", email: "alex@example.com", tier: "free" };
    const repo = new InMemoryUserRepository([initialUser]);
    const appUseCase = new DefaultUserUseCase(repo);
    const billingManager = new BillingManager(repo);
    const analytics = new AnalyticsTracker();

    // 1. Process upgrade
    const invoice = await billingManager.billForTierUpgrade("u-101", "pro");
    expect(invoice.amountCents).toBe(2900);
    expect(invoice.status).toBe("paid");

    // 2. Query updated user via application layer
    const updatedUser = await appUseCase.processUpgrade("u-101", "enterprise");
    expect(updatedUser.tier).toBe("enterprise");

    // 3. Track event
    const event = analytics.trackUserAction(updatedUser, "tier_upgraded", { newTier: "enterprise" });
    expect(event.eventName).toBe("tier_upgraded");
    expect(analytics.getEventsForUser("u-101").length).toBe(1);
  });
});
