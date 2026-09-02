# Index Access Types (Indexed Access / Lookup Types)

An in-depth guide exploring how index access types (`T[K]`, `T[number]`, `(typeof OBJ)[keyof typeof OBJ]`) extract, unwrap, and constrain types dynamically without redundant interface definitions.

---

## 1. Core Mechanics

| Expression | Meaning | Example |
| :--- | :--- | :--- |
| `T["property"]` | Look up property type from object | `User["id"]` $\rightarrow$ `string` |
| `T["a"]["b"]` | Look up nested property type | `Config["server"]["port"]` $\rightarrow$ `number` |
| `Array<T>[number]` | Extract array element type | `Order["items"][number]` $\rightarrow$ `OrderItem` |
| `Tuple[0]` | Look up positional tuple element | `[string, number][0]` $\rightarrow$ `string` |
| `(typeof OBJ)[keyof typeof OBJ]` | Union of all values in a const object | `(typeof COLORS)[keyof typeof COLORS]` $\rightarrow$ `"#ff0000" \| ...` |

---

## 2. Dynamic Key-Value Constraints (`<K extends keyof T>(key: K, val: T[K])`)

Instead of writing loose setters like `set(key: string, val: any)`, use index access types to guarantee that the value matches the exact type of the key:

```ts
class StateStore<T extends object> {
  // 🔒 COMPILE-TIME: 'value' MUST be of type 'T[K]'
  set<K extends keyof T>(key: K, value: T[K]): void {
    this.state[key] = value;
  }
}
```
