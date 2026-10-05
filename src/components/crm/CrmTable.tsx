import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Lead, LeadStatus, POLE_COLORS } from '../../types';
import {
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  FileText,
  Receipt,
  FolderCheck,
  CheckCircle2,
} from 'lucide-react';
import { STATUTS, ORDRE_STATUTS } from './leadStatus';

type CleTri = 'name' | 'project_type' | 'pole_assigned' | 'statut' | 'budget' | 'created_at';

interface CrmTableProps {
  leads: Lead[];
  onOpenInvoice: (lead: Lead, type: 'devis' | 'facture') => void;
  onConvert: (leadId: string) => void;
  onBulkStatus: (ids: string[], status: LeadStatus) => void;
}

const valeurTri = (lead: Lead, col: CleTri): string => {
  if (col === 'budget') return lead.budget ?? '';
  return String(lead[col] ?? '');
};

export const CrmTable: React.FC<CrmTableProps> = ({ leads, onOpenInvoice, onConvert, onBulkStatus }) => {
  const [tri, setTri] = useState<{ col: CleTri; dir: 'asc' | 'desc' }>({ col: 'created_at', dir: 'desc' });
  const [taille, setTaille] = useState<number>(() => {
    const v = Number(localStorage.getItem('arckaton_crm_taille'));
    return [10, 25, 50].includes(v) ? v : 10;
  });
  const [densite, setDensite] = useState<'confort' | 'compact'>(() =>
    localStorage.getItem('arckaton_crm_densite') === 'compact' ? 'compact' : 'confort'
  );
  const [page, setPage] = useState(1);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [bulkStatut, setBulkStatut] = useState<LeadStatus>('contacte');
  const enteteRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => localStorage.setItem('arckaton_crm_densite', densite), [densite]);
  useEffect(() => localStorage.setItem('arckaton_crm_taille', String(taille)), [taille]);
  useEffect(() => setPage(1), [tri, taille, leads.length]);

  const tries = useMemo(() => {
    const copie = [...leads];
    copie.sort((a, b) => {
      const cmp = valeurTri(a, tri.col).localeCompare(valeurTri(b, tri.col), 'fr', { numeric: true });
      return tri.dir === 'asc' ? cmp : -cmp;
    });
    return copie;
  }, [leads, tri]);

  const nbPages = Math.max(1, Math.ceil(tries.length / taille));
  const pageCourante = Math.min(page, nbPages);
  const lignes = tries.slice((pageCourante - 1) * taille, pageCourante * taille);

  const tousCoches = lignes.length > 0 && lignes.every((l) => selection.has(l.id));
  const partiel = !tousCoches && lignes.some((l) => selection.has(l.id));

  useEffect(() => {
    if (enteteRef.current) enteteRef.current.indeterminate = partiel;
  }, [partiel]);

  const basculerTri = (col: CleTri) => {
    setTri((t) => (t.col === col ? { col, dir: t.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' }));
  };

  const basculerLigne = (id: string) => {
    setSelection((prev) => {
      const suivant = new Set(prev);
      if (suivant.has(id)) suivant.delete(id);
      else suivant.add(id);
      return suivant;
    });
  };

  const basculerPage = () => {
    setSelection((prev) => {
      const suivant = new Set(prev);
      if (tousCoches) lignes.forEach((l) => suivant.delete(l.id));
      else lignes.forEach((l) => suivant.add(l.id));
      return suivant;
    });
  };

  const appliquerBulk = () => {
    if (selection.size === 0) return;
    onBulkStatus(Array.from(selection), bulkStatut);
    setSelection(new Set());
  };

  const enTete = (col: CleTri, libelle: string, classe?: string) => {
    const actif = tri.col === col;
    const Icone = !actif ? ArrowUpDown : tri.dir === 'asc' ? ArrowUp : ArrowDown;
    return (
      <th
        scope="col"
        aria-sort={actif ? (tri.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
        className={`text-left font-mono text-xs uppercase tracking-wide text-rk-muted ${classe ?? ''}`}
      >
        <button
          type="button"
          onClick={() => basculerTri(col)}
          className="inline-flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
        >
          <span>{libelle}</span>
          <Icone className="w-3 h-3" aria-hidden="true" />
        </button>
      </th>
    );
  };

  const cellule = densite === 'compact' ? 'px-3 py-1.5' : 'px-3 py-3';

  return (
    <div className="space-y-3">
      {/* Barre d'options : densite, taille de page, actions groupees */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-mono text-rk-muted flex items-center gap-1.5">
            <span>Densité</span>
            <select
              value={densite}
              onChange={(e) => setDensite(e.target.value as 'confort' | 'compact')}
              className="bg-rk-panel border border-rk-line rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
            >
              <option value="confort">Confort</option>
              <option value="compact">Compacte</option>
            </select>
          </label>
          <label className="text-xs font-mono text-rk-muted flex items-center gap-1.5">
            <span>Lignes</span>
            <select
              value={taille}
              onChange={(e) => setTaille(Number(e.target.value))}
              className="bg-rk-panel border border-rk-line rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </label>
        </div>

        {selection.size > 0 && (
          <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-xl px-3 py-1.5">
            <span className="text-xs text-blue-200">{selection.size} sélectionné(s)</span>
            <select
              value={bulkStatut}
              onChange={(e) => setBulkStatut(e.target.value as LeadStatus)}
              aria-label="Nouveau statut pour la sélection"
              className="bg-rk-panel border border-rk-line rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
            >
              {ORDRE_STATUTS.map((s) => (
                <option key={s} value={s}>
                  {STATUTS[s].label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={appliquerBulk}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-lg cursor-pointer"
            >
              Appliquer
            </button>
            <button
              type="button"
              onClick={() => setSelection(new Set())}
              className="text-xs text-rk-muted hover:text-white cursor-pointer"
            >
              Annuler
            </button>
          </div>
        )}
      </div>

      {/* Tableau */}
      <div className="overflow-auto max-h-[62vh] rounded-2xl border border-rk-line">
        <table className="w-full text-xs border-collapse">
          <caption className="sr-only">Prospects et clients du CRM</caption>
          <thead className="sticky top-0 z-10 bg-rk-chrome shadow-[0_1px_0_0_var(--color-rk-line)]">
            <tr className={densite === 'compact' ? '[&>th]:py-2' : '[&>th]:py-3'}>
              <th scope="col" className="w-10 px-3">
                <input
                  ref={enteteRef}
                  type="checkbox"
                  checked={tousCoches}
                  onChange={basculerPage}
                  aria-label="Sélectionner toutes les lignes de la page"
                  className="cursor-pointer accent-blue-600"
                />
              </th>
              {enTete('name', 'Client')}
              {enTete('project_type', 'Projet')}
              {enTete('pole_assigned', 'Pôle')}
              {enTete('statut', 'Statut')}
              {enTete('budget', 'Budget')}
              {enTete('created_at', 'Créé le')}
              <th scope="col" className="px-3 text-right font-mono text-xs uppercase tracking-wide text-rk-muted">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rk-line-soft">
            {lignes.map((l) => {
              const stInfo = STATUTS[l.statut] ?? STATUTS.nouveau;
              const pole = POLE_COLORS[l.pole_assigned] || POLE_COLORS.Tech;
              const waText = encodeURIComponent(
                `Bonjour ${l.name} ! C'est l'équipe Arckaton suite à votre demande pour ${l.project_type}. Pouvons-nous caler un appel de 10 minutes ?`
              );
              const waLink = `https://wa.me/${l.phone.replace(/[^0-9]/g, '')}?text=${waText}`;
              return (
                <tr key={l.id} className="hover:bg-white/5 transition-colors">
                  <td className={cellule}>
                    <input
                      type="checkbox"
                      checked={selection.has(l.id)}
                      onChange={() => basculerLigne(l.id)}
                      aria-label={`Sélectionner ${l.name}`}
                      className="cursor-pointer accent-blue-600"
                    />
                  </td>
                  <td className={`${cellule} font-semibold text-white`}>
                    <div className="truncate max-w-[200px]">{l.name}</div>
                    <div className="text-xs font-mono text-rk-muted">{l.phone}</div>
                  </td>
                  <td className={`${cellule} text-rk-text-secondary`}>
                    <div className="truncate max-w-[220px]">{l.project_type}</div>
                  </td>
                  <td className={cellule}>
                    <span className={`text-xs font-mono px-2 py-0.5 rounded border ${pole.bg} ${pole.text} ${pole.border}`}>
                      {l.pole_assigned}
                    </span>
                  </td>
                  <td className={cellule}>
                    <span className={`text-xs font-mono px-2 py-0.5 rounded-full border whitespace-nowrap ${stInfo.color}`}>
                      {stInfo.label}
                    </span>
                  </td>
                  <td className={`${cellule} font-serif font-bold text-emerald-400 whitespace-nowrap`}>{l.budget || '—'}</td>
                  <td className={`${cellule} font-mono text-rk-muted whitespace-nowrap`}>{l.created_at}</td>
                  <td className={`${cellule} text-right`}>
                    <div className="inline-flex items-center gap-1">
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="WhatsApp Direct"
                        aria-label={`WhatsApp ${l.name}`}
                        className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white"
                      >
                        <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
                      </a>
                      <button
                        type="button"
                        onClick={() => onOpenInvoice(l, 'devis')}
                        title="Générer un devis"
                        aria-label={`Générer un devis pour ${l.name}`}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-blue-400 border border-rk-line cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenInvoice(l, 'facture')}
                        title="Facture proforma"
                        aria-label={`Facture proforma pour ${l.name}`}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-amber-400 border border-rk-line cursor-pointer"
                      >
                        <Receipt className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                      {l.statut !== 'converti' ? (
                        <button
                          type="button"
                          onClick={() => onConvert(l.id)}
                          title="Convertir en projet client"
                          aria-label={`Convertir ${l.name} en projet client`}
                          className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
                        >
                          <FolderCheck className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      ) : (
                        <span title="Dossier projet actif" className="p-1.5 text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between gap-3 text-xs font-mono text-rk-muted">
        <span>
          {tries.length === 0
            ? '0 prospect'
            : `${(pageCourante - 1) * taille + 1}–${Math.min(pageCourante * taille, tries.length)} sur ${tries.length}`}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={pageCourante <= 1}
            aria-label="Page précédente"
            className="p-1.5 rounded-lg bg-rk-panel border border-rk-line hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <span aria-live="polite" className="px-2">
            Page {pageCourante} / {nbPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(nbPages, p + 1))}
            disabled={pageCourante >= nbPages}
            aria-label="Page suivante"
            className="p-1.5 rounded-lg bg-rk-panel border border-rk-line hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};
