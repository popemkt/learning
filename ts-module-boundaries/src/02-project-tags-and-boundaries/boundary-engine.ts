import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export interface ProjectMetadata {
  name: string;
  tags: string[];
  path: string;
  dependencies?: Record<string, string>;
}

export interface DependencyConstraint {
  sourceTag: string;
  onlyDependOnLibsWithTags: string[];
}

export interface BoundaryViolation {
  sourceProject: string;
  targetProject: string;
  sourceTag: string;
  targetTags: string[];
  allowedTags: string[];
  reason: string;
}

export interface BoundaryCheckResult {
  isValid: boolean;
  checkedEdgesCount: number;
  violations: BoundaryViolation[];
  summary: string;
}

/**
 * Standard Nx-style monorepo dependency constraints for Clean Architecture / Layering & Scope isolation:
 * - layer:domain -> only layer:domain
 * - layer:application -> only layer:application, layer:domain
 * - layer:infrastructure -> layer:infrastructure, layer:application, layer:domain
 * - layer:feature -> layer:feature, layer:application, layer:domain
 * - scope:billing -> scope:shared, scope:billing
 * - scope:analytics -> scope:shared, scope:analytics
 */
export const DEFAULT_DEP_CONSTRAINTS: DependencyConstraint[] = [
  // Layer boundaries (Clean Architecture)
  {
    sourceTag: "layer:domain",
    onlyDependOnLibsWithTags: ["layer:domain"],
  },
  {
    sourceTag: "layer:application",
    onlyDependOnLibsWithTags: ["layer:application", "layer:domain"],
  },
  {
    sourceTag: "layer:infrastructure",
    onlyDependOnLibsWithTags: ["layer:infrastructure", "layer:application", "layer:domain"],
  },
  {
    sourceTag: "layer:feature",
    onlyDependOnLibsWithTags: ["layer:feature", "layer:application", "layer:domain"],
  },
  // Scope boundaries (Swimlane / Domain boundaries)
  {
    sourceTag: "scope:billing",
    onlyDependOnLibsWithTags: ["scope:billing", "scope:shared"],
  },
  {
    sourceTag: "scope:analytics",
    onlyDependOnLibsWithTags: ["scope:analytics", "scope:shared"],
  },
  {
    sourceTag: "scope:shared",
    onlyDependOnLibsWithTags: ["scope:shared"],
  },
];

/**
 * Loads project metadata and Nx tags from a monorepo packages directory.
 */
export function loadMonorepoPackages(packagesDir: string): Map<string, ProjectMetadata> {
  const projects = new Map<string, ProjectMetadata>();

  if (!existsSync(packagesDir)) {
    return projects;
  }

  const entries = readdirSync(packagesDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const pkgJsonPath = join(packagesDir, entry.name, "package.json");
    if (!existsSync(pkgJsonPath)) continue;

    try {
      const raw = JSON.parse(readFileSync(pkgJsonPath, "utf-8"));
      const name = raw.name || entry.name;
      const tags: string[] = raw.nx?.tags ?? [];
      const dependencies = raw.dependencies;

      projects.set(name, {
        name,
        tags,
        path: join(packagesDir, entry.name),
        dependencies,
      });
    } catch {
      // ignore malformed package.json in discovery
    }
  }

  return projects;
}

/**
 * Validates a single dependency edge from source -> target against a set of constraints.
 */
export function validateDependencyEdge(
  source: ProjectMetadata,
  target: ProjectMetadata,
  constraints: DependencyConstraint[] = DEFAULT_DEP_CONSTRAINTS
): BoundaryViolation[] {
  const violations: BoundaryViolation[] = [];

  for (const constraint of constraints) {
    // If the source project possesses the sourceTag
    if (source.tags.includes(constraint.sourceTag)) {
      // Check if any target tag satisfies the allowed tags
      const hasAllowedTag = target.tags.some(tag => constraint.onlyDependOnLibsWithTags.includes(tag));

      if (!hasAllowedTag) {
        violations.push({
          sourceProject: source.name,
          targetProject: target.name,
          sourceTag: constraint.sourceTag,
          targetTags: target.tags,
          allowedTags: constraint.onlyDependOnLibsWithTags,
          reason: `Project '${source.name}' tagged with '${constraint.sourceTag}' is NOT allowed to depend on '${target.name}' (tags: [${target.tags.join(", ")}]). Permitted tags: [${constraint.onlyDependOnLibsWithTags.join(", ")}]`,
        });
      }
    }
  }

  return violations;
}

/**
 * Evaluates an entire graph of project dependency edges.
 */
export function checkModuleBoundaries(
  projects: Map<string, ProjectMetadata>,
  dependencyEdges: Array<{ from: string; to: string }>,
  constraints: DependencyConstraint[] = DEFAULT_DEP_CONSTRAINTS
): BoundaryCheckResult {
  const violations: BoundaryViolation[] = [];
  let checkedEdgesCount = 0;

  for (const edge of dependencyEdges) {
    const source = projects.get(edge.from);
    const target = projects.get(edge.to);

    if (!source) {
      throw new Error(`Unknown source project in dependency edge: ${edge.from}`);
    }
    if (!target) {
      throw new Error(`Unknown target project in dependency edge: ${edge.to}`);
    }

    checkedEdgesCount++;
    const edgeViolations = validateDependencyEdge(source, target, constraints);
    violations.push(...edgeViolations);
  }

  const isValid = violations.length === 0;
  const summary = isValid
    ? `SUCCESS: All ${checkedEdgesCount} dependency edge(s) satisfy the ${constraints.length} configured module boundary rules.`
    : `FAILURE: Found ${violations.length} boundary violation(s) across ${checkedEdgesCount} checked dependency edge(s).`;

  return {
    isValid,
    checkedEdgesCount,
    violations,
    summary,
  };
}
