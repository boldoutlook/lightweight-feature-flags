
/**
 * @typedef {Object} InMemoryFlagStoreOptions
 * @property {Record<string, any>} [initialFlags]
 */

export class InMemoryFlagStore {
  /**
   * @param {InMemoryFlagStoreOptions} [options]
   */
  constructor(options = {}) {
    this._flags = { ...(options.initialFlags || {}) };
  }

  /**
   * @param {string} key
   * @returns {any | undefined}
   */
  getFlag(key) {
    return this._flags[key];
  }

  /**
   * @returns {Record<string, any>}
   */
  getAllFlags() {
    return { ...this._flags };
  }

  /**
   * @param {string} key
   * @param {any} config
   */
  upsertFlag(key, config) {
    this._flags[key] = config;
  }

  /**
   * @param {string} key
   */
  deleteFlag(key) {
    delete this._flags[key];
  }
}
