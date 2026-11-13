import { useEffect } from "react";

/** next/script -> inject once after mount. */
export default function Script({ src, id, children, dangerouslySetInnerHTML, onLoad }) {
  useEffect(() => {
    if (id && document.getElementById(id)) return;
    const el = document.createElement("script");
    if (id) el.id = id;
    if (src) {
      el.src = src;
      el.async = true;
      if (onLoad) el.onload = onLoad;
    } else {
      el.text = dangerouslySetInnerHTML?.__html || (typeof children === "string" ? children : "");
    }
    document.body.appendChild(el);
  }, [id, src]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
