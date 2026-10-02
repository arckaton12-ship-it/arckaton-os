import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Pole } from '../../types';
import { X, Send, Sparkles, Bot, ArrowUpRight, CheckCircle2, FileText, Loader2 } from 'lucide-react';
import { POLES_INFO } from '../../data/mockData';
import { motion, AnimatePresence } from 'motion/react';
import { useDialogA11y } from '../../hooks/useDialogA11y';

export const AgentModal: React.FC = () => {
  const { 
    isAgentModalOpen, 
    setIsAgentModalOpen, 
    selectedPole, 
    setSelectedPole,
    setIsQuoteModalOpen,
    addAgentReport
  } = useApp();

  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string; pole?: Pole }>>([
    {
      role: 'assistant',
      text: "Bonjour ! Je suis l'agent conseiller d'Arckaton, entraîné sur la méthode officielle de l'agence. Quel est votre projet digital ou quelle question souhaitez-vous me poser ?",
      pole: 'Direction'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || loading) return;

    const newMessages = [...messages, { role: 'user' as const, text }];
    setMessages(newMessages);
    if (!textToSend) setInputText('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/agent-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          pole: selectedPole,
          // Le serveur lit `history` (et non `conversationHistory`) : sans ce
          // nom, l'historique n'était jamais transmis et le conseiller
          // oubliait le fil de la conversation.
          history: newMessages.slice(-6)
        })
      });

      const data = await res.json();
      setMessages([...newMessages, { role: 'assistant', text: data.reply, pole: selectedPole }]);
    } catch (err) {
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          text: `Le Pôle ${selectedPole} vous répond : Chez Arckaton, nous proposons trois forfaits officiels (Initiation à 380k, Synergie à 750k et Architecture à 2,9M FCFA), tous conçus pour livrer des résultats concrets avec suivi mensuel et sorties terrain. Souhaitez-vous que nous cadrions votre devis personnalisé ?`,
          pole: selectedPole
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = () => {
    addAgentReport({
      title: `Synthèse Échange Client — Pôle ${selectedPole}`,
      pole: selectedPole,
      lead_name: 'Visiteur Site Web',
      summary: `Échange interactif de ${messages.length} messages orienté sur les besoins ${selectedPole}. Le visiteur a abordé les forfaits et la mise en œuvre technique/marketing.`,
      recommendations: [
        'Organiser un appel de cadrage de 15 minutes sur WhatsApp',
        `Préparer une proposition calquée sur le forfait le plus pertinent (${selectedPole === 'Tech' ? 'Architecture' : 'Synergie'})`,
        'Présenter les métriques de succès (Kotto +337%, Districash 12 min)'
      ],
      forfait_recommande: selectedPole === 'Tech' ? 'Architecture (2 900 000 FCFA)' : 'Synergie (750 000 FCFA)'
    });

    setReportGenerated(true);
    setTimeout(() => setReportGenerated(false), 4000);
  };

  const poleOptions: Pole[] = ['Direction', 'Creatif', 'Tech', 'Digital', 'Client', 'Externe'];

  const quickQuestions: Record<Pole, string[]> = {
    Direction: [
      "Quels sont vos 3 forfaits et tarifs officiels ?",
      "Livrez-vous pour des clients à l'étranger ?",
      "Pourquoi dites-vous 'on ne livre pas un site, mais un système' ?"
    ],
    Tech: [
      "Comment intégrez-vous MTN MoMo et Orange Money ?",
      "Le logiciel ARKA-PME fonctionne-t-il hors-ligne ?",
      "Quels sont les délais de livraison pour un e-commerce ?"
    ],
    Creatif: [
      "Combien de visuels et retouches sont inclus ?",
      "Faites-vous les shootings photos et vidéos ?",
      "Pouvez-vous refondre notre logo et charte ?"
    ],
    Digital: [
      "Qu'est-ce que les 6 à 9 sorties terrain par mois ?",
      "Quel résultat avez-vous obtenu pour Maison Kotto (+337%) ?",
      "Le budget publicitaire est-il inclus dans le forfait ?"
    ],
    Client: [
      "Comment se passe la formation de 2 heures ?",
      "Quel est le temps de réponse du support WhatsApp ?",
      "Puis-je changer de forfait en cours d'année ?"
    ],
    Externe: [
      "Comment travaillez-vous avec des prestataires externes ?",
      "Quelles technologies web utilisez-vous ?",
      "Arckaton intervient-il sur des audits de systèmes existants ?"
    ]
  };

  const dialogRef = useDialogA11y<HTMLDivElement>(isAgentModalOpen, () => setIsAgentModalOpen(false));

  return (
    <AnimatePresence>
      {isAgentModalOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md"
        >
          <motion.div 
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Conseiller IA Arckaton"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', duration: 0.35, bounce: 0 }}
            className="bg-[#0f1523] border border-white/[0.1] rounded-2xl w-full max-w-2xl h-[90vh] flex flex-col shadow-2xl overflow-hidden relative outline-none"
          >
            {/* Header with 6 Poles Tabs */}
            <div className="bg-[#0a0e17] border-b border-white/[0.08] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-serif text-base font-bold text-white flex items-center gap-2">
                      <span>Conseiller IA Arckaton</span>
                      <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        Officiel 6 Pôles
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400 font-light">
                      Posez vos questions techniques, artistiques ou tarifaires en direct.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsAgentModalOpen(false)}
                  aria-label="Fermer"
                  className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>

              {/* 6 Poles selector pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {poleOptions.map((pole) => {
                  const isActive = selectedPole === pole;
                  const info = POLES_INFO[pole];
                  return (
                    <button
                      key={pole}
                      onClick={() => setSelectedPole(pole)}
                      className={`px-3 py-1.5 rounded-lg font-mono text-xs whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                          : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
                      }`}
                    >
                      <span>{info.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Conversation Message List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#0a0e17]">
              {messages.map((m, idx) => {
                const isUser = m.role === 'user';
                return (
                  <div
                    key={idx}
                    className={`flex gap-3 text-xs sm:text-sm leading-relaxed ${
                      isUser ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {!isUser && (
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Bot className="w-3.5 h-3.5" />
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] rounded-2xl p-4 ${
                        isUser
                          ? 'bg-emerald-500 text-slate-950 font-medium rounded-tr-none'
                          : 'bg-[#0f1523] text-slate-200 border border-white/[0.08] rounded-tl-none font-light'
                      }`}
                    >
                      {!isUser && (
                        <div className="text-[11px] font-mono text-emerald-400 mb-1">
                          Conseiller Arckaton
                        </div>
                      )}
                      <div>{m.text}</div>
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div className="flex gap-3 items-center text-xs text-slate-400">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  </div>
                  <span>Le conseiller prépare votre réponse...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestions Chips */}
            <div className="bg-[#0a0e17] px-4 py-2 border-t border-white/[0.06] overflow-x-auto flex gap-2">
              {quickQuestions[selectedPole].map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(q)}
                  disabled={loading}
                  className="text-[11px] font-mono text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] px-3 py-1.5 rounded-lg whitespace-nowrap transition-all cursor-pointer flex-shrink-0"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Bottom Actions & Input */}
            <div className="p-4 bg-[#0f1523] border-t border-white/[0.08] space-y-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  aria-label={`Votre question au Pôle ${selectedPole}`}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`Posez une question au Pôle ${selectedPole}...`}
                  className="flex-1 bg-[#0a0e17] border border-white/[0.08] rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                />
                <button
                  type="submit"
                  disabled={loading || !inputText.trim()}
                  aria-label="Envoyer la question"
                  className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 p-3 rounded-xl transition-all cursor-pointer shadow-md"
                >
                  <Send className="w-4 h-4" aria-hidden="true" />
                </button>
              </form>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                <button
                  type="button"
                  onClick={handleGenerateReport}
                  className="text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{reportGenerated ? 'Synthèse transmise à l\'équipe !' : 'Générer une synthèse'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsAgentModalOpen(false);
                    setIsQuoteModalOpen(true);
                  }}
                  className="text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 cursor-pointer"
                >
                  <span>Configurer un devis</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
