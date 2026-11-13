/**
 * Minimal next/server for Express: NextResponse (json/redirect + response cookies)
 * and after() (runs work once the response is sent).
 */
export class NextResponse extends Response {
  constructor(body, init = {}) {
    super(body, init);
    const pending = [];
    this.__cookies = pending;
    this.cookies = {
      set(name, value, opts = {}) {
        if (typeof name === "object") ({ name, value, ...opts } = name);
        pending.push({ op: "set", name, value, opts });
      },
      delete(name) {
        const o = typeof name === "object" ? name : { name };
        pending.push({ op: "delete", name: o.name, opts: o });
      },
    };
  }

  static json(data, init = {}) {
    const headers = new Headers(init.headers || {});
    if (!headers.has("content-type")) headers.set("content-type", "application/json");
    return new NextResponse(JSON.stringify(data), { ...init, headers });
  }

  static redirect(url, init = 307) {
    const status = typeof init === "number" ? init : init?.status || 307;
    return new NextResponse(null, { status, headers: { Location: String(url) } });
  }

  static next() {
    return new NextResponse(null, { status: 200 });
  }
}

export function after(task) {
  setImmediate(() => {
    Promise.resolve()
      .then(() => (typeof task === "function" ? task() : task))
      .catch((err) => console.error("[after]", err?.message || err));
  });
}
