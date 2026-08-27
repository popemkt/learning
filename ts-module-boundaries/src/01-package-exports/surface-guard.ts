import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

export interface BarrelExportSymbol {
  name: string;
  isTypeOnly: boolean;
  sourceModule: string;
}

export interface BarrelHygieneResult {
  filePath: string;
  hasWildcardExport: boolean;
  wildcardExports: string[];
  explicitExports: BarrelExportSymbol[];
  valueExports: string[];
  typeExports: string[];
  isCompliant: boolean;
  diagnostics: string[];
}

export interface SubpathConditionInfo {
  subpath: string;
  conditions: string[];
  isTypesFirst: boolean;
  typesTarget?: string;
  importTarget?: string;
  requireTarget?: string;
  missingTargets: string[];
}

export interface ConditionalExportResult {
  packageName: string;
  isConditional: boolean;
  subpaths: SubpathConditionInfo[];
  allTypesFirst: boolean;
  missingTargets: string[];
  isCompliant: boolean;
  diagnostics: string[];
}

export interface SurfaceCheckResult {
  packageName: string;
  hasExportsMap: boolean;
  hasWildcardLeak: boolean;
  hasBarrelWildcardLeak: boolean;
  hasValidConditionalOrder: boolean;
  exportedSubpaths: string[];
  internalFilesHidden: string[];
  missingTargets: string[];
  barrelAudits: BarrelHygieneResult[];
  conditionalAudit?: ConditionalExportResult;
  isSafe: boolean;
  diagnostics: string[];
}

/**
 * Regex matching wildcard re-exports in barrel files.
 * Matches:
 *  - export * from "./foo.js"
 *  - export * as ns from "./foo.js"
 */
export const WILDCARD_BARREL_REGEX = /^export\s+(?:\*|\*\s+as\s+[\w$]+)\s+from\s+['"][^'"]+['"]/m;

function parseTypeReExports(rawSymbols: string, sourceModule: string): BarrelExportSymbol[] {
  const result: BarrelExportSymbol[] = [];
  for (const rawSym of rawSymbols.split(",")) {
    const sym = rawSym.trim();
    if (!sym) continue;
    const exportedName = sym.includes(" as ") ? sym.split(/\s+as\s+/)[1].trim() : sym;
    result.push({ name: exportedName, isTypeOnly: true, sourceModule });
  }
  return result;
}

function parseNamedReExports(rawSymbols: string, sourceModule: string): BarrelExportSymbol[] {
  const result: BarrelExportSymbol[] = [];
  for (const rawSym of rawSymbols.split(",")) {
    const sym = rawSym.trim();
    if (!sym) continue;
    const isInlineType = sym.startsWith("type ");
    const cleanSym = isInlineType ? sym.replace(/^type\s+/, "") : sym;
    const exportedName = cleanSym.includes(" as ") ? cleanSym.split(/\s+as\s+/)[1].trim() : cleanSym;
    result.push({ name: exportedName, isTypeOnly: isInlineType, sourceModule });
  }
  return result;
}

/**
 * Audits a barrel file (e.g., index.ts) for wildcard export leaks and validates
 * explicit curation of the public API surface.
 */
export function checkBarrelHygiene(barrelFilePath: string): BarrelHygieneResult {
  if (!existsSync(barrelFilePath)) {
    return {
      filePath: barrelFilePath,
      hasWildcardExport: false,
      wildcardExports: [],
      explicitExports: [],
      valueExports: [],
      typeExports: [],
      isCompliant: false,
      diagnostics: [`FILE_NOT_FOUND: Barrel file does not exist at '${barrelFilePath}'`]
    };
  }

  const content = readFileSync(barrelFilePath, "utf-8");
  const lines = content.split("\n");
  const wildcardExports: string[] = [];
  const explicitExports: BarrelExportSymbol[] = [];
  const valueExports: string[] = [];
  const typeExports: string[] = [];
  const diagnostics: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (/^export\s+(?:\*|\*\s+as\s+[\w$]+)\s+from\s+['"][^'"]+['"]/.test(trimmed)) {
      wildcardExports.push(trimmed);
      continue;
    }

    const typeMatch = trimmed.match(/^export\s+type\s*\{\s*([^}]+)\s*\}\s*from\s*['"]([^'"]+)['"]/);
    if (typeMatch) {
      const parsed = parseTypeReExports(typeMatch[1], typeMatch[2]);
      explicitExports.push(...parsed);
      for (const p of parsed) typeExports.push(p.name);
      continue;
    }

    const namedMatch = trimmed.match(/^export\s*\{\s*([^}]+)\s*\}\s*from\s*['"]([^'"]+)['"]/);
    if (namedMatch) {
      const parsed = parseNamedReExports(namedMatch[1], namedMatch[2]);
      explicitExports.push(...parsed);
      for (const p of parsed) {
        const targetList = p.isTypeOnly ? typeExports : valueExports;
        targetList.push(p.name);
      }
      continue;
    }
  }

  const hasWildcardExport = wildcardExports.length > 0;
  const isCompliant = !hasWildcardExport;

  if (hasWildcardExport) {
    diagnostics.push(
      `WILDCARD_BARREL_EXPORT: Wildcard re-export detected in barrel '${barrelFilePath}': [${wildcardExports.join("; ")}]. Wildcard exports leak internal helpers and prevent tree-shaking.`
    );
  } else {
    diagnostics.push(
      `OK: Barrel '${barrelFilePath}' strictly curates ${valueExports.length} value export(s) and ${typeExports.length} type-only export(s).`
    );
  }

  return {
    filePath: barrelFilePath,
    hasWildcardExport,
    wildcardExports,
    explicitExports,
    valueExports,
    typeExports,
    isCompliant,
    diagnostics
  };
}

interface AuditSubpathOptions {
  packageDir: string;
  packageName: string;
  subpath: string;
  conditionMap: Record<string, unknown>;
  diagnostics: string[];
}

function auditSubpathConditions(options: AuditSubpathOptions): SubpathConditionInfo {
  const { packageDir, packageName, subpath, conditionMap, diagnostics } = options;
  const conditionKeys = Object.keys(conditionMap);
  const hasTypes = conditionKeys.includes("types");
  const typesIndex = conditionKeys.indexOf("types");
  const importIndex = conditionKeys.indexOf("import");
  const requireIndex = conditionKeys.indexOf("require");

  let isTypesFirst = true;
  if (hasTypes) {
    if (importIndex !== -1 && importIndex < typesIndex) isTypesFirst = false;
    if (requireIndex !== -1 && requireIndex < typesIndex) isTypesFirst = false;
  }

  if (!isTypesFirst) {
    diagnostics.push(
      `INVALID_CONDITION_ORDER: Condition 'types' must precede 'import' and 'require' in subpath '${subpath}' of '${packageName}'. Node/TS evaluates condition keys in object definition order.`
    );
  }

  const subpathMissing: string[] = [];
  for (const [condKey, targetVal] of Object.entries(conditionMap)) {
    if (typeof targetVal !== "string" || targetVal.includes("*")) continue;
    const targetPath = resolve(packageDir, targetVal);
    if (!existsSync(targetPath)) {
      subpathMissing.push(targetVal);
      diagnostics.push(
        `BROKEN_TARGET: Condition '${condKey}' in subpath '${subpath}' targets non-existent file '${targetVal}'.`
      );
    }
  }

  return {
    subpath,
    conditions: conditionKeys,
    isTypesFirst,
    typesTarget: typeof conditionMap.types === "string" ? conditionMap.types : undefined,
    importTarget: typeof conditionMap.import === "string" ? conditionMap.import : undefined,
    requireTarget: typeof conditionMap.require === "string" ? conditionMap.require : undefined,
    missingTargets: subpathMissing
  };
}

/**
 * Validates package conditional exports structure and condition ordering (e.g. types first).
 */
export function checkConditionalExports(packageDir: string): ConditionalExportResult {
  const pkgJsonPath = join(packageDir, "package.json");
  if (!existsSync(pkgJsonPath)) {
    throw new Error(`package.json not found in ${packageDir}`);
  }

  const pkg = JSON.parse(readFileSync(pkgJsonPath, "utf-8"));
  const packageName = pkg.name || "unnamed";
  const exportsField = pkg.exports;

  const diagnostics: string[] = [];
  const subpaths: SubpathConditionInfo[] = [];
  const missingTargets: string[] = [];

  if (!exportsField || typeof exportsField !== "object") {
    return {
      packageName,
      isConditional: false,
      subpaths: [],
      allTypesFirst: true,
      missingTargets: [],
      isCompliant: true,
      diagnostics: [`NO_CONDITIONAL_EXPORTS: Package '${packageName}' does not define object-based conditional exports.`]
    };
  }

  const isDirectConditionMap = "types" in exportsField || "import" in exportsField || "require" in exportsField;
  const normalizedEntries: [string, Record<string, unknown>][] = isDirectConditionMap
    ? [[".", exportsField as Record<string, unknown>]]
    : Object.entries(exportsField).filter(([_, v]) => typeof v === "object" && v !== null) as [string, Record<string, unknown>][];

  if (normalizedEntries.length === 0) {
    return {
      packageName,
      isConditional: false,
      subpaths: [],
      allTypesFirst: true,
      missingTargets: [],
      isCompliant: true,
      diagnostics: [`NO_CONDITIONAL_EXPORTS: No conditional export subpaths found in '${packageName}'.`]
    };
  }

  let allTypesFirst = true;

  for (const [subpath, conditionMap] of normalizedEntries) {
    const info = auditSubpathConditions({
      packageDir,
      packageName,
      subpath,
      conditionMap,
      diagnostics
    });
    if (!info.isTypesFirst) allTypesFirst = false;
    missingTargets.push(...info.missingTargets);
    subpaths.push(info);
  }

  const isCompliant = allTypesFirst && missingTargets.length === 0;
  if (isCompliant) {
    diagnostics.push(
      `OK: Package '${packageName}' defines valid conditional exports with correct condition precedence ('types' first).`
    );
  }

  return {
    packageName,
    isConditional: true,
    subpaths,
    allTypesFirst,
    missingTargets,
    isCompliant,
    diagnostics
  };
}

/**
 * SurfaceGuard: Audits a package directory to ensure encapsulation boundaries are enforced.
 */
export function checkPackageSurface(packageDir: string): SurfaceCheckResult {
  const pkgJsonPath = join(packageDir, "package.json");
  if (!existsSync(pkgJsonPath)) {
    throw new Error(`package.json not found in ${packageDir}`);
  }

  const pkg = JSON.parse(readFileSync(pkgJsonPath, "utf-8"));
  const packageName = pkg.name || "unnamed";
  const exportsField = pkg.exports;

  const diagnostics: string[] = [];
  const exportedSubpaths: string[] = [];
  const missingTargets: string[] = [];
  let hasWildcardLeak = false;

  if (!exportsField) {
    diagnostics.push("MISSING_EXPORTS_MAP: package.json lacks an 'exports' map. Any internal file is publicly importable.");
    return {
      packageName,
      hasExportsMap: false,
      hasWildcardLeak: false,
      hasBarrelWildcardLeak: false,
      hasValidConditionalOrder: true,
      exportedSubpaths: [],
      internalFilesHidden: [],
      missingTargets: [],
      barrelAudits: [],
      isSafe: false,
      diagnostics
    };
  }

  if (typeof exportsField === "string") {
    exportedSubpaths.push(".");
    const targetPath = resolve(packageDir, exportsField);
    if (!existsSync(targetPath)) {
      missingTargets.push(exportsField);
      diagnostics.push(`BROKEN_TARGET: Root export targets non-existent file '${exportsField}'`);
    }
  } else if (typeof exportsField === "object" && exportsField !== null) {
    for (const [subpath, target] of Object.entries(exportsField)) {
      exportedSubpaths.push(subpath);

      const isWildcard = subpath === "./*" || (typeof target === "string" && target.includes("*"));
      if (isWildcard) {
        hasWildcardLeak = true;
        diagnostics.push(`WILDCARD_LEAK: Wildcard export '${subpath} -> ${target}' exposes all internal files, defeating encapsulation.`);
      }

      if (typeof target === "string" && !target.includes("*")) {
        const targetPath = resolve(packageDir, target);
        if (!existsSync(targetPath)) {
          missingTargets.push(target);
          diagnostics.push(`BROKEN_TARGET: Subpath '${subpath}' targets missing path '${target}'`);
        }
      }
    }
  }

  const allFiles: string[] = [];
  const barrelFiles: string[] = [];

  function scan(dir: string) {
    if (!existsSync(dir)) return;
    const entries = readdirSync(dir);
    for (const entry of entries) {
      if (entry === "node_modules" || entry.startsWith(".")) continue;
      const full = join(dir, entry);
      const st = statSync(full);
      if (st.isDirectory()) {
        scan(full);
      } else if (full.endsWith(".ts") || full.endsWith(".js") || full.endsWith(".mts")) {
        allFiles.push(relative(packageDir, full));
        if (entry.startsWith("index.")) {
          barrelFiles.push(full);
        }
      }
    }
  }
  scan(packageDir);

  const internalFilesHidden = allFiles.filter(f => {
    return f.includes("internal/") || f.includes("private/") || f.includes("secret");
  });

  const barrelAudits: BarrelHygieneResult[] = barrelFiles.map(b => checkBarrelHygiene(b));
  const hasBarrelWildcardLeak = barrelAudits.some(b => b.hasWildcardExport);
  for (const audit of barrelAudits) {
    if (audit.hasWildcardExport) {
      diagnostics.push(...audit.diagnostics);
    }
  }

  let conditionalAudit: ConditionalExportResult | undefined;
  let hasValidConditionalOrder = true;
  if (typeof exportsField === "object" && exportsField !== null) {
    conditionalAudit = checkConditionalExports(packageDir);
    if (conditionalAudit.isConditional && !conditionalAudit.isCompliant) {
      hasValidConditionalOrder = conditionalAudit.allTypesFirst;
      diagnostics.push(...conditionalAudit.diagnostics.filter(d => !d.startsWith("OK:")));
    }
  }

  const isSafe = !hasWildcardLeak && !hasBarrelWildcardLeak && hasValidConditionalOrder && missingTargets.length === 0;

  if (isSafe && diagnostics.length === 0) {
    diagnostics.push(`OK: Package '${packageName}' strictly encapsulates ${internalFilesHidden.length} internal files across ${exportedSubpaths.length} public subpath(s).`);
  }

  return {
    packageName,
    hasExportsMap: true,
    hasWildcardLeak,
    hasBarrelWildcardLeak,
    hasValidConditionalOrder,
    exportedSubpaths,
    internalFilesHidden,
    missingTargets,
    barrelAudits,
    conditionalAudit,
    isSafe,
    diagnostics
  };
}
