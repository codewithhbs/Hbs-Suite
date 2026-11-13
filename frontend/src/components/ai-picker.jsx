import { useEffect, useState } from "react";
import { Select } from "@/components/ui";

/**
 * AI combination = text engine + image engine, stored as "text|image".
 *   "groq|cloudflare"  -> post text by Groq, image by Cloudflare FLUX
 *   ""                 -> platform default (night / calendar setting)
 */
export const TEXT_AI = [
  { value: "hybrid", label: "Hybrid (Gemini + Ollama)" },
  { value: "gemini", label: "Gemini" },
  { value: "groq", label: "Groq" },
  { value: "ollama", label: "Ollama (free, local)" },
];
export const IMAGE_AI = [
  { value: "gemini", label: "Gemini" },
  { value: "cloudflare", label: "Cloudflare FLUX" },
  { value: "auto", label: "Auto (Gemini → Cloudflare → others)" },
];

const SHORT = { hybrid: "Hybrid", gemini: "Gemini", groq: "Groq", ollama: "Ollama", cloudflare: "Cloudflare", auto: "Auto" };

export function splitAi(value) {
  const [text = "", image = ""] = String(value || "").split("|");
  return { text, image };
}
export const joinAi = (text, image) => (text || image ? `${text || ""}|${image || ""}` : "");

/** "Groq + Cloudflare" / "Default AI" */
export function aiLabel(value) {
  const { text, image } = splitAi(value);
  if (!text && !image) return "Default AI";
  return `${SHORT[text] || "Default"} + ${SHORT[image] || "default image"}`;
}

let enginesPromise = null;
/** /api/ai/engines once per page load - which AIs are configured. */
export function useAiEngines() {
  const [info, setInfo] = useState(null);
  useEffect(() => {
    enginesPromise ||= fetch("/api/ai/engines").then((r) => (r.ok ? r.json() : null)).catch(() => null);
    let alive = true;
    enginesPromise.then((d) => alive && setInfo(d));
    return () => {
      alive = false;
    };
  }, []);
  return info;
}

/** which options to show, based on configured providers (everything while unknown) */
export function availableAi(info) {
  if (!info) return { text: TEXT_AI, image: IMAGE_AI };
  const ollama = Boolean(info.ollama?.enabled);
  const gemini = Boolean(info.gemini?.configured);
  const groq = Boolean(info.groq?.configured);
  const text = TEXT_AI.filter((o) => (o.value === "hybrid" ? ollama && gemini : o.value === "gemini" ? gemini : o.value === "groq" ? groq : o.value === "ollama" ? ollama : true));
  const img = info.images || {};
  const image = IMAGE_AI.filter((o) => (o.value === "gemini" ? img.gemini : o.value === "cloudflare" ? img.cloudflare : Boolean(img.gemini || img.cloudflare)));
  return { text, image };
}

/** Two small selects: text AI + image AI. value/onChange use the "text|image" string. */
export function AiComboSelect({ value, onChange, className = "", compact = false }) {
  const info = useAiEngines();
  const opts = availableAi(info);
  const { text, image } = splitAi(value);
  return (
    <div className={`grid gap-2 ${compact ? "grid-cols-2" : "sm:grid-cols-2"} ${className}`}>
      <Select value={text} onChange={(e) => onChange(joinAi(e.target.value, image))} aria-label="AI for post text">
        <option value="">Text: default</option>
        {opts.text.map((o) => (
          <option key={o.value} value={o.value}>
            Text: {o.label}
          </option>
        ))}
      </Select>
      <Select value={image} onChange={(e) => onChange(joinAi(text, e.target.value))} aria-label="AI for post image">
        <option value="">Image: default</option>
        {opts.image.map((o) => (
          <option key={o.value} value={o.value}>
            Image: {o.label}
          </option>
        ))}
      </Select>
    </div>
  );
}
