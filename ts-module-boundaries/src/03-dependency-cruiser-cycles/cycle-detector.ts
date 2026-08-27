import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

export interface CycleViolation {
  cyclePath: string[];
  formattedChain: string;
  isLegacyException: boolean;
  ruleName: string;
  severity: "error" | "warn" | "info";
  explanation: string;
}

export interface CycleScanResult {
  totalFilesScanned: number;
  detectedCycles: CycleViolation[];
  activeErrorsCount: number;
  frozenLegacyCount: number;
  isCompliant: boolean;
  summary: string;
}

export interface CycleDetectorOptions {
  legacyExceptionPattern?: RegExp;
  extensions?: string[];
}

/**
 * Extracts relative import and export statements from TypeScript/JavaScript source code.
 */
export function extractRelativeImports(filePath: string, fileContent: string): string[] {
  const fileDir = dirname(filePath);
  const imports: string[] = [];

  // Match: import ... from "./..." or export ... from "./..."
  const importRegex = /(?:import|export)\s+(?:[\s\S]*?from\s+)?['"](\.[^'"]+)['"]/g;
  let match: RegExpExecArray | null;

  while ((match = importRegex.exec(fileContent)) !== null) {
    const importSpecifier = match[1];
    const resolvedPath = resolveImportPath(fileDir, importSpecifier);
    if (resolvedPath && existsSync(resolvedPath)) {
      imports.push(resolvedPath);
    }
  }

  return imports;
}

/**
 * Resolves relative TS/JS imports (supporting .js -> .ts and extensionless paths).
 */
function resolveImportPath(fromDir: string, specifier: string): string | null {
  const candidate = resolve(fromDir, specifier);

  // Exact file match
  if (existsSync(candidate) && statSync(candidate).isFile()) {
    return candidate;
  }

  // Handle .js -> .ts mapping
  if (specifier.endsWith(".js")) {
    const tsCandidate = resolve(fromDir, specifier.slice(0, -3) + ".ts");
    if (existsSync(tsCandidate)) return tsCandidate;
  }

  // Handle index files
  const indexTs = join(candidate, "index.ts");
  if (existsSync(indexTs)) return indexTs;

  const indexJs = join(candidate, "index.js");
  if (existsSync(indexJs)) return indexJs;

  // Handle implicit .ts
  if (existsSync(candidate + ".ts")) return candidate + ".ts";

  return null;
}

/**
 * Scans a directory and builds a dependency adjacency graph.
 */
export function buildDependencyGraph(
  rootDir: string,
  extensions: string[] = [".ts", ".js", ".tsx", ".jsx"]
): Map<string, string[]> {
  const graph = new Map<string, string[]>();
  const fileList: string[] = [];

  function collectFiles(dir: string) {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "node_modules" && entry.name !== ".git") {
          collectFiles(fullPath);
        }
      } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
        fileList.push(fullPath);
      }
    }
  }

  collectFiles(rootDir);

  for (const file of fileList) {
    const content = readFileSync(file, "utf-8");
    const neighbors = extractRelativeImports(file, content);
    graph.set(file, neighbors);
  }

  return graph;
}

/**
 * Finds all elementary cycles in the dependency graph using DFS cycle detection.
 */
export function findCyclesInGraph(
  graph: Map<string, string[]>,
  baseDir: string = process.cwd(),
  options: CycleDetectorOptions = {}
): CycleViolation[] {
  const visited = new Set<string>();
  const stack = new Set<string>();
  const currentPath: string[] = [];
  const rawCycles: string[][] = [];

  function dfs(node: string) {
    visited.add(node);
    stack.add(node);
    currentPath.push(node);

    const neighbors = graph.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor);
      } else if (stack.has(neighbor)) {
        // Found a cycle!
        const cycleStartIndex = currentPath.indexOf(neighbor);
        if (cycleStartIndex !== -1) {
          const cycle = currentPath.slice(cycleStartIndex);
          cycle.push(neighbor); // Close the loop
          rawCycles.push(cycle);
        }
      }
    }

    currentPath.pop();
    stack.delete(node);
  }

  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      dfs(node);
    }
  }

  // Deduplicate and format cycles
  const seenSignatures = new Set<string>();
  const violations: CycleViolation[] = [];

  for (const cycle of rawCycles) {
    const relCycle = cycle.map(p => relative(baseDir, p).replace(/\\/g, "/"));
    // Normalize cycle signature (rotate to lexicographically smallest node)
    const loopNodes = relCycle.slice(0, -1);
    const minIndex = loopNodes.indexOf([...loopNodes].sort()[0]);
    const normalized = [...loopNodes.slice(minIndex), ...loopNodes.slice(0, minIndex)];
    const signature = normalized.join(" -> ");

    if (seenSignatures.has(signature)) continue;
    seenSignatures.add(signature);

    const chain = [...normalized, normalized[0]].join(" → ");
    const isLegacy = options.legacyExceptionPattern
      ? cycle.some(p => options.legacyExceptionPattern?.test(p)) ||
        normalized.some(n => options.legacyExceptionPattern?.test(n))
      : false;

    violations.push({
      cyclePath: normalized,
      formattedChain: chain,
      isLegacyException: isLegacy,
      ruleName: "no-circular",
      severity: isLegacy ? "info" : "error",
      explanation: isLegacy
        ? `Legacy Cycle Exception (Frozen): ${chain}. Baselined in .dependency-cruiser.cjs.`
        : `Circular Dependency Error: ${chain}. Causes uninitialized binding and runtime undefined bugs.`,
    });
  }

  return violations;
}

/**
 * High-level scanner for checking circular dependencies in a directory.
 */
export function scanDirectoryForCycles(
  targetDir: string,
  options: CycleDetectorOptions = {}
): CycleScanResult {
  const graph = buildDependencyGraph(targetDir, options.extensions);
  const detectedCycles = findCyclesInGraph(graph, targetDir, options);

  const activeErrors = detectedCycles.filter(c => !c.isLegacyException);
  const frozenLegacy = detectedCycles.filter(c => c.isLegacyException);

  const isCompliant = activeErrors.length === 0;
  const summary = isCompliant
    ? `SUCCESS: 0 active cycle errors (${frozenLegacy.length} frozen legacy exception(s) safely baselined).`
    : `FAILURE: Found ${activeErrors.length} active circular dependency error(s)!`;

  return {
    totalFilesScanned: graph.size,
    detectedCycles,
    activeErrorsCount: activeErrors.length,
    frozenLegacyCount: frozenLegacy.length,
    isCompliant,
    summary,
  };
}
