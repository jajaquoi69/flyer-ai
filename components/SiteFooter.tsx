import Link from "next/link";
import React from "react";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/5 bg-black/40 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 lg:px-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-white">Flyer AI</p>
          <p className="text-sm text-white/60">Booster visuel pour bars & clubs nocturnes.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm text-white/60">
          <Link href="/legal" className="transition hover:text-white">
            Mentions légales
          </Link>
          <Link href="mailto:contact@flyer.ai" className="transition hover:text-white">
            contact@flyer.ai
          </Link>
          <Link href="https://instagram.com" className="transition hover:text-white">
            Instagram
          </Link>
        </div>
      </div>
    </footer>
  );
}
