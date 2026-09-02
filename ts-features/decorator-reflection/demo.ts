/**
 * demo.ts
 *
 * Interactive tour demonstrating TypeScript Decorator Reflection and IoC Resolution with inline code.
 */

import {
  Container,
  UserService,
  API_CONFIG_TOKEN,
  HttpClientService,
} from "./01-decorator-reflection-mechanics";

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
  console.log(`${colors.bold}${colors.cyan}║  TypeScript Decorator Reflection & IoC Container Resolution                ║${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}╚════════════════════════════════════════════════════════════════════════════╝${colors.reset}\n`);

  codeSnippet("1. Decorated Classes with Metadata Reflection", `
@Injectable()
export class HttpClientService {
  constructor(
    @Inject(API_CONFIG_TOKEN) public readonly config: ApiConfig,
    public readonly logger: LoggerService
  ) {}

  @Timed()
  public executeRequest(endpoint: string): string { ... }
}

@Injectable()
export class UserService {
  constructor(public readonly http: HttpClientService) {} // Emits 'design:paramtypes'
}
  `);

  const container = new Container();

  // Register token configuration
  container.registerInstance(API_CONFIG_TOKEN, {
    baseUrl: "https://api.example.com",
    timeoutMs: 5000,
  });

  // Resolve top-level UserService (Container resolves HttpClientService -> LoggerService + Config recursively!)
  const userService = container.resolve(UserService);

  console.log(`${colors.bold}${colors.green}1. IoC Tree Resolved Successfully:${colors.reset}`);
  console.log(`  UserService -> HttpClientService -> (LoggerService + API_CONFIG_TOKEN)\n`);

  const user = userService.getUser("usr_9981");
  console.log(`${colors.bold}${colors.yellow}2. Method Invocation with @Timed Decorator:${colors.reset}`);
  console.log(`  Resolved URL: ${user.url}`);

  const http = container.resolve(HttpClientService);
  const timedResult = http.executeRequest("/health") as unknown as { result: string; executionTimeMs: number };
  console.log(`  Execution Time: ${timedResult.executionTimeMs}ms\n`);

  console.log(`${colors.bold}${colors.green}✔ Decorator reflection and IoC container verified!${colors.reset}\n`);
}

if (import.meta.main) {
  runDemo();
}
