
import { InMemoryFlagStore } from "./InMemoryFlagStore.js";
import { hashStringToInt } from "./hash.js";

/**
 * @typedef {"eq" | "neq" | "in" | "not_in"} ConditionOperator
 *
 * @typedef {Object} Condition
 * @property {string} attribute
 * @property {ConditionOperator} operator
 * @property {any} value
 *
 * @typedef {Object} VariantConfig
 * @property {number} weight
 *
 * @typedef {Object} RolloutConfig
 * @property {number} percentage
 * @property {string} [attribute]
 *
 * @typedef {Object} FlagConfig
 * @property {boolean} enabled
 * @property {string} [description]
 * @property {Condition[]} [conditions]
 * @property {RolloutConfig} [rollout]
 * @property {Object.<string, VariantConfig>} [variants]
 */

/**
 * @typedef {Object} FlagStore
 * @property {(key: string) => FlagConfig | undefined} getFlag
 * @property {() => Record<string, FlagConfig>} getAllFlags
 * @property {(key: string, config: FlagConfig) => void} upsertFlag
 * @property {(key: string) => void} deleteFlag
 */

/**
 * @typedef {Object} FeatureFlagClientOptions
 * @property {FlagStore} [store]
 * @property {string} [seed]
 * @property {string} [defaultRolloutAttribute]
 */

export class FeatureFlagClient {
  /**
   * @param {FeatureFlagClientOptions} options
   */
  constructor(options = {}) {
    this.store = options.store || new InMemoryFlagStore();
    this.seed = options.seed || "feature-flags-default-seed";
    this.defaultRolloutAttribute = options.defaultRolloutAttribute || "userId";
  }

  /**
   * Evaluate a flag and return full details.
   *
   * @param {string} key
   * @param {Object} [context]
   * @returns {{ enabled: boolean, variant: string | null, flag?: FlagConfig }}
   */
  evaluate(key, context = {}) {
    const flag = this.store.getFlag(key);
    if (!flag) {
      return { enabled: false, variant: null };
    }

    // Base enabled status
    if (!flag.enabled) {
      return { enabled: false, variant: null, flag };
    }

    // Conditions
    if (Array.isArray(flag.conditions) && flag.conditions.length > 0) {
      const passes = this._evaluateConditions(flag.conditions, context);
      if (!passes) {
        return { enabled: false, variant: null, flag };
      }
    }

    // Rollout (percentage based)
    if (flag.rollout && typeof flag.rollout.percentage === "number") {
      const percentage = Math.max(0, Math.min(100, flag.rollout.percentage));
      if (percentage === 0) {
        return { enabled: false, variant: null, flag };
      }

      if (percentage < 100) {
        const attr = flag.rollout.attribute || this.defaultRolloutAttribute;
        const identifier = String(context[attr] ?? "");
        const bucket = this._computeBucket(key, identifier);
        if (bucket >= percentage) {
          return { enabled: false, variant: null, flag };
        }
      }
    }

    // Variants
    const variant = this._selectVariant(key, flag, context);

    return { enabled: true, variant, flag };
  }

  /**
   * Check if a flag is enabled.
   *
   * @param {string} key
   * @param {Object} [context]
   * @returns {boolean}
   */
  isEnabled(key, context = {}) {
    return this.evaluate(key, context).enabled;
  }

  /**
   * Get the assigned variant for a flag.
   *
   * @param {string} key
   * @param {Object} [context]
   * @returns {string | null}
   */
  getVariant(key, context = {}) {
    return this.evaluate(key, context).variant;
  }

  /**
   * Evaluate simple conditions.
   *
   * @private
   * @param {Condition[]} conditions
   * @param {Object} context
   * @returns {boolean}
   */
  _evaluateConditions(conditions, context) {
    for (const cond of conditions) {
      const actual = context[cond.attribute];
      const expected = cond.value;

      switch (cond.operator) {
        case "eq":
          if (actual !== expected) return false;
          break;
        case "neq":
          if (actual === expected) return false;
          break;
        case "in":
          if (!Array.isArray(expected) || !expected.includes(actual)) return false;
          break;
        case "not_in":
          if (Array.isArray(expected) && expected.includes(actual)) return false;
          break;
        default:
          // Unknown operator -> fail safe (disable)
          return false;
      }
    }
    return true;
  }

  /**
   * Compute a stable bucket between 0 and 99 for rollout.
   *
   * @private
   * @param {string} key
   * @param {string} identifier
   * @returns {number}
   */
  _computeBucket(key, identifier) {
    const str = `${this.seed}:${key}:${identifier}`;
    const hash = hashStringToInt(str, 100);
    return hash;
  }

  /**
   * Select a variant based on weights.
   *
   * @private
   * @param {string} key
   * @param {FlagConfig} flag
   * @param {Object} context
   * @returns {string | null}
   */
  _selectVariant(key, flag, context) {
    const variants = flag.variants;
    if (!variants || typeof variants !== "object") {
      return null;
    }

    const entries = Object.entries(variants);
    if (entries.length === 0) return null;

    const totalWeight = entries.reduce((sum, [, cfg]) => {
      const w = typeof cfg.weight === "number" ? cfg.weight : 0;
      return sum + Math.max(0, w);
    }, 0);

    if (totalWeight <= 0) {
      return null;
    }

    const attr = (flag.rollout && flag.rollout.attribute) || this.defaultRolloutAttribute;
    const identifier = String(context[attr] ?? "");
    const str = `${this.seed}:variant:${key}:${identifier}`;
    const bucket = hashStringToInt(str, totalWeight);

    let cumulative = 0;
    for (const [name, cfg] of entries) {
      const w = Math.max(0, typeof cfg.weight === "number" ? cfg.weight : 0);
      cumulative += w;
      if (bucket < cumulative) {
        return name;
      }
    }

    return entries[entries.length - 1][0] || null;
  }
}
