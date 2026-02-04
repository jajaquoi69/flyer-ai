"use client";

import React, { useEffect, useMemo, useState } from "react";

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

type Batch = {
  id: string;
  createdAt: number;
  vibe: string;
  images: string[];
  ocr: OcrResult[];
};

const MAX_GENERATIONS_PER_WEEK = 30;
const OCR_ENABLED = process.env.NEXT_PUBLIC_OCR_ENABLED === "true";
type Mode = "fast" | "premium";

const decodeEntities = (value: string) =>
  value
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&quot;|&#34;/g, '"')
    .replace(/&amp;|&#38;/g, "&")
    .replace(/&lt;|&#60;/g, "<")
    .replace(/&gt;|&#62;/g, ">");

const sanitizeForApi = (value: string) =>
  decodeEntities(value).trim();

const defaultFlyer: FlyerForm = {
  title: "Techno Night",
  subtitle: "Beats industriels, strobe et ligne d'acid jusqu'à l'aurore.",
  date: "Samedi 28 mars",
  time: "23h00 - 06h00",
  venue: "Warehouse 13",
  city: "Paris",
  price: "28 € • prévente",
  cta: "Réserver",
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

const weekStartLocal = () => {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const diff = (day + 6) % 7; // 0 when Monday
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() - diff);
  return monday.getTime();
};

export default function FlyerEditor() {
  const [flyer, setFlyer] = useState<FlyerForm>(defaultFlyer);
  const [vibe, setVibe] = useState<string>("techno neon underground");
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selected, setSelected] = useState<{ batchId: string; index: number } | null>(null);
  const [generatingFlyers, setGeneratingFlyers] = useState(false);
  const [genCount, setGenCount] = useState(0);
  const [weekStart, setWeekStart] = useState<number>(weekStartLocal());
  const [mode, setMode] = useState<Mode>("fast");

  // quota init
  useEffect(() => {
    const current = weekStartLocal();
    const storedWeek = Number(localStorage.getItem("flyer_gen_week_start") || "0");
    const storedCount = Number(localStorage.getItem("flyer_gen_week_count") || "0");
    if (storedWeek === current) {
      setGenCount(Number.isFinite(storedCount) ? storedCount : 0);
    } else {
      localStorage.setItem("flyer_gen_week_start", String(current));
      localStorage.setItem("flyer_gen_week_count", "0");
      setGenCount(0);
    }
    setWeekStart(current);
  }, []);

  const remaining = Math.max(0, MAX_GENERATIONS_PER_WEEK - genCount);

  const onChange =
    (key: keyof FlyerForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.value;
      setFlyer((prev) => ({ ...prev, [key]: value }));
    };

  const reset = () => setFlyer(defaultFlyer);

  const runOcrSequential = async (batchId: string, images: string[], normalized: FlyerForm) => {
    if (!OCR_ENABLED) {
      setBatches((prev) =>
        prev.map((b) =>
          b.id === batchId ? { ...b, ocr: images.map(() => ({ status: "idle" })) } : b
        )
      );
      return;
    }
    setBatches((prev) =>
      prev.map((b) =>
        b.id === batchId ? { ...b, ocr: images.map(() => ({ status: "checking" })) } : b
      )
    );
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

        setBatches((prev) =>
          prev.map((b) =>
            b.id === batchId
              ? {
                  ...b,
                  ocr: b.ocr.map((o, idx) =>
                    idx === i
                      ? ocr.isValid
                        ? { status: "ok", missing: ocr.missing, text: ocr.text }
                        : { status: "bad", missing: ocr.missing, text: ocr.text }
                      : o
                  ),
                }
              : b
          )
        );
      } catch (ocrErr: any) {
        setBatches((prev) =>
          prev.map((b) =>
            b.id === batchId
              ? {
                  ...b,
                  ocr: b.ocr.map((o, idx) =>
                    idx === i ? { status: "error", error: ocrErr?.message || "OCR error" } : o
                  ),
                }
              : b
          )
        );
      }
    }
  };

  const selectedImage = useMemo(() => {
    if (!selected) return null;
    const batch = batches.find((b) => b.id === selected.batchId);
    if (!batch) return null;
    return batch.images[selected.index] ?? null;
  }, [selected, batches]);

  return (
    <section className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-start">
        <div className="glass-card rounded-3xl border-white/10 p-6 shadow-lg shadow-indigo-900/40">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-white/60">Brief</p>
              <h2 className="text-xl font-semibold text-white">Paramètres du flyer</h2>
            </div>
            <button
              type="button"
              onClick={reset}
              className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-cyan-300/40 hover:text-white"
            >
              Réinitialiser
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            {fields.map(({ key, label, type }) => (
              <label
                key={key}
                className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80"
              >
                <span className="text-xs font-semibold uppercase tracking-[0.15em] text-white/60">
                  {label}
                </span>
                {key === "subtitle" ? (
                  <textarea
                    value={flyer[key]}
                    onChange={onChange(key)}
                    className="min-h-[72px] rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-400/30"
                  />
                ) : (
                  <input
                    type={type || "text"}
                    value={flyer[key]}
                    onChange={onChange(key)}
                    className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-400/30"
                  />
                )}
              </label>
            ))}
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-white/60">
                Ambiance / vibe
              </span>
              <input
                type="text"
                value={vibe}
                onChange={(e) => setVibe(e.target.value)}
                className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-400/30"
                placeholder="techno neon underground"
              />
            </label>
          </div>
        </div>

        <div className="glass-card rounded-3xl border-white/10 p-6 shadow-lg shadow-indigo-900/40">
          <div className="mb-4 flex items-center justify-between text-sm text-white/70">
            <span>Prévisualisation</span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/70">
              Sélection active
            </span>
          </div>
          {selectedImage ? (
            <div
              className="relative w-full overflow-hidden rounded-3xl border border-white/10 shadow-2xl shadow-indigo-900/40"
              style={{ aspectRatio: "4 / 5" }}
            >
              <img src={selectedImage} alt="Flyer sélectionné" className="h-full w-full object-cover" />
              <div className="pointer-events-none absolute inset-0 border border-white/10" />
            </div>
          ) : (
            <div
              className="relative flex w-full items-center justify-center overflow-hidden rounded-3xl border border-dashed border-white/15 bg-gradient-to-br from-indigo-900/40 via-purple-900/30 to-cyan-900/30 p-6 text-center text-sm text-white/60"
              style={{ aspectRatio: "4 / 5" }}
            >
              <div className="absolute inset-0 halo opacity-50 blur-3xl" />
              Générez un flyer pour voir l’aperçu
            </div>
          )}
        </div>
      </div>

      <div className="glass-card rounded-3xl border-white/10 p-6 shadow-lg shadow-indigo-900/40">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.14em] text-white/60">Génération complète</p>
            <h2 className="text-xl font-semibold text-white">Affiche IA 4 visuels</h2>
            <p className="text-sm text-white/70">
              Produit un visuel complet avec tous les textes (titre, date, lieu, etc.).
            </p>
            <p className="text-xs text-white/60">
              Générations restantes : {remaining} / {MAX_GENERATIONS_PER_WEEK} (semaine) — Reset : lundi 00:00
            </p>
            {remaining <= 0 && (
              <p className="text-xs font-semibold text-amber-300">
                Limite hebdo atteinte. Réessaie après lundi 00:00.
              </p>
            )}
          </div>
          <div className="flex flex-col items-start gap-2">
            <div className="flex items-center gap-2 text-xs text-white/70">
              <span>Mode :</span>
              <button
                type="button"
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  mode === "fast"
                    ? "border-cyan-300 bg-cyan-400/20 text-white"
                    : "border-white/10 text-white/60 hover:text-white"
                }`}
                onClick={() => setMode("fast")}
              >
                Rapide
              </button>
              <button
                type="button"
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  mode === "premium"
                    ? "border-purple-300 bg-purple-400/20 text-white"
                    : "border-white/10 text-white/60 hover:text-white"
                }`}
                onClick={() => setMode("premium")}
              >
                Premium
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={generatingFlyers || remaining <= 0}
                onClick={async () => {
                  try {
                    setGeneratingFlyers(true);
                    const normalizedFlyer = Object.fromEntries(
                      Object.entries(flyer).map(([k, v]) => [k, sanitizeForApi(String(v))])
                    ) as FlyerForm;
                    const normalizedVibe = sanitizeForApi(vibe);
                    const res = await fetch("/api/flyer-full", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ ...normalizedFlyer, vibe: normalizedVibe, mode }),
                    });
                    if (!res.ok) {
                      const errText = await res.text().catch(() => "");
                      throw new Error(`Echec de génération (${res.status}) ${errText}`);
                    }
                    // placeholder batch
                    const batchId = crypto.randomUUID();
                    const placeholderImages = Array(4).fill("");
                    const placeholderBatch: Batch = {
                      id: batchId,
                      createdAt: Date.now(),
                      vibe: normalizedVibe,
                      images: placeholderImages,
                      ocr: placeholderImages.map(() => ({
                        status: OCR_ENABLED ? "checking" : "idle",
                      })),
                    };
                    setBatches((prev) => [placeholderBatch, ...prev].slice(0, 10));
                    setSelected({ batchId, index: 0 });

                    const data = (await res.json()) as { images?: string[] };
                    if (!data.images || data.images.length === 0) {
                      throw new Error("Aucune image reçue");
                    }
                    const images = data.images;

                    // quota increment
                    setGenCount((prev) => {
                      const next = prev + 1;
                      localStorage.setItem("flyer_gen_week_count", String(next));
                      localStorage.setItem("flyer_gen_week_start", String(weekStartLocal()));
                      return next;
                    });

                    // replace placeholders with real images
                    setBatches((prev) =>
                      prev.map((b) =>
                        b.id === batchId
                          ? {
                              ...b,
                              images,
                              ocr: images.map(() => ({
                                status: OCR_ENABLED ? "checking" : "idle",
                              })),
                            }
                          : b
                      )
                    );

                    await runOcrSequential(batchId, images, normalizedFlyer);
                  } catch (err) {
                    console.error(err);
                    alert("Impossible de générer les flyers pour le moment.");
                } finally {
                  setGeneratingFlyers(false);
                }
              }}
                className="inline-flex items-center rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/40 transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {generatingFlyers ? "Génération..." : "Générer 4 flyers (Full IA)"}
            </button>
          </div>
        </div>
        </div>
      </div>

      <div className="glass-card rounded-3xl border-white/10 p-6 shadow-lg shadow-indigo-900/40">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-white/60">Historique & OCR</p>
            <p className="text-sm text-white/70">Derniers lots générés (max 10)</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setBatches([]);
              setSelected(null);
            }}
            className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-white/80 transition hover:border-cyan-300/40 hover:text-white"
          >
            Vider l’historique
          </button>
        </div>
        {batches.length === 0 ? (
          <p className="text-sm text-white/60">Aucun lot généré pour l’instant.</p>
        ) : (
          <div className="space-y-3">
            {batches.map((batch) => (
              <div
                key={batch.id}
                className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-indigo-950/30"
              >
                <div className="flex items-center justify-between text-xs text-white/60">
                  <span>
                    Génération {new Date(batch.createdAt).toLocaleString()} — vibe : {batch.vibe || "N/A"}
                  </span>
                  {OCR_ENABLED && (
                    <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] font-semibold text-white/70">
                      OCR
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {batch.images.map((img, idx) => {
                    const isSelected = selected?.batchId === batch.id && selected.index === idx;
                    const ocr = batch.ocr[idx];
                    const badgeText =
                      ocr?.status === "ok"
                        ? "✅ Vérifié"
                        : ocr?.status === "bad"
                        ? `❌ À vérifier${ocr.missing?.length ? ` (${ocr.missing.join(", ")})` : ""}`
                        : ocr?.status === "error"
                        ? "OCR error"
                        : ocr?.status === "checking"
                        ? "Vérification…"
                        : undefined;
                    return (
                      <button
                        key={`${batch.id}-${idx}`}
                        type="button"
                        onClick={() => setSelected({ batchId: batch.id, index: idx })}
                        className={`relative overflow-hidden rounded-xl border bg-black/40 transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 ${
                          isSelected ? "border-cyan-300 ring-2 ring-cyan-300/40" : "border-white/10"
                        }`}
                        aria-label={`Flyer ${idx + 1}`}
                      >
                        {badgeText && (
                          <div className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-1 text-[11px] font-semibold text-white shadow">
                            {badgeText}
                          </div>
                        )}
                        {img ? (
                          <img src={img} alt={`Flyer ${idx + 1}`} className="h-48 w-full object-cover" />
                        ) : (
                          <div className="h-48 w-full animate-pulse bg-white/10" />
                        )}
                        {isSelected && <div className="pointer-events-none absolute inset-0 border-2 border-cyan-300/80" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedImage && (
        <div className="glass-card rounded-3xl border-white/10 p-6 shadow-lg shadow-indigo-900/40">
          <p className="text-sm font-semibold text-white">Exports rapides</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={async () => {
                try {
                  const res = await fetch("/api/export-formats", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ imageDataUrl: selectedImage }),
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
              className="inline-flex items-center rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              Télécharger Post (1080x1350)
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  const res = await fetch("/api/export-formats", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ imageDataUrl: selectedImage }),
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
              className="inline-flex items-center rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              Télécharger Story (1080x1920)
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

