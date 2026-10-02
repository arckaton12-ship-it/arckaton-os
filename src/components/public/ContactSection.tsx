import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Send, Phone, Mail, MapPin, CheckCircle2, MessageSquare, ArrowRight, Loader2 } from 'lucide-react';
import { OFFICIAL_KNOWLEDGE } from '../../data/mockData';
import { motion } from 'motion/react';

export const ContactSection: React.FC = () => {
  const { addLead } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('Cameroun');
  const [projectType, setProjectType] = useState('Site web vitrine UX/UI (Forfait Synergie)');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [generatedWaLink, setGeneratedWaLink] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const { whatsappLink } = addLead({
        name,
        email,
        phone,
        project_type: projectType,
        budget: 'Sur devis',
        message: message || 'Prise de contact directe depuis le site.',
        source: 'site_v2',
        statut: 'nouveau',
        pole_assigned: 'Direction',
        country,
      });

      setGeneratedWaLink(whatsappLink);
      // Petit delai volontaire : le bouton affiche « Envoi en cours… » et un
      // double clic ne peut pas creer deux prospects.
      window.setTimeout(() => {
        setSubmitted(true);
        setIsSubmitting(false);
      }, 400);
    } catch {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="py-28 bg-[#0a0e17] relative border-t border-white/[0.08] scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          
          {/* Left Agency Info */}
          <div className="lg:col-span-5 space-y-8">
            <div>
              <div className="text-xs font-mono uppercase tracking-widest text-emerald-400 mb-2">
                Contact & Disponibilité
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white leading-[1.15]">
                Parlons concrètement de votre système digital
              </h2>
              <p className="text-slate-400 text-sm sm:text-base mt-3 leading-relaxed font-light">
                Notre bureau à Yaoundé (Mimboman) et nos équipes à distance vous répondent sous 24h ouvrées. Choisissez le canal qui vous convient le mieux.
              </p>
            </div>

            <div className="space-y-4">
              <a
                href={OFFICIAL_KNOWLEDGE.agency.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-5 rounded-2xl bg-[#0f1523] border border-white/[0.08] hover:border-emerald-500/30 transition-all group"
              >
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-mono text-slate-400">WhatsApp & Téléphone Officiel</div>
                  <div className="text-base font-semibold text-white mt-0.5">{OFFICIAL_KNOWLEDGE.agency.phone}</div>
                  <div className="text-[11px] text-emerald-400 font-mono">Réponse sous 2h ouvrées</div>
                </div>
              </a>

              <a
                href={`mailto:${OFFICIAL_KNOWLEDGE.agency.email}`}
                className="flex items-center gap-4 p-5 rounded-2xl bg-[#0f1523] border border-white/[0.08] hover:border-white/[0.16] transition-all group"
              >
                <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-mono text-slate-400">Courriel Professionnel</div>
                  <div className="text-base font-semibold text-white mt-0.5">{OFFICIAL_KNOWLEDGE.agency.email}</div>
                  <div className="text-[11px] text-slate-400 font-mono">Devis formels & cahiers des charges</div>
                </div>
              </a>

              <div className="flex items-center gap-4 p-5 rounded-2xl bg-[#0f1523] border border-white/[0.08]">
                <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-mono text-slate-400">Bureau Principal</div>
                  <div className="text-base font-semibold text-white mt-0.5">{OFFICIAL_KNOWLEDGE.agency.location}</div>
                  <div className="text-[11px] text-slate-400 font-mono">Accueil sur rendez-vous</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Direct Message Form */}
          <div className="lg:col-span-7">
            <div className="bg-[#0f1523] border border-white/[0.08] rounded-2xl p-8 sm:p-10 relative">
              
              {!submitted ? (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-1">
                    <h3 className="font-serif text-2xl font-bold text-white">
                      Envoyer un message direct
                    </h3>
                    <p className="text-xs text-slate-400 font-light">
                      Remplissez ces informations clés pour être mis en relation avec le pôle adéquat.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-mono text-slate-300 mb-1.5">
                        Votre nom ou entreprise *
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ex : M. Ebanda / Société X"
                        className="w-full rk-input px-4 py-3 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-slate-300 mb-1.5">
                        Numéro WhatsApp * (avec indicatif)
                      </label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+237 681 46 29 82"
                        className="w-full rk-input px-4 py-3 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono text-slate-300 mb-1.5">
                        Email professionnel
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="contact@entreprise.com"
                        className="w-full rk-input px-4 py-3 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-slate-300 mb-1.5">
                        Pays / Ville d'exercice
                      </label>
                      <input
                        type="text"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        placeholder="Ex : Cameroun, Gabon, France..."
                        className="w-full rk-input px-4 py-3 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-300 mb-1.5">
                      Projet ou forfait souhaité
                    </label>
                    <select
                      value={projectType}
                      onChange={(e) => setProjectType(e.target.value)}
                      className="w-full rk-input px-4 py-3 text-xs"
                    >
                      <option value="Site web vitrine UX/UI (Forfait Synergie)">Site vitrine UX/UI (Forfait Synergie 750k FCFA)</option>
                      <option value="E-commerce & Mobile Money (Forfait Architecture)">E-commerce & Mobile Money MTN/Orange (2,9M FCFA)</option>
                      <option value="Mini-site & Lancement (Forfait Initiation)">Mini-site 3-5 pages (Forfait Initiation 380k FCFA)</option>
                      <option value="Logiciel SaaS ARKA-PME (30j gratuit)">Logiciel de caisse & stock ARKA-PME</option>
                      <option value="Identité de marque & Direction artistique">Direction artistique & Identité de marque</option>
                      <option value="Autre demande sur-mesure">Autre demande sur-mesure</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-300 mb-1.5">
                      Précisions sur votre besoin
                    </label>
                    <textarea
                      rows={3}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Décrivez brièvement vos objectifs, vos délais et vos attentes..."
                      className="w-full rk-input px-4 py-3 text-xs"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed text-slate-950 font-semibold py-3.5 px-6 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                          <span>Envoi en cours…</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Transmettre ma demande à l'équipe</span>
                        </>
                      )}
                    </button>
                    <p className="text-[11px] text-center text-slate-400 font-mono mt-2.5">
                      Réponse garantie sous 24h ouvrées • Aucun engagement financier initial
                    </p>
                  </div>
                </form>
              ) : (
                <div className="text-center py-10 space-y-6">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-serif text-2xl font-bold text-white">
                      Message bien reçu !
                    </h4>
                    <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                      Merci <strong className="text-white">{name}</strong>. Nos équipes ont bien enregistré votre demande pour <strong className="text-emerald-400">{projectType}</strong>. Votre dossier est désormais visible dans Arckaton OS.
                    </p>
                  </div>

                  <div className="pt-4 max-w-sm mx-auto space-y-3">
                    <a
                      href={generatedWaLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold py-3 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-md"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Ouvrir la conversation WhatsApp directe</span>
                    </a>

                    <button
                      onClick={() => setSubmitted(false)}
                      className="text-xs text-slate-400 hover:text-white cursor-pointer"
                    >
                      Envoyer un autre message
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
