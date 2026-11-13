import { useEffect } from "react";

let template = "%s · HBS Suite";
let fallback = "HBS Suite";

/** Brand-aware title template (white-label workspaces swap the brand name). */
export function setTitleTemplate(brandName) {
  if (!brandName) return;
  template = `%s · ${brandName}`;
  fallback = brandName;
}

export function setTitle(title) {
  document.title = title ? template.replace("%s", title) : fallback;
}

export function useTitle(title) {
  useEffect(() => {
    setTitle(title);
  }, [title]);
}
