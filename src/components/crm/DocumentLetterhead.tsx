import React from 'react';
import { OFFICIAL_KNOWLEDGE } from '../../data/mockData';

const L = OFFICIAL_KNOWLEDGE.letterhead;
const NAVY = L.colors.logoBackground;
const GREEN = L.colors.green;

/**
 * En-tête officiel, utilisé pour les documents commerciaux (devis, factures).
 *
 * Le document est imprimé en noir sur blanc : on n'utilise donc pas de
 * bandeau sombre (les fonds ne s'impriment pas toujours et le texte blanc
 * disparaîtrait). L'identité tient au logo, à la couleur du titre et à un
 * filet de rappel — deux couleurs seulement, la charte navy et le vert.
 */
export const DocumentLetterhead: React.FC<{ compact?: boolean }> = ({ compact }) => (
  <header className="invoice-letterhead">
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        <img
          src={L.logo}
          alt={`${L.agencyName} — logo`}
          className={`${compact ? 'w-12 h-12' : 'w-14 h-14'} rounded-lg object-contain shrink-0`}
        />
        <div className="leading-tight">
          <div
            className="font-display font-extrabold tracking-tight"
            style={{ color: NAVY, fontSize: compact ? '0.95rem' : '1.1rem' }}
          >
            {L.agencyName}
          </div>
          <div className="text-[10.5px] font-semibold tracking-wide" style={{ color: GREEN }}>
            {L.taglineLine1} · {L.taglineLine2}
          </div>
          <div className="text-[10px] text-rk-muted mt-0.5">
            {L.relationship} de {L.parentName}
          </div>
        </div>
      </div>

      <div className="text-right text-[10.5px] text-rk-muted leading-relaxed">
        <div className="font-semibold" style={{ color: NAVY }}>
          {L.agencyLocation}
        </div>
        <div>{OFFICIAL_KNOWLEDGE.agency.phone}</div>
        <div>{L.email}</div>
      </div>
    </div>

    {/* Double filet de rappel : navy puis vert, deux couleurs seulement. */}
    <div className="mt-3 h-[3px] w-full rounded-full" style={{ backgroundColor: NAVY }} />
    <div className="mt-[3px] h-[2px] w-24 rounded-full" style={{ backgroundColor: GREEN }} />
  </header>
);

/**
 * Mentions légales imprimées en bas des devis et factures.
 *
 * Arckaton est une filiale de SLOMAH SARL : l'en-tête nomme l'agence et sa
 * ville, le pied de page rappelle la société mère, son siège et ses
 * identifiants. Les RC / NIU appartiennent à SLOMAH SARL, pas à Arckaton ;
 * les présenter comme ceux d'Arckaton serait faux.
 *
 * Le bloc est dans le flux normal (et non fixé en bas de page) : il ne peut
 * donc jamais recouvrir le contenu.
 */
export const DocumentLegalFooter: React.FC = () => (
  <footer className="invoice-legal mt-6 border-t border-slate-200 pt-3 text-[9px] leading-relaxed text-rk-muted">
    <div className="font-semibold text-slate-700">
      {L.agencyName} — {L.relationship} de {L.parentName}
    </div>
    <div>
      Agence : {L.agencyLocation} · Siège social : {L.parentLocation}
    </div>
    <div>
      RC : {L.rc} <span className="mx-1 text-rk-text-secondary">|</span> NIU : {L.niu}
    </div>
  </footer>
);
