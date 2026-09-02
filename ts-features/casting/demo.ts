/**
 * demo.ts
 *
 * Interactive tour & executable demonstration of TypeScript Type Assertions,
 * Chain Casting Hazards, and Safe Production Patterns with inline code visualization.
 */

import {
  demonstrateUpcasting,
  demonstrateDowncasting,
  explainOverlapRule,
  demonstrateTypeErasure,
} from "./01-type-assertion-mechanics";

import {
  simulateMissingMethodCrash,
  simulateDeserializationBug,
  simulatePrototypeMismatch,
  simulateDateCoercionBug,
} from "./02-chain-casting-hazards";

import {
  isUserProfile,
  parseOrderPayload,
  mapDtoToBankAccount,
  formatPaymentDetails,
  demonstrateSatisfies,
  demonstrateConstAssertion,
} from "./03-safe-alternatives";

import {
  demonstratePaletteSafety,
  demonstrateTypoCatching,
  getRoute,
  activeFlags,
} from "./04-as-vs-satisfies";

// ANSI Color Helpers
const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  bgDark: "\x1b[48;5;236m",
};

function banner(title: string): void {
  console.log(`\n${colors.bold}${colors.cyan}╔════════════════════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}║  ${title.padEnd(74)}║${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}╚════════════════════════════════════════════════════════════════════════════╝${colors.reset}\n`);
}

function section(title: string): void {
  console.log(`\n${colors.bold}${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bold}${colors.yellow}▶ ${title}${colors.reset}`);
  console.log(`${colors.bold}${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
}

function codeSnippet(title: string, code: string): void {
  console.log(`  ${colors.dim}┌─ 💻 ${colors.cyan}${title}${colors.dim} ──────────────────────────────────────────${colors.reset}`);
  for (const line of code.trim().split("\n")) {
    console.log(`  ${colors.dim}│${colors.reset}  ${line}`);
  }
  console.log(`  ${colors.dim}└─────────────────────────────────────────────────────────────${colors.reset}`);
}

function success(msg: string): void {
  console.log(`  ${colors.green}✔ ${msg}${colors.reset}`);
}

function warning(msg: string): void {
  console.log(`  ${colors.yellow}⚠️  ${msg}${colors.reset}`);
}

function failure(msg: string): void {
  console.log(`  ${colors.red}✖ ${msg}${colors.reset}`);
}

function info(msg: string): void {
  console.log(`  ${colors.dim}ℹ ${msg}${colors.reset}`);
}

export function runDemo(): void {
  banner("TypeScript Casting & Type Assertion Deep Dive");

  // --------------------------------------------------------------------------
  // SECTION 1: Single Assertion Mechanics & Type Erasure
  // --------------------------------------------------------------------------
  section("1. Type Assertion Mechanics (as T)");
  
  codeSnippet("Upcasting & Type Erasure", `
const admin: AdminUser = { id: "usr_9981", role: "admin", permissions: [...] };
const entity = admin as Entity; // Upcast: wide compile-time type, object untouched at runtime

const stringVal: unknown = "12345";
const num = stringVal as number; // ⚠️ ZERO runtime JS code generated! (typeof is still "string")
  `);

  const upcast = demonstrateUpcasting();
  success(`Upcast AdminUser -> Entity: ID = ${upcast.asserted.id}`);
  info(`Runtime Reality: Underlying object still has role='${Reflect.get(upcast.asserted, "role")}' in memory`);

  const downcast = demonstrateDowncasting({ id: "usr_007" });
  success(`Downcast Entity -> User: ID = ${downcast.id}`);
  info(`Runtime Reality: downcast.email is '${downcast.email}' (undefined because downcasting is unchecked)`);

  const erasure = demonstrateTypeErasure();
  warning(`Type Erasure: ("12345" as number) -> typeof at runtime is '${erasure.runtimeType}' (NOT number!)`);

  const overlap = explainOverlapRule();
  info(`Overlap Rule: Disjoint types (e.g. ("hello" as number)) are rejected at compile-time with TS2352`);

  // --------------------------------------------------------------------------
  // SECTION 2: Chain Casting Hazards (as unknown as T)
  // --------------------------------------------------------------------------
  section("2. Chain Casting Hazards ('as unknown as T')");
  console.log(`  ${colors.dim}Why double assertion is a dangerous anti-pattern:${colors.reset}\n`);

  // Hazard 1: Missing Method
  codeSnippet("Hazard 1: Missing Method / The Type Illusion", `
const fakeGateway = ({ refund: () => true } as unknown) as PaymentGateway;
// 🔒 COMPILE-TIME: Compiles with 0 errors! TS believes .charge() exists.
fakeGateway.charge(2500); // 💥 RUNTIME CRASH
  `);
  const hazard1 = simulateMissingMethodCrash();
  failure(`fakeGateway.charge(2500) threw at runtime:`);
  console.log(`    ${colors.red}${hazard1.errorThrown}${colors.reset}\n`);

  // Hazard 2: Deserialization
  codeSnippet("Hazard 2: Deserialization & Nested Undefined Property Access", `
const parsed = JSON.parse('{"id": "usr_404", "name": "Jane"}');
const profile = (parsed as unknown) as UserProfile; // TS assumes .settings exists!
console.log(profile.settings.notifications.email);  // 💥 RUNTIME CRASH
  `);
  const hazard2 = simulateDeserializationBug();
  failure(`profile.settings.notifications.email threw at runtime:`);
  console.log(`    ${colors.red}${hazard2.errorThrown}${colors.reset}\n`);

  // Hazard 3: Prototype Mismatch
  codeSnippet("Hazard 3: Class Prototype Invalidation", `
const plainObj = { accountNumber: "ACC-123", balanceCents: 50000 };
const account = (plainObj as unknown) as BankAccount; // NOT created via 'new BankAccount()'
account.deposit(1000); // 💥 RUNTIME CRASH: deposit is not in prototype chain
  `);
  const hazard3 = simulatePrototypeMismatch();
  failure(`account.deposit(1000) threw at runtime:`);
  console.log(`    ${colors.red}${hazard3.errorThrown}${colors.reset}\n`);

  // Hazard 4: Date Coercion
  codeSnippet("Hazard 4: Date / Primitive Coercion Failure", `
const parsed = JSON.parse('{"orderId": "ord_1", "placedAt": "2026-08-30T10:00:00Z"}');
const order = (parsed as unknown) as OrderPayload; // ISO string forced to Date!
order.placedAt.getFullYear(); // 💥 RUNTIME CRASH: placedAt is a string, not a Date
  `);
  const hazard4 = simulateDateCoercionBug();
  failure(`order.placedAt.getFullYear() threw at runtime:`);
  console.log(`    ${colors.red}${hazard4.errorThrown}${colors.reset}\n`);

  // --------------------------------------------------------------------------
  // SECTION 3: Safe Production-Grade Alternatives
  // --------------------------------------------------------------------------
  section("3. Safe Production Alternatives (Guards, Schemas, Mappers)");

  codeSnippet("Pattern A: User-Defined Type Guard (x is T)", `
function isUserProfile(val: unknown): val is UserProfile {
  return typeof val === "object" && val !== null && "id" in val && "settings" in val ...;
}
if (isUserProfile(raw)) {
  console.log(raw.settings.notifications.email); // ✅ Type-safe narrowing!
}
  `);
  const validProfile = { id: "usr_101", name: "Alice", settings: { notifications: { email: true, sms: false } } };
  const invalidProfile = { id: "usr_102", name: "Bob" };
  if (isUserProfile(validProfile)) success(`Type Guard: Valid profile narrowed safely -> email = ${validProfile.settings.notifications.email}`);
  if (!isUserProfile(invalidProfile)) success(`Type Guard: Malformed profile safely rejected without crashing`);

  console.log();
  codeSnippet("Pattern B: Schema Parser ('Parse, Don't Validate')", `
function parseOrder(raw: unknown): Result<OrderPayload, Error> {
  // Validates numbers, parses ISO date strings to real Date instances, returns typed Result
}
  `);
  const rawOrder = { orderId: "ord_990", totalCents: 4950, placedAt: "2026-08-30T12:00:00.000Z" };
  const parseResult = parseOrderPayload(rawOrder);
  if (parseResult.success) {
    success(`Schema Parser: Successfully parsed ISO string to Date -> Year = ${parseResult.data.placedAt.getFullYear()}`);
  }

  console.log();
  codeSnippet("Pattern C: Domain Entity Mapper / Factory Function", `
function mapToBankAccount(dto: RawAccountDto): BankAccount {
  return new BankAccount(dto.account_number, dto.initial_balance_cents); // ✅ Genuine prototype!
}
  `);
  const account = mapDtoToBankAccount({ account_number: "ACC-9988", initial_balance_cents: 10000 });
  account.deposit(5000);
  success(`Domain Mapper: Instantiated via constructor -> Balance = $${(account.getBalance() / 100).toFixed(2)}`);

  console.log();
  codeSnippet("Pattern D: Discriminated Unions + Exhaustive Checking", `
type PaymentMethod = { kind: "CARD"; ... } | { kind: "CRYPTO"; network: "ETH"; ... };
switch (method.kind) {
  case "CARD": return ...;
  case "CRYPTO": return ...;
  default: const _exhaustive: never = method; throw new Error(...);
}
  `);
  const paymentSummary = formatPaymentDetails({ kind: "CRYPTO_WALLET", address: "0x71C...392", network: "ETH" });
  success(`Discriminated Union: ${paymentSummary}`);

  // --------------------------------------------------------------------------
  // SECTION 4: as vs. satisfies Operator Comparison
  // --------------------------------------------------------------------------
  section("4. 'as' vs. 'satisfies' Operator Comparison");
  
  codeSnippet("'as' (Widens/Loses specific types) vs 'satisfies' (Preserves exact literals)", `
type Palette = Record<string, string | [number, number, number]>;

// With 'satisfies':
const palette = { primary: "#3b82f6", accent: [255, 128, 0] } satisfies Palette;
palette.primary.toUpperCase(); // ✅ TS knows primary is string!
palette.accent[0];            // ✅ TS knows accent is array!

// With 'as Palette':
// palette.primary.toUpperCase(); // ❌ Error: Property toUpperCase does not exist on array union
  `);

  const palette = demonstratePaletteSafety();
  success(`'satisfies' Type Preservation: 'palette.primary' retains string (${palette.primaryUpper}), 'accent' retains array (red=${palette.accentRedChannel})`);
  
  const typos = demonstrateTypoCatching();
  success(`'satisfies' catches missing/misspelled properties at compile time; 'as' silences them`);
  
  const route = getRoute("home");
  success(`'satisfies' preserves exact key autocomplete: home route -> '${route}'`);
  
  info(`'as const satisfies': ALLOWED_DOMAINS[0] = '${activeFlags.ALLOWED_DOMAINS[0]}' (Immutable tuple & contract safe)`);

  console.log(`\n${colors.bold}${colors.green}✨ All casting demonstrations completed!${colors.reset}\n`);
}

if (import.meta.main) {
  runDemo();
}
