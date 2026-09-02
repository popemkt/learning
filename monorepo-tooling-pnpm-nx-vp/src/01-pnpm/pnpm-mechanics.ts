/**
 * PNPM Mechanics & Architecture Model
 * Demonstrates:
 * 1. Centralized Version Catalogs (`catalog:`)
 * 2. Strict Symlinked node_modules vs Flat Phantom Hazards
 * 3. Workspace Protocol (`workspace:*`) Resolution
 * 4. The Anti-Pattern: Using pnpm for Task Orchestration
 */

export interface CatalogConfig {
  readonly [dependency: string]: string;
}

export interface PackageManifest {
  readonly name: string;
  readonly version: string;
  readonly dependencies?: Record<string, string>;
  readonly devDependencies?: Record<string, string>;
}

export interface WorkspaceResolvedPackage {
  readonly name: string;
  readonly resolvedDependencies: Record<string, { version: string; isInternal: boolean; source: string }>;
}

export interface NodeModulesResolutionResult {
  readonly packageRequesting: string;
  readonly dependencyRequested: string;
  readonly isDeclaredDirectly: boolean;
  readonly isResolved: boolean;
  readonly reason: string;
}

export class PnpmWorkspaceEngine {
  private catalog: CatalogConfig;
  private workspacePackages: Map<string, PackageManifest> = new Map();

  constructor(catalog: CatalogConfig) {
    // ✅ ATTENTION: Catalog acts as single source of truth for versions across entire monorepo
    this.catalog = catalog;
  }

  public registerPackage(pkg: PackageManifest): void {
    this.workspacePackages.set(pkg.name, pkg);
  }

  /**
   * Resolves package dependencies replacing `catalog:` and `workspace:*`
   */
  public resolvePackage(pkgName: string): WorkspaceResolvedPackage {
    const pkg = this.workspacePackages.get(pkgName);
    if (!pkg) {
      throw new Error(`Package "${pkgName}" not found in workspace`);
    }

    const resolvedDeps: Record<string, { version: string; isInternal: boolean; source: string }> = {};
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

    for (const [depName, versionSpec] of Object.entries(allDeps)) {
      if (versionSpec === "catalog:") {
        // ✅ ATTENTION: "catalog:" resolves from root pnpm-workspace.yaml catalog
        const catalogVersion = this.catalog[depName];
        if (!catalogVersion) {
          // ⚠️ CRITICAL: Missing catalog entry fails fast during dependency resolution
          throw new Error(`Dependency "${depName}" uses "catalog:" but is not declared in root catalog`);
        }
        resolvedDeps[depName] = {
          version: catalogVersion,
          isInternal: false,
          source: "catalog",
        };
      } else if (versionSpec === "workspace:*" || versionSpec.startsWith("workspace:")) {
        // 🔒 COMPILE-TIME: workspace:* resolves directly to workspace sibling package
        const internalPkg = this.workspacePackages.get(depName);
        if (!internalPkg) {
          throw new Error(`Workspace dependency "${depName}" not found in local workspace packages`);
        }
        resolvedDeps[depName] = {
          version: internalPkg.version,
          isInternal: true,
          source: "workspace",
        };
      } else {
        resolvedDeps[depName] = {
          version: versionSpec,
          isInternal: false,
          source: "direct",
        };
      }
    }

    return {
      name: pkg.name,
      resolvedDependencies: resolvedDeps,
    };
  }

  /**
   * Simulates pnpm's strict non-flat node_modules resolution
   * In pnpm, a package can ONLY require what is explicitly declared in its own package.json!
   */
  public simulateModuleResolution(
    requestingPackage: string,
    importedModule: string,
    options: { layout: "flat_npm_yarn" | "strict_pnpm_symlinks" }
  ): NodeModulesResolutionResult {
    const pkg = this.workspacePackages.get(requestingPackage);
    if (!pkg) {
      throw new Error(`Package "${requestingPackage}" not found`);
    }

    const isDirect = Boolean(pkg.dependencies?.[importedModule] || pkg.devDependencies?.[importedModule]);

    if (isDirect) {
      return {
        packageRequesting: requestingPackage,
        dependencyRequested: importedModule,
        isDeclaredDirectly: true,
        isResolved: true,
        reason: "Declared in package.json -> Symlinked into package node_modules",
      };
    }

    // Check if the dependency is transitively available in another package (phantom dependency)
    let existsTransitivelyInWorkspace = false;
    for (const [otherName, otherPkg] of this.workspacePackages.entries()) {
      if (otherName !== requestingPackage && (otherPkg.dependencies?.[importedModule] || otherPkg.devDependencies?.[importedModule])) {
        existsTransitivelyInWorkspace = true;
        break;
      }
    }

    if (options.layout === "flat_npm_yarn") {
      // ❌ FORBIDDEN: Flat node_modules hoists dependencies to root, masking missing package.json entries
      return {
        packageRequesting: requestingPackage,
        dependencyRequested: importedModule,
        isDeclaredDirectly: false,
        isResolved: existsTransitivelyInWorkspace,
        reason: existsTransitivelyInWorkspace
          ? "⚠️ Phantom Dependency: Hoisted to root node_modules by flat layout (Unsafe!)"
          : "Not found",
      };
    }

    // ✅ ATTENTION: Strict pnpm symlink layout refuses undeclared modules even if present in other packages!
    return {
      packageRequesting: requestingPackage,
      dependencyRequested: importedModule,
      isDeclaredDirectly: false,
      isResolved: false,
      reason: "🔒 Protected: pnpm strict isolation blocks phantom import of undeclared dependency",
    };
  }
}

/**
 * Task Execution: Why pnpm is NOT a Build Orchestrator
 */
export interface TaskExecutionProfile {
  readonly orchestrator: "pnpm_recursive" | "nx_dag";
  readonly totalDurationMs: number;
  readonly cacheHits: number;
  readonly executedTasks: string[];
  readonly description: string;
}

export function simulateTaskExecution(
  packages: Array<{ name: string; buildTimeMs: number; deps: string[] }>,
  mode: "pnpm_recursive" | "nx_dag",
  cachedPackages: Set<string> = new Set()
): TaskExecutionProfile {
  if (mode === "pnpm_recursive") {
    // ❌ FORBIDDEN: pnpm -r / pnpm --filter lacks DAG computation caching & optimal topological concurrency
    // It runs linearly or by naive batches without artifact hashing
    let totalTime = 0;
    const executed: string[] = [];

    for (const p of packages) {
      // pnpm -r has no computation cache out-of-the-box (re-runs every time)
      totalTime += p.buildTimeMs;
      executed.push(`${p.name}:build (executed from scratch)`);
    }

    return {
      orchestrator: "pnpm_recursive",
      totalDurationMs: totalTime,
      cacheHits: 0,
      executedTasks: executed,
      description: "pnpm -r run build: Executes sequentially/naively with ZERO computation caching across runs.",
    };
  }

  // Nx DAG mode
  // ✅ ATTENTION: Nx builds a task graph, runs independent tasks concurrently, and skips cached inputs
  let cacheHits = 0;
  const executed: string[] = [];

  // Group by level in topological sort (level 0: no deps, level 1: deps on level 0, etc.)
  const levels: Array<Array<{ name: string; buildTimeMs: number }>> = [];
  const levelMap = new Map<string, number>();

  for (const p of packages) {
    let maxDepLevel = -1;
    for (const d of p.deps) {
      const dl = levelMap.get(d) ?? 0;
      if (dl > maxDepLevel) maxDepLevel = dl;
    }
    const myLevel = maxDepLevel + 1;
    levelMap.set(p.name, myLevel);

    while (levels.length <= myLevel) {
      levels.push([]);
    }
    levels[myLevel].push(p);
  }

  let totalTime = 0;
  for (const level of levels) {
    // Parallel execution at each level
    const nonCachedInLevel = level.filter((p) => !cachedPackages.has(p.name));
    const cachedInLevel = level.filter((p) => cachedPackages.has(p.name));

    cacheHits += cachedInLevel.length;
    for (const c of cachedInLevel) {
      executed.push(`${c.name}:build [CACHED]`);
    }

    if (nonCachedInLevel.length > 0) {
      const maxTimeInLevel = Math.max(...nonCachedInLevel.map((p) => p.buildTimeMs));
      totalTime += maxTimeInLevel;
      for (const nc of nonCachedInLevel) {
        executed.push(`${nc.name}:build (executed in ${nc.buildTimeMs}ms)`);
      }
    }
  }

  return {
    orchestrator: "nx_dag",
    totalDurationMs: totalTime,
    cacheHits,
    executedTasks: executed,
    description: "Nx run-many: Builds DAG, parallelizes across topological levels, and instant cache-replays.",
  };
}
