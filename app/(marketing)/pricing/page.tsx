import Link from "next/link";
import React from "react";

const tiers = [
  {
    name: "Bêta",
    price: "Inclus",
    desc: "30 générations / semaine, export HD, OCR, historique.",
    badge: "Actif",
    cta: { href: "/create", label: "Créer maintenant" },
  },
  {
    name: "Pro",
    price: "Bientôt",
    desc: "Volumes illimités, branding custom, génération story dédiée.",
    badge: "Coming soon",
    cta: { href: "mailto:contact@flyer.ai", label: "Parler au commercial" },
  },
];

export default function PricingPage() {
  return (
    <div className="relative mx-auto max-w-5xl px-6 pb-20 pt-12 lg:px-8">
      <div className="mb-10 space-y-3 text-center">
        <p className="text-sm uppercase tracking-[0.14em] text-white/50">Tarifs</p>
        <h1 className="text-3xl font-semibold text-white">Pensé pour les bars, simple à piloter</h1>
        <p className="text-base text-white/70">
          Commence avec le plan Bêta, contacte-nous pour ouvrir le plan Pro ou des besoins volumétriques.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className="glass-card flex h-full flex-col justify-between rounded-2xl border-white/10 p-6 shadow-lg shadow-indigo-900/40"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-lg font-semibold text-white">{tier.name}</p>
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                  {tier.badge}
                </span>
              </div>
              <p className="text-3xl font-semibold text-white">{tier.price}</p>
              <p className="text-sm text-white/70">{tier.desc}</p>
            </div>
            <div className="mt-6">
              <Link
                href={tier.cta.href}
                className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/40 transition hover:translate-y-[-1px]"
              >
                {tier.cta.label}
              </Link>
              {tier.name === "Bêta" && (
                <p className="mt-3 text-center text-xs text-white/60">
                  Limite hebdo : 30 générations. Remis à zéro chaque lundi.
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 text-center text-sm text-white/60">
        Besoin de volumes importants pour un réseau de bars ?{" "}
        <Link href="mailto:contact@flyer.ai" className="text-cyan-200 hover:text-white">
          contact@flyer.ai
        </Link>
      </div>
    </div>
  );
}
