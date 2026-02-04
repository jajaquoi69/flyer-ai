import Link from "next/link";
import React from "react";
import Flyer3DRingCarousel from "@/components/Flyer3DRingCarousel";

const steps = [
  {
    title: "✨ Décris la vibe",
    text: "Techno warehouse, soirée cocktails ou DJ guest : titre, lieu, date, horaires.",
  },
  {
    title: "🎛️ Génère 4 visuels",
    text: "Layouts 4:5 prêts Insta, contrastés pour écrans mobiles, halo & verre dépoli.",
  },
  {
    title: "📸 Poste direct",
    text: "Export HD Post & Story. OCR en option (bientôt) pour checker les infos clés.",
  },
];

const reasons = [
  { title: "🪩 Lisible en club", text: "Typo nette, contraste fort, rien ne disparaît dans les lumières." },
  { title: "⚡ Palette nocturne", text: "Dégradés indigo/cyan, halos maîtrisés, reflets verre premium." },
  { title: "📱 Formats Insta prêts", text: "Post 1080x1350 et Story 1080x1920 générés en un clic." },
  { title: "🧠 Option OCR (bientôt)", text: "Vérification automatique des infos avant publication." },
  { title: "🕒 Historique & relance", text: "Retrouve tes derniers lots, relance ou télécharge sans tout ressaisir." },
  { title: "🚀 Mode premium", text: "Rendu plus propre, lumières précises, textures fines et vibes sur-mesure." },
];

const examples = [
  { title: "Techno Warehouse", vibe: "Néons violet + lignes acides" },
  { title: "Cocktail Lounge", vibe: "Verre dépoli + halo turquoise" },
  { title: "Soirée Disco", vibe: "Paillettes, chrome et typographie bold" },
];

export default function MarketingHome() {
  return (
    <div className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-60 blur-3xl">
        <div className="absolute left-[-10%] top-0 h-72 w-72 rounded-full bg-indigo-500/30" />
        <div className="absolute right-[-5%] top-16 h-80 w-80 rounded-full bg-cyan-400/25" />
        <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-500/20" />
      </div>

      <section className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-16 lg:grid-cols-2 lg:px-8 lg:pt-24">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-cyan-100">
              🧪 Bêta privée
            </span>
            <span className="text-sm text-white/70">⚡ Optimisé pour bars & clubs</span>
          </div>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
            Des flyers de soirée qui claquent,
            <span className="bg-gradient-to-r from-cyan-300 via-purple-300 to-cyan-200 bg-clip-text text-transparent">
              {" "}
              en 20 secondes ✨
            </span>
          </h1>
          <p className="max-w-2xl text-lg text-white/70">
            4 propositions prêtes pour Instagram, guidées par ta vibe, avec halos propres et texte lisible.
            Exports Post & Story instantanés. OCR en option (bientôt) pour double-checker les infos.
          </p>
          <p className="text-sm text-white/60">
            📍 Optimisé pour bars & clubs • 📸 Formats Insta • 4 propositions par lot
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/create"
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/40 ring-1 ring-cyan-200/40 transition hover:translate-y-[-1px] hover:shadow-cyan-400/50"
            >
              Créer un flyer 🚀
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white/75 transition hover:border-cyan-300/40 hover:text-white"
            >
              Voir les tarifs 💎
            </Link>
            <span className="text-xs uppercase tracking-[0.08em] text-white/50">
              30 générations/semaine en bêta
            </span>
          </div>
          <div className="glass-card mt-6 grid grid-cols-2 gap-4 rounded-2xl p-5 text-sm text-white/80 sm:w-fit">
            <div>
              <p className="text-xs uppercase tracking-wide text-white/60">Qualité</p>
              <p className="text-lg font-semibold text-white">4 visuels</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-white/60">Contrôle</p>
              <p className="text-lg font-semibold text-white">Option OCR (bientôt)</p>
            </div>
          </div>
          </div>

        <div className="relative">
          <div className="absolute inset-0 rounded-full blur-[120px] bg-gradient-to-br from-indigo-500/30 via-purple-500/20 to-cyan-400/25" />
          <div className="relative rounded-[28px] bg-white/6 p-8 shadow-2xl shadow-indigo-900/40 backdrop-blur-xl">
            <Flyer3DRingCarousel />
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl space-y-10 px-6 pb-20 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.14em] text-white/50">🧭 Comment ça marche</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">En 3 étapes simples</h2>
          </div>
          <Link href="/create" className="text-sm font-semibold text-cyan-200 hover:text-white">
            Lancer une génération →
          </Link>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.title}
              className="glass-card rounded-2xl border-white/10 p-6 shadow-lg shadow-indigo-900/30"
            >
              <div className="mb-3 h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500/40 to-cyan-400/40" />
              <h3 className="text-lg font-semibold text-white">{step.title}</h3>
              <p className="mt-2 text-sm text-white/70">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl space-y-8 px-6 pb-16 lg:px-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.14em] text-white/50">🎯 Pour qui ?</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">Bars, clubs et crews qui bougent</h2>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/80">
              {["🍹 Bars", "🪩 Clubs", "📚 Assos étudiantes", "🎧 DJs / Collectifs"].map((t) => (
                <span key={t} className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.14em] text-white/50">💡 Pourquoi ça fonctionne</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">Pensé pour la nuit</h2>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {reasons.map((reason) => (
            <div
              key={reason.title}
              className="glass-card rounded-2xl border-white/10 p-6 shadow-lg shadow-indigo-900/30"
            >
              <h3 className="text-lg font-semibold text-white">{reason.title}</h3>
              <p className="mt-2 text-sm text-white/70">{reason.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl space-y-8 px-6 pb-20 lg:px-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.14em] text-white/50">🖼️ Exemples</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">Choisis ta vibe</h2>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {examples.map((item) => (
            <div key={item.title} className="glass-card overflow-hidden rounded-2xl border-white/10 shadow-lg">
              <div className="relative aspect-[4/5] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/30 via-purple-500/25 to-cyan-400/25" />
                <div className="absolute inset-0 halo opacity-50 blur-3xl" />
                <div className="absolute inset-0 border border-white/10" />
              </div>
              <div className="p-5">
                <h3 className="text-base font-semibold text-white">{item.title}</h3>
                <p className="text-sm text-white/70">{item.vibe}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl space-y-8 px-6 pb-20 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.14em] text-white/50">📱 Formats</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">Prêts pour Insta & Story</h2>
          </div>
          <Link
            href="/create"
            className="inline-flex items-center rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            Lancer un lot
          </Link>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="glass-card mx-auto w-full max-w-xs rounded-2xl border-white/10 p-6 shadow-lg md:max-w-sm">
            <div className="flex items-center justify-between text-sm text-white/60">
              <span>Post 4:5</span>
              <span>1080 x 1350</span>
            </div>
            <div className="mt-4 aspect-[4/5] overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-indigo-600/40 via-purple-700/30 to-cyan-500/30" />
          </div>
          <div className="glass-card mx-auto w-full max-w-xs rounded-2xl border-white/10 p-6 shadow-lg md:max-w-sm">
            <div className="flex items-center justify-between text-sm text-white/60">
              <span>Story 9:16</span>
              <span>1080 x 1920</span>
            </div>
            <div className="mt-4 aspect-[9/16] overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-purple-700/30 via-indigo-700/30 to-cyan-500/30" />
          </div>
        </div>
      </section>

      <section className="relative isolate overflow-hidden pb-20">
        <div className="absolute inset-0 blur-3xl">
          <div className="absolute left-1/3 top-0 h-72 w-72 rounded-full bg-indigo-500/30" />
          <div className="absolute right-1/4 top-10 h-80 w-80 rounded-full bg-cyan-400/25" />
        </div>
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-indigo-900/30 via-purple-900/20 to-cyan-900/30 px-8 py-12 shadow-2xl shadow-indigo-900/50 lg:px-12 lg:py-14">
          <div className="glass-card absolute inset-6 -z-10 rounded-3xl opacity-60 blur-3xl" />
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.14em] text-white/50">Prêt à essayer ?</p>
              <h3 className="mt-3 text-3xl font-semibold text-white">
                Prêt à remplir ton prochain event ? 🪩
              </h3>
              <p className="mt-2 text-base text-white/70">
                4 propositions prêtes Insta, exports Post & Story en quelques secondes. Bêta : 30 générations / semaine, feedback bienvenu.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/create"
                className="inline-flex items-center rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/40 transition hover:translate-y-[-1px]"
              >
                Lancer une génération
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white/80 transition hover:border-cyan-300/40 hover:text-white"
              >
                Voir les tarifs
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
