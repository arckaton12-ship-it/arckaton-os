import React from 'react';
import { Lead, Projet } from '../../types';
import { OFFICIAL_KNOWLEDGE } from '../../data/mockData';
import { Printer, Download, X, CheckCircle2, ShieldCheck } from 'lucide-react';

interface InvoiceModalProps {
  lead?: Lead | null;
  projet?: Projet | null;
  type: 'devis' | 'facture';
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ lead, projet, type, onClose }) => {
  const clientName = lead?.name || projet?.client_name || 'Client PME';
  const clientPhone = lead?.phone || '+237 6XX XX XX XX';
  const projectType = lead?.project_type || projet?.service || 'Forfait Synergie (Système Digital Complet)';
  const reference = `${type === 'devis' ? 'DEV' : 'FAC'}-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const dateStr = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  // Pricing breakdown estimation based on project type
  const isArchitecture = projectType.toLowerCase().includes('architecture') || projectType.toLowerCase().includes('e-commerce');
  const isInitiation = projectType.toLowerCase().includes('initiation') || projectType.toLowerCase().includes('vitrine');

  const creationPrice = isArchitecture ? 2900000 : isInitiation ? 380000 : 750000;
  const monthlyPrice = isArchitecture ? 580000 : isInitiation ? 160000 : 350000;
  const acompte = Math.round(creationPrice * 0.5);
  const solde = creationPrice - acompte;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-[#0b122e] border border-white/20 rounded-3xl w-full max-w-3xl shadow-2xl p-6 sm:p-8 space-y-6 my-8 text-slate-100">
        
        {/* Actions bar (Non-printable) */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-500/30">
              {type === 'devis' ? 'Proposition Commerciale / Devis' : 'Facture Proforma Officielle'}
            </span>
            <span className="text-xs font-mono text-slate-400">Réf : {reference}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
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

        {/* Printable Document Box */}
        <div className="bg-[#070c1e] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-6 print:bg-white print:text-black">
          
          {/* Header Brand & Details */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-white/10 pb-6">
            <div>
              <div className="font-serif text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                <span>arckaton</span>
                <span className="text-xs font-mono text-blue-400 px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/30">
                  SYSTEMS
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-xs font-serif italic">
                « On ne livre pas un site. On livre un système digital complet. »
              </p>
              <div className="text-[11px] font-mono text-slate-400 mt-2 space-y-0.5">
                <div>{OFFICIAL_KNOWLEDGE.agency.location}</div>
                <div>WhatsApp / Tel : {OFFICIAL_KNOWLEDGE.agency.phone}</div>
                <div>Email : {OFFICIAL_KNOWLEDGE.agency.email}</div>
              </div>
            </div>

            <div className="text-left sm:text-right space-y-1">
              <div className="text-lg font-serif font-bold text-emerald-400">
                {type === 'devis' ? 'DEVIS CHIFFRÉ' : 'FACTURE PROFORMA'}
              </div>
              <div className="text-xs font-mono text-slate-300">Date : {dateStr}</div>
              <div className="text-xs font-mono text-slate-400">Validité : 30 jours ouvrés</div>

              {/* Client Box */}
              <div className="mt-4 p-3 bg-white/5 rounded-xl text-left border border-white/5">
                <div className="text-[10px] font-mono uppercase text-slate-400">Client / Donneur d'Ordre :</div>
                <div className="text-xs font-bold text-white">{clientName}</div>
                <div className="text-[11px] font-mono text-slate-300">{clientPhone}</div>
                {lead?.country && <div className="text-[10px] font-mono text-slate-400">{lead.country}</div>}
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-3">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 font-mono text-slate-400 text-[11px]">
                  <th className="py-2.5">Désignation de la Prestation</th>
                  <th className="py-2.5 text-center">Pôle</th>
                  <th className="py-2.5 text-right">Montant (FCFA)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <tr>
                  <td className="py-3 pr-4">
                    <div className="font-bold text-white">{projectType}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                      Conception UX/UI responsive, intégration système sur-mesure, optimisation mobile et SEO local.
                    </div>
                  </td>
                  <td className="py-3 text-center font-mono text-blue-400">Tech / Studio</td>
                  <td className="py-3 text-right font-mono font-bold text-white">
                    {creationPrice.toLocaleString('fr-FR')} FCFA
                  </td>
                </tr>

                <tr>
                  <td className="py-3 pr-4">
                    <div className="font-bold text-white">Intégration Passerelle Mobile Money (MTN MoMo & Orange Money)</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Configuration des webhooks de notification automatique et sécurisation SSL.
                    </div>
                  </td>
                  <td className="py-3 text-center font-mono text-blue-400">Tech</td>
                  <td className="py-3 text-right font-mono text-slate-400">Inclus</td>
                </tr>

                <tr>
                  <td className="py-3 pr-4">
                    <div className="font-bold text-white">Hébergement Cloud Haute Performance & Certificat SSL (1 an)</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Sauvegardes automatiques journalières et bande passante illimitée.
                    </div>
                  </td>
                  <td className="py-3 text-center font-mono text-emerald-400">Direction</td>
                  <td className="py-3 text-right font-mono text-slate-400">Offert (An 1)</td>
                </tr>

                <tr>
                  <td className="py-3 pr-4">
                    <div className="font-bold text-white">Suivi Mensuel & Activations Terrain (Option recommandée)</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Captations photo/vidéo sur site, maintenance réactive et assistance WhatsApp prioritaire.
                    </div>
                  </td>
                  <td className="py-3 text-center font-mono text-amber-400">Client / Terrain</td>
                  <td className="py-3 text-right font-mono text-slate-300">
                    {monthlyPrice.toLocaleString('fr-FR')} FCFA/mois
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totals Box */}
          <div className="border-t border-white/10 pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs font-mono">
            <div className="space-y-1 text-slate-400">
              <div className="text-[11px]">Modalités de règlement :</div>
              <div className="text-white">▪ 50% d'acompte au lancement : <span className="text-emerald-400 font-bold">{acompte.toLocaleString('fr-FR')} FCFA</span></div>
              <div className="text-white">▪ 50% de solde à la livraison finale : <span className="text-emerald-400 font-bold">{solde.toLocaleString('fr-FR')} FCFA</span></div>
              <div className="text-[10px] text-slate-500 mt-1">Moyens acceptés : Mobile Money (MTN / Orange), Virement Bancaire CEMAC, Espèces contre reçu légal.</div>
            </div>

            <div className="bg-white/5 border border-white/10 p-4 rounded-xl space-y-1.5 w-full sm:w-64 text-right">
              <div className="flex justify-between text-slate-400">
                <span>Total Prestation :</span>
                <span>{creationPrice.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>TVA (Régime Simplifié) :</span>
                <span>0 FCFA</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-emerald-400 border-t border-white/10 pt-1.5">
                <span>Net à Payer :</span>
                <span>{creationPrice.toLocaleString('fr-FR')} FCFA</span>
              </div>
            </div>
          </div>

          {/* Footer Seals */}
          <div className="border-t border-white/10 pt-4 text-[10px] font-mono text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Système Certifié Arckaton OS • Document conforme aux règles de facturation</span>
            </div>
            <div>Signature & Cachet de l'Agence</div>
          </div>

        </div>

      </div>
    </div>
  );
};
