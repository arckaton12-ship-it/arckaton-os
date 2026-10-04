import React from 'react';
import { useApp } from '../../contexts/AppContext';
import { ShieldCheck, Smartphone, Clock } from 'lucide-react';

/**
 * Bandeau de preuve sociale place juste sous le heros.
 *
 * Les chiffres viennent du contenu publie (realisations, temoignages) : si le
 * CMS est vide, le bandeau disparait au lieu d'afficher des chiffres inventes.
 */
export const TrustStrip: React.FC = () => {
  const { realisations, temoignages } = useApp();

  const nbRealisations = realisations.length;
  const nbClients = temoignages.length;
  const aucunChiffre = nbRealisations === 0 && nbClients === 0;

  const elements: { valeur: string; libelle: string }[] = [];
  if (nbRealisations > 0) {
    elements.push({ valeur: `${nbRealisations}+`, libelle: 'Systèmes livrés & documentés' });
  }
  if (nbClients > 0) {
    elements.push({ valeur: `${nbClients}`, libelle: 'Clients qui témoignent' });
  }

  const engagements = [
    { Icone: Smartphone, texte: 'Paiement MTN MoMo & Orange Money' },
    { Icone: ShieldCheck, texte: 'Fonctionne même hors connexion' },
    { Icone: Clock, texte: 'Réponse sous 24h ouvrées' },
  ];

  return (
    <section className="border-y border-rk-line bg-rk-base/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        {!aucunChiffre && (
          <div className="flex items-center gap-8">
            {elements.map((el) => (
              <div key={el.libelle} className="text-center md:text-left">
                <div className="font-serif text-2xl font-bold text-emerald-400 tracking-tight">{el.valeur}</div>
                <div className="text-xs text-rk-muted">{el.libelle}</div>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center md:justify-end gap-x-6 gap-y-2">
          {engagements.map(({ Icone, texte }) => (
            <span key={texte} className="inline-flex items-center gap-2 text-xs font-mono text-rk-muted">
              <Icone className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
              {texte}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};
