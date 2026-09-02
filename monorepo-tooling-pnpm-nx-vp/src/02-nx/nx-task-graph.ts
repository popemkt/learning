/**
 * Nx Task Graph & Computation Cache Model
 * Demonstrates:
 * 1. DAG Task Scheduling (`dependsOn: ["^build"]`)
 * 2. Computation Caching (Input Hashing -> Instant Output Replay)
 * 3. Affected Project Calculation (`nx affected`)
 * 4. The Self-Chaining Build Anti-Pattern in Sub-package Test Scripts
 */

export interface ProjectNode {
  readonly name: string;
  readonly path: string;
  readonly dependencies: string[];
  readonly tags: string[];
  readonly files: Record<string, string>; // path -> content hash
}

export interface TargetConfig {
  readonly dependsOn?: string[];
  readonly inputs?: string[];
  readonly outputs?: string[];
  readonly cache?: boolean;
}

export interface TaskResult {
  readonly taskId: string;
  readonly project: string;
  readonly target: string;
  readonly status: "cache_hit" | "executed" | "redundant_sub_build";
  readonly durationMs: number;
  readonly hash: string;
}

export class NxWorkspaceGraph {
  private projects: Map<string, ProjectNode> = new Map();
  private targetDefaults: Record<string, TargetConfig> = {};
  private computationCache: Map<string, { outputs: Record<string, string> }> = new Map();

  constructor(targetDefaults: Record<string, TargetConfig>) {
    this.targetDefaults = targetDefaults;
  }

  public addProject(project: ProjectNode): void {
    this.projects.set(project.name, project);
  }

  /**
   * Computes a deterministic input hash for a task
   */
  public computeTaskHash(projectName: string, targetName: string): string {
    const project = this.projects.get(projectName);
    if (!project) throw new Error(`Unknown project ${projectName}`);

    // ✅ ATTENTION: Hash includes project source files + upstream dependency hashes
    const fileEntries = Object.entries(project.files).sort(([a], [b]) => a.localeCompare(b));
    let raw = `${projectName}:${targetName}:` + fileEntries.map(([k, v]) => `${k}=${v}`).join(";");

    // Include upstream dependency hashes for targets that depend on ^build
    const config = this.targetDefaults[targetName];
    if (config?.dependsOn?.includes("^build")) {
      for (const depName of project.dependencies) {
        const depHash = this.computeTaskHash(depName, "build");
        raw += `+dep(${depName})=${depHash}`;
      }
    }

    // Simple deterministic hash simulation
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
    }
    return `hash_${Math.abs(hash).toString(16)}`;
  }

  /**
   * Executes a target across all projects respecting DAG dependencies and caching
   */
  public runMany(
    targetName: string,
    options: { simulateSubPackageSelfBuild?: boolean } = {}
  ): { results: TaskResult[]; totalTimeMs: number; redundantTimeMs: number } {
    const results: TaskResult[] = [];
    const executionOrder = this.getTopologicalOrder();
    let totalTimeMs = 0;
    let redundantTimeMs = 0;

    for (const projectName of executionOrder) {
      const project = this.projects.get(projectName)!;
      const targetConfig = this.targetDefaults[targetName] ?? { cache: true };
      const taskHash = this.computeTaskHash(projectName, targetName);

      // Check computation cache
      const isCached = targetConfig.cache && this.computationCache.has(taskHash);

      if (isCached) {
        // ✅ ATTENTION: Computation Cache Hit -> 0ms execution
        results.push({
          taskId: `${projectName}:${targetName}`,
          project: projectName,
          target: targetName,
          status: "cache_hit",
          durationMs: 0,
          hash: taskHash,
        });
      } else {
        // Execute task
        const baseTaskDurationMs = 250;
        let actualDuration = baseTaskDurationMs;

        // ⚠️ CRITICAL ANTI-PATTERN: Sub-package scripts running `pnpm run build` inside `test`
        if (targetName === "test" && options.simulateSubPackageSelfBuild) {
          // ❌ FORBIDDEN: Package test script forces redundant rebuild of itself and upstream
          const redundantRebuildMs = 300;
          actualDuration += redundantRebuildMs;
          redundantTimeMs += redundantRebuildMs;
        }

        totalTimeMs += actualDuration;

        // Populate cache
        if (targetConfig.cache) {
          this.computationCache.set(taskHash, {
            outputs: { "dist/index.js": `built_artifact_for_${projectName}` },
          });
        }

        results.push({
          taskId: `${projectName}:${targetName}`,
          project: projectName,
          target: targetName,
          status: options.simulateSubPackageSelfBuild && targetName === "test" ? "redundant_sub_build" : "executed",
          durationMs: actualDuration,
          hash: taskHash,
        });
      }
    }

    return { results, totalTimeMs, redundantTimeMs };
  }

  /**
   * Calculates affected projects given changed file paths
   */
  public getAffectedProjects(changedFiles: string[]): { affectedProjects: string[]; reverseDeps: Record<string, string[]> } {
    // 1. Identify directly touched projects
    const directlyTouched = new Set<string>();
    for (const file of changedFiles) {
      for (const [name, proj] of this.projects.entries()) {
        if (file.startsWith(proj.path)) {
          directlyTouched.add(name);
        }
      }
    }

    // 2. Build reverse dependency graph (who depends on whom)
    const dependentsMap = new Map<string, Set<string>>();
    for (const [name, proj] of this.projects.entries()) {
      for (const dep of proj.dependencies) {
        if (!dependentsMap.has(dep)) {
          dependentsMap.set(dep, new Set());
        }
        dependentsMap.get(dep)!.add(name);
      }
    }

    // 3. Walk dependents transitively
    const allAffected = new Set<string>(directlyTouched);
    const queue = Array.from(directlyTouched);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const dependents = dependentsMap.get(current) ?? new Set();
      for (const dependent of dependents) {
        if (!allAffected.has(dependent)) {
          allAffected.add(dependent);
          queue.push(dependent);
        }
      }
    }

    const reverseDepsRecord: Record<string, string[]> = {};
    for (const [k, v] of dependentsMap.entries()) {
      reverseDepsRecord[k] = Array.from(v);
    }

    return {
      affectedProjects: Array.from(allAffected),
      reverseDeps: reverseDepsRecord,
    };
  }

  private getTopologicalOrder(): string[] {
    const visited = new Set<string>();
    const order: string[] = [];

    const visit = (node: string) => {
      if (visited.has(node)) return;
      visited.add(node);
      const proj = this.projects.get(node);
      if (proj) {
        for (const dep of proj.dependencies) {
          visit(dep);
        }
      }
      order.push(node);
    };

    for (const name of this.projects.keys()) {
      visit(name);
    }

    return order;
  }
}
