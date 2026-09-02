/**
 * Nx Module Boundary Enforcer Model
 * Simulates `@nx/enforce-module-boundaries` via tags
 */

export interface ProjectTags {
  readonly scope: "app" | "swimlane" | "shared";
  readonly layer: "domain" | "contract" | "application" | "infrastructure" | "test-support" | "app";
}

export interface ImportBoundaryRule {
  readonly sourceTag: string;
  readonly onlyDependOnLibsWithTags: string[];
}

export interface BoundaryViolation {
  readonly importer: string;
  readonly imported: string;
  readonly importerTags: string[];
  readonly importedTags: string[];
  readonly violatedRule: string;
  readonly explanation: string;
}

export class NxModuleBoundaryValidator {
  private projectTags: Map<string, string[]> = new Map();

  // Standard boundary rules as configured in ESLint / Nx
  private scopeDepConstraints: Record<string, string[]> = {
    "scope:app": ["scope:app", "scope:swimlane", "scope:shared"],
    "scope:swimlane": ["scope:shared"], // ⚠️ CRITICAL: Swimlanes may not import sibling swimlanes!
    "scope:shared": ["scope:shared"], // 🔒 COMPILE-TIME: Shared libs may never import swimlanes or apps
  };

  private layerDepConstraints: Record<string, string[]> = {
    "layer:domain": ["layer:domain", "layer:contract"], // 🔒 Pure floor: domain cannot depend on app or infra!
    "layer:contract": ["layer:contract", "layer:domain"],
    "layer:application": ["layer:domain", "layer:contract", "layer:infrastructure", "layer:test-support"],
    "layer:infrastructure": ["layer:contract", "layer:domain"],
    "layer:app": ["*"],
  };

  public registerProject(projectName: string, tags: string[]): void {
    this.projectTags.set(projectName, tags);
  }

  public validateImport(importerProject: string, importedProject: string): BoundaryViolation | null {
    const importerTags = this.projectTags.get(importerProject) ?? [];
    const importedTags = this.projectTags.get(importedProject) ?? [];

    // 1. Check Scope Axis
    const importerScope = importerTags.find((t) => t.startsWith("scope:"));
    const importedScope = importedTags.find((t) => t.startsWith("scope:"));

    if (importerScope && importedScope) {
      const allowedScopes = this.scopeDepConstraints[importerScope] ?? [];
      if (!allowedScopes.includes(importedScope)) {
        // ❌ FORBIDDEN: Scope boundary violation
        return {
          importer: importerProject,
          imported: importedProject,
          importerTags,
          importedTags,
          violatedRule: `Scope constraint: ${importerScope} -> ${importedScope}`,
          explanation: `A project with "${importerScope}" is forbidden from depending on "${importedScope}". Sibling swimlanes must communicate through domain/contracts, not direct cross-imports!`,
        };
      }
    }

    // 2. Check Layer Axis
    const importerLayer = importerTags.find((t) => t.startsWith("layer:"));
    const importedLayer = importedTags.find((t) => t.startsWith("layer:"));

    if (importerLayer && importedLayer) {
      const allowedLayers = this.layerDepConstraints[importerLayer] ?? [];
      if (!allowedLayers.includes("*") && !allowedLayers.includes(importedLayer)) {
        // ❌ FORBIDDEN: Architectural layer inversion
        return {
          importer: importerProject,
          imported: importedProject,
          importerTags,
          importedTags,
          violatedRule: `Layer constraint: ${importerLayer} -> ${importedLayer}`,
          explanation: `Architectural Layer inversion! "${importerLayer}" cannot depend on upward layer "${importedLayer}". Pure domain models must remain free of infrastructure/application side-effects.`,
        };
      }
    }

    // ✅ ATTENTION: Valid import according to Nx tag boundary model
    return null;
  }
}
