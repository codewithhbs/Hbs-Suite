import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Which AI writes the TEXT of a post run.
 *   ollama  - every agent on Ollama (free; Gemini only if Ollama is down)
 *   gemini  - every agent on Gemini (fast)
 *   hybrid  - post text (content + humanize, HYBRID_GEMINI_AGENTS) on Gemini,
 *             research / keywords / topic / QA / embeddings on Ollama
 *   - background (nightly job, calendar auto-post, auto-schedule): AI_BACKGROUND_ENGINE (default hybrid)
 *   - manual (Generate AI, Regenerate, Run AI job button): the user picks.
 * Images always use Gemini (IMAGE_PROVIDER) - not affected.
 */
const als = new AsyncLocalStorage();
export const ENGINES = ["ollama", "gemini", "hybrid", "groq"];

/** hybrid: these agents (the post text) go to Gemini, everything else stays on Ollama. */
const hybridGeminiAgents = () =>
  String(process.env.HYBRID_GEMINI_AGENTS || "content,humanize")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);

export function normalizeEngine(v) {
  const e = String(v || "").trim().toLowerCase();
  return ENGINES.includes(e) ? e : null;
}

/** Image AI a run can pick: gemini | cloudflare | auto (null = platform default chain). */
export const IMAGE_ENGINES = ["gemini", "cloudflare", "auto"];

/**
 * AI choice of one run. Text and image are chosen separately:
 *   "groq"              -> text Groq, image default
 *   "groq|cloudflare"   -> text Groq, image Cloudflare FLUX   (also "groq+cloudflare")
 *   "|cloudflare"       -> image only (Regenerate image)
 */
export function parseEngine(value) {
  if (value && typeof value === "object") return { engine: normalizeEngine(value.engine), image: IMAGE_ENGINES.includes(value.image) ? value.image : null };
  const [t = "", i = ""] = String(value || "").trim().toLowerCase().split(/[|+:]/);
  return { engine: normalizeEngine(t), image: IMAGE_ENGINES.includes(i.trim()) ? i.trim() : null };
}

/** Canonical "text|image" string for storing on calendar slots / tasks (null = nothing chosen). */
export function engineKey(value) {
  const { engine, image } = parseEngine(value);
  if (!engine && !image) return null;
  return `${engine || ""}|${image || ""}`;
}

/** Runs fn with the engine for every runAI / embed / image call inside it (also across awaits). */
export function withEngine(engine, fn) {
  const { engine: e, image } = parseEngine(engine);
  return e || image ? als.run({ engine: e, image }, fn) : fn();
}

/** The choice made for this run (manual pick), or null when nothing was picked. */
export function explicitEngine() {
  const s = als.getStore();
  return s && (s.engine || s.image) ? `${s.engine || ""}|${s.image || ""}` : null;
}

/** Image AI picked for this run (null = IMAGE_PROVIDER default). */
export function currentImageEngine() {
  return als.getStore()?.image || null;
}

/** Engine of this run; background runs (no choice made) use AI_BACKGROUND_ENGINE (default hybrid). */
export function currentEngine() {
  return als.getStore()?.engine || normalizeEngine(process.env.AI_BACKGROUND_ENGINE) || "hybrid";
}

/**
 * Provider this agent should try FIRST under the current engine (null = normal order).
 * It is an order, not a filter: if Gemini fails, Ollama still gets a go before the
 * offline template (Mock) - a failed Gemini call must never turn into template text.
 */
export function enginePreferred(agent = "") {
  const e = currentEngine();
  // Gemini first; if its balance / quota is finished Groq answers before slow local Ollama
  if (e === "gemini") return ["gemini", "groq"];
  if (e === "groq") return ["groq", "gemini"];
  if (e === "hybrid" && hybridGeminiAgents().includes(String(agent).toLowerCase())) return ["gemini", "groq"];
  return null;
}

/** Kept for callers that still import it - nothing is excluded any more. */
export function engineExclusions() {
  return [];
}
