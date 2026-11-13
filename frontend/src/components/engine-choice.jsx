import { useCallback, useRef, useState } from "react";
import { Cpu, Zap, AlertTriangle, Layers, Rocket, Image as ImageIcon, Sparkles } from "lucide-react";
import { Modal, Button } from "@/components/ui";
import { availableAi, joinAi, splitAi } from "@/components/ai-picker";

/**
 * Ask which AI combination makes this post: text AI + image AI.
 *   const [engineDialog, askEngine] = useEngineChoice();
 *   const engine = await askEngine();   // "groq|cloudflare" | "hybrid|gemini" | "auto" | null (cancelled)
 *   fetch(..., { body: JSON.stringify({ ..., engine }) })
 * The backend uses it for every agent + the image of that run (lib/ai/engine.js parseEngine).
 * Only one possible combination -> returns it without showing the dialog.
 */
const LAST = "hbs:ai-choice";

const TEXT_CARDS = {
  hybrid: { icon: Layers, tone: "brand", badge: "RECOMMENDED", text: (i) => `Post text by Gemini, research / keywords / checks by Ollama${i?.ollama?.model ? ` (${i.ollama.model})` : ""}. Low cost.` },
  groq: { icon: Rocket, tone: "orange", badge: "FASTEST", text: (i) => `${i?.groq?.model || "Groq"} - seconds per post, very low cost. Gemini takes over at the limit.` },
  gemini: { icon: Zap, tone: "violet", badge: "QUALITY", text: (i) => `${i?.gemini?.model || "Gemini"} - best long posts, paid per post. Groq takes over if the balance runs out.` },
  ollama: { icon: Cpu, tone: "emerald", badge: "FREE", text: (i) => `Local ${i?.ollama?.model || "model"} - no AI cost for text, slower (minutes per post).` },
};
const TONE = {
  brand: "border-brand-400 bg-brand-50/60 dark:bg-brand-950/20",
  orange: "border-orange-400 bg-orange-50/60 dark:bg-orange-950/20",
  violet: "border-violet-400 bg-violet-50/60 dark:bg-violet-950/20",
  emerald: "border-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/20",
};
const IMAGE_LABEL = { gemini: "Gemini", cloudflare: "Cloudflare FLUX", auto: "Auto" };

function remembered() {
  try {
    return localStorage.getItem(LAST) || "";
  } catch {
    return "";
  }
}

export function useEngineChoice() {
  const [state, setState] = useState(null); // { info, text, image }
  const resolver = useRef(null);

  const ask = useCallback(async () => {
    const info = await fetch("/api/ai/engines").then((r) => (r.ok ? r.json() : null)).catch(() => null);
    const opts = availableAi(info);
    if (!opts.text.length && !opts.image.length) return "auto";
    if (opts.text.length <= 1 && opts.image.length <= 1) return joinAi(opts.text[0]?.value || "", opts.image[0]?.value || "") || "auto";
    const last = splitAi(remembered());
    const text = opts.text.some((o) => o.value === last.text) ? last.text : opts.text[0]?.value || "";
    const image = opts.image.some((o) => o.value === last.image) ? last.image : opts.image[0]?.value || "";
    return new Promise((resolve) => {
      resolver.current = resolve;
      setState({ info, text, image });
    });
  }, []);

  const finish = (value) => {
    const r = resolver.current;
    resolver.current = null;
    setState(null);
    if (value) {
      try {
        localStorage.setItem(LAST, value);
      } catch {
        /* private mode */
      }
    }
    r?.(value);
  };

  const info = state?.info;
  const opts = availableAi(info);
  const set = (patch) => setState((s) => ({ ...s, ...patch }));
  const presets = [
    { text: "groq", image: "cloudflare", label: "Groq + Cloudflare", hint: "fastest, lowest cost" },
    { text: "gemini", image: "gemini", label: "Gemini + Gemini", hint: "best quality" },
    { text: "hybrid", image: "gemini", label: "Hybrid + Gemini", hint: "balanced" },
  ].filter((p) => opts.text.some((o) => o.value === p.text) && opts.image.some((o) => o.value === p.image));

  const dialog = (
    <Modal
      open={Boolean(state)}
      title="Which AI should make this post?"
      onClose={() => finish(null)}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={() => finish(null)}>Cancel</Button>
          <Button onClick={() => finish(joinAi(state?.text, state?.image) || "auto")}>
            <Sparkles className="h-3.5 w-3.5" /> Generate
          </Button>
        </>
      }
    >
      {state ? (
        <div className="space-y-4">
          {presets.length ? (
            <div className="flex flex-wrap gap-2">
              {presets.map((p) => {
                const on = state.text === p.text && state.image === p.image;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => set({ text: p.text, image: p.image })}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${on ? "border-brand-500 bg-brand-500 text-white" : "border-zinc-200 hover:border-brand-400 dark:border-zinc-700"}`}
                  >
                    {p.label} <span className={on ? "text-white/80" : "text-zinc-400"}>· {p.hint}</span>
                  </button>
                );
              })}
            </div>
          ) : null}

          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-zinc-400">Post text</p>
            <div className="space-y-2">
              {opts.text.map(({ value }) => {
                const c = TEXT_CARDS[value];
                const Icon = c.icon;
                const on = state.text === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => set({ text: value })}
                    className={`flex w-full items-start gap-3 rounded-xl border-2 p-3 text-left transition ${on ? TONE[c.tone] : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700"}`}
                  >
                    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-zinc-600 dark:text-zinc-300" />
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 text-sm font-semibold capitalize">
                        {value} <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">{c.badge}</span>
                      </span>
                      <span className="mt-0.5 block text-xs text-zinc-500">{c.text(info)}</span>
                      {value === "ollama" && info && !info.ollama?.up ? (
                        <span className="mt-1 flex items-center gap-1 text-[11px] font-medium text-amber-600">
                          <AlertTriangle className="h-3 w-3" /> Ollama is not reachable right now - the next AI will be used.
                        </span>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {opts.image.length ? (
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-zinc-400">Post image / poster</p>
              <div className="flex flex-wrap gap-2">
                {opts.image.map(({ value }) => {
                  const on = state.image === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => set({ image: value })}
                      className={`inline-flex items-center gap-1.5 rounded-xl border-2 px-3 py-2 text-xs font-semibold transition ${on ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950/30 dark:text-brand-300" : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700"}`}
                    >
                      <ImageIcon className="h-3.5 w-3.5" /> {IMAGE_LABEL[value]}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 text-[11px] text-zinc-400">If the chosen image AI fails or runs out of balance, the other one is tried automatically.</p>
            </div>
          ) : null}

          <p className="text-center text-[11px] text-zinc-400">
            Night / calendar runs use the AI chosen on each calendar entry, otherwise{" "}
            {{ gemini: "Gemini", ollama: "Ollama", groq: "Groq" }[info?.background] || "Hybrid"}.
          </p>
        </div>
      ) : null}
    </Modal>
  );

  return [dialog, ask];
}
