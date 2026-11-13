import { forwardRef } from "react";

/** next/image -> plain <img> (assets are pre-sized; Nginx serves them with long cache). */
const Image = forwardRef(function Image({ src, fill, priority, quality: _q, placeholder: _p, blurDataURL: _b, unoptimized: _u, loader: _l, sizes, style, ...rest }, ref) {
  const s = typeof src === "object" && src ? src.src : src;
  const fillStyle = fill ? { position: "absolute", inset: 0, width: "100%", height: "100%", ...style } : style;
  return <img ref={ref} src={s} sizes={sizes} loading={priority ? "eager" : "lazy"} decoding="async" style={fillStyle} {...rest} />;
});

export default Image;
