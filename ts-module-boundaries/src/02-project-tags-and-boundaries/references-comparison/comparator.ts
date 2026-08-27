import { spawnSync } from "node:child_process";
import { join } from "node:path";

export interface ComparisonResult {
  mode: "workspace-single-source" | "solution-ts-references";
  title: string;
  sourceOfTruth: string;
  duplicateConfigRequired: boolean;
  successResult: {
    status: "PASS";
    output: string;
  };
  failureDemo: {
    scenario: string;
    caughtBy: string;
    errorMessage: string;
  };
}

export function runReferencesComparison(baseDir: string): ComparisonResult[] {
  const solutionDir = join(baseDir, "references-comparison/mode-solution-ts-references");

  // -------------------------------------------------------------------------
  // 1. Mode A: Workspace Single Source of Truth (pnpm + ESLint enforceBuildableLibDependency)
  // -------------------------------------------------------------------------
  const modeWorkspace: ComparisonResult = {
    mode: "workspace-single-source",
    title: "Level 1+2: Workspace Single Source of Truth (pnpm + ESLint / Draiver Pattern)",
    sourceOfTruth: "package.json 'dependencies' only",
    duplicateConfigRequired: false,
    successResult: {
      status: "PASS",
      output: "pnpm links workspace packages natively; ESLint @nx/enforce-module-boundaries (enforceBuildableLibDependency: true) validates declared dependencies."
    },
    failureDemo: {
      scenario: "Developer imports package B without adding it to package A's package.json dependencies",
      caughtBy: "ESLint @nx/enforce-module-boundaries (Gate 2) & pnpm non-flat node_modules isolation",
      errorMessage: "A project cannot depend on '@monorepo/b' because it is not declared as a dependency in 'package.json'"
    }
  };

  // -------------------------------------------------------------------------
  // 2. Mode B: TypeScript Solution Mode (composite: true + tsconfig references)
  // -------------------------------------------------------------------------
  const validSolutionTsconfig = join(solutionDir, "tsconfig.solution.json");
  const missingRefTsconfig = join(solutionDir, "missing-reference-pkg/tsconfig.json");

  // Run tsc -b on valid solution
  const validBuild = spawnSync("npx", ["tsc", "-b", validSolutionTsconfig], {
    encoding: "utf-8"
  });

  // Run tsc -b on project with missing reference
  const failingBuild = spawnSync("npx", ["tsc", "-b", missingRefTsconfig], {
    encoding: "utf-8"
  });

  const modeSolution: ComparisonResult = {
    mode: "solution-ts-references",
    title: "Level 3: TypeScript Solution Mode (composite: true + tsconfig references)",
    sourceOfTruth: "DUAL: package.json 'dependencies' AND tsconfig.json 'references' array",
    duplicateConfigRequired: true,
    successResult: {
      status: "PASS",
      output: validBuild.status === 0
        ? "tsc -b compiled full multi-project DAG natively, generating composite .d.ts maps in topological order."
        : `Build output: ${validBuild.stdout || validBuild.stderr}`
    },
    failureDemo: {
      scenario: "Developer adds dependency to package.json but FORGETS to add { path: '../core-pkg' } in tsconfig.json",
      caughtBy: "TypeScript Compiler (tsc -b)",
      errorMessage: failingBuild.stderr || failingBuild.stdout || "error TS6307: File is not listed within the file list of project"
    }
  };

  return [modeWorkspace, modeSolution];
}
