import '@testing-library/jest-dom';

// jsdom in this environment is launched with `--localstorage-file` but no
// path, which leaves `window.localStorage` as a non-functional stub (missing
// `clear`, etc). Install a reliable in-memory Storage so tests that exercise
// persistence behave deterministically. Methods live on Storage.prototype so
// `vi.spyOn(Storage.prototype, ...)` continues to work for error-path tests.
class MemoryStorage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
}

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: new MemoryStorage(),
});

// Mirror prototype so Storage.prototype spies target the live instance.
Object.defineProperty(globalThis, 'Storage', {
  configurable: true,
  value: MemoryStorage,
});
