import React, { useEffect, useMemo, useState } from 'react';
import { Search, CornerDownLeft } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useDialogA11y } from '../../hooks/useDialogA11y';

export interface PaletteItem {
  id: string;
  label: string;
  group: string;
  hint?: string;
  icon: LucideIcon;
  run: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  items: PaletteItem[];
}

// Recherche insensible a la casse et aux accents.
const normaliser = (valeur: string) =>
  valeur
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

interface Groupe {
  nom: string;
  items: { item: PaletteItem; index: number }[];
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, items }) => {
  const dialogRef = useDialogA11y<HTMLDivElement>(isOpen, onClose);
  const [requete, setRequete] = useState('');
  const [actif, setActif] = useState(0);
  const listId = 'rk-command-list';

  const resultats = useMemo(() => {
    const q = normaliser(requete.trim());
    if (!q) return items;
    return items.filter((item) =>
      normaliser(`${item.label} ${item.hint ?? ''} ${item.group}`).includes(q)
    );
  }, [items, requete]);

  useEffect(() => {
    if (isOpen) {
      setRequete('');
      setActif(0);
    }
  }, [isOpen]);

  useEffect(() => {
    setActif(0);
  }, [requete]);

  useEffect(() => {
    if (!isOpen) return;
    const el = document.getElementById(`rk-command-option-${actif}`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [actif, isOpen]);

  const groupes = useMemo<Groupe[]>(() => {
    const parNom = new Map<string, Groupe>();
    resultats.forEach((item, index) => {
      const groupe = parNom.get(item.group) ?? { nom: item.group, items: [] };
      groupe.items.push({ item, index });
      parNom.set(item.group, groupe);
    });
    return Array.from(parNom.values());
  }, [resultats]);

  const executer = (item?: PaletteItem) => {
    const cible = item ?? resultats[actif];
    if (!cible) return;
    cible.run();
    onClose();
  };

  const surTouche = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActif((i) => Math.min(i + 1, resultats.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActif((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      executer();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center p-4 pt-[12vh] bg-black/60 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Palette de commandes"
        className="w-full max-w-xl bg-rk-panel border border-rk-line rounded-2xl shadow-2xl overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 border-b border-rk-line">
          <Search className="w-4 h-4 text-rk-muted shrink-0" aria-hidden="true" />
          <input
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={resultats.length > 0 ? `rk-command-option-${actif}` : undefined}
            aria-label="Rechercher une commande"
            value={requete}
            onChange={(e) => setRequete(e.target.value)}
            onKeyDown={surTouche}
            placeholder="Rechercher une section ou une action…"
            className="flex-1 bg-transparent border-0 outline-none py-4 text-sm text-rk-text placeholder:text-rk-muted"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 text-xs font-mono text-rk-muted border border-rk-line-soft rounded px-1.5 py-0.5">
            <CornerDownLeft className="w-3 h-3" aria-hidden="true" />
            <span>Entrée</span>
          </kbd>
        </div>

        <ul id={listId} role="listbox" aria-label="Commandes" className="max-h-[52vh] overflow-y-auto py-2">
          {resultats.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-rk-muted">
              Aucun résultat pour « {requete} ».
            </li>
          )}
          {groupes.map((groupe) => (
            <li key={groupe.nom} role="presentation">
              <p className="px-4 pt-3 pb-1 text-xs font-mono uppercase tracking-wider text-rk-muted">
                {groupe.nom}
              </p>
              <ul role="presentation">
                {groupe.items.map(({ item, index }) => {
                  const Icon = item.icon;
                  const estActif = index === actif;
                  return (
                    <li
                      key={item.id}
                      id={`rk-command-option-${index}`}
                      role="option"
                      aria-selected={estActif}
                      onClick={() => executer(item)}
                      onMouseMove={() => setActif(index)}
                      className={`mx-2 px-3 py-2.5 rounded-xl flex items-center gap-3 text-sm cursor-pointer ${
                        estActif ? 'bg-blue-600 text-white' : 'text-rk-text-secondary hover:bg-white/5'
                      }`}
                    >
                      <Icon
                        aria-hidden="true"
                        className={`w-4 h-4 shrink-0 ${estActif ? 'text-white' : 'text-rk-muted'}`}
                      />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.hint && (
                        <span className={`text-xs font-mono ${estActif ? 'text-white/80' : 'text-rk-muted'}`}>
                          {item.hint}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
