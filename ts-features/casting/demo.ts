/**
 * demo.ts
 *
 * Interactive tour & executable demonstration of TypeScript Type Assertions,
 * Chain Casting Hazards, and Safe Production Patterns.
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
};

function banner(title: string): void {
  console.log(`\n${colors.bold}${colors.cyan}╔════════════════════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}║  ${title.padEnd(74)}║${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}╚════════════════════════════════════════════════════════════════════════════╝${colors.reset}\n`);
}

function section(title: string): void {
  console.log(`${colors.bold}${colors.yellow}▶ ${title}${colors.reset}`);
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
  
  const upcast = demonstrateUpcasting();
  success(`Upcast AdminUser -> Entity: ID = ${upcast.asserted.id}`);
  info(`At runtime, underlying object retains role='${Reflect.get(upcast.asserted, "role")}' (Structural truth)`);

  const downcast = demonstrateDowncasting({ id: "usr_007" });
  success(`Downcast Entity -> User: ID = ${downcast.id}`);
  info(`downcast.email is '${downcast.email}' at runtime (undefined because downcasting is unchecked!)`);

  const erasure = demonstrateTypeErasure();
  warning(`Type Erasure: ("12345" as number) typeof at runtime = '${erasure.runtimeType}' (NOT number!)`);

  const overlap = explainOverlapRule();
  info(`Overlap Rule: Disjoint types (e.g. string as number) are rejected at compile-time (TS2352)`);

  console.log();

  // --------------------------------------------------------------------------
  // SECTION 2: Chain Casting Hazards (as unknown as T)
  // --------------------------------------------------------------------------
  section("2. Chain Casting Hazards ('as unknown as T')");
  console.log(`  ${colors.dim}Bypassing the compiler safety net creates silent runtime catastrophes:${colors.reset}\n`);

  // Hazard 1: Missing Method
  const hazard1 = simulateMissingMethodCrash();
  failure(`Hazard 1 (Missing Method): fakeGateway.charge(2500) threw:`);
  console.log(`    ${colors.red}${hazard1.errorThrown}${colors.reset}`);
  info(`Compile-time: ${hazard1.compileTimeView}`);

  // Hazard 2: Deserialization
  const hazard2 = simulateDeserializationBug();
  failure(`Hazard 2 (Deserialization Bug): profile.settings.notifications.email threw:`);
  console.log(`    ${colors.red}${hazard2.errorThrown}${colors.reset}`);

  // Hazard 3: Prototype Mismatch
  const hazard3 = simulatePrototypeMismatch();
  failure(`Hazard 3 (Class Prototype Invalidation): account.deposit(1000) threw:`);
  console.log(`    ${colors.red}${hazard3.errorThrown}${colors.reset}`);
  info(`Object was plain JSON literal, not instantiated via 'new BankAccount()'`);

  // Hazard 4: Date Coercion
  const hazard4 = simulateDateCoercionBug();
  failure(`Hazard 4 (Date Coercion Failure): order.placedAt.getFullYear() threw:`);
  console.log(`    ${colors.red}${hazard4.errorThrown}${colors.reset}`);
  info(`Runtime type of placedAt was '${hazard4.rawType}', not Date instance`);

  console.log();

  // --------------------------------------------------------------------------
  // SECTION 3: Safe Production-Grade Alternatives
  // --------------------------------------------------------------------------
  section("3. Safe Production Alternatives");

  // Alternative 1: Type Guards
  const validProfile = {
    id: "usr_101",
    name: "Alice",
    settings: { notifications: { email: true, sms: false } },
  };
  const invalidProfile = { id: "usr_102", name: "Bob" };

  if (isUserProfile(validProfile)) {
    success(`Type Guard (isUserProfile): Valid profile safely narrowed -> email = ${validProfile.settings.notifications.email}`);
  }
  if (!isUserProfile(invalidProfile)) {
    success(`Type Guard (isUserProfile): Malformed profile safely rejected without crashing`);
  }

  // Alternative 2: Schema Parsing
  const rawOrder = {
    orderId: "ord_990",
    totalCents: 4950,
    placedAt: "2026-08-30T12:00:00.000Z",
  };
  const parseResult = parseOrderPayload(rawOrder);
  if (parseResult.success) {
    const year = parseResult.data.placedAt.getFullYear();
    success(`Schema Parser: Successfully parsed and instantiated Date -> Year = ${year}`);
  }

  const badOrder = { orderId: "", totalCents: -500, placedAt: "not-a-date" };
  const badParseResult = parseOrderPayload(badOrder);
  if (!badParseResult.success) {
    success(`Schema Parser: Defensively caught ${badParseResult.errors.length} validation errors:`);
    for (const err of badParseResult.errors) {
      info(`  Field '${err.path}': ${err.message}`);
    }
  }

  // Alternative 3: Domain Entity Mappers
  const account = mapDtoToBankAccount({
    account_number: "ACC-9988",
    initial_balance_cents: 10000,
  });
  account.deposit(5000);
  success(`Domain Mapper: BankAccount instantiated via constructor -> Balance = $${(account.getBalance() / 100).toFixed(2)}`);

  // Alternative 4: Discriminated Unions
  const paymentSummary = formatPaymentDetails({
    kind: "CRYPTO_WALLET",
    address: "0x71C...392",
    network: "ETH",
  });
  success(`Discriminated Union: Exhaustively formatted -> ${paymentSummary}`);

  // Alternative 5: satisfies operator
  const satisfiesDemo = demonstrateSatisfies();
  success(`'satisfies' Operator: Verified RouteConfig without widening method literal '${satisfiesDemo.methodExactLiteral}'`);

  // Alternative 6: as const
  const constDemo = demonstrateConstAssertion();
  success(`'as const' Assertion: Created immutable literal registry (${constDemo.rolesCount} roles)`);

  console.log(`\n${colors.bold}${colors.green}✨ All demonstrations completed successfully!${colors.reset}\n`);
}

// Execute if run directly
if (import.meta.main) {
  runDemo();
}
