
/**
 * A simple localStorage-backed flag store for browser environments.
 *
 * @typedef {Object} LocalStorageFlagStoreOptions
 * @property {string} [key] - The localStorage key to use.
 */

export class LocalStorageFlagStore {
  /**
   * @param {LocalStorageFlagStoreOptions} [options]
   */
  constructor(options = {}) {
    this.storageKey = options.key || "feature-flags";
    this._ensureStorageAvailable();
    this._flags = this._load();
  }

  _ensureStorageAvailable() {
    if (typeof window === "undefined" || !window.localStorage) {
      throw new Error("LocalStorageFlagStore can only be used in a browser with localStorage.");
    }
  }

  _load() {
    const raw = window.localStorage.getItem(this.storageKey);
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    } catch (_) {
      // ignore corrupted data
    }
    return {};
  }

  _save() {
    window.localStorage.setItem(this.storageKey, JSON.stringify(this._flags));
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
    this._save();
  }

  /**
   * @param {string} key
   */
  deleteFlag(key) {
    delete this._flags[key];
    this._save();
  }
}
