/**
 * Groq provider - very fast hosted open models.
 * OpenAI-compatible Chat Completions at https://api.groq.com/openai/v1
 *
 * Text   -> chat/completions (JSON mode when requested)
 * Embed  -> not offered by Groq (skipped in the embedding chain)
 * Image  -> not offered
 *
 * Model resolution: GROQ_TEXT_MODEL is tried first. If Groq answers
 * "model_not_found" / "decommissioned" (models get retired often), the live
 * model list (/models) is read once, the best available model is picked from
 * PREFERRED and cached, and the call is retried - no manual change needed.
 */
const BASE = () => (process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1").replace(/\/+$/, "");

/** Best first. Only chat models (no whisper / guard / tts). */
const PREFERRED = [
  "openai/gpt-oss-120b",
  "llama-3.3-70b-versatile",
  "moonshotai/kimi-k2-instruct",
  "qwen/qwen3-32b",
  "meta-llama/llama-4-maverick-17b-128e-instruct",
  "openai/gpt-oss-20b",
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "llama-3.1-8b-instant",
];
const NOT_CHAT = /whisper|guard|tts|playai|distil|orpheus|compound|prompt-guard/i;
const CACHE_MS = 6 * 60 * 60 * 1000;
let resolved = { key: "", model: null, at: 0 }; // model picked from /models for this API key

const isModelGone = (status, txt) => status === 404 || /model_not_found|decommissioned|does not exist|no longer supported/i.test(txt);

/** Live model list for this key, best usable chat model first. */
export async function listGroqModels(apiKey = process.env.GROQ_API_KEY) {
  const res = await fetch(`${BASE()}/models`, { headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Groq ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`);
  const ids = ((await res.json())?.data || []).filter((m) => m.active !== false).map((m) => m.id).filter((id) => !NOT_CHAT.test(id));
  const ranked = [...PREFERRED.filter((id) => ids.includes(id)), ...ids.filter((id) => !PREFERRED.includes(id))];
  return ranked;
}

export class GroqProvider {
  constructor() {
    this.name = "groq";
    this.apiKey = process.env.GROQ_API_KEY || "";
    this.configuredModel = (process.env.GROQ_TEXT_MODEL || "").trim() || PREFERRED[0];
    this.textModel = resolved.key === this.apiKey && resolved.model ? resolved.model : this.configuredModel;
    this.embeddingModel = null;
    this.imageModel = null;
    this.supportsEmbeddings = false;
    this.timeout = Number(process.env.GROQ_TIMEOUT_MS || process.env.AI_TIMEOUT_MS || 45000);
  }

  isConfigured() {
    return Boolean(this.apiKey);
  }

  async #pickAvailableModel(exclude) {
    const fresh = resolved.key === this.apiKey && resolved.model && Date.now() - resolved.at < CACHE_MS;
    if (fresh && resolved.model !== exclude) return resolved.model;
    const list = (await listGroqModels(this.apiKey)).filter((id) => id !== exclude);
    if (!list.length) throw new Error("Groq: no chat model is available for this API key");
    resolved = { key: this.apiKey, model: list[0], at: Date.now() };
    console.warn(`[groq] model "${exclude}" is not available - using "${list[0]}" (set GROQ_TEXT_MODEL to change)`);
    return list[0];
  }

  async #chat(model, body) {
    const res = await fetch(`${BASE()}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, model }),
      signal: AbortSignal.timeout(this.timeout),
    }).catch((err) => {
      throw new Error(err?.name === "TimeoutError" ? `Groq timeout after ${this.timeout} ms` : `Groq request failed: ${err.message}`);
    });
    if (res.ok) return { ok: true, data: await res.json() };
    return { ok: false, status: res.status, txt: (await res.text().catch(() => "")).slice(0, 300) };
  }

  async complete({ system, prompt, maxTokens = 900, temperature = 0.7, json = true }) {
    if (!this.isConfigured()) throw new Error("GROQ_API_KEY not configured");
    if (!prompt) throw new Error("Prompt is required");

    const messages = [];
    // Groq JSON mode requires the word "JSON" somewhere in the messages
    const sys = json && !/json/i.test(`${system || ""}${prompt}`) ? `${system || ""}\nRespond with valid JSON only.`.trim() : system;
    if (sys) messages.push({ role: "system", content: sys });
    messages.push({ role: "user", content: prompt });
    const body = {
      messages,
      max_completion_tokens: maxTokens,
      temperature,
      ...(json ? { response_format: { type: "json_object" } } : {}),
    };

    let model = this.textModel;
    let r = await this.#chat(model, body);
    if (!r.ok && isModelGone(r.status, r.txt)) {
      model = await this.#pickAvailableModel(model);
      this.textModel = model;
      r = await this.#chat(model, body);
    }
    if (!r.ok && r.status === 400 && json && /json_validate_failed|response_format/i.test(r.txt)) {
      // model rejected JSON mode -> ask for JSON in the prompt only
      const { response_format: _rf, ...plain } = body;
      r = await this.#chat(model, plain);
    }
    if (!r.ok) {
      // 429 = rate limit / daily token quota -> runAI moves to the next provider at once
      throw new Error(`Groq ${r.status}${r.status === 429 ? " (rate limit / quota)" : ""}: ${r.txt}`);
    }

    const data = r.data;
    const text = data?.choices?.[0]?.message?.content ?? "";
    if (!text) throw new Error("Groq returned an empty response");
    return {
      text,
      model: data?.model || model,
      inputTokens: data?.usage?.prompt_tokens ?? null,
      outputTokens: data?.usage?.completion_tokens ?? null,
    };
  }

  async embed() {
    throw new Error("Groq does not provide embeddings");
  }
}