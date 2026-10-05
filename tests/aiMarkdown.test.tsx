import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AiMarkdown } from '../src/components/ui/AiMarkdown';

/**
 * Le rendu ne doit jamais transformer une reponse de l'IA en HTML executable :
 * c'est du texte envoye par un modele distant, donc non fiable. On verifie que
 * le Markdown attendu devient des balises, et que tout le reste reste du texte.
 */
function html(source: string): string {
  return renderToStaticMarkup(<AiMarkdown text={source} />);
}

describe('AiMarkdown', () => {
  it('transforme le gras en <strong> colore', () => {
    const out = html('Vous avez **3 prospects** a relancer.');
    expect(out).toContain('<strong');
    expect(out).toContain('3 prospects');
    expect(out).not.toContain('**');
  });

  it('decoupe les listes a puces', () => {
    const out = html('- Relancer Kotto\n- Valider le devis');
    expect(out.match(/rounded-full/g)?.length).toBe(2);
    expect(out).toContain('Relancer Kotto');
    expect(out).toContain('Valider le devis');
    expect(out).not.toContain('- ');
  });

  it('decoupe les listes numerotees', () => {
    const out = html('1. Premier\n2. Second');
    expect(out).toContain('>1.<');
    expect(out).toContain('>2.<');
  });

  it('isole les titres', () => {
    const out = html('### Priorites\nRelancer le pipeline.');
    expect(out).toContain('Priorites');
    expect(out).not.toContain('###');
  });

  it('reunit les lignes d un meme paragraphe', () => {
    const out = html('Premiere ligne\nSeconde ligne');
    expect(out).toContain('Premiere ligne Seconde ligne');
    expect(out.match(/<p/g)?.length).toBe(1);
  });

  it('echappe le HTML tente par le modele', () => {
    const out = html('<img src=x onerror="alert(1)"> et <script>alert(2)</script>');
    expect(out).not.toContain('<img');
    expect(out).not.toContain('<script');
    expect(out).toContain('&lt;img');
    expect(out).toContain('&lt;script&gt;');
  });

  it('ne rend rien sur un texte vide', () => {
    expect(html('')).toBe('');
    expect(html('   \n  ')).toBe('');
  });

  it('laisse un texte sans Markdown intact', () => {
    expect(html('Bonjour, que puis-je faire ?')).toContain('Bonjour, que puis-je faire ?');
  });
});
