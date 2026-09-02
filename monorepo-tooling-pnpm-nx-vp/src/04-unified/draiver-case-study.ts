/**
 * Draiver Case Study & Unification Blueprint
 * Audits current state and outlines the exact clean cutover for /draiver
 */

export interface ToolOverlapAudit {
  readonly area: string;
  readonly currentState: string;
  readonly problem: string;
  readonly unifiedFix: string;
  readonly primaryTool: "pnpm" | "nx" | "vp";
}

export const DRAIVER_AUDIT_FINDINGS: ToolOverlapAudit[] = [
  {
    area: "Task Orchestration (Root)",
    currentState: 'Root mixes "nx run-many -t build" with "pnpm --workspace-concurrency=1 -r run test"',
    problem: "Dual orchestration creates two different execution paths; test runs bypass Nx caching and run sequentially",
    unifiedFix: 'Unify all task running under Nx: "test": "nx run-many -t test", "build": "nx run-many -t build"',
    primaryTool: "nx",
  },
  {
    area: "Sub-package Test Scripts",
    currentState: '"test": "pnpm run clean:dist && pnpm run build && node --test ..."',
    problem: "Packages self-rebuild during test, destroying Nx DAG benefits and doubling execution time",
    unifiedFix: 'Make package scripts atomic: "test": "node --test dist/**/*.spec.js" (let Nx handle ^build)',
    primaryTool: "nx",
  },
  {
    area: "Linter Duplication",
    currentState: '23x repeated "vp lint . -c ../../.oxlintrc.json" in package.json + separate ESLint boundaries',
    problem: "Developer confusion over why both exist and repetition of config path in every package.json",
    unifiedFix: "Formalize 2-tier linter: Nx targetDefault for 'lint' -> 'vp lint .', ESLint as dedicated boundary check",
    primaryTool: "vp",
  },
  {
    area: "Test Runner Fragmentation",
    currentState: "Studio uses 'vp test run' (direct TS); API & libs use 'tsc -> dist/ -> node --test'",
    problem: "Requires clean:dist everywhere on backend, risks stale dist orphans, and creates dual testing mental models",
    unifiedFix: "Align on direct TS test execution (e.g. vp test or tsx/node --test with loader) to eliminate dist/ compile steps",
    primaryTool: "vp",
  },
  {
    area: "Formatting & Git Hooks",
    currentState: ".githooks/pre-commit calls 'pnpm exec vp fmt --write'; root package.json has 'pnpm fmt'",
    problem: "Works well! vp fmt (Oxfmt) is the right tool for single-pass fast formatting",
    unifiedFix: "Keep vp fmt as universal formatter; add 'pnpm fmt:check' as an Nx-cached CI lint step",
    primaryTool: "vp",
  },
];

export function getDraiverBeforeAfterConfig() {
  return {
    rootPackageJsonBefore: `{
  "scripts": {
    "build": "pnpm run build:all",
    "build:all": "nx run-many -t build",
    "test": "pnpm run test:all",
    "test:all": "nx run-many -t typecheck && pnpm run test:unit && pnpm run lint && pnpm run harness:check",
    "test:unit": "pnpm --workspace-concurrency=1 --filter './libs/**' --filter './apps/**' -r run --if-present test",
    "typecheck": "nx run-many -t typecheck",
    "lint": "nx run-many -t lint && pnpm run lint:boundaries",
    "lint:boundaries": "eslint libs apps/draiver-api/src",
    "fmt": "vp fmt apps libs scripts --write"
  }
}`,
    rootPackageJsonAfter: `{
  "scripts": {
    "dev": "node scripts/run-dev-stack.mjs mocks",
    "build": "nx run-many -t build",
    "test": "nx run-many -t test && pnpm run harness:check",
    "typecheck": "nx run-many -t typecheck",
    "lint": "nx run-many -t lint && pnpm run lint:boundaries",
    "lint:boundaries": "eslint libs apps/draiver-api/src",
    "fmt": "vp fmt apps libs scripts --write",
    "fmt:check": "vp fmt apps libs scripts --check",
    "affected": "nx affected -t build,test,lint --base=origin/master"
  }
}`,
    subPackageJsonBefore: `{
  "name": "libs/draiver-domain",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "clean:dist": "node -e \\"require('node:fs').rmSync('dist',{recursive:true,force:true})\\"",
    "lint": "vp lint . -c ../../.oxlintrc.json",
    "test": "pnpm run clean:dist && pnpm run build && node --test \\"dist/**/*.spec.js\\""
  }
}`,
    subPackageJsonAfter: `{
  "name": "libs/draiver-domain",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "lint": "vp lint",
    "test": "node --test \\"dist/**/*.spec.js\\""
  }
}`,
  };
}
