type RETENTION_POLICY = number | null | undefined;

/**
 * A first-in-first-out cache built on top of js Map.
 *
 * The retention policy is either null, or a number denoting the percentage of entries we want to
 * retain when trim is called. E.g. if retentionPolicyPolicy=0.75, then when the size is exceeded it
 * will expunge the first 25% of the entries.
 */
export class FIFOCache<T> {
  private _size: number;
  private retentionPolicy: RETENTION_POLICY;
  private _map: Map<string, T>;

  constructor(size: number, retentionPolicyPolicy: RETENTION_POLICY = null) {
    this._size = size;
    this.retentionPolicy = retentionPolicyPolicy;
    this._map = new Map();
  }

  trim() {
    const maxSize = this._size;

    if (this._map.size <= maxSize) return;

    if (!this.retentionPolicy) {
      while (this._map.size > maxSize) {
        const key = this._map.keys().next().value;
        this._map.delete(key);
      }
    } else {
      while (this._map.size / maxSize > this.retentionPolicy) {
        const key = this._map.keys().next().value;
        this._map.delete(key);
      }
    }
  }

  set(k: string, v: T) {
    this._map.set(k, v);
    this.trim();
  }

  get(k: string) {
    return this._map.get(k);
  }

  delete(k: string) {
    return this._map.delete(k);
  }

  size() {
    return this._map.size;
  }
}
