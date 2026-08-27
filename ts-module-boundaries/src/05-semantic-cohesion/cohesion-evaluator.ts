import { readFileSync } from "node:fs";

export type ConcernType =
  | "HTTP_TRANSPORT"
  | "PERSISTENCE_DB"
  | "BUSINESS_DOMAIN"
  | "PRESENTATION_FORMAT";

export type CohesionVerdict = "KEEP" | "SPLIT" | "MERGE" | "PROMOTE_TO_PACKAGE";

export interface ConcernDetection {
  type: ConcernType;
  label: string;
  matchedTokens: string[];
}

export interface CohesionEvaluation {
  moduleName: string;
  detectedConcerns: ConcernDetection[];
  cohesionScore: number; // 0.0 to 1.0 (1.0 = Pure Single Responsibility)
  verdict: CohesionVerdict;
  rationale: string;
  recommendations: string[];
  isAdvisoryOnly: true;
}

const CONCERN_PATTERNS: Record<ConcernType, { label: string; patterns: RegExp[] }> = {
  HTTP_TRANSPORT: {
    label: "HTTP Transport & Protocol",
    patterns: [
      /\bstatusCode\b/i,
      /\bheaders\b/i,
      /\bcontent-type\b/i,
      /\b(?:400|404|415|422|500|201|200)\b/,
      /\bHttpRequest\b/,
      /\bHttpResponse\b/,
      /\breq\.body\b/,
    ],
  },
  PERSISTENCE_DB: {
    label: "Persistence & Database Storage",
    patterns: [
      /\bINSERT\s+INTO\b/i,
      /\bSELECT\s+.*FROM\b/i,
      /\b(?:dbTable|sqlInsert|Map<string,\s*(?:string|Invoice)>)\b/i,
      /\bclass\s+\w+Repository\b/,
    ],
  },
  BUSINESS_DOMAIN: {
    label: "Business Domain Logic",
    patterns: [
      /\b(?:taxRate\s*=|subtotalCents\s*(\+=|=)|taxCents\s*=)\b/,
      /\b(?:calculateInvoiceTotals|createInvoice)\s*\(/,
      /\bMath\.round\([^)]*tax[^)]*\)/i,
    ],
  },
  PRESENTATION_FORMAT: {
    label: "Presentation & Formatting",
    patterns: [
      /<div|<h1|<p|<ul|<li/i,
      /\b(?:toFixed\s*\(\s*2\s*\)|formatCurrency)\s*\(/,
      /\bclass="[^"]*"/,
    ],
  },
};
/**
 * Analyzes source code to detect mixed architectural concerns.
 */
export function evaluateCodeCohesion(
  sourceCode: string,
  moduleName: string = "AnonymousModule"
): CohesionEvaluation {
  const detectedConcerns: ConcernDetection[] = [];

  for (const [concernKey, config] of Object.entries(CONCERN_PATTERNS) as Array<[ConcernType, { label: string; patterns: RegExp[] }]>) {
    const matchedTokens: string[] = [];

    for (const pattern of config.patterns) {
      const match = sourceCode.match(pattern);
      if (match) {
        matchedTokens.push(match[0]);
      }
    }

    if (matchedTokens.length > 0) {
      detectedConcerns.push({
        type: concernKey,
        label: config.label,
        matchedTokens,
      });
    }
  }

  const concernCount = detectedConcerns.length;
  let cohesionScore: number;
  let verdict: CohesionVerdict;
  let rationale: string;
  const recommendations: string[] = [];

  if (concernCount <= 1) {
    cohesionScore = 1.0;
    verdict = "KEEP";
    rationale = `High cohesion: Module focuses strictly on a single architectural concern (${detectedConcerns[0]?.label ?? "Pure logic"}).`;
  } else if (concernCount === 2) {
    cohesionScore = 0.67;
    verdict = "KEEP";
    rationale = `Moderate cohesion: Module handles 2 related concerns (${detectedConcerns.map(c => c.label).join(", ")}). Acceptable if closely coupled by contract.`;
    recommendations.push("Consider separating secondary concern if module complexity grows.");
  } else if (concernCount === 3) {
    cohesionScore = 0.40;
    verdict = "SPLIT";
    rationale = `Low cohesion: Module entangles 3 distinct concerns (${detectedConcerns.map(c => c.label).join(", ")}). High maintenance risk.`;
    recommendations.push("Extract domain entities and business calculations into a pure domain module.");
    recommendations.push("Extract data storage logic into a dedicated repository interface.");
  } else {
    cohesionScore = 0.25;
    verdict = "SPLIT";
    rationale = `God Object / Anti-Pattern: Module mixes all 4 architectural concerns (HTTP, Database, Domain, and Presentation).`;
    recommendations.push("Extract HTTP status codes and header parsing into a Controller.");
    recommendations.push("Extract business rules and tax calculations into a Domain Entity.");
    recommendations.push("Extract SQL queries and storage into a Repository.");
    recommendations.push("Extract HTML and text templates into a Presentation Formatter.");
  }

  // If a pure domain or formatter module is completely isolated, it might qualify for PROMOTE_TO_PACKAGE
  if (cohesionScore === 1.0 && sourceCode.length > 500 && !detectedConcerns.some(c => c.type === "HTTP_TRANSPORT")) {
    recommendations.push("Candidate for PROMOTE_TO_PACKAGE if shared across multiple services.");
  }

  return {
    moduleName,
    detectedConcerns,
    cohesionScore,
    verdict,
    rationale,
    recommendations,
    isAdvisoryOnly: true,
  };
}

/**
 * Evaluates cohesion of a file from disk.
 */
export function evaluateFileCohesion(filePath: string): CohesionEvaluation {
  const content = readFileSync(filePath, "utf-8");
  const moduleName = filePath.split("/").pop() ?? filePath;
  return evaluateCodeCohesion(content, moduleName);
}
