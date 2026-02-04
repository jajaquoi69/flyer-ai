"use client";

import Image from "next/image";
import React, { useEffect, useMemo, useRef, useState } from "react";

const slides = [
  { src: "/examples/01.png", alt: "Flyer 1" },
  { src: "/examples/02.png", alt: "Flyer 2" },
  { src: "/examples/03.png", alt: "Flyer 3" },
  { src: "/examples/04.png", alt: "Flyer 4" },
  { src: "/examples/05.png", alt: "Flyer 5" },
  { src: "/examples/06.png", alt: "Flyer 6" },
];

const degPerItem = 360 / slides.length;
const radius = 240; // tightened ring

export default function Flyer3DRingCarousel() {
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [lastX, setLastX] = useState(0);
  const velocityRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const stopInertia = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  };

  useEffect(() => {
    return () => stopInertia();
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    stopInertia();
    setIsDragging(true);
    setLastX(e.clientX);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - lastX;
    setLastX(e.clientX);
    const deltaDeg = dx * 0.25;
    setRotation((r) => r + deltaDeg);
    velocityRef.current = deltaDeg;
  };

  const snapToNearest = (currentRot: number, startVelocity = 0) => {
    const nearestIndex = Math.round((-currentRot % 360) / degPerItem);
    const targetRot = -nearestIndex * degPerItem;
    if (prefersReduced) {
      setRotation(targetRot);
      return;
    }
    const start = performance.now();
    const duration = 320;
    const initial = currentRot;
    const delta = targetRot - initial;
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
    const animate = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setRotation(initial + delta * easeOut(p));
      if (p < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
  };

  const startInertia = () => {
    if (prefersReduced) {
      snapToNearest(rotation);
      return;
    }
    let velocity = velocityRef.current;
    const decay = 0.92;
    const tick = () => {
      velocity *= decay;
      const nextRot = rotation + velocity;
      setRotation(nextRot);
      if (Math.abs(velocity) < 0.05) {
        snapToNearest(nextRot, velocity);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    startInertia();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") setRotation((r) => r + degPerItem);
    if (e.key === "ArrowRight") setRotation((r) => r - degPerItem);
  };

  const orderedSlides = useMemo(() => slides, []);

  return (
    <div
      className="relative w-full select-none"
      style={{ perspective: "700px" }}
      onKeyDown={onKeyDown}
      tabIndex={0}
    >
      <div className="mb-4 flex items-center justify-between text-sm text-white/70">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Serveur créatif actif
        </span>
        <span className="text-white/60">1080 × 1350</span>
      </div>

      <div
        className="relative mx-auto h-[440px] max-w-[420px] touch-pan-y"
        style={{ perspective: "700px" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          className="absolute inset-0"
          style={{
            transformStyle: "preserve-3d",
            transform: `translateZ(-${radius}px) rotateY(${rotation}deg)`,
            transition: prefersReduced || isDragging ? "none" : "transform 0.15s ease-out",
          }}
        >
          {orderedSlides.map((slide, i) => {
            const angle = i * degPerItem;
            const rawDelta = (angle + rotation) % 360;
            const delta = rawDelta > 180 ? rawDelta - 360 : rawDelta; // -180..180
            const dist = Math.min(Math.abs(delta), 360 - Math.abs(delta)) / 180; // 0..1
            const closeness = 1 - Math.min(Math.max(dist, 0), 1);

            let opacity = 0.35 + closeness * closeness * 0.65;
            let scale = 0.82 + closeness * 0.24;
            let blur = (1 - closeness) * 1.8;

            if (dist <= 0.15) {
              opacity = 1;
              scale = 1.05;
              blur = 0;
            } else if (dist <= 0.38) {
              opacity = Math.min(0.92, 0.7 + closeness * 0.25);
              scale = 0.92 + closeness * 0.12;
              blur = 0.2;
            } else {
              opacity = Math.min(opacity, 0.38);
              blur = Math.max(1.2, blur);
            }

            const isBack = dist > 0.65 || Math.cos((angle - rotation) * (Math.PI / 180)) < 0;
            if (isBack) {
              opacity = Math.min(opacity, 0.28);
              blur = Math.max(2.4, blur);
            }

            const saturation = 0.6 + closeness * 0.4;
            const brightness = 0.7 + closeness * 0.3;
            const zIndex = Math.round(closeness * 1000);
            const frontBoost = dist <= 0.12;
            const scaleFront = frontBoost ? 1.05 : scale;
            const opacityFront = frontBoost ? 1 : opacity;

            return (
              <div
                key={slide.src}
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  transform: `rotateY(${angle}deg) translateZ(${radius}px)`,
                  backfaceVisibility: "hidden",
                  zIndex,
                }}
              >
                <div
                  className="relative aspect-[4/5] w-[220px] overflow-hidden rounded-3xl shadow-2xl shadow-indigo-900/40"
                  style={{
                    transform: `scale(${scaleFront})`,
                    opacity: opacityFront,
                    filter: `blur(${blur}px) saturate(${saturation}) brightness(${brightness})`,
                    boxShadow:
                      frontBoost
                        ? "0 0 32px rgba(67,212,255,0.35), 0 0 44px rgba(124,111,247,0.34)"
                        : "0 8px 24px rgba(0,0,0,0.35)",
                  }}
                >
                  <Image
                    src={slide.src}
                    alt={slide.alt}
                    fill
                    sizes="320px"
                    className="h-full w-full object-cover rounded-3xl"
                    style={{ opacity: 1 }}
                    priority={i < 2}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-center gap-3 text-white/70">
        <button
          aria-label="Précédent"
          onClick={() => setRotation((r) => r + degPerItem)}
          className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-sm backdrop-blur hover:bg-white/10"
        >
          ‹
        </button>
        <span className="text-xs uppercase tracking-[0.14em] text-white/50">Exemples générés</span>
        <button
          aria-label="Suivant"
          onClick={() => setRotation((r) => r - degPerItem)}
          className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-sm backdrop-blur hover:bg-white/10"
        >
          ›
        </button>
      </div>
    </div>
  );
}
