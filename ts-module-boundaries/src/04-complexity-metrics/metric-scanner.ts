import { readFileSync } from "node:fs";

export interface MetricThresholds {
  maxComplexity: number; // default: 5
  maxDepth: number;      // default: 3
  maxParams: number;     // default: 3
}

export const DEFAULT_THRESHOLDS: MetricThresholds = {
  maxComplexity: 5,
  maxDepth: 3,
  maxParams: 3,
};

export interface FunctionMetricReport {
  functionName: string;
  cyclomaticComplexity: number;
  maxDepth: number;
  parameterCount: number;
  warnings: string[];
  isCompliant: boolean;
}

export interface ComplexityScanResult {
  filePath?: string;
  functionReports: FunctionMetricReport[];
  totalWarnings: number;
  exitCode: 0; // Philosophy: Warn-only metrics must NEVER break the build (exit code 0)
  philosophyExplanation: string;
}

/**
 * Calculates cyclomatic complexity for a function body string.
 * Base = 1.
 * Increments on: if, else if, for, while, case, catch, &&, ||, ??, ? (ternary).
 */
export function calculateCyclomaticComplexity(functionBody: string): number {
  let complexity = 1;

  // Decision keywords and branching tokens
  const decisionPatterns = [
    /\bif\s*\(/g,
    /\belse\s+if\s*\(/g,
    /\bfor\s*\(/g,
    /\bwhile\s*\(/g,
    /\bcase\s+[^:]+:/g,
    /\bcatch\s*\(/g,
    /(?<!&)&&(?!&)/g,
    /(?<!\|)\|\|(?!\|)/g,
    /(?<!\?)\?(?!\?|\.)/g, // Ternary operator (excluding ?? and ?.)
  ];

  for (const pattern of decisionPatterns) {
    const matches = functionBody.match(pattern);
    if (matches) {
      complexity += matches.length;
    }
  }

  return complexity;
}

/**
 * Calculates maximum nesting depth within a function body.
 */
export function calculateMaxNestingDepth(functionBody: string): number {
  let currentDepth = 0;
  let maxDepth = 0;

  for (let i = 0; i < functionBody.length; i++) {
    const char = functionBody[i];
    if (char === "{") {
      currentDepth++;
      if (currentDepth > maxDepth) {
        maxDepth = currentDepth;
      }
    } else if (char === "}") {
      currentDepth = Math.max(0, currentDepth - 1);
    }
  }

  // Deduct outer function body wrapper brace
  return Math.max(0, maxDepth - 1);
}

/**
 * Extracts parameter count from parameter signature string.
 */
export function countParameters(paramString: string): number {
  const trimmed = paramString.trim();
  if (!trimmed) return 0;

  // Split top-level commas (handling simple objects/generics)
  let depth = 0;
  let count = 0;
  let currentParam = "";

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];
    if (char === "{" || char === "<" || char === "(") {
      depth++;
      currentParam += char;
    } else if (char === "}" || char === ">" || char === ")") {
      depth = Math.max(0, depth - 1);
      currentParam += char;
    } else if (char === "," && depth === 0) {
      if (currentParam.trim().length > 0) count++;
      currentParam = "";
    } else {
      currentParam += char;
    }
  }

  if (currentParam.trim().length > 0) {
    count++;
  }

  return count;
}

/**
 * Parses exported and top-level functions from TypeScript source text.
 */
export function analyzeSourceMetrics(
  sourceText: string,
  thresholds: MetricThresholds = DEFAULT_THRESHOLDS,
  filePath?: string
): ComplexityScanResult {
  const functionReports: FunctionMetricReport[] = [];

  // Match function declarations: function name(params) { body }
  const fnRegex = /(?:export\s+)?function\s+([a-zA-Z0-9_$]+)\s*\(([\s\S]*?)\)(?:\s*:\s*[^{]+)?\s*\{/g;
  let match: RegExpExecArray | null;

  while ((match = fnRegex.exec(sourceText)) !== null) {
    const fnName = match[1];
    const paramStr = match[2];
    const startIndex = match.index + match[0].length - 1;

    // Find matching closing brace for function body
    let depth = 0;
    let endIndex = startIndex;
    for (let i = startIndex; i < sourceText.length; i++) {
      if (sourceText[i] === "{") depth++;
      else if (sourceText[i] === "}") {
        depth--;
        if (depth === 0) {
          endIndex = i;
          break;
        }
      }
    }

    const body = sourceText.slice(startIndex, endIndex + 1);
    const cyclomaticComplexity = calculateCyclomaticComplexity(body);
    const maxDepth = calculateMaxNestingDepth(body);
    const parameterCount = countParameters(paramStr);

    const warnings: string[] = [];
    if (cyclomaticComplexity > thresholds.maxComplexity) {
      warnings.push(`[WARN: complexity] ${cyclomaticComplexity} exceeds max threshold of ${thresholds.maxComplexity}`);
    }
    if (maxDepth > thresholds.maxDepth) {
      warnings.push(`[WARN: max-depth] ${maxDepth} exceeds max threshold of ${thresholds.maxDepth}`);
    }
    if (parameterCount > thresholds.maxParams) {
      warnings.push(`[WARN: max-params] ${parameterCount} parameter(s) exceeds max threshold of ${thresholds.maxParams}`);
    }

    functionReports.push({
      functionName: fnName,
      cyclomaticComplexity,
      maxDepth,
      parameterCount,
      warnings,
      isCompliant: warnings.length === 0,
    });
  }

  const totalWarnings = functionReports.reduce((acc, r) => acc + r.warnings.length, 0);

  return {
    filePath,
    functionReports,
    totalWarnings,
    exitCode: 0,
    philosophyExplanation:
      "WARN-ONLY PHILOSOPHY: Metrics serve as headlights for code review, not traffic spikes. Setting complexity rules to 'error' induces 'code shredding'—forcing devs to create unnatural 1-line wrappers to dodge lint errors. Warn-only keeps CI green while surfacing hotspots to reviewers.",
  };
}

/**
 * Reads a file and scans it for complexity metrics.
 */
export function scanFileMetrics(
  filePath: string,
  thresholds: MetricThresholds = DEFAULT_THRESHOLDS
): ComplexityScanResult {
  const content = readFileSync(filePath, "utf-8");
  return analyzeSourceMetrics(content, thresholds, filePath);
}
