// Minimal localStorage shim for Node-environment vitest. Re-import-safe.
class MemoryStorage {
  private store = new Map<string, string>();
  get length() { return this.store.size; }
  clear() { this.store.clear(); }
  getItem(k: string) { return this.store.has(k) ? this.store.get(k)! : null; }
  setItem(k: string, v: string) { this.store.set(k, String(v)); }
  removeItem(k: string) { this.store.delete(k); }
  key(i: number) { return [...this.store.keys()][i] ?? null; }
}

export function installLocalStorage(): MemoryStorage {
  const ls = new MemoryStorage();
  (globalThis as unknown as { localStorage: MemoryStorage }).localStorage = ls;
  return ls;
}
