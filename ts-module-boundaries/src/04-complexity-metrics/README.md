# Concept 4: Complexity Metrics & Warn-Only Philosophy

> **Layer 4 of the 5-Layer Defense-in-Depth Model**  
> **Core Guarantee**: Highlight internal logic bloat, cyclomatic branching, and deep nesting without forcing counter-productive code shredding.

---

## 1. The Fundamental Problem: Internal Logic Bloat

Layers 1–3 protect the boundaries **between** files, packages, and layers. However, they say nothing about what happens **inside** a single file or function.

Without metric visibility:
- A single function quietly accumulates nested `if/else`, `switch`, loops, and null checks over months.
- Functions begin accepting 7+ positional arguments (`(id, name, type, isVerified, forceSync, timeout, retries, logger)`).
- Code becomes impossible to reason about, unit test, or safely modify without unintended regressions.

---

## 2. The .NET / C# Analogue

| .NET / C# | TypeScript Parity |
| :--- | :--- |
| Visual Studio Code Metrics (Cyclomatic Complexity, Depth of Inheritance) | Oxlint / ESLint `complexity` rule |
| Roslyn Maintainability Index Analyzers | Oxlint / ESLint `max-depth` & `max-params` rules |
| Advisory build warnings (Warning level 3/4) | **Warn-Only Linter Configuration** (`severity: "warn"`) |

---

## 3. The Core Design Decision: Why Warn-Only?

### ⚠️ The Anti-Pattern: Setting Complexity Rules to `"error"`
When teams set complexity limits as hard CI blockers (`severity: "error"`):
1. **"Code Shredding"**: Developers under deadline pressure unnaturally chop a coherent 25-line algorithm into 5 disjointed 1-line private helper functions just to lower the mathematical complexity score of the parent function.
2. **Harder to Read & Debug**: The resulting shredded code is significantly harder to trace and step through in a debugger than the original linear function.
3. **Blocked Emergency Hotfixes**: A critical 1-line production bug fix in an existing legacy function fails CI because the legacy function exceeds the hard threshold.

### ✅ The Solution: Warn-Only as Headlights
- **`severity: "warn"`**: Exit code is `0`. CI stays green.
- **Headlights for Code Review**: The warnings appear directly in terminal output and PR review summaries. Reviewers can spot newly bloated logic and discuss refactoring thoughtfully.
- **No Line Count Rules**: We intentionally omit `max-lines-per-function`. A 50-line flat function executing sequential, well-named steps is clear and readable. Branchiness (`complexity`), deep nesting (`max-depth`), and parameter bloat (`max-params`) are the true drivers of cognitive load.

---

## 4. Configuration: `.oxlintrc.json`

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "rules": {
    "complexity": ["warn", { "max": 5 }],
    "max-depth": ["warn", { "max": 3 }],
    "max-params": ["warn", { "max": 3 }]
  }
}
```

### Metrics Explained:
- **`complexity` (max: 5)**: Number of linearly independent execution paths through a function (driven by `if`, `else`, `? :`, `&&`, `||`, `case`).
- **`max-depth` (max: 3)**: Maximum nesting level of code blocks inside a function.
- **`max-params` (max: 3)**: Number of positional parameters in a function signature. Exceeding 3 signals that a parameter object (DTO / Options object) should be used.

---

## 5. Code Walkthrough in this Folder

```text
04-complexity-metrics/
├── metric-scanner.ts           # AST/lexical scanner measuring complexity, depth & params
├── complex-samples.ts          # Anti-patterns (high complexity, deep nesting, param bloat)
└── clean-samples.ts            # Refactored patterns (guard clauses, lookup tables, DTO objects)
```

### Refactoring Comparison:

#### Anti-Pattern: Tangled Discount Calculation (Complexity: 15, Depth: 2, Params: 5)
```typescript
// ❌ 5 positional params, deeply nested conditions
export function calculateTangledDiscount(
  tier: string, isVip: boolean, yearsActive: number,
  orderTotalCents: number, couponCode?: string
): number {
  if (tier === "enterprise") {
    if (yearsActive > 5) return isVip ? 45 : 35;
    else if (yearsActive > 2) return 30;
    else return 25;
  }
  // ... many more branches
}
```

#### Refactored: Clean Lookup Table & Guard Clauses (Complexity: 2, Depth: 0, Params: 3)
```typescript
// ✅ Intent-revealing lookup table with constant-time resolution
const TIER_BASE_DISCOUNTS: Record<string, number> = {
  enterprise: 25,
  pro: 15,
  standard: 5,
  free: 0
};

export function calculateCleanDiscount(
  tier: string,
  profile: CustomerProfile,
  orderTotalCents: number
): number {
  const base = TIER_BASE_DISCOUNTS[tier] ?? 0;
  const loyaltyBonus = Math.min(profile.yearsActive * 2, 10);
  const vipBonus = profile.isVip ? 10 : 0;
  return Math.min(base + loyaltyBonus + vipBonus, 50);
}
```

---

## 6. How to Run & Verify

```bash
# Run the concept demo (scans complex vs clean samples)
bun run src/demo.ts 4

# Run Oxlint complexity check
bun run lint:oxlint

# Run the test suite
bun test tests/04-complexity-metrics.test.ts
```
