/**
 * Cloudflare Workers AI provider - image generation with FLUX.1 [schnell].
 *   POST https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/run/@cf/black-forest-labs/flux-1-schnell
 *   body { prompt, steps }  ->  { result: { image: "<base64 jpeg>" }, success: true }
 *
 * Used as the image fallback when Gemini fails (balance / quota finished, safety
 * block, timeout), or first with IMAGE_PROVIDER=cloudflare. Server-side only.
 */
const API = "https://api.cloudflare.com/client/v4";

export class CloudflareProvider {
  constructor() {
    this.name = "cloudflare";
    this.accountId = process.env.CLOUDFLARE_ACCOUNT_ID || "";
    this.apiToken = process.env.CLOUDFLARE_API_TOKEN || "";
    this.imageModel = process.env.CLOUDFLARE_IMAGE_MODEL || "@cf/black-forest-labs/flux-1-schnell";
    this.textModel = null;
    this.embeddingModel = null;
    this.supportsEmbeddings = false;
    this.steps = Math.min(8, Math.max(1, Number(process.env.CLOUDFLARE_IMAGE_STEPS || 6)));
    this.imageTimeout = Number(process.env.AI_IMAGE_TIMEOUT_MS || 60000);
  }

  isConfigured() {
    return Boolean(this.accountId && this.apiToken);
  }

  /** @returns {{buffer: Buffer, contentType: string, model: string, endpoint: string}} */
  async image(prompt) {
    if (!this.isConfigured()) throw new Error("CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN not configured");
    if (!prompt) throw new Error("Image prompt is required");

    const url = `${API}/accounts/${encodeURIComponent(this.accountId)}/ai/run/${this.imageModel}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiToken}`, "Content-Type": "application/json" },
      // FLUX schnell: prompt max 2048 chars, steps 1-8
      body: JSON.stringify({ prompt: String(prompt).slice(0, 2048), steps: this.steps }),
      signal: AbortSignal.timeout(this.imageTimeout),
    }).catch((err) => {
      throw new Error(err?.name === "TimeoutError" ? `Cloudflare image timeout after ${this.imageTimeout} ms` : `Cloudflare request failed: ${err.message}`);
    });

    const type = res.headers.get("content-type") || "";
    if (!res.ok) {
      const txt = (await res.text().catch(() => "")).slice(0, 300);
      throw new Error(`Cloudflare ${res.status}: ${txt}`);
    }

    // some models stream raw image bytes, FLUX returns JSON with base64
    if (type.startsWith("image/")) {
      const buffer = Buffer.from(await res.arrayBuffer());
      if (!buffer.length) throw new Error("Cloudflare returned an empty image");
      return { buffer, contentType: type.split(";")[0], model: this.imageModel, endpoint: "workers-ai" };
    }
    const data = await res.json();
    if (data?.success === false) throw new Error(`Cloudflare error: ${JSON.stringify(data?.errors || []).slice(0, 300)}`);
    const b64 = data?.result?.image;
    if (!b64) throw new Error("Cloudflare returned no image");
    const buffer = Buffer.from(b64, "base64");
    if (!buffer.length) throw new Error("Cloudflare image buffer is empty");
    const contentType = buffer[0] === 0x89 ? "image/png" : "image/jpeg";
    return { buffer, contentType, model: this.imageModel, endpoint: "workers-ai" };
  }

  async complete() {
    throw new Error("Cloudflare provider is image-only here");
  }

  async embed() {
    throw new Error("Cloudflare provider is image-only here");
  }
}
