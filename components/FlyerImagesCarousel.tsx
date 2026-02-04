"use client";

import Image from "next/image";
import React, { useEffect, useMemo, useRef, useState } from "react";

const slides = [
  { src: "/examples/01.png", alt: "Exemple flyer 1" },
  { src: "/examples/02.png", alt: "Exemple flyer 2" },
  { src: "/examples/03.png", alt: "Exemple flyer 3" },
  { src: "/examples/04.png", alt: "Exemple flyer 4" },
  { src: "/examples/05.png", alt: "Exemple flyer 5" },
  { src: "/examples/06.png", alt: "Exemple flyer 6" },
];

type Props = {
  interval?: number;
};

export default function FlyerImagesCarousel({ interval = 3500 }: Props) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (prefersReduced || paused) return;
    timerRef.current = setTimeout(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, interval);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [index, paused, prefersReduced, interval]);

  const goTo = (i: number) => setIndex(i % slides.length);
  const prev = () => setIndex((i) => (i - 1 + slides.length) % slides.length);
  const next = () => setIndex((i) => (i + 1) % slides.length);

  const current = useMemo(() => slides[index], [index]);

  return (
    <div
      className="relative w-full"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="mb-4 flex items-center justify-between text-sm text-white/70">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Serveur créatif actif
        </span>
        <span className="text-white/60">1080 x 1350</span>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-white/10 shadow-2xl shadow-indigo-900/40" style={{ aspectRatio: "4 / 5" }}>
        <div
          className="absolute inset-0 rounded-3xl"
          style={{
            boxShadow: "0 0 24px rgba(67,212,255,0.24), 0 0 42px rgba(124,111,247,0.22)",
          }}
        />
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-indigo-900/40 via-purple-900/20 to-cyan-900/25" />
        <div className="relative h-full w-full">
          <Image
            key={current.src}
            src={current.src}
            alt={current.alt}
            fill
            sizes="420px"
            className={`h-full w-full object-cover rounded-3xl transition duration-600 ease-out ${
              prefersReduced ? "" : "opacity-100 animate-[fadeIn_0.6s_ease]"
            }`}
            onError={() => next()}
            priority
          />
        </div>

        {!prefersReduced && (
          <>
            <button
              aria-label="Précédent"
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-black/40 px-2 py-1 text-white/80 backdrop-blur hover:bg-white/10"
            >
              ‹
            </button>
            <button
              aria-label="Suivant"
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-black/40 px-2 py-1 text-white/80 backdrop-blur hover:bg-white/10"
            >
              ›
            </button>
          </>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              aria-label={`Aller au visuel ${i + 1}`}
              onClick={() => goTo(i)}
              className={`h-2.5 rounded-full transition ${
                i === index ? "w-6 bg-white" : "w-2.5 bg-white/30 hover:bg-white/60"
              }`}
            />
          ))}
        </div>
        <span className="text-xs uppercase tracking-[0.14em] text-white/50">Exemples générés</span>
      </div>
    </div>
  );
}

// fade animation
const fadeStyles = `
@keyframes fadeIn {
  from { opacity: 0; transform: scale(1.01); }
  to { opacity: 1; transform: scale(1); }
}
`;

if (typeof document !== "undefined" && !document.getElementById("flyer-carousel-fade")) {
  const styleTag = document.createElement("style");
  styleTag.id = "flyer-carousel-fade";
  styleTag.innerHTML = fadeStyles;
  document.head.appendChild(styleTag);
}
