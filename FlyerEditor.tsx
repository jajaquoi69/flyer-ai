"use client";

import React, { useEffect, useState } from "react";

type FlyerForm = {
  title: string;
  subtitle: string;
  date: string;
  time: string;
  venue: string;
  city: string;
  price: string;
  cta: string;
};

type OcrResult =
  | { status: "idle" | "checking" }
  | { status: "ok"; missing?: string[]; text?: string }
  | { status: "bad"; missing: string[]; text?: string }
  | { status: "error"; error: string };

const decodeEntities = (value: string) =>
  value
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&quot;|&#34;/g, '"')
    .replace(/&amp;|&#38;/g, "&")
    .replace(/&lt;|&#60;/g, "<")
    .replace(/&gt;|&#62;/g, ">")
    .trim();

const defaultFlyer: FlyerForm = {
  title: "Techno Night",
  subtitle: "Beats industriels, strobe et ligne d'acid jusqu'√† l'aurore.",
  date: "Samedi 28 mars",
  time: "23h00 - 06h00",
  venue: "Warehouse 13",
  city: "Paris",
  price: "28 ‚Ç¨ ‚Ä¢ pr√©vente",
  cta: "R√©server",
};

const fields: { key: keyof FlyerForm; label: string; type?: string }[] = [
  { key: "title", label: "Titre" },
  { key: "subtitle", label: "Sous-titre" },
  { key: "date", label: "Date" },
  { key: "time", label: "Heure" },
  { key: "venue", label: "Lieu" },
  { key: "city", label: "Ville" },
  { key: "price", label: "Prix" },
  { key: "cta", label: "CTA", type: "text" },
];

export default function FlyerEditor() {
  const [flyer, setFlyer] = useState<FlyerForm>(defaultFlyer);
  const [vibe, setVibe] = useState<string>("techno neon underground");
  const [flyerImages, setFlyerImages] = useState<string[]>([]);
  const [selectedFlyerDataUrl, setSelectedFlyerDataUrl] = useState<string | undefined>();
  const [generatingFlyers, setGeneratingFlyers] = useState(false);
  const [ocrResults, setOcrResults] = useState<OcrResult[]>([]);
  const MAX_GENERATIONS_PER_WEEK = 30;
  const [genCount, setGenCount] = useState(0);
  const [weekStart, setWeekStart] = useState<number | null>(null);

  const computeWeekStartParis = () => {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Paris",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const [{ value: y }, , { value: m }, , { value: d }] = formatter.formatToParts(now);
    const current = new Date(`${y}-${m}-${d}T00:00:00+01:00`).getTime();
    // Find Monday: get day (0 Sunday -> shift)
    const day = new Date(current).toLocaleString("en-US", { timeZone: "Europe/Paris", weekday: "short" });
    const dayIndex =
      day === "Sun"
        ? 0
        : day === "Mon"
        ? 1
        : day === "Tue"
        ? 2
        : day === "Wed"
        ? 3
        : day === "Thu"
        ? 4
        : day === "Fri"
        ? 5
        : 6; // Sat
    const offset = ((dayIndex + 6) % 7) * 24 * 60 * 60 * 1000; // days since Monday
    return current - offset;
  };

  useEffect(() => {
    const currentWeekStart = computeWeekStartParis();
    setWeekStart(currentWeekStart);
    const storedWeek = Number(localStorage.getItem("genWeekStart") || "0");
    const storedCount = Number(localStorage.getItem("genCount") || "0");
    if (storedWeek === currentWeekStart) {
      setGenCount(Number.isFinite(storedCount) ? storedCount : 0);
    } else {
      localStorage.setItem("genWeekStart", String(currentWeekStart));
      localStorage.setItem("genCount", "0");
      setGenCount(0);
    }
  }, []);

  const remaining = Math.max(0, MAX_GENERATIONS_PER_WEEK - genCount);

  const onChange =
    (key: keyof FlyerForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = decodeEntities(e.target.value);
      setFlyer((prev) => ({ ...prev, [key]: value }));
    };

  const reset = () => setFlyer(defaultFlyer);

  const runOcrSequential = async (images: string[], normalized: FlyerForm) => {
    setOcrResults(images.map(() => ({ status: "checking" })));
    for (let i = 0; i < images.length; i++) {
      try {
        const verifyRes = await fetch("/api/verify-ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageDataUrl: images[i],
            expected: {
              title: normalized.title,
              date: normalized.date,
              time: normalized.time,
              venue: normalized.venue,
              city: normalized.city,
              price: normalized.price,
              cta: normalized.cta,
            },
          }),
        });

        if (!verifyRes.ok) {
          const errText = await verifyRes.text().catch(() => "");
          throw new Error(`OCR ${verifyRes.status}: ${errText}`);
        }

        const ocr = (await verifyRes.json()) as {
          isValid: boolean;
          missing: string[];
          text: string;
        };

        setOcrResults((prev) => {
          const next = [...prev];
          next[i] = ocr.isValid
            ? { status: "ok", missing: ocr.missing, text: ocr.text }
            : { status: "bad", missing: ocr.missing, text: ocr.text };
          return next;
        });
      } catch (ocrErr: any) {
        setOcrResults((prev) => {
          const next = [...prev];
          next[i] = { status: "error", error: ocrErr?.message || "OCR error" };
          return next;
        });
      }
    }
  };

  return (
    <section className="flex flex-col gap-10 lg:grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-start">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Param√®tres du flyer</h2>
          <button
            type="button"
            onClick={reset}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-400 hover:text-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:border-indigo-300"
          >
            R√©initialiser
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {fields.map(({ key, label, type }) => (
            <label
              key={key}
              className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white/70 p-4 text-sm text-zinc-700 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-zinc-200"
            >
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500 dark:text-zinc-400">
                {label}
              </span>
              {key === "subtitle" ? (
                <textarea
                  value={flyer[key]}
                  onChange={onChange(key)}
                  className="min-h-[72px] rounded-lg border border-zinc-200 bg-white/90 px-3 py-2 text-sm text-zinc-900 shadow-inner outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-white/15 dark:bg-white/10 dark:text-white dark:focus:border-indigo-300 dark:focus:ring-indigo-500/40"
                />
              ) : (
                <input
                  type={type || "text"}
                  value={flyer[key]}
                  onChange={onChange(key)}
                  className="rounded-lg border border-zinc-200 bg-white/90 px-3 py-2 text-sm text-zinc-900 shadow-inner outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-white/15 dark:bg-white/10 dark:text-white dark:focus:border-indigo-300 dark:focus:ring-indigo-500/40"
                />
              )}
            </label>
          ))}
        </div>

        <div className="grid gap-3 rounded-xl border border-zinc-200 bg-white/70 p-4 text-sm text-zinc-700 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-zinc-200">
          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500 dark:text-zinc-400">
              Ambiance / vibe
            </span>
            <input
              type="text"
              value={vibe}
              onChange={(e) => setVibe(decodeEntities(e.target.value))}
              className="rounded-lg border border-zinc-200 bg-white/90 px-3 py-2 text-sm text-zinc-900 shadow-inner outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-white/15 dark:bg-white/10 dark:text-white dark:focus:border-indigo-300 dark:focus:ring-indigo-500/40"
              placeholder="techno neon underground"
            />
          </label>
        </div>
      </div>

      <div className="flex justify-center">
        {selectedFlyerDataUrl ? (
          <div className="relative w-full max-w-[420px] overflow-hidden rounded-3xl shadow-2xl" style={{ aspectRatio: "4 / 5" }}>
            <img src={selectedFlyerDataUrl} alt="Flyer s√©lectionn√©" className="h-full w-full object-cover" />
          </div>
        ) : (
          <div
            className="flex w-full max-w-[420px] items-center justify-center rounded-3xl border border-dashed border-zinc-300 bg-white/40 p-6 text-center text-sm text-zinc-500 dark:border-white/20 dark:bg-white/5 dark:text-zinc-400"
            style={{ aspectRatio: "4 / 5" }}
          >
            GÈnÈrez un flyer pour voir l‚Äôaper√ßu
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
              GÈnÈration complËte (affiche IA)
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Produit un visuel complet avec tous les textes (titre, date, lieu, etc.).
            </p>
          </div>
          <button
            type="button"
            disabled={generatingFlyers}
            onClick={async () => {
              try {
                setGeneratingFlyers(true);
                const normalizedFlyer = Object.fromEntries(
                  Object.entries(flyer).map(([k, v]) => [k, decodeEntities(String(v))])
                ) as FlyerForm;
                const normalizedVibe = decodeEntities(vibe);
                const res = await fetch("/api/flyer-full", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ ...normalizedFlyer, vibe: normalizedVibe }),
                });
                if (!res.ok) {
                  const errText = await res.text().catch(() => "");
                  throw new Error(`Echec de gÈnÈration (${res.status}) ${errText}`);
                }
                const data = (await res.json()) as { images?: string[] };
                if (!data.images || data.images.length === 0) {
                  throw new Error("Aucune image re√ßue");
                }
                setFlyerImages(data.images);
                setSelectedFlyerDataUrl(data.images[0]);
                await runOcrSequential(data.images, normalizedFlyer);
              } catch (err) {
                console.error(err);
                alert("Impossible de GÈnÈrer les flyers pour le moment.");
              } finally {
                setGeneratingFlyers(false);
              }
            }}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {generatingFlyers ? "GÈnÈration..." : "GÈnÈrer 4 flyers (Full IA)"}
          </button>
        </div>

        {flyerImages.length > 0 && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {flyerImages.map((img, idx) => {
                const isSelected = selectedFlyerDataUrl === img;
                const ocr = ocrResults[idx];
                const badgeText =
                  ocr?.status === "ok"
                    ? "‚úÖ V√©rifi√©"
                    : ocr?.status === "bad"
                    ? `‚ùå √Ä v√©rifier${ocr.missing?.length ? ` (${ocr.missing.join(", ")})` : ""}`
                    : ocr?.status === "error"
                    ? "OCR error"
                    : ocr?.status === "checking"
                    ? "V√©rification‚Ä¶"
                    : undefined;
                return (
                  <button
                    key={img}
                    type="button"
                    onClick={() => setSelectedFlyerDataUrl(img)}
                    className={`relative overflow-hidden rounded-xl border transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${
                      isSelected ? "border-emerald-500 ring-2 ring-emerald-200" : "border-white/10"
                    }`}
                    aria-label={`Flyer ${idx + 1}`}
                  >
                    {badgeText && (
                      <div className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-1 text-[11px] font-semibold text-white shadow">
                        {badgeText}
                      </div>
                    )}
                    <img src={img} alt={`Flyer ${idx + 1}`} className="h-48 w-full object-cover" />
                    {isSelected && <div className="absolute inset-0 border-2 border-emerald-400" />}
                  </button>
                );
              })}
            </div>

            {selectedFlyerDataUrl && (
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/export-formats", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ imageDataUrl: selectedFlyerDataUrl }),
                      });
                      if (!res.ok) {
                        const errText = await res.text().catch(() => "");
                        throw new Error(`Echec export (${res.status}) ${errText}`);
                      }
                      const data = (await res.json()) as {
                        postDataUrl?: string;
                        storyDataUrl?: string;
                      };
                      const download = (url: string, name: string) => {
                        const link = document.createElement("a");
                        link.href = url;
                        link.download = name;
                        document.body.appendChild(link);
                        link.click();
                        link.remove();
                      };
                      if (data.postDataUrl) download(data.postDataUrl, "post.png");
                      if (data.storyDataUrl) download(data.storyDataUrl, "story.png");
                    } catch (err) {
                      console.error(err);
                      alert("Impossible d'exporter pour le moment.");
                    }
                  }}
                  className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                >
                  T√©l√©charger Post (1080x1350)
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/export-formats", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ imageDataUrl: selectedFlyerDataUrl }),
                      });
                      if (!res.ok) {
                        const errText = await res.text().catch(() => "");
                        throw new Error(`Echec export (${res.status}) ${errText}`);
                      }
                      const data = (await res.json()) as {
                        postDataUrl?: string;
                        storyDataUrl?: string;
                      };
                      const download = (url: string, name: string) => {
                        const link = document.createElement("a");
                        link.href = url;
                        link.download = name;
                        document.body.appendChild(link);
                        link.click();
                        link.remove();
                      };
                      if (data.storyDataUrl) download(data.storyDataUrl, "story.png");
                      if (!data.storyDataUrl && data.postDataUrl) download(data.postDataUrl, "story.png");
                    } catch (err) {
                      console.error(err);
                      alert("Impossible d'exporter pour le moment.");
                    }
                  }}
                  className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                >
                  T√©l√©charger Story (1080x1920)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}











