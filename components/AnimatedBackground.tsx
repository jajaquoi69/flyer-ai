"use client";

import React, { useEffect, useMemo, useRef } from "react";

type Variant = "marketing" | "app";

type Star = { x: number; y: number; r: number; baseA: number; speed: number; layer: "near" | "far" };

type BgConfig = {
  planet: {
    size: number; // percentage of min(viewport)
    top: string;
    left: string;
    opacity: number;
    blur: number;
    glow: number;
  };
  nebulaOpacity: number;
  starCountDesktop: number;
  starCountMobile: number;
  nearLayerRatio: number;
  twinkleStrength: number;
  baseAlpha: number;
  parallaxPlanet: number;
  parallaxStars: number;
};

const CONFIG: Record<Variant, BgConfig> = {
  marketing: {
    planet: { size: 85, top: "15%", left: "30%", opacity: 0.9, blur: 0, glow: 32 },
    nebulaOpacity: 0.38,
    starCountDesktop: 260,
    starCountMobile: 160,
    nearLayerRatio: 0.55,
    twinkleStrength: 0.18,
    baseAlpha: 0.68,
    parallaxPlanet: -0.05,
    parallaxStars: -0.09,
  },
  app: {
    planet: { size: 70, top: "25%", left: "60%", opacity: 0.45, blur: 8, glow: 12 },
    nebulaOpacity: 0.3,
    starCountDesktop: 140,
    starCountMobile: 80,
    nearLayerRatio: 0.35,
    twinkleStrength: 0.1,
    baseAlpha: 0.45,
    parallaxPlanet: -0.025,
    parallaxStars: -0.045,
  },
};

const noiseSvg = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.25'/%3E%3C/svg%3E`;
const planetNoise = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cfilter id='pn'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.3' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23pn)' opacity='0.12'/%3E%3C/svg%3E`;

export default function AnimatedBackground({ variant = "marketing" }: { variant?: Variant }) {
  const planetRef = useRef<HTMLDivElement>(null);
  const starsCanvasRef = useRef<HTMLCanvasElement>(null);
  const nebulaRef = useRef<HTMLDivElement>(null);
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const cfg = useMemo(() => CONFIG[variant], [variant]);

  useEffect(() => {
    const planet = planetRef.current;
    const canvas = starsCanvasRef.current;
    if (!planet || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let stars: Star[] = [];
    const makeStars = () => {
      const count = (window.innerWidth < 768 ? cfg.starCountMobile : cfg.starCountDesktop) | 0;
      stars = Array.from({ length: count }, (_, i) => {
        const layer: "near" | "far" = i / count < cfg.nearLayerRatio ? "near" : "far";
        const depth = layer === "near" ? 1 : 0.6;
        return {
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          r: (Math.random() * 1.3 + 0.4) * depth,
          baseA: (Math.random() * 0.4 + cfg.baseAlpha) * depth,
          speed: (Math.random() * 0.6 + 0.2) * depth,
          layer,
        };
      });
      // occasional brighter stars
      const brightCount = Math.max(4, Math.floor(count * 0.04));
      for (let i = 0; i < brightCount; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          r: Math.random() * 1.8 + 1.2,
          baseA: 0.85,
          speed: Math.random() * 0.4 + 0.2,
          layer: "near",
        });
      }
    };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      makeStars();
    };
    resize();

    let frameId = 0;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const time = performance.now() * 0.002;
      for (const s of stars) {
        const twinkle = prefersReduced ? 0 : Math.sin(time * s.speed + s.x) * cfg.twinkleStrength;
        const alpha = Math.max(0, Math.min(1, s.baseA + twinkle));
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      frameId = requestAnimationFrame(render);
    };
    if (!prefersReduced) frameId = requestAnimationFrame(render);

    const onScroll = () => {
      const y = window.scrollY;
      const planetOffset = y * cfg.parallaxPlanet;
      const starOffset = y * cfg.parallaxStars;
      planet.style.transform = `translate3d(0, ${planetOffset}px, 0)`;
      canvas.style.transform = `translate3d(0, ${starOffset}px, 0)`;
    };
    const onMove = (e: MouseEvent) => {
      if (prefersReduced) return;
      const dx = (e.clientX / window.innerWidth - 0.5);
      const dy = (e.clientY / window.innerHeight - 0.5);
      planet.style.transform = `translate3d(${dx * 10}px, ${dy * 10}px, 0)`;
      canvas.style.transform = `translate3d(${dx * 6}px, ${dy * 6}px, 0)`;
    };

    window.addEventListener("resize", resize);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("mousemove", onMove);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousemove", onMove);
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [cfg, prefersReduced]);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[#02030a]" aria-hidden />
      {/* Nebula layer */}
      <div
        ref={nebulaRef}
        className="absolute inset-0"
        aria-hidden
        style={{
          opacity: cfg.nebulaOpacity,
          background:
            "radial-gradient(55% 55% at 20% 30%, rgba(124,111,247,0.35), transparent), radial-gradient(45% 45% at 75% 25%, rgba(67,212,255,0.28), transparent), radial-gradient(40% 40% at 60% 70%, rgba(255,140,255,0.15), transparent)",
          animation: prefersReduced ? "none" : "nebulaDrift 28s ease-in-out infinite alternate",
        }}
      />

      {/* Planet / halo */}
      <div
        ref={planetRef}
        className="absolute"
        aria-hidden
        style={{
          width: `${cfg.planet.size}vmin`,
          height: `${cfg.planet.size}vmin`,
          top: cfg.planet.top,
          left: cfg.planet.left,
          transform: "translate(-50%, -50%)",
          opacity: cfg.planet.opacity,
          filter: `blur(${cfg.planet.blur}px) drop-shadow(0 30px 80px rgba(2,3,10,0.55)) drop-shadow(0 40px 120px rgba(124,111,247,0.28))`,
          background: `
            radial-gradient(70% 70% at 65% 32%, rgba(255,255,255,0.55), transparent 60%),
            radial-gradient(85% 85% at 40% 55%, rgba(124,111,247,0.58), transparent 72%),
            radial-gradient(100% 100% at 30% 60%, rgba(67,212,255,0.42), transparent 78%),
            radial-gradient(120% 120% at 52% 52%, rgba(255,255,255,0.12), transparent 78%),
            radial-gradient(140% 140% at 52% 52%, rgba(8,10,22,1), rgba(4,6,13,1) 70%)
          `,
          boxShadow: `
            0 0 ${cfg.planet.glow}px rgba(124,111,247,0.4),
            0 0 ${cfg.planet.glow * 1.2}px rgba(67,212,255,0.28),
            0 12px 40px rgba(0,0,0,0.45),
            0 0 0 1px rgba(255,255,255,0.05)
          `,
          borderRadius: "9999px",
          backgroundImage: `
            radial-gradient(120% 120% at 70% 35%, rgba(255,255,255,0.14), transparent 55%),
            radial-gradient(160% 160% at 15% 80%, rgba(0,0,0,0.35), transparent 60%),
            url(${planetNoise})
          `,
          backgroundBlendMode: "screen, normal, soft-light",
        }}
      />

      {/* Stars canvas */}
      <canvas
        ref={starsCanvasRef}
        className="absolute inset-0"
        aria-hidden
        style={{ transform: "translate3d(0,0,0)" }}
      />

      {/* Noise overlay */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${noiseSvg})`,
          mixBlendMode: "soft-light",
          opacity: 0.22,
        }}
        aria-hidden
      />
    </div>
  );
}

// Nebula animation
const styles = `
@keyframes nebulaDrift {
  0% { transform: translate3d(0,0,0) scale(1); }
  50% { transform: translate3d(2%, -1%, 0) scale(1.02); }
  100% { transform: translate3d(-2%, 1%, 0) scale(1.03); }
}
`;

if (typeof document !== "undefined" && !document.getElementById("animated-bg-styles")) {
  const styleTag = document.createElement("style");
  styleTag.id = "animated-bg-styles";
  styleTag.innerHTML = styles;
  document.head.appendChild(styleTag);
}
