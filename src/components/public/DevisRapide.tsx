import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { FORFAITS_DATA } from '../../data/mockData';
import { Loader2, CheckCircle2, MessageSquare, ShieldCheck, WifiOff, Send } from 'lucide-react';
import { submitPublicLead } from '../../utils/publicLead';
import { formatCurrencyPrice } from '../../utils/currency';

/**
 * Devis rapide : le chemin le plus court du site vers un lead.
 *
 * Le parcours conseiller (WizardConseil) reste la voie complète (besoin,
 * créneaux, coordonnées, confirmation). Ici on capture juste l'essentiel
 * (forfait présélectionné + nom + téléphone) et on appelle le même endpoint
 * `POST /api/leads` via `submitPublicLead` : le serveur reste seul juge du
 * pôle, du statut et du plafond de dépôt. Aucun chiffre n'est inventé ; si
 * l'envoi échoue on remet le lien WhatsApp, jamais de promesse d'enregistrement.
 */
export const DevisRapide: React.FC = () => {
  const { currency } = useApp();
  const [forfait, setForfait] = useState<string>(FORFAITS_DATA[FORFAITS_DATA.length - 1]?.name ?? '');
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [consentement, setConsentement] = useState(false);
  const [envoi, setEnvoi] = useState<'repos' | 'enCours'>('repos');
  const [resultat, setResultat] = useState<{ saved: boolean; whatsappLink: string } | null>(null);

  const nomDuForfait = FORFAITS_DATA.find((f) => f.name === forfait);
  const prix = nomDuForfait && nomDuForfait.creation_price_amount
    ? formatCurrencyPrice(nomDuForfait.creation_price_amount, currency)
    : null;

  const soumettre = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim() || !telephone.trim() || !consentement) return;
    setEnvoi('enCours');
    const r = await submitPublicLead({
      name: nom.trim(),
      phone: telephone.trim(),
      project_type: forfait || 'Systeme digital sur mesure',
      source: 'site_v2_devis_rapide',
      consentement: true,
    });
    setResultat(r);
    setEnvoi('repos');
  };

  return (
    <section aria-label="Devis rapide" className="mb-16 sm:mb-24">
      <div className="bg-rk-surface border border-rk-line rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4 border-b border-rk-line pb-5">
          <div>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-white">Devis rapide en 30 secondes</h3>
            <p className="text-xs text-rk-muted mt-1.5 max-w-xl leading-relaxed">
              Choisissez un forfait, laissez votre téléphone : un conseiller vous rappelle sous 24h ouvrées.
              Le devis détaillé interactif reste disponible sur chaque forfait.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 shrink-0">
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            Réponse garantie
          </span>
        </div>

        {resultat ? (
          <div className="pt-8 text-center space-y-4" aria-live="polite">
            <div
              className={`w-14 h-14 rounded-full border mx-auto flex items-center justify-center ${
                resultat.saved
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}
            >
              {resultat.saved ? <CheckCircle2 className="w-7 h-7" /> : <WifiOff className="w-7 h-7" />}
            </div>
            <div className="space-y-1.5">
              <h4 className="font-serif text-lg font-bold text-white">
                {resultat.saved ? 'Demande bien reçue !' : 'Envoi automatique indisponible'}
              </h4>
              <p className="text-xs text-rk-text-secondary max-w-md mx-auto leading-relaxed">
                {resultat.saved
                  ? 'Votre demande est enregistrée : un conseiller Arckaton vous recontacte sous 24h ouvrées.'
                  : 'Utilisez WhatsApp pour nous transmettre votre demande sans attendre.'}
              </p>
            </div>
            <a
              href={resultat.whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold py-3 px-6 rounded-xl text-xs transition-all shadow-md"
            >
              <MessageSquare className="w-4 h-4" aria-hidden="true" />
              <span>Confirmer sur WhatsApp</span>
            </a>
            <div>
              <button
                type="button"
                onClick={() => setResultat(null)}
                className="text-xs text-rk-muted hover:text-white underline underline-offset-2 cursor-pointer"
              >
                Faire une autre demande
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={soumettre} className="pt-6 grid grid-cols-1 lg:grid-cols-[1fr_1fr_180px_auto] gap-3 items-end">
            <div>
              <label htmlFor="devis-rapide-forfait" className="block text-xs font-mono text-rk-text-secondary mb-1.5">
                Forfait souhaité *
              </label>
              <select
                id="devis-rapide-forfait"
                value={forfait}
                onChange={(e) => setForfait(e.target.value)}
                className="w-full rk-input px-3.5 py-3 text-sm"
              >
                {FORFAITS_DATA.map((f) => (
                  <option key={f.id} value={f.name}>
                    {f.name}
                    {f.creation_price_amount ? ` — ${formatCurrencyPrice(f.creation_price_amount, currency)}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="devis-rapide-nom" className="block text-xs font-mono text-rk-text-secondary mb-1.5">
                Votre nom ou entreprise *
              </label>
              <input
                id="devis-rapide-nom"
                type="text"
                required
                autoComplete="name"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Ex : M. Ebanda / Société X"
                className="w-full rk-input px-3.5 py-3 text-sm"
              />
            </div>

            <div>
              <label htmlFor="devis-rapide-tel" className="block text-xs font-mono text-rk-text-secondary mb-1.5">
                Numéro WhatsApp * (avec indicatif)
              </label>
              <input
                id="devis-rapide-tel"
                type="tel"
                required
                inputMode="tel"
                autoComplete="tel"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                placeholder="+237 6 00 00 00 00"
                className="w-full rk-input px-3.5 py-3 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={!nom.trim() || !telephone.trim() || !consentement || envoi === 'enCours'}
              className="h-[46px] inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-semibold px-5 rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              {envoi === 'enCours' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                  Envoi…
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" aria-hidden="true" />
                  Recevoir mon devis
                </>
              )}
            </button>

            <div className="col-span-1 lg:col-span-4 flex items-start gap-2.5 pt-3">
              <input
                type="checkbox"
                id="devis-rapide-consentement"
                checked={consentement}
                onChange={(e) => setConsentement(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-emerald-500 shrink-0"
              />
              <label
                htmlFor="devis-rapide-consentement"
                className="text-xs text-rk-muted font-light leading-relaxed cursor-pointer select-none"
              >
                J'autorise Arckaton à me recontacter à ce numéro pour traiter cette demande
                (consentement révocable à tout moment — loi 2024/017, art. 41).
              </label>
            </div>

            {prix && (
              <p className="col-span-1 lg:col-span-4 text-[11px] font-mono text-rk-muted pt-1">
                Commence à {prix} de création ({nomDuForfait?.delai ?? 'délai selon forfait'}), le devis chiffré
                vous est transmis par WhatsApp.
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  );
};