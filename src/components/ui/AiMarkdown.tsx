import React from 'react';

/**
 * Rendu des réponses de l'IA.
 *
 * Les deux assistants (conseiller public, copilote interne) répondent avec un
 * Markdown restreint : `**gras**`, `*italique*`, listes à puces, listes
 * numérotées, titres `###`. On rend ces éléments avec du JSX plutôt qu'avec
 * `dangerouslySetInnerHTML` : aucune Balise du modèle n'est jamais interpretée
 * comme du HTML, donc pas d'injection possible.
 *
 * Le sous-ensemble est volontairement fermé. Tout ce qui n'est pas reconnu est
 * rendu comme du texte, pas interprété.
 */

type Props = {
  text: string;
  /** Classes du conteneur. */
  className?: string;
  /** Couleur des passages en gras : sert a faire ressortir le chiffre cle. */
  strongClass?: string;
  /** Couleur des titres de section. */
  headingClass?: string;
  /** Couleur des puces. */
  bulletClass?: string;
};

type Bloc =
  | { type: 'paragraphe'; texte: string }
  | { type: 'titre'; texte: string }
  | { type: 'puce'; texte: string }
  | { type: 'numero'; texte: string; index: number };

/** Decoupe le texte en blocs : titres, listes et paragraphes. */
function parseBlocs(source: string): Bloc[] {
  const lignes = source.replace(/\r\n/g, '\n').split('\n');
  const blocs: Bloc[] = [];
  let compteur = 0;

  for (const ligne of lignes) {
    const texte = ligne.trimEnd();
    if (!texte.trim()) {
      compteur = 0;
      continue;
    }

    const titre = texte.match(/^#{1,6}\s+(.*)$/);
    if (titre) {
      blocs.push({ type: 'titre', texte: titre[1] });
      continue;
    }

    const puce = texte.match(/^\s*[-*•]\s+(.*)$/);
    if (puce) {
      blocs.push({ type: 'puce', texte: puce[1] });
      continue;
    }

    const numero = texte.match(/^\s*(\d+)[.)]\s+(.*)$/);
    if (numero) {
      compteur = Number(numero[1]) || compteur + 1;
      blocs.push({ type: 'numero', texte: numero[2], index: compteur });
      continue;
    }

    compteur = 0;
    const dernier = blocs[blocs.length - 1];
    // Deux lignes consecutives sans separation forment un seul paragraphe.
    if (dernier && dernier.type === 'paragraphe') {
      dernier.texte += ` ${texte.trim()}`;
    } else {
      blocs.push({ type: 'paragraphe', texte: texte.trim() });
    }
  }

  return blocs;
}

/** Segments en ligne : gras, italique, code. */
const SEGMENT = /(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`\n]+`)/g;

function rendreSegments(texte: string, strongClass: string, clePrefixe: string): React.ReactNode[] {
  const morceaux = texte.split(SEGMENT).filter((m) => m !== '');
  return morceaux.map((morceau, i) => {
    const cle = `${clePrefixe}-${i}`;

    if (morceau.startsWith('**') && morceau.endsWith('**') && morceau.length > 4) {
      return (
        <strong key={cle} className={`font-semibold ${strongClass}`}>
          {morceau.slice(2, -2)}
        </strong>
      );
    }
    if (morceau.startsWith('`') && morceau.endsWith('`') && morceau.length > 2) {
      return (
        <code key={cle} className="font-mono text-[0.92em] bg-black/25 rounded px-1 py-0.5">
          {morceau.slice(1, -1)}
        </code>
      );
    }
    if (morceau.startsWith('*') && morceau.endsWith('*') && morceau.length > 2) {
      return <em key={cle}>{morceau.slice(1, -1)}</em>;
    }
    return <React.Fragment key={cle}>{morceau}</React.Fragment>;
  });
}

export const AiMarkdown: React.FC<Props> = ({
  text,
  className = '',
  strongClass = 'text-emerald-300',
  headingClass = 'text-white font-semibold',
  bulletClass = 'text-emerald-400',
}) => {
  const blocs = parseBlocs(text || '');
  if (!blocs.length) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      {blocs.map((bloc, i) => {
        const segments = rendreSegments(bloc.texte, strongClass, `b${i}`);

        if (bloc.type === 'titre') {
          return (
            <p key={i} className={`text-[0.95em] mt-3 first:mt-0 ${headingClass}`}>
              {segments}
            </p>
          );
        }

        if (bloc.type === 'puce') {
          return (
            <div key={i} className="flex gap-2 pl-0.5">
              <span className={`shrink-0 mt-[0.45em] h-1.5 w-1.5 rounded-full ${bulletClass}`} aria-hidden="true" />
              <span className="flex-1">{segments}</span>
            </div>
          );
        }

        if (bloc.type === 'numero') {
          return (
            <div key={i} className="flex gap-2 pl-0.5">
              <span className={`shrink-0 font-mono text-[0.85em] font-semibold ${bulletClass}`}>{bloc.index}.</span>
              <span className="flex-1">{segments}</span>
            </div>
          );
        }

        return <p key={i}>{segments}</p>;
      })}
    </div>
  );
};

export default AiMarkdown;
