/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment:
        "Circular dependencies cause runtime TDZ (Temporal Dead Zone), uninitialized bindings, and undefined imports in JavaScript/TypeScript.",
      from: {},
      to: {
        circular: true,
        // Exception list: Frozen legacy debt. Old cycles are baselined and ignored
        // while any NEW circular dependency will immediately fail CI.
        pathNot: "^src/03-dependency-cruiser-cycles/circular-legacy",
      },
    },
    {
      name: "domain-must-not-depend-on-infra",
      severity: "error",
      comment:
        "Clean Architecture layer boundary: Domain layer must not depend on Infrastructure or Application layer.",
      from: {
        path: "^src/02-project-tags-and-boundaries/packages/domain",
      },
      to: {
        path: "^src/02-project-tags-and-boundaries/packages/(infrastructure|application)",
      },
    },
    {
      name: "feature-billing-isolation",
      severity: "error",
      comment:
        "Feature swimlane isolation: Feature Billing must not depend on Feature Analytics.",
      from: {
        path: "^src/02-project-tags-and-boundaries/packages/feature-billing",
      },
      to: {
        path: "^src/02-project-tags-and-boundaries/packages/feature-analytics",
      },
    },
  ],
  options: {
    doNotFollow: {
      path: "node_modules",
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: "./tsconfig.json",
    },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
      extensions: [".ts", ".d.ts", ".js", ".cjs", ".mjs", ".json"],
    },
    reporterOptions: {
      text: {
        highlightFocused: true,
      },
    },
  },
};
