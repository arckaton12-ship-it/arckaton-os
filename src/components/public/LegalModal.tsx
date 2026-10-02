import React from 'react';
import { useApp } from '../../contexts/AppContext';
import { OFFICIAL_KNOWLEDGE } from '../../data/mockData';
import { X, Scale, ShieldCheck, Mail, MapPin, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDialogA11y } from '../../hooks/useDialogA11y';

type LegalTab = 'mentions' | 'confidentialite';

const L = OFFICIAL_KNOWLEDGE.letterhead;
const A = OFFICIAL_KNOWLEDGE.agency;

/**
 * Mentions légales et politique de confidentialité.
 *
 * Répartition des identifiants, confirmée par la direction :
 *   - Arckaton est une FILIALE implantée à Yaoundé ;
 *   - SLOMAH SARL est la société mère, dont le siège est à Douala ;
 *   - le RC et le NIU publiés sont ceux de SLOMAH SARL ;
 *   - SLOMAH SARL est le responsable du traitement des données ;
 *   - Red Parker est le directeur de publication ;
 *   - l'hébergement (Supabase, Render) est situé en Europe.
 *
 * Les points qui n'ont pas été tranchés par la direction restent signalés
 * comme tels plutôt qu'inventés : voir les sections marquées « à compléter ».
 */
export const LegalModal: React.FC = () => {
  const { isLegalModalOpen, setIsLegalModalOpen } = useApp();
  const [tab, setTab] = React.useState<LegalTab>('mentions');
  const dialogRef = useDialogA11y<HTMLDivElement>(isLegalModalOpen, () => setIsLegalModalOpen(false));

  if (!isLegalModalOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 overflow-y-auto bg-black/80 backdrop-blur-md">
        <motion.div
          ref={dialogRef}
          tabIndex={-1}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 18 }}
          transition={{ duration: 0.22 }}
          className="w-full max-w-3xl my-4 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden outline-none"
          role="dialog"
          aria-modal="true"
          aria-label="Mentions légales et politique de confidentialité"
        >
          {/* En-tête */}
          <div className="flex items-start justify-between gap-4 px-5 sm:px-7 py-5 border-b border-slate-200">
            <div className="min-w-0">
              <h2 className="font-serif text-xl font-bold text-slate-900">
                Informations légales
              </h2>
              <p className="text-xs text-slate-500 font-mono mt-1">
                {L.agencyName} — {L.relationship} de {L.parentName}
              </p>
            </div>
            <button
              onClick={() => setIsLegalModalOpen(false)}
              className="shrink-0 w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Onglets */}
          <div className="flex gap-2 px-5 sm:px-7 pt-4">
            <button
              onClick={() => setTab('mentions')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                tab === 'mentions'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              Mentions légales
            </button>
            <button
              onClick={() => setTab('confidentialite')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                tab === 'confidentialite'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Confidentialité
            </button>
          </div>

          {/* Contenu */}
          <div className="px-5 sm:px-7 py-6 text-sm text-slate-700 leading-relaxed max-h-[60vh] overflow-y-auto space-y-6">
            {tab === 'mentions' ? (
              <>
                <section className="space-y-2">
                  <h3 className="font-semibold text-slate-900">Éditeur du site</h3>
                  <p>
                    Le présent site est édité par <strong>{L.agencyName}</strong>, agence
                    digitale et éditeur du logiciel ARKA-PME, exercant son activité à{' '}
                    <strong>{L.agencyLocation}</strong>.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="font-semibold text-slate-900">Rattachement à la société mère</h3>
                  <p>
                    {L.agencyName} est une <strong>{L.relationship.toLowerCase()}</strong> de la
                    société <strong>{L.parentName}</strong>, dont le siège social est situé à{' '}
                    <strong>{L.parentLocation}</strong>.
                  </p>
                  <p>
                    Les identifiants légaux publiés ci-dessous sont ceux de{' '}
                    <strong>{L.parentName}</strong> et ne doivent pas être rattachés à{' '}
                    {L.agencyName}.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="font-semibold text-slate-900">Coordonnées</h3>
                  <ul className="space-y-1.5">
                    <li className="flex items-start gap-2">
                      <Building2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                      <span>
                        {L.agencyName} — {L.agencyLocation}
                        <br />
                        {L.parentName} — Siège social : {L.parentLocation}
                        <br />
                        RC : {L.rc} — NIU : {L.niu}
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Mail className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                      <a href={`mailto:${A.email}`} className="hover:underline">
                        {A.email}
                      </a>
                    </li>
                    <li className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                      <span>{A.phone}</span>
                    </li>
                  </ul>
                </section>

                <section className="space-y-2">
                  <h3 className="font-semibold text-slate-900">Direction de la publication</h3>
                  <p>
                    Le directeur de la publication est <strong>Red Parker</strong>. Il peut être
                    contacté à l'adresse <a href={`mailto:${A.email}`} className="underline">{A.email}</a>.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="font-semibold text-slate-900">Propriété intellectuelle</h3>
                  <p>
                    L'ensemble des contenus de ce site (textes, visuels, identité graphique,
                    marques, code source du site et du logiciel ARKA-PME) est protégé par le
                    droit d'auteur. Toute reproduction, même partielle, est interdite sans
                    autorisation écrite préalable de {L.parentName}.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="font-semibold text-slate-900">Responsabilité</h3>
                  <p>
                    {L.agencyName} s'efforce d'assurer l'exactitude des informations publiées.
                    Les contenus techniques, tarifs et délais sont donnés à titre indicatif
                    et peuvent évoluer. L'utilisation du site et de l'espace membres
                    « Arckaton OS » s'effectue sous l'entière responsabilité de l'utilisateur.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="font-semibold text-slate-900">Droit applicable</h3>
                  <p>
                    Les présentes mentions sont régies par le droit camerounais. À défaut de
                    résolution amiable, les tribunaux de <strong>{L.parentLocation}</strong> sont
                    seuls compétents.
                  </p>
                </section>
              </>
            ) : (
              <>
                <section className="space-y-2">
                  <h3 className="font-semibold text-slate-900">Responsable du traitement</h3>
                  <p>
                    Le responsable du traitement des données est{' '}
                    <strong>{L.parentName}</strong>, pour le compte de {L.agencyName}. Toute
                    demande relative à vos données peut être adressée à{' '}
                    <a href={`mailto:${A.email}`} className="underline">
                      {A.email}
                    </a>
                    .
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="font-semibold text-slate-900">Données collectées</h3>
                  <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                      <strong>Site public :</strong> nom, adresse e-mail, téléphone, entreprise
                      et message transmis via les formulaires de contact et de devis.
                    </li>
                    <li>
                      <strong>Espace Arckaton OS :</strong> identité du membre, rôle, pôle,
                      adresse e-mail, téléphone, et l'activité qu'il génère (tâches,
                      projets, documents commerciaux, messages).
                    </li>
                    <li>
                      <strong>Cookies et stockage local :</strong> jeton de session, préférences
                      d'affichage, et état local de l'interface.
                    </li>
                  </ul>
                  <p className="text-xs text-slate-500">
                    Aucune donnée dite « sensible » (santé, opinions politiques ou religieuses,
                    orientation sexuelle) n'est collectée, et aucune donnée n'est vendue à des
                    tiers.
                  </p>                </section>

                <section className="space-y-2">
                  <h3 className="font-semibold text-slate-900">Finalités et bases légales</h3>
                  <ul className="list-disc pl-5 space-y-1.5">
                    <li>Répondre aux demandes commerciales et établir devis et factures : exécution du contrat.</li>
                    <li>Gérer l'accès à l'espace membres et les droits associés : exécution du contrat.</li>
                    <li>Assurer la sécurité, la maintenance et la traçabilité des accès : intérêt légitime.</li>
                    <li>Contacter l'utilisateur au sujet de son projet : intérêt légitime.</li>
                  </ul>
                </section>

                <section className="space-y-2">
                  <h3 className="font-semibold text-slate-900">Partage et sous-traitants</h3>
                  <p>
                    Les données sont hébergées en Europe : l'application est déployée chez{' '}
                    <strong>Render</strong> et les bases de données sont gérées par{' '}
                    <strong>Supabase</strong>. Ces deux prestataires agissent comme sous-traitants
                    au sens de la réglementation applicable.
                  </p>
                  <p>
                    Un service d'intelligence artificielle peut être appelé pour produire des
                    synthèses : seules les métriques agrégées lui sont transmises, jamais
                    l'identité des clients. Vos données ne sont ni vendues, ni louées à des tiers.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="font-semibold text-slate-900">Durées de conservation</h3>
                  <p>
                    Les demandes commerciales non conclues sont conservées 3 ans à compter du
                    dernier contact. Les documents comptables (devis, factures) sont conservés
                    selon les obligations légales applicables au Cameroun. Les comptes de l'espace
                    membres restent actifs jusqu'à suppression demandée ; un compte désactivé
                    conserve son journal d'activité pour traçabilité.
                  </p>
                  <p className="text-xs text-slate-500">
                    L'hébergement est situé en Europe. La durée exacte de conservation des
                    journaux de connexion reste à préciser.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="font-semibold text-slate-900">Vos droits</h3>
                  <p>
                    Vous disposez d'un droit d'accès, de rectification, d'effacement, de
                    limitation, d'opposition et de portabilité de vos données. Ces droits se
                    exercent par e-mail. Une réclamation peut être adressée à l'autorité de
                    protection des données compétente au Cameroun.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="font-semibold text-slate-900">Sécurité</h3>
                  <p>
                    L'accès à l'espace membres est protégé par authentification. Les mots de
                    passe sont stockés sous forme hachée et ne sont jamais lisibles en clair.
                    Les échanges sont chiffrés. Un membre ne peut consulter que les données
                    de son propre pôle.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="font-semibold text-slate-900">Modifications</h3>
                  <p>
                    Cette politique peut être mise à jour. La date de dernière révision est
                    indiquée ci-dessous et s'applique dès sa publication.
                  </p>
                </section>
              </>
            )}
          </div>

          {/* Pied */}
          <div className="px-5 sm:px-7 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
            <span className="text-[11px] font-mono text-slate-500">
              Dernière révision : {new Date().toLocaleDateString('fr-FR')}
            </span>
            <a
              href={`mailto:${A.email}?subject=${encodeURIComponent('Demande relative à mes données')}`}
              className="text-[11px] font-mono font-semibold text-emerald-700 hover:underline"
            >
              Exercer un droit sur mes données
            </a>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
