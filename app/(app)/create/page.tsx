import type { Metadata } from "next";
import Link from "next/link";
import FlyerEditor from "./FlyerEditor";

export const metadata: Metadata = {
  title: "Créer un flyer | Flyer AI",
  description: "Prévisualisez un flyer 4:5 optimisé pour Instagram.",
};

export default function CreateFlyerPage() {
  return (
    <main className="space-y-8">
      <header className="glass-card rounded-3xl border-white/10 bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-cyan-900/30 p-6 shadow-xl shadow-indigo-900/40">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-cyan-100">
              Bêta
            </span>
            <span className="text-sm text-white/70">30 générations/semaine</span>
          </div>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold leading-tight text-white">Créer un flyer</h1>
              <p className="max-w-3xl text-base text-white/70">
                Génère 4 visuels 4:5 optimisés Instagram, contrôle OCR automatique et exports Post/Story.
                Adapte le brief à l&apos;ambiance de ta soirée.
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/pricing"
                className="inline-flex items-center rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-cyan-300/40 hover:text-white"
              >
                Voir les tarifs
              </Link>
              <Link
                href="/"
                className="inline-flex items-center rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                Accueil
              </Link>
            </div>
          </div>
        </div>
      </header>

      <FlyerEditor />
    </main>
  );
}
