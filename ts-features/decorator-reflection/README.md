# TypeScript Decorator Reflection & Dependency Injection

An in-depth guide to understanding how TypeScript's `experimentalDecorators` and `emitDecoratorMetadata` compiler options work under the hood, enabling frameworks like NestJS, Angular, and TypeORM to inspect and inject constructor dependencies.

---

## 1. How Decorator Reflection Works

When `emitDecoratorMetadata: true` is enabled in `tsconfig.json`, the TypeScript compiler extracts the static types of constructor parameters, properties, and method return values, serializing them into JavaScript calls:

```ts
// TypeScript Source:
@Injectable()
class UserService {
  constructor(private http: HttpClientService, private logger: LoggerService) {}
}

// Emitted JavaScript:
__decorate([
  Injectable(),
  __metadata("design:paramtypes", [HttpClientService, LoggerService])
], UserService);
```

At runtime, `Reflect.getMetadata("design:paramtypes", UserService)` returns `[HttpClientService, LoggerService]`.

---

## 2. Parameter Decorators (`@Inject(TOKEN)`)

TypeScript cannot emit metadata for interfaces (because interfaces are erased at runtime). To inject an interface (like `ApiConfig`), use a custom parameter decorator with a `Symbol` token:

```ts
class HttpClientService {
  constructor(@Inject(API_CONFIG_TOKEN) private config: ApiConfig) {}
}
```

The parameter decorator records that parameter index `0` requires `API_CONFIG_TOKEN`, allowing the container to resolve non-class tokens.
