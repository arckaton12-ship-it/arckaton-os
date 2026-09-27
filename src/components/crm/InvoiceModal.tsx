import React, { useEffect, useMemo, useState } from 'react';
import { Lead, Projet } from '../../types';
import { OFFICIAL_KNOWLEDGE } from '../../data/mockData';
import { Printer, X, ShieldCheck, Save, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { DocumentLetterhead, DocumentLegalFooter } from './DocumentLetterhead';

interface InvoiceModalProps {
  lead?: Lead | null;
  projet?: Projet | null;
  type: 'devis' | 'facture';
  onClose: () => void;
  onSaved?: (quoteRef: string) => void;
}

interface QuoteLine {
  designation: string;
  detail: string;
  pole: string;
  montant: number;
}

const STATUS_LABELS: Record<string, string> = {
  brouillon: 'Brouillon',
  envoye: 'Envoyé au client',
  accepte: 'Accepté',
  refuse: 'Refusé',
  paye: 'Payé',
};

function formatFcfa(value: number) {
  return `${Number(value || 0).toLocaleString('fr-FR')} FCFA`;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ lead, projet, type, onClose, onSaved }) => {
  const clientName = lead?.name || projet?.client_name || '';
  const clientPhone = lead?.phone || projet?.client_phone || '';
  const projectType = lead?.project_type || projet?.service || '';
  const [dateStr] = useState(() =>
    new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  );

  const [lines, setLines] = useState<QuoteLine[]>([]);
  const [quoteRef, setQuoteRef] = useState<string>('');
  const [status, setStatus] = useState('brouillon');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedRef, setSavedRef] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const token = () => localStorage.getItem('arckaton_os_token') || '';
  const authHeaders = () => {
    const t = token();
    return t ? { Authorization: `Bearer ${t}` } : undefined;
  };

  // Le lead n'a pas de budget : la prestation est saisie a la main plutot
  // qu'inventee a partir d'une comparaison de chaines de caracteres.
  const addLine = () =>
    setLines((prev) => [
      ...prev,
      { designation: '', detail: '', pole: 'Tech', montant: 0 },
    ]);

  const updateLine = (idx: number, patch: Partial<QuoteLine>) =>
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  const removeLine = (idx: number) =>
    setLines((prev) => prev.filter((_, i) => i !== idx));

  // Préremplissage depuis le projet réel s'il existe
  useEffect(() => {
    const budget = projet?.budget_estime || '';
    const parsed = Number(String(budget).replace(/[^\d]/g, ''));
    const initial: QuoteLine[] = [];
    if (projectType) {
      initial.push({ designation: projectType, detail: '', pole: projet?.pole || 'Tech', montant: Number.isFinite(parsed) && parsed > 0 ? parsed : 0 });
    }
    setLines(initial);
  }, [projectType, projet]);

  // Référence proposée par le serveur (séquentielle, jamais regenerée)
  useEffect(() => {
    let stopped = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/quotes/next-ref?type=${type}`, { headers: authHeaders() });
        if (!res.ok) return;
        const json = await res.json();
        if (!stopped && json.quote_ref) setQuoteRef(json.quote_ref);
      } catch {
        /* le devis reste affichable sans reference proposee */
      }
    };
    load();
    return () => {
      stopped = true;
    };
  }, [type]);

  const total = useMemo(
    () => lines.reduce((sum, l) => sum + (Number(l.montant) || 0), 0),
    [lines]
  );
  const deposit = Math.round(total * 0.5);
  const balance = total - deposit;

  const canSave =
    !saving &&
    !savedRef &&
    clientName.trim().length > 0 &&
    lines.some((l) => l.designation.trim() && Number(l.montant) > 0);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(authHeaders() || {}) },
        body: JSON.stringify({
          type,
          client_name: clientName,
          client_phone: clientPhone,
          client_email: lead?.email || projet?.client_email || '',
          project_ref: projet?.id || null,
          project_name: projet?.client_name || null,
          pole: projet?.pole || 'Direction',
          items: lines
            .filter((l) => l.designation.trim())
            .map((l) => ({
              designation: l.designation,
              detail: l.detail,
              pole: l.pole,
              montant: Number(l.montant) || 0,
            })),
          status,
          notes,
          valid_days: 30,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Enregistrement impossible");
      const ref = json.quote?.quote_ref || quoteRef;
      setSavedRef(ref);
      setQuoteRef(ref);
      if (ref && onSaved) onSaved(ref);
    } catch (err: any) {
      setError(err.message || "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-[#0b122e] border border-white/20 rounded-3xl w-full max-w-3xl shadow-2xl p-6 sm:p-8 space-y-6 my-8 text-slate-100">

        {/* Barre d'actions (non imprimable) */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 flex-wrap gap-3 no-print">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-500/30">
              {type === 'devis' ? 'Proposition Commerciale / Devis' : 'Facture Proforma'}
            </span>
            <span className="text-xs font-mono text-slate-400">
              Réf : {savedRef || quoteRef || '—'}
            </span>
            {savedRef && (
              <span className="text-[11px] font-mono text-emerald-300 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> enregistré
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!savedRef && (
              <button
                onClick={handleSave}
                disabled={!canSave}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                title={
                  !clientName
                    ? 'Renseignez un client'
                    : !lines.some((l) => l.designation.trim() && Number(l.montant) > 0)
                    ? 'Ajoutez au moins une prestation avec un montant'
                    : "Enregistrer le devis et lui attribuer sa reference"
                }
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Enregistrer</span>
              </button>
            )}
            <button
              onClick={() => window.print()}
              disabled={lines.length === 0}
              className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimer / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-[11px] font-mono text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2 no-print">
            <AlertTriangle className="w-3.5 h-3.5" /> {error}
          </div>
        )}

        {/* Document imprimable */}
        <div className="bg-[#070c1e] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-6 print:bg-white print:text-black">

          {/* En-tête officiel de l'agence (papier à en-tête) */}
          <DocumentLetterhead />

          {/* En-tête */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-white/10 pb-6 print:border-black/20">
            <div>
              <div className="font-serif text-2xl font-bold text-white tracking-tight print:text-black">
                arckaton <span className="text-xs font-mono text-blue-400 print:text-black">SYSTEMS</span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-xs font-serif italic print:text-slate-600">
                « On ne livre pas un site. On livre un système digital complet. »
              </p>
              <div className="text-[11px] font-mono text-slate-400 mt-2 space-y-0.5 print:text-slate-600">
                {OFFICIAL_KNOWLEDGE.agency.location && <div>{OFFICIAL_KNOWLEDGE.agency.location}</div>}
                {OFFICIAL_KNOWLEDGE.agency.phone && (
                  <div>WhatsApp / Tel : {OFFICIAL_KNOWLEDGE.agency.phone}</div>
                )}
                {OFFICIAL_KNOWLEDGE.agency.email && <div>Email : {OFFICIAL_KNOWLEDGE.agency.email}</div>}
              </div>
            </div>

            <div className="text-left sm:text-right space-y-1">
              <div className="text-lg font-serif font-bold text-emerald-400 print:text-black">
                {type === 'devis' ? 'DEVIS CHIFFRÉ' : 'FACTURE PROFORMA'}
              </div>
              <div className="text-xs font-mono text-slate-300 print:text-slate-700">Date : {dateStr}</div>
              <div className="text-xs font-mono text-slate-400 print:text-slate-600">Validité : 30 jours</div>

              <div className="mt-4 p-3 bg-white/5 rounded-xl text-left border border-white/5 print:border-black/20">
                <div className="text-[11px] font-mono uppercase text-slate-400 print:text-slate-600">
                  Client / Donneur d'Ordre :
                </div>
                <div className="text-xs font-bold text-white print:text-black">
                  {clientName || 'Client à renseigner'}
                </div>
                {clientPhone && <div className="text-[11px] font-mono text-slate-300 print:text-slate-700">{clientPhone}</div>}
                {lead?.country && <div className="text-[11px] font-mono text-slate-400 print:text-slate-600">{lead.country}</div>}
              </div>
            </div>
          </div>

          {/* Prestations */}
          <div className="space-y-3">
            <div className="flex items-center justify-between no-print">
              <h4 className="font-serif text-sm font-bold text-white print:hidden">Prestations</h4>
              <button
                onClick={addLine}
                className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-200 border border-blue-500/30 cursor-pointer print:hidden"
              >
                + Ajouter une ligne
              </button>
            </div>

            {lines.length === 0 ? (
              <div className="py-5 px-4 rounded-2xl border border-dashed border-white/15 bg-white/5 text-center print:hidden">
                <p className="text-xs font-mono text-slate-400">Aucune prestation saisie.</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Ajoutez les lignes avec leur montant : rien n'est estimé automatiquement.
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 font-mono text-slate-400 text-[11px] print:border-black/20">
                    <th className="py-2.5">Désignation de la Prestation</th>
                    <th className="py-2.5 text-center">Pôle</th>
                    <th className="py-2.5 text-right">Montant (FCFA)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 print:divide-black/10">
                  {lines.map((l, i) => (
                    <tr key={i}>
                      <td className="py-3 pr-4 space-y-1.5">
                        <input
                          type="text"
                          value={l.designation}
                          onChange={(e) => updateLine(i, { designation: e.target.value })}
                          placeholder="Intégration passerelle Mobile Money"
                          className="w-full px-2 py-1.5 rounded-lg bg-[#070c1e] border border-white/10 text-xs text-white focus:outline-none focus:border-blue-500/50 print:hidden"
                        />
                        <div className={`font-bold text-white print:text-black ${l.designation ? 'hidden print:block' : 'hidden'}`}>
                          {l.designation}
                        </div>
                        <input
                          type="text"
                          value={l.detail}
                          onChange={(e) => updateLine(i, { detail: e.target.value })}
                          placeholder="Détail de la prestation"
                          className="w-full px-2 py-1.5 rounded-lg bg-[#070c1e] border border-white/10 text-[11px] text-slate-300 focus:outline-none focus:border-blue-500/50 print:hidden"
                        />
                        {l.detail && (
                          <div className="text-[11px] text-slate-400 print:text-slate-600">{l.detail}</div>
                        )}
                      </td>
                      <td className="py-3 text-center">
                        <select
                          value={l.pole}
                          onChange={(e) => updateLine(i, { pole: e.target.value })}
                          className="text-[11px] font-mono px-1.5 py-1 rounded-lg bg-[#070c1e] border border-white/10 text-white print:hidden"
                        >
                          <option value="Direction">Direction</option>
                          <option value="Tech">Tech</option>
                          <option value="Creatif">Créatif</option>
                          <option value="Digital">Digital</option>
                          <option value="Client">Client</option>
                        </select>
                        <div className="hidden print:block font-mono text-blue-400 print:text-black">{l.pole}</div>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            min={0}
                            step={5000}
                            value={l.montant === 0 ? '' : l.montant}
                            onChange={(e) => {
                              const raw = e.target.value;
                              updateLine(i, { montant: raw === '' ? 0 : Number(raw) });
                            }}
                            placeholder="Inclus"
                            className="w-28 text-right px-2 py-1.5 rounded-lg bg-[#070c1e] border border-white/10 text-[11px] font-mono text-white focus:outline-none focus:border-blue-500/50 print:hidden"
                          />
                          <button
                            onClick={() => removeLine(i)}
                            className="text-slate-500 hover:text-red-400 px-1 cursor-pointer print:hidden"
                            title="Retirer la ligne"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="hidden print:block font-mono font-bold text-white print:text-black">
                          {Number(l.montant) > 0 ? formatFcfa(l.montant) : 'Inclus'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Totaux */}
          {lines.length > 0 && (
            <div className="border-t border-white/10 pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs font-mono print:border-black/20">
              <div className="space-y-1 text-slate-400 no-print">
                <div className="text-[11px]">Modalités de règlement :</div>
                <div className="text-white print:text-black">
                  ▪ 50% d'acompte au lancement :{' '}
                  <span className="text-emerald-400 font-bold print:text-black">{formatFcfa(deposit)}</span>
                </div>
                <div className="text-white print:text-black">
                  ▪ 50% de solde à la livraison finale :{' '}
                  <span className="text-emerald-400 font-bold print:text-black">{formatFcfa(balance)}</span>
                </div>
                <div className="text-[11px] text-slate-400 print:text-slate-600 mt-1">
                  Moyens acceptés : Mobile Money (MTN / Orange), virement bancaire, espèces contre reçu.
                </div>

                <div className="pt-2 space-y-1 no-print">
                  <label className="block text-[11px] uppercase text-slate-400">Statut de suivi</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    disabled={!!savedRef}
                    className="w-full text-xs font-mono px-2 py-1.5 rounded-lg bg-[#070c1e] border border-white/10 text-white disabled:opacity-60"
                  >
                    {Object.entries(STATUS_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>

                  <label className="block text-[11px] uppercase text-slate-400 pt-2">Conditions / notes</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={!!savedRef}
                    placeholder="Délai de livraison, conditions de révision, acompte..."
                    className="w-full px-2 py-1.5 rounded-lg bg-[#070c1e] border border-white/10 text-[11px] text-white resize-none disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 p-4 rounded-xl space-y-1.5 w-full sm:w-64 text-right print:border-black/20">
                <div className="flex justify-between text-slate-400 print:text-slate-700">
                  <span>Total Prestation :</span>
                  <span>{formatFcfa(total)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-emerald-400 border-t border-white/10 pt-1.5 print:text-black print:border-black/20">
                  <span>Net à Payer :</span>
                  <span>{formatFcfa(total)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Pied de page */}
          <div className="border-t border-white/10 pt-4 text-[11px] font-mono text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2 print:border-black/20 print:text-slate-600">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Document généré par Arckaton OS</span>
            </div>
            <div>Signature & Cachet</div>
          </div>

          {/* Mentions légales officielles (pied de page du papier à en-tête).
              En impression, le bloc est fixé en bas : il se répète donc sur
              chaque page, comme sur un document papier. */}
          <div className="print:fixed print:bottom-0 print:left-0 print:right-0 print:z-0">
            <DocumentLegalFooter />
          </div>

        </div>
      </div>
    </div>
  );
};
