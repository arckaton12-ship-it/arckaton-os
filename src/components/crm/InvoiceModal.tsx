import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Lead, Projet } from '../../types';
import { OFFICIAL_KNOWLEDGE } from '../../data/mockData';
import { Printer, X, ShieldCheck, Save, Loader2, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { DocumentLetterhead, DocumentLegalFooter } from './DocumentLetterhead';
import { useDialogA11y } from '../../hooks/useDialogA11y';

const NAVY = OFFICIAL_KNOWLEDGE.letterhead.colors.logoBackground;
const GREEN = OFFICIAL_KNOWLEDGE.letterhead.colors.green;

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
  const clientEmail = lead?.email || projet?.client_email || '';
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
  const dialogRef = useDialogA11y<HTMLDivElement>(true, onClose);

  const token = () => localStorage.getItem('arckaton_os_token') || '';
  const authHeaders = () => {
    const t = token();
    return t ? { Authorization: `Bearer ${t}` } : undefined;
  };

  // Fermer au clavier : réflexe attendu d'une fenêtre modale. Le bouton
  // « Retour » reste la sortie visible ; Échap est son raccourci.
  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', surTouche);
    return () => window.removeEventListener('keydown', surTouche);
  }, [onClose]);

  // En impression, on n'imprime QUE le document. La modale est placee dans un
  // portail hors de #root (voir le return) et marque le body : le reste de
  // l'application (dashboard) est alors masque. Sans cela, Ctrl+P sortait les
  // pages de l'OS en plus du devis.
  useEffect(() => {
    document.body.classList.add('rk-print-invoice');
    return () => document.body.classList.remove('rk-print-invoice');
  }, []);

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
          client_email: clientEmail,
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

  const inputClass =
    'w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 placeholder:text-rk-muted focus:border-slate-400 focus:outline-none print:hidden';

  return createPortal(
    <div className="invoice-modal rk-print-portal fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-backdrop-in overflow-auto">
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={type === 'devis' ? 'Génération de devis' : 'Génération de facture proforma'}
        className="invoice-shell w-full max-w-[860px] my-4 sm:my-8 space-y-3 outline-none animate-modal-in"
      >

        {/* Barre d'actions (non imprimable) */}
        <div className="no-print flex items-center justify-between gap-3 flex-wrap rounded-2xl bg-rk-surface border border-rk-line px-4 py-3 text-rk-text shadow-xl">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onClose}
              className="bg-white/5 hover:bg-white/10 text-rk-text border border-rk-line font-semibold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Retour au CRM (Échap)"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Retour</span>
            </button>
            <span className="text-xs font-mono uppercase bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-500/30">
              {type === 'devis' ? 'Devis' : 'Facture proforma'}
            </span>
            <span className="text-xs font-mono text-rk-muted">
              Réf : {savedRef || quoteRef || '—'}
            </span>
            {savedRef && (
              <span className="text-xs font-mono text-emerald-300 flex items-center gap-1">
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
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-rk-muted hover:text-white flex items-center justify-center cursor-pointer"
              title="Fermer"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {error && (
          <div className="no-print flex items-center gap-2 text-xs font-mono text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5" /> {error}
          </div>
        )}

        {/* Feuille A4 : blanche à l'écran comme au papier, pour un vrai
            aperçu sans double style à maintenir. */}
        <div className="invoice-document bg-white text-slate-900 rounded-2xl shadow-2xl px-6 py-7 sm:px-10 sm:py-10">
          <DocumentLetterhead />

          {/* Titre + méta */}
          <div className="mt-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <h1
                className="font-display text-2xl sm:text-[26px] font-extrabold tracking-tight leading-none"
                style={{ color: NAVY }}
              >
                {type === 'devis' ? 'DEVIS' : 'FACTURE PROFORMA'}
              </h1>
              <div className="mt-1.5 text-xs font-mono text-rk-muted">
                Référence : <span className="font-semibold text-slate-700">{savedRef || quoteRef || '—'}</span>
              </div>
            </div>
            <div className="text-xs text-rk-muted sm:text-right leading-relaxed">
              <div>Date d'émission : <span className="font-semibold text-slate-800">{dateStr}</span></div>
              <div>Validité de l'offre : <span className="font-semibold text-slate-800">30 jours</span></div>
              <div>Statut : <span className="font-semibold text-slate-800">{STATUS_LABELS[status] || status}</span></div>
            </div>
          </div>

          {/* Client + détails */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-[9.5px] font-semibold uppercase tracking-wider text-rk-muted">
                Client / Donneur d'ordre
              </div>
              <div className="mt-1 text-[13px] font-bold text-slate-900">
                {clientName || 'Client à renseigner'}
              </div>
              {clientPhone && <div className="text-xs text-rk-muted mt-0.5">{clientPhone}</div>}
              {clientEmail && <div className="text-xs text-rk-muted">{clientEmail}</div>}
              {lead?.country && <div className="text-xs text-rk-muted">{lead.country}</div>}
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-[9.5px] font-semibold uppercase tracking-wider text-rk-muted">
                Détails de la prestation
              </div>
              <div className="mt-1 text-xs text-rk-muted space-y-0.5">
                <div>
                  Projet : <span className="font-semibold text-slate-800">{projet?.client_name || clientName || '—'}</span>
                </div>
                {projectType && (
                  <div>
                    Prestation : <span className="font-semibold text-slate-800">{projectType}</span>
                  </div>
                )}
                <div>
                  Pôle : <span className="font-semibold text-slate-800">{projet?.pole || 'Direction'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Prestations */}
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: NAVY }}>
                Prestations
              </h2>
              <button
                onClick={addLine}
                className="no-print text-xs font-mono px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer"
              >
                + Ajouter une ligne
              </button>
            </div>

            {lines.length === 0 ? (
              <div className="no-print mt-2 py-6 px-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center">
                <p className="text-xs font-mono text-rk-muted">Aucune prestation saisie.</p>
                <p className="text-xs text-rk-muted mt-1">
                  Ajoutez les lignes avec leur montant : rien n'est estimé automatiquement.
                </p>
              </div>
            ) : (
              <table className="mt-2 w-full text-left text-[12px] border-collapse">
                <thead>
                  <tr className="bg-slate-100" style={{ color: NAVY }}>
                    <th className="w-[7%] py-2 pl-2 font-semibold text-xs uppercase tracking-wide">#</th>
                    <th className="py-2 font-semibold text-xs uppercase tracking-wide">Désignation de la prestation</th>
                    <th className="w-[16%] py-2 text-center font-semibold text-xs uppercase tracking-wide">Pôle</th>
                    <th className="w-[22%] py-2 pr-2 text-right font-semibold text-xs uppercase tracking-wide">Montant (FCFA)</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, i) => (
                    <tr key={i} className="align-top border-b border-slate-100">
                      <td className="py-2.5 pl-2 text-xs font-mono text-rk-muted">{i + 1}</td>
                      <td className="py-2.5 pr-3 space-y-1">
                        <input
                          type="text"
                          value={l.designation}
                          onChange={(e) => updateLine(i, { designation: e.target.value })}
                          placeholder="Intégration passerelle Mobile Money"
                          className={`${inputClass} font-medium`}
                        />
                        <div className={`font-semibold text-slate-900 ${l.designation ? 'hidden print:block' : 'hidden'}`}>
                          {l.designation}
                        </div>
                        <input
                          type="text"
                          value={l.detail}
                          onChange={(e) => updateLine(i, { detail: e.target.value })}
                          placeholder="Détail de la prestation"
                          className={`${inputClass} text-rk-muted`}
                        />
                        {l.detail && (
                          <div className="text-xs text-rk-muted">{l.detail}</div>
                        )}
                      </td>
                      <td className="py-2.5 text-center">
                        <select
                          value={l.pole}
                          onChange={(e) => updateLine(i, { pole: e.target.value })}
                          className="text-xs font-mono px-1.5 py-1 rounded-md border border-slate-200 bg-white text-slate-900 print:hidden"
                        >
                          <option value="Direction">Direction</option>
                          <option value="Tech">Tech</option>
                          <option value="Creatif">Créatif</option>
                          <option value="Digital">Digital</option>
                          <option value="Client">Client</option>
                        </select>
                        <div className="hidden print:block font-mono text-xs text-slate-700">{l.pole}</div>
                      </td>
                      <td className="py-2.5 pr-2 text-right">
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
                            className={`${inputClass} w-28 text-right font-mono`}
                          />
                          <button
                            onClick={() => removeLine(i)}
                            className="no-print text-rk-muted hover:text-red-500 px-1 cursor-pointer"
                            title="Retirer la ligne"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="hidden print:block font-mono font-semibold text-slate-900">
                          {Number(l.montant) > 0 ? formatFcfa(l.montant) : 'Inclus'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Modalités + totaux */}
          {lines.length > 0 && (
            <div className="invoice-totals mt-5 flex flex-col sm:flex-row justify-between items-start gap-5">
              <div className="flex-1 space-y-1 text-xs text-rk-muted">
                <div className="text-[9.5px] font-semibold uppercase tracking-wider text-rk-muted">
                  Modalités de règlement
                </div>
                <div>
                  • 50% d'acompte au lancement :{' '}
                  <span className="font-semibold text-slate-800">{formatFcfa(deposit)}</span>
                </div>
                <div>
                  • 50% de solde à la livraison finale :{' '}
                  <span className="font-semibold text-slate-800">{formatFcfa(balance)}</span>
                </div>
                <div className="text-rk-muted">
                  Moyens acceptés : Mobile Money (MTN / Orange), virement bancaire, espèces contre reçu.
                </div>

                {notes.trim() && (
                  <div className="pt-1.5">
                    <div className="text-[9.5px] font-semibold uppercase tracking-wider text-rk-muted">
                      Notes / conditions
                    </div>
                    <div className="whitespace-pre-wrap text-slate-700">{notes}</div>
                  </div>
                )}

                {/* Édition (jamais imprimée) */}
                <div className="no-print pt-3 space-y-2">
                  <div>
                    <label className="block text-xs uppercase tracking-wide text-rk-muted">Statut de suivi</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      disabled={!!savedRef}
                      className="mt-0.5 w-full text-xs font-mono px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-900 disabled:opacity-60"
                    >
                      {Object.entries(STATUS_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wide text-rk-muted">Conditions / notes</label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      disabled={!!savedRef}
                      placeholder="Délai de livraison, conditions de révision, acompte..."
                      className="mt-0.5 w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 resize-none disabled:opacity-60 focus:border-slate-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="w-full sm:w-[260px] rounded-xl border border-slate-200 overflow-hidden shrink-0">
                <div className="flex justify-between px-4 py-2 text-xs text-rk-muted bg-slate-50">
                  <span>Total prestations</span>
                  <span className="font-mono">{formatFcfa(total)}</span>
                </div>
                <div className="flex justify-between px-4 py-2 text-xs text-rk-muted border-t border-slate-100">
                  <span>Acompte (50%)</span>
                  <span className="font-mono">{formatFcfa(deposit)}</span>
                </div>
                <div className="flex justify-between items-center px-4 py-3 border-t-2" style={{ borderColor: GREEN }}>
                  <span className="text-xs font-bold uppercase tracking-wide" style={{ color: NAVY }}>
                    Net à payer
                  </span>
                  <span className="font-mono text-base font-extrabold text-slate-900">
                    {formatFcfa(total)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Signatures */}
          <div className="invoice-signature mt-8 flex flex-col sm:flex-row justify-between gap-6 text-xs text-rk-muted">
            <div className="w-full sm:w-[45%]">
              <div className="font-semibold text-slate-700">Le client (bon pour accord)</div>
              <div className="mt-8 border-t border-dashed border-slate-300 pt-1">Nom, date et signature</div>
            </div>
            <div className="w-full sm:w-[45%]">
              <div className="font-semibold text-slate-700">Pour {OFFICIAL_KNOWLEDGE.letterhead.agencyName}</div>
              <div className="mt-8 border-t border-dashed border-slate-300 pt-1">Signature & cachet</div>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-1.5 text-xs text-rk-muted">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            <span>Document généré par Arckaton OS</span>
          </div>

          <DocumentLegalFooter />
        </div>
      </div>
    </div>,
    document.body
  );
};
