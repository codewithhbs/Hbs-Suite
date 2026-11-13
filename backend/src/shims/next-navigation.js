/** Server-side redirect()/notFound(): thrown, turned into HTTP by the error handler. */
export function redirect(url) {
  const e = new Error(`Redirect to ${url}`);
  e.status = 401;
  e.code = "REDIRECT";
  e.location = url;
  throw e;
}

export function notFound() {
  const e = new Error("Not found");
  e.status = 404;
  throw e;
}
