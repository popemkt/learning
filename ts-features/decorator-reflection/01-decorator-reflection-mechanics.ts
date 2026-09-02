/**
 * 01-decorator-reflection-mechanics.ts
 *
 * Demonstrates TypeScript Decorator Reflection & Dependency Injection mechanics:
 * 1. `emitDecoratorMetadata` and `Reflect.getMetadata("design:paramtypes")`
 * 2. `@Injectable()` class decorator
 * 3. `@Inject(token)` custom parameter decorator
 * 4. Lightweight IoC / Dependency Injection Container
 * 5. Method timing/logging decorator
 */

import "reflect-metadata";

// Metadata Keys
const INJECTABLE_WATERMARK = "custom:injectable";
const INJECT_TOKENS_METADATA = "custom:inject_tokens";

// ============================================================================
// 1. Decorators
// ============================================================================

export type Constructor<T = unknown> = new (...args: any[]) => T;

/**
 * Class decorator marking a service as eligible for IoC injection.
 */
export function Injectable(): ClassDecorator {
  return (target: object) => {
    Reflect.defineMetadata(INJECTABLE_WATERMARK, true, target);
  };
}

/**
 * Parameter decorator for injecting token-based dependencies (e.g. config objects).
 */
export function Inject(token: string | symbol): ParameterDecorator {
  return (target: object, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    const existingTokens: Map<number, string | symbol> =
      Reflect.getOwnMetadata(INJECT_TOKENS_METADATA, target) ?? new Map();
    existingTokens.set(parameterIndex, token);
    Reflect.defineMetadata(INJECT_TOKENS_METADATA, existingTokens, target);
  };
}

/**
 * Method decorator wrapping execution with performance timing.
 */
export function Timed(): MethodDecorator {
  return (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) => {
    const originalMethod = descriptor.value as (...args: unknown[]) => unknown;

    descriptor.value = function (...args: unknown[]) {
      const start = performance.now();
      const result = originalMethod.apply(this, args);
      const elapsedMs = performance.now() - start;
      return {
        result,
        executionTimeMs: Number(elapsedMs.toFixed(3)),
      };
    };

    return descriptor;
  };
}

// ============================================================================
// 2. Dependency Injection Container
// ============================================================================

export class Container {
  private readonly singletons = new Map<Constructor | string | symbol, unknown>();

  public registerInstance<T>(token: Constructor<T> | string | symbol, instance: T): void {
    this.singletons.set(token, instance);
  }

  /**
   * Resolves a class constructor and its dependencies recursively using TS metadata.
   */
  public resolve<T>(target: Constructor<T>): T {
    // Return existing singleton if already instantiated
    if (this.singletons.has(target)) {
      return this.singletons.get(target) as T;
    }

    // Check if class was decorated with @Injectable()
    const isInjectable = Reflect.getMetadata(INJECTABLE_WATERMARK, target);
    if (!isInjectable) {
      throw new Error(`Cannot resolve '${target.name}': Missing @Injectable() decorator.`);
    }

    // 🔒 COMPILE-TIME MAGIC: 'design:paramtypes' is emitted by TypeScript compiler!
    const paramTypes: Constructor[] = Reflect.getMetadata("design:paramtypes", target) ?? [];
    const customTokens: Map<number, string | symbol> =
      Reflect.getOwnMetadata(INJECT_TOKENS_METADATA, target) ?? new Map();

    // Resolve each constructor parameter recursively
    const dependencies = paramTypes.map((paramType, index) => {
      // Check if parameter has explicit @Inject(token)
      if (customTokens.has(index)) {
        const token = customTokens.get(index)!;
        if (!this.singletons.has(token)) {
          throw new Error(`Cannot resolve dependency token '${String(token)}' for '${target.name}'.`);
        }
        return this.singletons.get(token);
      }

      // Otherwise resolve by class constructor
      return this.resolve(paramType);
    });

    // Instantiate and cache singleton
    const instance = new target(...dependencies);
    this.singletons.set(target, instance);
    return instance;
  }
}

// ============================================================================
// 3. Concrete Services Demonstrating IoC Tree Resolution
// ============================================================================

export const API_CONFIG_TOKEN = Symbol("API_CONFIG");

export interface ApiConfig {
  baseUrl: string;
  timeoutMs: number;
}

@Injectable()
export class LoggerService {
  public log(msg: string): string {
    return `[Logger]: ${msg}`;
  }
}

@Injectable()
export class HttpClientService {
  constructor(
    @Inject(API_CONFIG_TOKEN) public readonly config: ApiConfig,
    public readonly logger: LoggerService
  ) {}

  @Timed()
  public executeRequest(endpoint: string): string {
    this.logger.log(`Fetching ${this.config.baseUrl}${endpoint}`);
    return `Response from ${endpoint}`;
  }
}

@Injectable()
export class UserService {
  constructor(public readonly http: HttpClientService) {}

  public getUser(userId: string): { id: string; url: string } {
    const res = this.http.executeRequest(`/users/${userId}`);
    return { id: userId, url: `${this.http.config.baseUrl}/users/${userId}` };
  }
}
