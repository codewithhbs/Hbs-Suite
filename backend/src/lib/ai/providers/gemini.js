/**
 * Gemini provider.
 *
 * Text   -> generateContent (JSON mode via responseMimeType when requested)
 * Embed  -> embedContent
 * Image  -> generateContent with responseModalities ["TEXT","IMAGE"]
 *           Returns a raw Buffer, same shape as the OpenAI/Hugging Face providers,
 *           so ImageService can save it unchanged.
 *
 * Server-side only. GEMINI_API_KEY must never reach the browser.
 */
const BASE = "https://generativelanguage.googleapis.com/v1beta";

const debug = (...args) => {
  if (process.env.AI_DEBUG === "1") console.log(...args);
};

/** Finish reasons that mean the model did not complete a normal answer. */
const BAD_FINISH = new Set([
  "SAFETY",
  "RECITATION",
  "BLOCKLIST",
  "PROHIBITED_CONTENT",
  "SPII",
  "MALFORMED_FUNCTION_CALL",
  "OTHER",
]);

function tryParse(s) {
  try {
    JSON.parse(s);
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns a string that parses as JSON, or null.
 * Tries: raw text, fence-stripped text, first "{" to last "}", and the same
 * slice with trailing commas removed.
 */
function repairJson(text) {
  if (tryParse(text)) return text;
  const stripped = String(text)
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  if (tryParse(stripped)) return stripped;
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  const sliced = stripped.slice(start, end + 1);
  if (tryParse(sliced)) return sliced;
  const noTrailingCommas = sliced.replace(/,\s*([}\]])/g, "$1");
  return tryParse(noTrailingCommas) ? noTrailingCommas : null;
}

/** Models that cannot write text (image / embedding / audio / video). */
const NOT_TEXT = /image|imagen|embedding|embed|tts|veo|aqa|live|native-audio/i;
/** Google retires model names for new keys often - this alias always points at the current Flash. */
const SAFE_TEXT_MODEL = "gemini-flash-latest";
/** Best first when the configured model is gone. Cheap + fast "flash" models only (no pro = cost). */
const PREFERRED = [
  "gemini-flash-latest",
  "gemini-3-flash",
  "gemini-3-flash-preview",
  "gemini-2.5-flash",
  "gemini-flash-lite-latest",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
];
const MODEL_GONE = /no longer available|is not found|not found for API version|not supported for generateContent|does not exist|deprecated|has been shut down/i;
const CACHE_MS = 6 * 60 * 60 * 1000;
let resolved = { key: "", model: null, at: 0 }; // text model picked from the live list for this key
let listCache = { key: "", list: null, at: 0 };

/** Live text models for this key, best first. */
export async function listGeminiTextModels(apiKey = process.env.GEMINI_API_KEY) {
  if (listCache.key === apiKey && listCache.list && Date.now() - listCache.at < 10 * 60 * 1000) return listCache.list;
  const res = await fetch(`${BASE}/models?pageSize=1000`, { headers: { "x-goog-api-key": apiKey }, signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Gemini models ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`);
  const ids = ((await res.json())?.models || [])
    .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
    .map((m) => String(m.name || "").replace(/^models\//, ""))
    .filter((id) => id.startsWith("gemini") && !NOT_TEXT.test(id));
  const flash = ids.filter((id) => /flash/i.test(id) && !/thinking|exp/i.test(id));
  const ranked = [...new Set([...PREFERRED.filter((id) => ids.includes(id)), ...flash, ...ids.filter((id) => !/pro|ultra/i.test(id))])];
  listCache = { key: apiKey, list: ranked, at: Date.now() };
  return ranked;
}
const NO_JSON_MODE = /JSON mode is not enabled|response_mime_type|responseMimeType|response mime type/i;
const NO_SYSTEM = /Developer instruction is not enabled|system_instruction|systemInstruction/i;
/** models found (at runtime) not to support JSON mode / system instructions */
const noJsonModels = new Set();
const noSystemModels = new Set();
let warnedModel = "";

export class GeminiProvider {
  constructor() {
    this.name = "gemini";
    this.apiKey = process.env.GEMINI_API_KEY || "";
    const configured = (process.env.GEMINI_TEXT_MODEL || "").trim() || SAFE_TEXT_MODEL;
    // an image / embedding model in the TEXT model field -> 400 errors on every post; use a text model instead
    const usable = NOT_TEXT.test(configured) ? SAFE_TEXT_MODEL : configured;
    // a model found retired earlier for this key -> use the replacement picked then
    this.textModel = resolved.key === this.apiKey && resolved.model && resolved.from === usable && Date.now() - resolved.at < CACHE_MS ? resolved.model : usable;
    if (NOT_TEXT.test(configured) && warnedModel !== configured) {
      warnedModel = configured;
      console.warn(`[gemini] GEMINI_TEXT_MODEL "${configured}" cannot write text - using "${SAFE_TEXT_MODEL}". Fix it in Admin -> Integrations -> Google Gemini -> Text model.`);
    }
    this.embeddingModel =
      process.env.GEMINI_EMBEDDING_MODEL || "text-embedding-004";
    this.imageModel =
      process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
    this.timeout = Number(process.env.AI_TIMEOUT_MS || 30000);
    this.imageTimeout = Number(process.env.AI_IMAGE_TIMEOUT_MS || 60000);
  }

  isConfigured() {
    return Boolean(this.apiKey);
  }

  /** First live text model for this key that is not `gone`. Cached per key. */
  async #replacementModel(gone) {
    try {
      const list = (await listGeminiTextModels(this.apiKey)).filter((id) => id !== gone);
      if (!list.length) return null;
      resolved = { key: this.apiKey, model: list[0], from: this.textModel, at: Date.now() };
      console.warn(`[gemini] model "${gone}" is not available for this key - using "${list[0]}". Set it in Admin -> Integrations -> Google Gemini -> Text model.`);
      this.textModel = list[0];
      return list[0];
    } catch (err) {
      console.warn("[gemini] could not list models:", err.message);
      return gone === SAFE_TEXT_MODEL ? null : SAFE_TEXT_MODEL;
    }
  }

  async #post(path, body, { timeout = this.timeout } = {}) {
    if (!this.apiKey) throw new Error("GEMINI_API_KEY not configured");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(`${BASE}${path}`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "x-goog-api-key": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(`${res.status} ${(await res.text()).slice(0, 300)}`);
      }
      return await res.json();
    } catch (err) {
      if (err?.name === "AbortError") {
        throw new Error(`timeout after ${timeout} ms`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  async complete({
    system,
    prompt,
    maxTokens = 1024,
    temperature = 0.7,
    json = true,
    schema = null,
  }) {
    if (!this.isConfigured()) throw new Error("GEMINI_API_KEY not configured");
    if (!prompt) throw new Error("Prompt is required");

    let model = this.textModel;
    const buildConfig = (jsonMode) => ({
      // Thinking models spend output budget on thoughts, so never go below 1024.
      maxOutputTokens: Math.max(Number(maxTokens) || 1024, 1024),
      temperature,
      ...(jsonMode
        ? {
            responseMimeType: "application/json",
            // A schema is applied ONLY when the calling agent passes one.
            // A fixed schema here would force every agent into the same shape.
            ...(schema ? { responseSchema: schema } : {}),
          }
        : {}),
      // Gemini 3 models use thinkingLevel. LOW is enough for writing tasks.
      ...(String(model).startsWith("gemini-3") ? { thinkingConfig: { thinkingLevel: "LOW" } } : {}),
    });

    /**
     * Some models (Gemma, older / preview models) reject JSON mode or a system
     * instruction with a 400. Then the same request is sent again without it:
     * JSON is asked for in the prompt and the system text is put in front of the prompt.
     */
    const send = (jsonMode, systemField) => {
      const jsonHint = json && !jsonMode ? "\n\nRespond with valid JSON only - no markdown, no text outside the JSON." : "";
      const text = `${!systemField && system ? `${system}\n\n` : ""}${prompt}${jsonHint}`;
      debug("[GEMINI] Request", { model, maxTokens, temperature, json, jsonMode, systemField, hasSchema: Boolean(schema) });
      return this.#post(`/models/${model}:generateContent`, {
        ...(systemField && system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
        contents: [{ role: "user", parts: [{ text }] }],
        generationConfig: buildConfig(jsonMode),
      });
    };

    let jsonMode = json && !noJsonModels.has(model);
    let systemField = !noSystemModels.has(model);
    let data;
    for (let attempt = 0; ; attempt++) {
      try {
        data = await send(jsonMode, systemField);
        break;
      } catch (err) {
        const msg = String(err.message || "");
        if (attempt < 2 && msg.startsWith("400") && jsonMode && NO_JSON_MODE.test(msg)) {
          noJsonModels.add(model);
          jsonMode = false;
          continue;
        }
        if (attempt < 2 && msg.startsWith("400") && systemField && NO_SYSTEM.test(msg)) {
          noSystemModels.add(model);
          systemField = false;
          continue;
        }
        // model retired for this key ("no longer available to new users") -> pick a live one and retry
        if (attempt < 3 && /^404|^400/.test(msg) && MODEL_GONE.test(msg)) {
          const next = await this.#replacementModel(model);
          if (next) {
            model = next;
            jsonMode = json && !noJsonModels.has(model);
            systemField = !noSystemModels.has(model);
            continue;
          }
        }
        throw err;
      }
    }

    // Prompt blocked before any candidate was produced.
    if (data?.promptFeedback?.blockReason) {
      throw new Error(
        `Gemini blocked the prompt. Reason: ${data.promptFeedback.blockReason}`,
      );
    }

    const candidate = data?.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    const finishReason = candidate?.finishReason || null;

    // Skip "thought" parts. Thinking models can return them, and gluing thought
    // text in front of the JSON makes JSON.parse fail even when finishReason is STOP.
    const text = parts
      .filter((part) => !part.thought)
      .map((part) => part.text || "")
      .join("")
      .trim();

    debug("[GEMINI] Response", {
      model,
      finishReason,
      finishMessage: candidate?.finishMessage || null,
      promptTokens: data?.usageMetadata?.promptTokenCount ?? null,
      outputTokens: data?.usageMetadata?.candidatesTokenCount ?? null,
      thinkingTokens: data?.usageMetadata?.thoughtsTokenCount ?? null,
      totalTokens: data?.usageMetadata?.totalTokenCount ?? null,
      outputLength: text.length,
      output: text,
    });

    // Do not let truncated output reach runAI as a success.
    if (finishReason === "MAX_TOKENS") {
      throw new Error(
        `Gemini response was truncated because max output tokens were reached. Model: ${model}`,
      );
    }

    if (finishReason && BAD_FINISH.has(finishReason)) {
      throw new Error(
        `Gemini stopped early. Finish reason: ${finishReason}${
          candidate?.finishMessage ? ` (${candidate.finishMessage})` : ""
        }`,
      );
    }

    if (!text) {
      throw new Error(
        `Gemini returned an empty text response. Finish reason: ${finishReason || "unknown"}`,
      );
    }

    // JSON mode must return valid JSON. Repair small formatting slips first,
    // otherwise throw so runAI retries or falls back.
    let finalText = text;
    if (json) {
      const repaired = repairJson(text);
      if (!repaired) {
        console.error(
          "[GEMINI] Invalid JSON response:",
          text.slice(0, 2000),
        );
        throw new Error(
          `Gemini returned incomplete or invalid JSON. Finish reason: ${finishReason || "unknown"}`,
        );
      }
      if (repaired !== text) debug("[GEMINI] JSON repaired");
      finalText = repaired;
    }

    return {
      text: finalText,
      model,
      inputTokens: data?.usageMetadata?.promptTokenCount ?? null,
      outputTokens: data?.usageMetadata?.candidatesTokenCount ?? null,
    };
  }

  async embed(text) {
    if (!this.isConfigured()) throw new Error("GEMINI_API_KEY not configured");
    if (!text) throw new Error("Text is required for embedding");

    const data = await this.#post(
      `/models/${this.embeddingModel}:embedContent`,
      { content: { parts: [{ text }] } },
    );

    const vec = data?.embedding?.values;
    if (!Array.isArray(vec)) {
      throw new Error("Invalid embedding response from Gemini");
    }
    return vec;
  }

  /** @returns {{buffer: Buffer, contentType: string, model: string, endpoint: string}} */
  async image(prompt, { aspectRatio = null } = {}) {
    if (!this.isConfigured()) throw new Error("GEMINI_API_KEY not configured");
    if (!this.imageModel) throw new Error("GEMINI_IMAGE_MODEL not set in .env");
    if (!prompt) throw new Error("Image prompt is required");

    const body = (withRatio) => ({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
        ...(withRatio && aspectRatio ? { imageConfig: { aspectRatio } } : {}),
      },
    });
    let data;
    try {
      data = await this.#post(`/models/${this.imageModel}:generateContent`, body(true), { timeout: this.imageTimeout });
    } catch (err) {
      // older image models don't know imageConfig -> retry without the aspect ratio
      if (!aspectRatio || !/imageConfig|aspect|Invalid JSON payload|Unknown name/i.test(String(err.message))) throw err;
      data = await this.#post(`/models/${this.imageModel}:generateContent`, body(false), { timeout: this.imageTimeout });
    }

    if (data?.promptFeedback?.blockReason) {
      throw new Error(
        `Gemini blocked the image prompt. Reason: ${data.promptFeedback.blockReason}`,
      );
    }

    const candidate = data?.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    const imagePart = parts.find(
      (p) => p.inlineData?.data || p.inline_data?.data,
    );
    const inline = imagePart?.inlineData || imagePart?.inline_data;

    if (!inline?.data) {
      const reason = candidate?.finishReason ? ` Finish reason: ${candidate.finishReason}.` : "";
      throw new Error(`Gemini returned no usable image data.${reason}`);
    }

    const buffer = Buffer.from(inline.data, "base64");
    if (!buffer.length) throw new Error("Generated image buffer is empty");

    return {
      buffer,
      contentType: inline.mimeType || inline.mime_type || "image/png",
      model: this.imageModel,
      endpoint: "generateContent",
    };
  }
}