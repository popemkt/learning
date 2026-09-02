/**
 * decorator-reflection.test.ts
 *
 * Automated verification of decorator reflection and IoC container.
 */

import { describe, it, expect } from "bun:test";
import {
  Container,
  UserService,
  HttpClientService,
  LoggerService,
  API_CONFIG_TOKEN,
  Injectable,
} from "./01-decorator-reflection-mechanics";

describe("Decorator Reflection & IoC Container", () => {
  it("resolves nested dependency tree automatically via metadata reflection", () => {
    const container = new Container();

    container.registerInstance(API_CONFIG_TOKEN, {
      baseUrl: "https://staging.internal.net",
      timeoutMs: 8000,
    });

    const userService = container.resolve(UserService);
    expect(userService).toBeInstanceOf(UserService);
    expect(userService.http).toBeInstanceOf(HttpClientService);
    expect(userService.http.logger).toBeInstanceOf(LoggerService);
    expect(userService.http.config.baseUrl).toBe("https://staging.internal.net");

    const user = userService.getUser("user_44");
    expect(user.url).toBe("https://staging.internal.net/users/user_44");
  });

  it("caches resolved singletons across multiple resolve calls", () => {
    const container = new Container();
    container.registerInstance(API_CONFIG_TOKEN, { baseUrl: "http://localhost", timeoutMs: 1000 });

    const logger1 = container.resolve(LoggerService);
    const logger2 = container.resolve(LoggerService);
    expect(logger1).toBe(logger2); // Exact same instance
  });

  it("throws clear error when resolving non-decorated class", () => {
    class UndecoratedClass {}

    const container = new Container();
    expect(() => container.resolve(UndecoratedClass)).toThrow("Missing @Injectable()");
  });

  it("times method execution using @Timed decorator", () => {
    const container = new Container();
    container.registerInstance(API_CONFIG_TOKEN, { baseUrl: "http://localhost", timeoutMs: 1000 });

    const http = container.resolve(HttpClientService);
    const response = http.executeRequest("/api/ping") as unknown as { result: string; executionTimeMs: number };

    expect(response.result).toBe("Response from /api/ping");
    expect(response.executionTimeMs).toBeGreaterThanOrEqual(0);
  });
});
