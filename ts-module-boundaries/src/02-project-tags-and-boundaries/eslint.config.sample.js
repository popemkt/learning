/**
 * Sample ESLint flat configuration demonstrating @nx/enforce-module-boundaries.
 *
 * In a real Nx monorepo, this configuration replaces hundreds of manual architecture unit tests
 * with instant, build-time IDE and CI linting errors whenever an illegal cross-boundary import occurs.
 */
import nxPlugin from "@nx/eslint-plugin";

export default [
  {
    files: ["packages/**/*.ts", "packages/**/*.js"],
    plugins: {
      "@nx": nxPlugin,
    },
    rules: {
      "@nx/enforce-module-boundaries": [
        "error",
        {
          enforceBuildableLibDependency: true,
          allow: [],
          depConstraints: [
            // ==========================================
            // LAYER BOUNDARIES (Clean Architecture)
            // ==========================================
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
              onlyDependOnLibsWithTags: [
                "layer:infrastructure",
                "layer:application",
                "layer:domain",
              ],
            },
            {
              sourceTag: "layer:feature",
              onlyDependOnLibsWithTags: [
                "layer:feature",
                "layer:application",
                "layer:domain",
              ],
            },

            // ==========================================
            // SCOPE / SWIMLANE BOUNDARIES
            // ==========================================
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
          ],
        },
      ],
    },
  },
];
