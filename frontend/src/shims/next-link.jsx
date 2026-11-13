import { forwardRef } from "react";
import { Link as RouterLink } from "react-router-dom";
import { apiUrl } from "@/lib/api-base";

function toHref(href) {
  if (!href || typeof href === "string") return href || "";
  const qs = href.query ? `?${new URLSearchParams(href.query)}` : "";
  return `${href.pathname || ""}${qs}${href.hash || ""}`;
}

/** next/link -> react-router Link (external, hash, mail, /api downloads stay <a>). */
const Link = forwardRef(function Link({ href, prefetch: _p, replace, scroll, shallow: _s, locale: _l, legacyBehavior: _lb, passHref: _ph, ...rest }, ref) {
  const to = toHref(href);
  if (/^(https?:|mailto:|tel:|#|\/\/)/i.test(to) || to.startsWith("/api/")) {
    return <a ref={ref} href={apiUrl(to)} {...rest} />;
  }
  return <RouterLink ref={ref} to={to} replace={replace} preventScrollReset={scroll === false} {...rest} />;
});

export default Link;
