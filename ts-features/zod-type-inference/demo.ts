/**
 * demo.ts
 *
 * Interactive tour demonstrating `z.input` vs `z.infer` in Zod schemas with inline code.
 */

import { demonstrateInputVsOutput } from "./01-input-vs-output";

const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
};

function codeSnippet(title: string, code: string): void {
  console.log(`  ${colors.dim}┌─ 💻 ${colors.cyan}${title}${colors.dim} ──────────────────────────────────────────${colors.reset}`);
  for (const line of code.trim().split("\n")) {
    console.log(`  ${colors.dim}│${colors.reset}  ${line}`);
  }
  console.log(`  ${colors.dim}└─────────────────────────────────────────────────────────────${colors.reset}\n`);
}

export function runDemo(): void {
  console.log(`\n${colors.bold}${colors.cyan}╔════════════════════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}║  Zod Type Inference: z.input<T> vs z.infer<T>                              ║${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}╚════════════════════════════════════════════════════════════════════════════╝${colors.reset}\n`);

  codeSnippet("Zod Schema with Defaults, Coercion, and Transforms", `
export const AgentDefinitionSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  policy: AgentPolicySchema.default(DEFAULT_AGENT_POLICY), // Optional on input, guaranteed on output
  createdAt: z.coerce.date().default(() => new Date()),     // Accepts string/number, produces Date
  tags: z.string().default("").transform(s => s.split(",").map(t => t.trim())), // string -> string[]
});

export type AgentDefinition = z.infer<typeof AgentDefinitionSchema>;     // Output type
export type AgentDefinitionInput = z.input<typeof AgentDefinitionSchema>; // Input type
  `);

  const { inputProvided, outputProduced, isDateInstance, tagsArray } = demonstrateInputVsOutput();

  console.log(`${colors.bold}${colors.yellow}1. Input Payload (Permissive z.input<T>):${colors.reset}`);
  console.log(`  ${colors.dim}${JSON.stringify(inputProvided, null, 2)}${colors.reset}\n`);

  console.log(`${colors.bold}${colors.green}2. Parsed Domain Model (Guaranteed z.infer<T>):${colors.reset}`);
  console.log(`  Key: ${outputProduced.key}`);
  console.log(`  Policy Max Retries (Defaulted): ${outputProduced.policy.maxRetries}`);
  console.log(`  CreatedAt is Date instance: ${isDateInstance} (${outputProduced.createdAt.toISOString()})`);
  console.log(`  Tags transformed: [${tagsArray.map((t) => `"${t}"`).join(", ")}]\n`);

  console.log(`${colors.bold}${colors.green}✔ Zod input-to-output transformation verified!${colors.reset}\n`);
}

if (import.meta.main) {
  runDemo();
}
