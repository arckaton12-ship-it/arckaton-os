import React from 'react';
import { OFFICIAL_KNOWLEDGE } from '../../data/mockData';

const L = OFFICIAL_KNOWLEDGE.letterhead;

/**
 * En-tête et pied de page officiels, utilisés pour les documents
 * commerciaux (devis, factures).
 *
 * Reproduit le papier à en-tête de l'agence : logo, dénomination,
 * activités, coordonnées en tête ; siège social, RC et NIU en pied.
 *
 * Les couleurs proviennent du document source (`letterhead.colors`) et non
 * du thème de l'OS, afin que le document imprimé soit identique à la
 * charte, y compris en impression sur fond clair.
 */
export const DocumentLetterhead: React.FC<{ compact?: boolean }> = ({ compact }) => (
  <div className="space-y-4">
    {/* Bandeau supérieur. Le fond reprend la couleur reelle du logo
        (#171942) et non celle du docx (#0A0F2E) : le logo etant un carre
        opaque, une couleur differente dessinerait une couture visible
        autour de lui. */}
    <div
      className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl px-4 py-4 sm:px-5"
      style={{ backgroundColor: L.colors.logoBackground }}
    >
      <img
        src={L.logo}
        alt={`${L.agencyName} — logo`}
        className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-contain shrink-0"
      />
      <div className="min-w-0">
        <div
          className="font-bold tracking-tight leading-tight"
          style={{ color: '#fff', fontSize: compact ? '1rem' : '1.15rem' }}
        >
          {L.agencyName}
        </div>
        <div className="text-[11px] font-mono leading-relaxed" style={{ color: L.colors.green }}>
          {L.taglineLine1} · {L.taglineLine2}
        </div>
        <div className="text-[11px] font-mono mt-0.5" style={{ color: '#cbd5e1' }}>
          {L.email}
        </div>
        {/* Rattachement à la société mère, visible dès l'en-tête. */}
        <div className="text-[10px] font-mono mt-0.5" style={{ color: '#94a3b8' }}>
          {L.relationship} de {L.parentName} · {L.agencyLocation}
        </div>
      </div>
    </div>
  </div>
);

/**
 * Mentions légales imprimées en bas des devis et factures.
 *
 * Arckaton est une filiale de SLOMAH SARL : l'en-tête nomme l'agence et sa
 * ville, le pied de page rappelle la société mère, son siège et ses
 * identifiants. Les RC / NIU appartiennent à SLOMAH SARL, pas à Arckaton ;
 * les présenter comme ceux d'Arckaton serait faux.
 */
export const DocumentLegalFooter: React.FC = () => (
  <div
    className="rounded-xl px-4 py-3 text-[10px] font-mono leading-relaxed"
    style={{ backgroundColor: L.colors.logoBackground, color: '#fff' }}
  >
    <div className="font-bold tracking-wide">
      {L.agencyName} — {L.relationship} de {L.parentName}
    </div>
    <div>Agence : {L.agencyLocation}</div>
    <div>
      {L.parentName} — Siège social : {L.parentLocation}
    </div>
    <div>
      RC : {L.rc} <span className="mx-1">|</span> NIU : {L.niu}
    </div>
  </div>
);
