import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Per-request store (req, res, memo). Lets the domain code keep calling
 * cookies() / headers() / cache() without passing req around.
 */
export const als = new AsyncLocalStorage();

export function requestContext(req, res, next) {
  als.run({ req, res, memo: new Map() }, () => next());
}

export const currentStore = () => als.getStore() || null;
