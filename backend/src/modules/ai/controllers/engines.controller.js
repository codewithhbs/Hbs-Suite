import { route } from "../../../lib/saas/routeKit.js";
import { getProviderChain, getImageChain } from "../../../lib/ai/index.js";
import { normalizeEngine } from "../../../lib/ai/engine.js";
import { geminiImagesEnabled } from "../../../lib/images/imageService.js";


/** Engines a user can pick for a manual run (Generate AI / Regenerate / Run AI job). */
export const GET = route({ permission: "task.generate" }, async () => {
  const chain = getProviderChain();
  const ollama = chain.find((p) => p.name === "ollama");
  const gemini = chain.find((p) => p.name === "gemini");
  const groq = chain.find((p) => p.name === "groq");
  const geminiImg = await geminiImagesEnabled();
  const image = getImageChain().map((p) => p.name).filter((n) => geminiImg || n !== "gemini");
  return {
    groq: groq ? { configured: true, model: groq.textModel } : { configured: false, model: null },
    image,
    images: {
      gemini: geminiImg && Boolean(process.env.GEMINI_API_KEY),
      gemini_disabled: !geminiImg,
      cloudflare: Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN),
    },
    ollama: ollama ? { enabled: true, up: await ollama.available(), model: ollama.textModel } : { enabled: false, up: false, model: null },
    gemini: gemini ? { configured: true, model: gemini.textModel } : { configured: false, model: null },
    background: normalizeEngine(process.env.AI_BACKGROUND_ENGINE) || "hybrid",
  };
});