import { currentStore } from "../core/requestContext.js";

/** React.cache() replacement: memoised per HTTP request (AsyncLocalStorage). */
export function cache(fn) {
  const id = Symbol(fn.name || "cached");
  return (...args) => {
    const store = currentStore();
    if (!store) return fn(...args);
    const key = `${String(id.description)}:${JSON.stringify(args)}`;
    let bucket = store.memo.get(id);
    if (!bucket) store.memo.set(id, (bucket = new Map()));
    if (!bucket.has(key)) bucket.set(key, fn(...args));
    return bucket.get(key);
  };
}
