"use client";

import Link from "next/link";
import React from "react";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/", label: "Accueil" },
  { href: "/pricing", label: "Tarifs" },
  { href: "/create", label: "Créer" },
];

type HeaderVariant = "marketing" | "app";

export function SiteHeader({ variant = "marketing" }: { variant?: HeaderVariant }) {
  const pathname = usePathname();
  const isActive = (href: string) => (pathname === "/" ? href === "/" : pathname?.startsWith(href));

  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-black/40 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 lg:px-8">
        <Link href="/" className="flex items-center gap-3 text-sm font-semibold text-white">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-400 shadow-lg shadow-indigo-500/30">
            FA
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold tracking-tight">Flyer AI</span>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-cyan-200">
              Bêta
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-white/80 md:flex">
          {navLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`transition hover:text-white ${
                isActive(item.href) ? "text-white underline decoration-cyan-300/60 underline-offset-4" : ""
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {variant === "marketing" && (
            <Link
              href="/pricing"
              className="hidden rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-cyan-300/40 hover:text-white md:inline-flex"
            >
              Voir les tarifs
            </Link>
          )}
          <Link
            href="/create"
            className="inline-flex items-center rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:translate-y-[-1px] hover:shadow-cyan-400/40"
          >
            Créer un flyer
          </Link>
        </div>
      </div>
    </header>
  );
}
