# Zod Type Inference: `z.input<T>` vs `z.infer<T>`

An in-depth guide to understanding how schema transformations, default values, and coercion create two distinct TypeScript types for a single schema: the **Input Type** (`z.input<T>`) and the **Output/Inferred Type** (`z.infer<T>` / `z.output<T>`).

---

## 1. Why Do `z.input` and `z.infer` Differ?

In TypeScript, static interfaces describe an object in memory at a single point in time. However, in data pipelines and web APIs, data passes through a **transformation lifecycle**:

```
┌───────────────────────────────────────┐
│       External Boundary / HTTP        │
│   (Missing fields, ISO strings, etc.) │
└───────────────────┬───────────────────┘
                    │
                    ▼  z.input<typeof Schema>  (Permissive, optional defaults)
┌───────────────────────────────────────┐
│          Zod Schema Parser            │
│  (.default(), .coerce(), .transform())│
└───────────────────┬───────────────────┘
                    │
                    ▼  z.infer<typeof Schema>  (Guaranteed fields, Date instances)
┌───────────────────────────────────────┐
│             Domain Logic              │
│  (Zero undefined checks, typed spine) │
└───────────────────────────────────────┘
```

---

## 2. The 3 Primary Drivers of Type Divergence

| Schema Feature | `z.input<typeof Schema>` | `z.infer<typeof Schema>` | Why? |
| :--- | :--- | :--- | :--- |
| `z.string().default("test")` | `string \| undefined` | `string` | Callers can omit the field; parser fills in default |
| `z.coerce.date()` | `string \| number \| Date` | `Date` | Accepts ISO strings or timestamps; emits real `Date` |
| `z.string().transform(s => s.split(","))` | `string` | `string[]` | Input is comma-separated string; output is array |

---

## 3. Production Impact

In NestJS controllers or API handlers:
```ts
// ❌ WRONG: Typing incoming request with z.infer forces callers to supply default fields!
@Post()
createAgent(@Body() body: AgentDefinition) { ... }

// ✅ CORRECT: Incoming request is typed as z.input; service receives z.infer
@Post()
createAgent(@Body() body: AgentDefinitionInput): AgentDefinition {
  return this.agentService.create(AgentDefinitionSchema.parse(body));
}
```
