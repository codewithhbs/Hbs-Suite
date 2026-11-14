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
const NOT_CHAT = /whisper|guard|tts|playai|distil|orpheus|compound|prompt-guard|allam|saba|gemma|mistral-saba/i;
/** reasoning models spend output tokens on hidden thinking - too small a budget = empty answer */
const REASONING = /gpt-oss|qwen3|deepseek-r1|qwq/i;
const CACHE_MS = 6 * 60 * 60 * 1000;
let resolved = { key: "", model: null, at: 0 }; // model picked from /models for this API key

/** model -> time until it may be used again (each Groq model has its own rate limit) */
const cooling = new Map();
const COOL_DEFAULT_MS = 60 * 1000;
const isCooling = (m) => (cooling.get(m) || 0) > Date.now();
/** "Please try again in 7m12.5s" / "in 45.2s" / "in 850ms" -> ms (max 1h) */
function retryAfterMs(txt) {
  const m = /try again in\s+(?:(\d+)h)?(?:(\d+)m(?!s))?(?:([\d.]+)s)?(?:([\d.]+)ms)?/i.exec(String(txt || ""));
  if (!m) return COOL_DEFAULT_MS;
  const ms = (Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0)) * 1000 + Number(m[4] || 0);
  return Math.min(Math.max(ms || COOL_DEFAULT_MS, 5000), 60 * 60 * 1000);
}
const MAX_SWITCHES = Number(process.env.GROQ_MAX_MODEL_SWITCHES || 3);

const isModelGone = (status, txt) => status === 404 || /model_not_found|decommissioned|does not exist|no longer supported/i.test(txt);

/** Live model list for this key, best usable chat model first. */
let modelsCache = { key: "", list: null, at: 0 };
export async function listGroqModels(apiKey = process.env.GROQ_API_KEY) {
  if (modelsCache.key === apiKey && modelsCache.list && Date.now() - modelsCache.at < 10 * 60 * 1000) return modelsCache.list;
  const res = await fetch(`${BASE()}/models`, { headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Groq ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`);
  const ids = ((await res.json())?.data || []).filter((m) => m.active !== false).map((m) => m.id).filter((id) => !NOT_CHAT.test(id));
  const good = PREFERRED.filter((id) => ids.includes(id));
  // unknown models only when none of the tested ones is on this key
  const ranked = good.length ? good : ids;
  modelsCache = { key: apiKey, list: ranked, at: Date.now() };
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

  /** Best model for this key that is not rate limited and not in `skip`. */
  async #nextFreeModel(skip = []) {
    let list;
    try {
      list = await listGroqModels(this.apiKey);
    } catch {
      list = PREFERRED;
    }
    return list.find((m) => !skip.includes(m) && !isCooling(m)) || null;
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
    /** per-model body: reasoning models get a bigger budget and low reasoning so the answer is not empty */
    const bodyFor = (m) => {
      if (!REASONING.test(m)) return body;
      const b = { ...body, max_completion_tokens: Math.max(Number(maxTokens) * 3, 4096) };
      if (/gpt-oss/i.test(m)) b.reasoning_effort = "low";
      if (/qwen3/i.test(m)) b.reasoning_format = "hidden";
      return b;
    };

    let model = this.textModel;
    let r = null;
    if (isCooling(model)) {
      // main model is rate limited right now -> start on the next free model
      model = (await this.#nextFreeModel([model])) || model;
    } else {
      r = await this.#chat(model, bodyFor(model));
    }
    if (r && !r.ok && isModelGone(r.status, r.txt)) {
      model = await this.#pickAvailableModel(model);
      this.textModel = model;
      r = await this.#chat(model, bodyFor(model));
    }
    if (!r) r = await this.#chat(model, bodyFor(model));

    // 429 = this model's rate limit / daily tokens are used up. Every Groq model has
    // its own limit, so try the next good model before giving up on Groq.
    const tried = [model];
    while (!r.ok && r.status === 429 && tried.length <= MAX_SWITCHES) {
      cooling.set(model, Date.now() + retryAfterMs(r.txt));
      const next = await this.#nextFreeModel(tried);
      if (!next) break;
      console.warn(`[groq] ${model} rate limited - trying ${next}`);
      model = next;
      tried.push(model);
      r = await this.#chat(model, bodyFor(model));
    }

    if (!r.ok && r.status === 400 && json && /json_validate_failed|response_format/i.test(r.txt)) {
      // model rejected JSON mode -> ask for JSON in the prompt only
      const { response_format: _rf, ...plain } = bodyFor(model);
      r = await this.#chat(model, plain);
    }
    if (!r.ok) {
      if (r.status === 429) cooling.set(model, Date.now() + retryAfterMs(r.txt));
      // 429 = rate limit / daily token quota -> runAI moves to the next provider at once
      throw new Error(`Groq ${r.status}${r.status === 429 ? " (rate limit / quota)" : ""}: ${r.txt}`);
    }

    let data = r.data;
    let text = data?.choices?.[0]?.message?.content ?? "";
    if (!text) {
      // a reasoning model used its whole budget on thinking -> one try on the next good model
      const next = await this.#nextFreeModel([model]);
      if (next) {
        const r2 = await this.#chat(next, bodyFor(next));
        if (r2.ok && r2.data?.choices?.[0]?.message?.content) {
          model = next;
          data = r2.data;
          text = data.choices[0].message.content;
        }
      }
    }
    if (!text) throw new Error(`Groq returned an empty response (${model}, finish: ${data?.choices?.[0]?.finish_reason || "unknown"})`);
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