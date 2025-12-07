
# Lightweight Feature Flags

A **self-hosted**, zero-dependency JavaScript library for feature flags with:

- ✅ Simple on/off flags  
- ✅ A/B variants  
- ✅ Gradual rollouts (percentage-based)  
- ✅ Pluggable storage (in-memory, localStorage, or your own)  
- ✅ Works in Node.js and the browser

No SaaS, no external calls — you own your data and hosting.

## Installation

Copy this folder into your project or install it as a local dependency:

```bash
# from one level above the folder
npm install ./lightweight-feature-flags
```

Or just copy `src/` into your codebase and import from it directly.

## Quick Start (Node.js)

```js
import { FeatureFlagClient, InMemoryFlagStore } from "lightweight-feature-flags/src/index.js";

const store = new InMemoryFlagStore();
const ff = new FeatureFlagClient({ store });

// 1. Register a simple flag
store.upsertFlag("new-dashboard", {
  enabled: true,
  description: "Rollout of the new dashboard UI",
});

// 2. Check if enabled for a given user
const context = { userId: "user-123" };
if (ff.isEnabled("new-dashboard", context)) {
  console.log("Show new dashboard");
} else {
  console.log("Show old dashboard");
}
```

## A/B Testing Example

```js
import { FeatureFlagClient, InMemoryFlagStore } from "lightweight-feature-flags/src/index.js";

const store = new InMemoryFlagStore();
const ff = new FeatureFlagClient({ store });

store.upsertFlag("checkout-button-text", {
  enabled: true,
  description: "Experiment with checkout button label",
  rollout: {
    percentage: 100,
    attribute: "userId",
  },
  variants: {
    control: { weight: 50 },
    variantA: { weight: 25 },
    variantB: { weight: 25 },
  },
});

const context = { userId: "user-42" };
const variant = ff.getVariant("checkout-button-text", context);

switch (variant) {
  case "variantA":
    console.log("Show 'Buy Now'");
    break;
  case "variantB":
    console.log("Show 'Complete Order'");
    break;
  default:
    console.log("Show 'Checkout'");
}
```

## Gradual Rollouts (Percentage-Based)

```js
store.upsertFlag("search-v2", {
  enabled: true,
  description: "New search algorithm",
  rollout: {
    percentage: 10,       // 10% of users
    attribute: "userId",  // use userId for bucketing
  },
});

const ctxA = { userId: "alice" };
const ctxB = { userId: "bob" };

console.log(ff.isEnabled("search-v2", ctxA)); // maybe true
console.log(ff.isEnabled("search-v2", ctxB)); // maybe false
```

The same user will consistently see the same result thanks to a stable hash function.

## Flag Definition Shape

Each flag is a plain object:

```ts
type ConditionOperator = "eq" | "neq" | "in" | "not_in";

type Condition = {
  attribute: string;
  operator: ConditionOperator;
  value: any;
};

type VariantConfig = {
  weight: number; // relative percentage weight (doesn't need to sum to 100 exactly)
};

type RolloutConfig = {
  percentage: number;     // 0–100
  attribute?: string;     // which context attribute to hash, default: "userId"
};

type FlagConfig = {
  enabled: boolean;
  description?: string;
  conditions?: Condition[];
  rollout?: RolloutConfig;
  variants?: Record<string, VariantConfig>;
};
```

## Context

The **context** is any plain object you pass to `isEnabled` / `getVariant`:

```js
const context = {
  userId: "user-123",
  country: "CA",
  plan: "pro",
};

const enabled = ff.isEnabled("some-flag", context);
```

Conditions and rollout bucketing will read attributes from this object.

## Conditions

You can restrict flags to certain users using simple conditions:

```js
store.upsertFlag("pro-only-feature", {
  enabled: true,
  conditions: [
    { attribute: "plan", operator: "eq", value: "pro" },
  ],
});
```

Supported operators:

- `"eq"` – equals
- `"neq"` – not equals
- `"in"` – value is in an array
- `"not_in"` – value is not in an array

If **any** condition fails, the flag is considered disabled for that context.

## Storage

### InMemoryFlagStore (default, multi-platform)

Good for:

- Node.js services
- Tests
- Short-lived workers

```js
import { InMemoryFlagStore } from "lightweight-feature-flags/src/index.js";

const store = new InMemoryFlagStore();
store.upsertFlag("my-flag", { enabled: true });
```

### LocalStorageFlagStore (browser-only)

Persists flags to `window.localStorage`:

```js
import { LocalStorageFlagStore } from "lightweight-feature-flags/src/index.js";

const store = new LocalStorageFlagStore({ key: "my-feature-flags" });
```

> Note: This store will throw if `localStorage` is not available.

### Custom Store

You can implement your own store (e.g., backed by a database or API):

```ts
interface FlagStore {
  getFlag(key: string): FlagConfig | undefined;
  getAllFlags(): Record<string, FlagConfig>;
  upsertFlag(key: string, config: FlagConfig): void;
  deleteFlag(key: string): void;
}
```

Pass it into the client:

```js
const ff = new FeatureFlagClient({ store: myStore });
```

## Using in the Browser (No Build Tools)

See `examples/browser-basic.html`:

```html
<script type="module">
  import { FeatureFlagClient, InMemoryFlagStore } from "../src/index.js";

  const store = new InMemoryFlagStore();
  const ff = new FeatureFlagClient({ store });

  store.upsertFlag("demo", {
    enabled: true,
    rollout: { percentage: 50, attribute: "userId" },
  });

  const context = { userId: "anon-123" };
  document.body.textContent = ff.isEnabled("demo", context)
    ? "You see the new experience!"
    : "You see the classic experience.";
</script>
```

## API Reference

### `new FeatureFlagClient(options)`

```ts
type FeatureFlagClientOptions = {
  store?: FlagStore;      // default: new InMemoryFlagStore()
  seed?: string;          // global seed for hashing (for multi-service consistency)
  defaultRolloutAttribute?: string; // default: "userId"
};
```

### `ff.isEnabled(key, context?) => boolean`

Evaluates whether a flag is enabled for the given context.

### `ff.getVariant(key, context?) => string | null`

Returns the name of the assigned variant, or `null` if no variant applies.

### `ff.evaluate(key, context?) => { enabled: boolean; variant: string | null; flag?: FlagConfig }`

Low-level method that returns full evaluation details.

## Design Goals

- **Self-hosted first** – no external calls, no telemetry.  
- **Deterministic** – same user + same flag → same result.  
- **Small API surface** – easy to learn in minutes.  
- **Composable** – plug in your own persistence and admin UI later.

## License

MIT – do whatever you want, but attribution is appreciated.
