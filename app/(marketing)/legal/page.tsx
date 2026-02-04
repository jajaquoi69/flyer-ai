import React from "react";

export default function LegalPage() {
  return (
    <div className="relative mx-auto max-w-4xl px-6 pb-20 pt-12 lg:px-8">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.14em] text-white/50">Mentions légales</p>
        <h1 className="text-3xl font-semibold text-white">Informations légales & confidentialité</h1>
        <p className="text-base text-white/70">
          Flyer AI est un service expérimental destiné aux établissements de nuit. Ces mentions servent de
          référence jusqu&apos;à la publication des CGU complètes.
        </p>
      </div>

      <div className="mt-8 space-y-6">
        <section className="glass-card rounded-2xl border-white/10 p-6 shadow-lg shadow-indigo-900/30">
          <h2 className="text-lg font-semibold text-white">Éditeur</h2>
          <p className="mt-2 text-sm text-white/70">
            Nom de la société (à compléter), siège social (adresse), email de contact : contact@flyer.ai.
          </p>
        </section>

        <section className="glass-card rounded-2xl border-white/10 p-6 shadow-lg shadow-indigo-900/30">
          <h2 className="text-lg font-semibold text-white">Données</h2>
          <p className="mt-2 text-sm text-white/70">
            Nous stockons les prompts, flyers générés et historiques pour vous permettre de les retrouver. Les
            données ne sont pas revendues et peuvent être supprimées sur demande.
          </p>
        </section>

        <section className="glass-card rounded-2xl border-white/10 p-6 shadow-lg shadow-indigo-900/30">
          <h2 className="text-lg font-semibold text-white">Utilisation</h2>
          <p className="mt-2 text-sm text-white/70">
            Ne pas utiliser le service pour des contenus illégaux, violents ou discriminatoires. L&apos;utilisateur
            reste responsable des visuels publiés.
          </p>
        </section>
      </div>
    </div>
  );
}
