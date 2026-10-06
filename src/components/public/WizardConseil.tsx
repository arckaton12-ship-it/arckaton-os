// Parcours conseiller : une seule boite de dialogue partagee par Devis,
// Essai, Reservation et Contact. La machine a etats (`src/wizard/engine.ts`)
// decide chaque etape ; ce composant ne fait que rendre un etat, declarer
// les effets reseau (creneaux, envoi) et rester accessible.
import React, { useEffect, useReducer, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ArrowLeft,
  ArrowRight,
  Loader2,
  CheckCircle2,
  MessageSquare,
  CalendarDays,
  Clock,
  Play,
  FileText,
  Send,
  WifiOff,
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useDialogA11y } from '../../hooks/useDialogA11y';
import {
  reducer,
  etatInitial,
  peutPasser,
  etapePrecedente,
  fautDemanderCreneaux,
  estParcoursCadrage,
  validerBesoin,
  type ModeWizard,
} from '../../wizard/engine';
import { chargerCreneaux } from '../../utils/publicCreneaux';
import { soumettreRdv } from '../../utils/publicRdv';
import { submitPublicLead } from '../../utils/publicLead';

const SOURCES: Record<ModeWizard, string> = {
  devis: 'site_v2_devis',
  essai: 'site_v2_trial',
  reservation: 'site_v2_rdv',
  contact: 'site_v2',
};

const TITRES: Record<ModeWizard, { titre: string; sousTitre: string }> = {
  devis: { titre: 'Demander un devis interactif', sousTitre: 'Votre besoin, puis un conseiller valide le périmètre.' },
  essai: { titre: 'Essai ARKA-PME (30 jours)', sousTitre: 'Un RDV de cadrage de 15 min pour préparez votre base de test.' },
  reservation: { titre: 'Réserver un rendez-vous de cadrage', sousTitre: 'Axé sur vos objectifs : audit, formation ou démonstration.' },
  contact: { titre: 'Être rappelé par un conseiller', sousTitre: 'Laissez vos coordonnées, on vous rappelle sous 24h ouvrées.' },
};

const ICO_PARC_FOV: Partial<Record<ModeWizard, React.ReactNode>> = {
  devis: <FileText className="w-4 h-4" />,
  essai: <Play className="w-4 h-4 fill-emerald-400" />,
  reservation: <CalendarDays className="w-4 h-4" />,
  contact: <Send className="w-4 h-4" />,
};

function optionsPour(mode: ModeWizard): readonly string[] {
  if (mode === 'essai') {
    return [
      'ARKA-PME — Boutique de détail & Prêt-à-porter',
      'ARKA-PME — Commerce général & Quincaillerie',
      'ARKA-PME — Pharmacie & Parapharmacie',
      'ARKA-PME — Supermarché & Épicerie fine',
      'ARKA-PME — Restauration',
      'ARKA-PME — Autre activité commerciale',
    ];
  }
  if (mode === 'reservation') {
    return [
      'Diagnostic digital sur site (audit)',
      'Démonstration e-commerce + Mobile Money',
      'Formation de vos équipes au digital',
      'Réunion de cadrage projet',
    ];
  }
  return [
    'Site web vitrine UX/UI',
    'E-commerce & Mobile Money MTN/Orange',
    'Mini-site 3-5 pages',
    'Logiciel de caisse & stock ARKA-PME',
    'Identité de marque & Direction artistique',
    'Maintien & évolution de mon site',
  ];
}

const AUTRE = 'Autre besoin sur-mesure…';

function formatCreneau(iso: string): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Africa/Douala',
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

const ETAPES_CADRAGE = ['besoin', 'creneaux', 'coordonnees', 'confirmation'] as const;
const ETAPES_LEAD = ['besoin', 'coordonnees', 'confirmation'] as const;

export const WizardConseil: React.FC = () => {
  const { wizard, fermerWizard } = useApp();
  const [etat, dispatch] = useReducer(reducer, wizard.mode, etatInitial);
  const [choix, setChoix] = useState(AUTRE);
  const [autreBesoin, setAutreBesoin] = useState('');

  // A chaque ouverture, repart du besoin exprime par le bouton qui a declenché.
  useEffect(() => {
    if (!wizard.ouvert) return;
    dispatch({ type: 'demarrer_avec', mode: wizard.mode, besoinInitial: wizard.besoinInitial });
    const options = optionsPour(wizard.mode);
    if (options.includes(wizard.besoinInitial)) {
      setChoix(wizard.besoinInitial);
    } else if (wizard.besoinInitial) {
      setChoix(AUTRE);
      setAutreBesoin(wizard.besoinInitial);
    } else {
      setChoix(options[0]);
    }
  }, [wizard.ouvert, wizard.mode, wizard.besoinInitial]);

  // Chargement des creneaux a l'entree de l'etape creneaux.
  useEffect(() => {
    if (!wizard.ouvert || !fautDemanderCreneaux(etat)) return;
    dispatch({ type: 'demander_creneaux' });
    let annule = false;
    chargerCreneaux(etat.besoin)
      .then((r) => {
        if (!annule) dispatch({ type: 'creneaux_chargees', pole: r.pole, creneaux: r.creneaux });
      })
      .catch((err: unknown) => {
        if (!annule) {
          dispatch({ type: 'creneaux_echec', message: err instanceof Error ? err.message : 'Impossible de charger le calendrier.' });
        }
      });
    return () => {
      annule = true;
    };
  }, [etat, wizard.ouvert]);

  const ouvrable = optionsPour(wizard.mode);
  const besoinCourant = choix === AUTRE ? autreBesoin : choix;
  const cadrage = estParcoursCadrage(wizard.mode);
  const etapes = cadrage ? ETAPES_CADRAGE : ETAPES_LEAD;
  const indexEtape = etapes.indexOf(etat.etape);
  const precedente = etapePrecedente(etat);

  const handleClose = () => fermerWizard();
  const dialogRef = useDialogA11y<HTMLDivElement>(wizard.ouvert, handleClose);

  const majBesoin = (valeur: string, message?: string) => {
    dispatch({ type: 'renseigner_besoin', valeur, message });
  };

  const envoyer = async () => {
    if (!peutPasser(etat)) return;
    dispatch({ type: 'envoi_demarre' });
    try {
      if (cadrage) {
        const creneau = etat.creneauChoisi;
        if (!creneau) throw new Error('Choisissez un créneau.');
        const resultat = await soumettreRdv({
          nom: etat.prenomNom,
          telephone: etat.telephone,
          email: etat.email || undefined,
          motif: etat.besoin || besoinCourant,
          debut_utc: creneau,
          duree_min: 30,
          source: SOURCES[etat.mode],
          consentement: true,
        });
        if (resultat.conflitCreneau) {
          dispatch({ type: 'retour_creneaux' });
          return;
        }
        dispatch({
          type: 'envoi_reussi',
          resultat: {
            saved: resultat.saved,
            whatsappLink: resultat.whatsappLink,
            rdvRef: resultat.rdvRef,
            pole: resultat.pole,
            creneauIso: resultat.creneauIso,
          },
        });
        return;
      }
      const resultat = await submitPublicLead({
        name: etat.prenomNom,
        phone: etat.telephone,
        email: etat.email || undefined,
        project_type: etat.besoin || besoinCourant,
        message: etat.message || undefined,
        source: SOURCES[etat.mode],
        consentement: true,
      });
      dispatch({ type: 'envoi_reussi', resultat: { saved: resultat.saved, whatsappLink: resultat.whatsappLink } });
    } catch (err) {
      dispatch({
        type: 'envoi_echec',
        message: err instanceof Error ? err.message : 'Envoi impossible. Réessayez.',
      });
    }
  };

  return (
    <AnimatePresence>
      {wizard.ouvert && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
        >
          <motion.div
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={TITRES[wizard.mode].titre}
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', duration: 0.35, bounce: 0 }}
            className="bg-rk-surface border border-rk-line rounded-2xl w-full max-w-xl max-h-[90dvh] flex flex-col shadow-2xl overflow-hidden relative outline-none"
          >
            {/* Header */}
            <div className="bg-rk-base px-6 py-4 sm:py-5 border-b border-rk-line flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  {ICO_PARC_FOV[wizard.mode] ?? <Send className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-serif text-base sm:text-lg font-bold text-white">{TITRES[wizard.mode].titre}</h3>
                  <p className="text-[11px] text-rk-muted font-mono">{TITRES[wizard.mode].sousTitre}</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                aria-label="Fermer le parcours conseiller"
                className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] text-rk-muted hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            {/* Steps indicator */}
            {indexEtape >= 0 && (
              <div className="flex items-center gap-1.5 px-6 pt-4" aria-label={`Étape ${indexEtape + 1} sur ${etapes.length}`}>
                {etapes.map((s, i) => (
                  <div
                    key={s}
                    className={`h-1 flex-1 rounded-full transition-colors ${i <= indexEtape ? 'bg-emerald-500' : 'bg-white/[0.08]'}`}
                  />
                ))}
              </div>
            )}

            <div className="p-6 sm:p-7 overflow-y-auto">
              {etat.etape === 'besoin' && (
                <div className="space-y-4">
                  <FieldsetBesoin
                    mode={wizard.mode}
                    options={ouvrable}
                    choix={choix}
                    autreBesoin={autreBesoin}
                    message={etat.message}
                    onChoix={(v) => {
                      setChoix(v);
                      majBesoin(v === AUTRE ? autreBesoin : v);
                    }}
                    onAutre={(v) => {
                      setAutreBesoin(v);
                      majBesoin(v);
                    }}
                    onMessage={(m) => majBesoin(besoinCourant, m)}
                  />
                </div>
              )}

              {etat.etape === 'creneaux' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs text-rk-muted font-mono">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                    <span>Pôle {etat.pole ?? '…'} • Fuseau Africa/Douala</span>
                  </div>

                  {etat.chargement === 'enCours' && (
                    <div className="flex items-center justify-center gap-2 py-10 text-rk-muted text-xs" aria-live="polite">
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      <span>Chargement des créneaux…</span>
                    </div>
                  )}

                  {etat.chargement === 'erreur' && (
                    <div role="alert" className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-xs text-red-200 leading-relaxed">
                      {etat.erreur}
                      <button
                        type="button"
                        onClick={() => dispatch({ type: 'demander_creneaux' })}
                        className="mt-3 block text-red-100 underline underline-offset-2 cursor-pointer"
                      >
                        Réessayer
                      </button>
                    </div>
                  )}

                  {etat.chargement === 'ok' && (
                    <ul className="space-y-1.5 max-h-72 overflow-y-auto pr-1" role="radiogroup" aria-label="Choisissez votre créneau">
                      {etat.creneaux.map((iso) => (
                        <li key={iso}>
                          <label
                            className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors text-sm ${
                              etat.creneauChoisi === iso
                                ? 'border-emerald-500/60 bg-emerald-500/10 text-white'
                                : 'border-rk-line bg-rk-base text-rk-text-secondary hover:border-rk-line-strong'
                            }`}
                          >
                            <input
                              type="radio"
                              name="creneau"
                              value={iso}
                              checked={etat.creneauChoisi === iso}
                              onChange={() => dispatch({ type: 'choisir_creneau', iso })}
                              className="accent-emerald-500"
                            />
                            <span className="font-mono">{formatCreneau(iso)}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {etat.etape === 'coordonnees' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label htmlFor="wizard-nom" className="block text-xs font-mono text-rk-text-secondary mb-1.5">
                        Votre nom ou entreprise *
                      </label>
                      <input
                        id="wizard-nom"
                        type="text"
                        required
                        autoComplete="name"
                        value={etat.prenomNom}
                        onChange={(e) =>
                          dispatch({
                            type: 'renseigner_coordonnees',
                            prenomNom: e.target.value,
                            telephone: etat.telephone,
                            email: etat.email,
                          })
                        }
                        placeholder="Ex : M. Ebanda / Société X"
                        className="w-full rk-input px-4 py-3 text-sm"
                      />
                    </div>

                    <div>
                      <label htmlFor="wizard-tel" className="block text-xs font-mono text-rk-text-secondary mb-1.5">
                        Numéro WhatsApp * (avec indicatif)
                      </label>
                      <input
                        id="wizard-tel"
                        type="tel"
                        required
                        inputMode="tel"
                        autoComplete="tel"
                        value={etat.telephone}
                        onChange={(e) =>
                          dispatch({
                            type: 'renseigner_coordonnees',
                            prenomNom: etat.prenomNom,
                            telephone: e.target.value,
                            email: etat.email,
                          })
                        }
                        placeholder="+237 681 46 29 82"
                        className="w-full rk-input px-4 py-3 text-sm"
                      />
                    </div>

                    <div>
                      <label htmlFor="wizard-email" className="block text-xs font-mono text-rk-text-secondary mb-1.5">
                        Email professionnel
                      </label>
                      <input
                        id="wizard-email"
                        type="email"
                        autoComplete="email"
                        value={etat.email}
                        onChange={(e) =>
                          dispatch({
                            type: 'renseigner_coordonnees',
                            prenomNom: etat.prenomNom,
                            telephone: etat.telephone,
                            email: e.target.value,
                          })
                        }
                        placeholder="contact@entreprise.com"
                        className="w-full rk-input px-4 py-3 text-sm"
                      />
                    </div>
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={etat.consentement}
                      onChange={(e) => dispatch({ type: 'basculer_consentement', accorde: e.target.checked })}
                      className="mt-0.5 w-4 h-4 accent-emerald-500"
                    />
                    <span className="text-xs text-rk-muted font-light leading-relaxed">
                      J'autorise Arckaton à me recontacter à ce numéro pour {cadrage ? 'organiser ce rendez-vous' : 'traiter cette demande'} (consentement révocable à tout moment).
                    </span>
                  </label>

                  {etat.erreur && (
                    <div role="alert" className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-xs text-red-200">
                      {etat.erreur}
                    </div>
                  )}
                </div>
              )}

              {etat.etape === 'confirmation' && etat.resultat && (
                <Confirmation resultat={etat.resultat} cadrage={cadrage} />
              )}
            </div>

            {/* Footer navigation */}
            {etat.etape !== 'confirmation' && (
              <div className="px-6 sm:px-7 pb-6 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (precedente) dispatch({ type: 'revenir_etape' });
                  }}
                  className="text-xs text-rk-muted hover:text-white flex items-center gap-1.5 cursor-pointer"
                >
                  {precedente && (
                    <>
                      <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                      Retour
                    </>
                  )}
                </button>

                {etat.etape === 'coordonnees' ? (
                  <button
                    type="button"
                    onClick={envoyer}
                    disabled={!peutPasser(etat)}
                    className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-semibold py-3 px-6 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
                  >
                    {etat.envoi === 'enCours' ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                        Envoi en cours…
                      </>
                    ) : (
                      <>
                        {cadrage ? 'Confirmer le rendez-vous' : 'Transmettre ma demande'}
                        <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'valider_etape' })}
                    disabled={!peutPasser(etat) || etat.chargement === 'enCours'}
                    className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-semibold py-3 px-6 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
                  >
                    Suivant
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>
            )}

            {etat.etape === 'confirmation' && (
              <div className="px-6 sm:px-7 pb-6">
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'recommencer' })}
                  className="text-xs text-rk-muted hover:text-white underline underline-offset-2 cursor-pointer"
                >
                  Faire une autre demande
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface FieldsetBesoinProps {
  mode: ModeWizard;
  options: readonly string[];
  choix: string;
  autreBesoin: string;
  message: string;
  onChoix: (v: string) => void;
  onAutre: (v: string) => void;
  onMessage: (m: string) => void;
}

function FieldsetBesoin({ options, choix, autreBesoin, message, onChoix, onAutre, onMessage }: FieldsetBesoinProps) {
  return (
    <>
      <div>
        <label htmlFor="wizard-besoin" className="block text-xs font-mono text-rk-text-secondary mb-1.5">
          Votre besoin
        </label>
        <select
          id="wizard-besoin"
          value={choix}
          onChange={(e) => onChoix(e.target.value)}
          className="w-full rk-input px-4 py-3 text-sm"
        >
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
          <option value={AUTRE}>{AUTRE}</option>
        </select>
      </div>

      {choix === AUTRE && (
        <div>
          <label htmlFor="wizard-autre" className="block text-xs font-mono text-rk-text-secondary mb-1.5">
            Décrivez votre besoin *
          </label>
          <input
            id="wizard-autre"
            type="text"
            value={autreBesoin}
            onChange={(e) => onAutre(e.target.value)}
            placeholder="Ex : refonte de la boutique en ligne avec budget 3M FCFA"
            className="w-full rk-input px-4 py-3 text-sm"
          />
          {!validerBesoin(autreBesoin) && (
            <p className="text-[11px] text-rk-muted mt-1.5 font-mono">Quelques mots suffisent pour démarrer.</p>
          )}
        </div>
      )}

      <div>
        <label htmlFor="wizard-message" className="block text-xs font-mono text-rk-text-secondary mb-1.5">
          Précisions (optionnel)
        </label>
        <textarea
          id="wizard-message"
          rows={3}
          value={message}
          onChange={(e) => onMessage(e.target.value)}
          placeholder="Objectifs, délais, budget indicatif…"
          className="w-full rk-input px-4 py-3 text-sm"
        />
      </div>
    </>
  );
}

interface ConfirmationProps {
  resultat: {
    saved: boolean;
    whatsappLink: string;
    rdvRef?: string;
    creneauIso?: string;
    pole?: string;
  };
  cadrage: boolean;
}

function Confirmation({ resultat, cadrage }: ConfirmationProps) {
  const titre = resultat.saved
    ? cadrage
      ? 'Rendez-vous de cadrage demandé !'
      : 'Demande bien reçue !'
    : 'Demande prête à envoyer';

  const detail = resultat.saved
    ? cadrage
      ? `Notre équipe vous appelle pour confirmer ce créneau.`
      : `Votre demande est enregistrée : un conseiller vous recontacte sous 24h ouvrées.`
    : `Envoi automatique indisponible : utilisez WhatsApp pour nous transmettre votre demande.`;

  return (
    <div className="text-center py-6 space-y-5" aria-live="polite">
      <div
        className={`w-14 h-14 rounded-full border mx-auto flex items-center justify-center ${
          resultat.saved
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
        }`}
      >
        {resultat.saved ? <CheckCircle2 className="w-7 h-7" /> : <WifiOff className="w-7 h-7" />}
      </div>

      <div className="space-y-2">
        <h4 className="font-serif text-xl sm:text-2xl font-bold text-white">{titre}</h4>
        <p className="text-xs sm:text-sm text-rk-text-secondary max-w-md mx-auto font-light leading-relaxed">{detail}</p>

        {resultat.saved && cadrage && resultat.creneauIso && (
          <p className="text-xs text-emerald-400 font-mono inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5">
            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
            {formatCreneau(resultat.creneauIso)} • Pôle {resultat.pole ?? ''}
          </p>
        )}
      </div>

      <div className="pt-2 max-w-sm mx-auto space-y-3">
        <a
          href={resultat.saved ? resultat.whatsappLink : resultat.whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold py-3 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-md"
        >
          <MessageSquare className="w-4 h-4" aria-hidden="true" />
          <span>Confirmer sur WhatsApp</span>
        </a>
      </div>
    </div>
  );
}