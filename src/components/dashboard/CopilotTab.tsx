import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { 
  Sparkles, 
  Bot, 
  Send, 
  FileText, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Copy, 
  Printer, 
  RefreshCw,
  Calendar,
  Zap,
  ArrowRight
} from 'lucide-react';
import { AgentReport } from '../../types';
import { ReportPreviewSkeleton, ChatResponseSkeleton } from './DashboardSkeleton';

export const CopilotTab: React.FC = () => {
  const { leads, tasks, agentReports, addAgentReport, currentUser, projets, chiffreAffairesReel } = useApp();

  const [generatingReport, setGeneratingReport] = useState(false);
  const [selectedReport, setSelectedReport] = useState<AgentReport | null>(agentReports[0] || null);

  // Copilot Chat State
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    {
      role: 'assistant',
      text: "Bonjour ! Je suis le Copilote Stratégique d'Arckaton OS, branché sur vos données en temps réel : pipeline des prospects, tâches, devis et contacts arrivés par le site. Je suis en lecture seule — j'analyse et je conseille, mais je ne modifie rien moi-même. Que voulez-vous examiner ?"
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [copied, setCopied] = useState(false);
const [aiEnabled, setAiEnabled] = useState<boolean | null>(null);

  // 1-Click AI Strategic Report Generation
  const handleGenerateReport = async () => {
    setGeneratingReport(true);

    try {
      const res = await fetch('/api/ai/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pole: 'Direction',
          leadsContext: leads.map(l => ({
            name: l.name,
            project: l.project_type,
            budget: l.budget,
            statut: l.statut,
            country: l.country
          })),
          tasksContext: tasks.map(t => ({
            title: t.title,
            pole: t.pole,
            status: t.status,
            priority: t.priority
          }))
        })
      });

      const data = await res.json();
      
      const newReport: AgentReport = {
        id: `report-${Date.now()}`,
        title: data.title || `Rapport Stratégique Hebdomadaire — ${new Date().toLocaleDateString('fr-FR')}`,
        pole: 'Direction',
        lead_name: 'Audit Global Pipeline & Opérations',
        summary: data.summary,
        recommendations: data.recommendations || [
          'Relancer en priorité les 3 prospects ayant demandé le Forfait Synergie sur WhatsApp',
          'Accélérer la validation du module Mobile Money v2 par le Pôle Tech',
          'Planifier la captation vidéo de jeudi pour Maison Kotto (Pôle Créatif)'
        ],
        forfait_recommande: data.forfait_recommande || 'Synergie (750k FCFA)',
        created_at: new Date().toISOString()
      };

      addAgentReport(newReport);
      setSelectedReport(newReport);
    } catch (err) {
      // Repli local : on ne fabrique aucun chiffre. Le copilote IA est
      // indisponible, le rapport ne contient que l'etat reel de l'OS et
      // le dit explicitement.
      const caReel = chiffreAffairesReel;
      const fallbackReport: AgentReport = {
        id: `report-${Date.now()}`,
        title: `État des opérations — ${new Date().toLocaleDateString('fr-FR')}`,
        pole: 'Direction',
        lead_name: 'Synthèse automatique (IA indisponible)',
        summary:
          `Copilote IA indisponible : aucun rapport automatique n'a pu être produit. ` +
          `État réel au moment de la demande : ${leads.length} prospect(s) au pipeline ` +
          `(${leads.filter((l) => l.statut === 'nouveau').length} nouveau(s), ` +
          `${leads.filter((l) => l.statut === 'converti').length} converti(s)), ` +
          `${tasks.length} tâche(s) dont ${tasks.filter((t) => (t.status || t.statut) !== 'termine').length} non terminée(s), ` +
          `${projets.length} projet(s). ` +
          `Volume facturé : ${caReel > 0 ? caReel.toLocaleString('fr-FR') + ' FCFA' : '0 FCFA (aucune facture enregistrée)'}.`,
        recommendations: [
          'Configurer la clé Gemini dans les variables du serveur pour réactiver le copilote (onglet Paramètres).',
          'Renseigner vos factures dans CRM pour que le volume facturé reflète votre activité réelle.',
          'Traiter les prospects au statut « nouveau » : ils ne sont encore jamais contactés.'
        ],
        forfait_recommande: '—',
        created_at: new Date().toISOString()
      };
      addAgentReport(fallbackReport);
      setSelectedReport(fallbackReport);
    } finally {
      setGeneratingReport(false);
    }
  };

  // Copilot Chat Handler
  const handleSendChat = async (presetText?: string) => {
    const text = presetText || chatInput;
    if (!text.trim() || chatLoading) return;

    const newMsgs = [...chatMessages, { role: 'user' as const, text }];
    setChatMessages(newMsgs);
    if (!presetText) setChatInput('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('arckaton_os_token')
            ? { Authorization: `Bearer ${localStorage.getItem('arckaton_os_token')}` }
            : {}),
        },
        body: JSON.stringify({
          query: text,
          message: text,
          pole: currentUser?.pole || 'Direction',
          role: currentUser?.poste_titre || currentUser?.role,
          pathname: 'Copilote IA',
          // Les tours precedents evitent que le modele resserve la meme
          // reponse : sans historique, chaque question repartait de zero.
          history: chatMessages.slice(-6).map((m) => ({ role: m.role, text: m.text })),
          leadsSummary: {
            total: leads.length,
            nouveaux: leads.filter(l => l.statut === 'nouveau').length,
            convertis: leads.filter(l => l.statut === 'converti').length
          },
          tasksSummary: {
            total: tasks.length,
            urgentes: tasks.filter(t => t.priority === 'urgente' && t.status !== 'termine').length
          }
        })
      });

      const data = await res.json();
      // Le serveur peut renvoyer `reply` (IA) ou `advice` (base de connaissances)
      const reply: string = data.reply || data.advice || '';
      if (!reply) throw new Error('Réponse vide du copilote');
      if (data.aiEnabled === false) setAiEnabled(false);
      setChatMessages([...newMsgs, { role: 'assistant', text: reply }]);
    } catch (err) {
      setChatMessages([
        ...newMsgs,
        {
          role: 'assistant',
          text:
            `Le copilote IA est indisponible, je ne peux donc pas produire d'analyse chiffrée sans inventer de données. ` +
            `Ce que je peux confirmer depuis l'OS : ${leads.length} prospect(s) au pipeline, ${tasks.length} tâche(s), ` +
            `${projets.length} projet(s), et un volume facturé de ` +
            `${chiffreAffairesReel > 0 ? chiffreAffairesReel.toLocaleString('fr-FR') + ' FCFA' : '0 FCFA'}. ` +
            `Pour une analyse réelle, ajoutez la clé Gemini dans les paramètres du serveur.`
        }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const copyReportText = () => {
    if (!selectedReport) return;
    const text = `${selectedReport.title}\n\nSYNTHÈSE EXÉCUTIVE :\n${selectedReport.summary}\n\nRECOMMANDATIONS STRATÉGIQUES :\n${selectedReport.recommendations.map((r, i) => `${i+1}. ${r}`).join('\n')}\n\nFORFAIT RECOMMANDÉ : ${selectedReport.forfait_recommande}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const quickCopilotPrompts = [
    "Quels leads relancer en priorité aujourd'hui ?",
    "Rédige un message WhatsApp de closing pour le Forfait Synergie",
    "Analyse notre rentabilité et nos devis en cours",
    "Goulots d'étranglement actuels sur le Pôle Tech ?"
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Top Special Feature Banner */}
      <div className="bg-gradient-to-r from-[#0d1e57] via-[#0a0f2e] to-[#0d1e57] border-2 border-emerald-500/40 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-300 font-mono text-xs px-3 py-1 rounded-full border border-emerald-500/40">
            <Sparkles className="w-3.5 h-3.5 animate-spin" />
            <span>Signature Exclusive Arckaton OS • Intelligence Décisionnelle</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white">
            Copilote Stratégique & Générateur de Rapports IA
          </h2>
          <p className="text-rk-text-secondary text-xs sm:text-sm max-w-2xl leading-relaxed">
            Un centre de commandement assisté par intelligence artificielle pour auditer vos opérations en 1 clic, déceler les opportunités commerciales et guider les 6 pôles de l'agence.
          </p>
        </div>

        <button
          onClick={handleGenerateReport}
          disabled={generatingReport}
          className="bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 disabled:opacity-60 text-slate-950 font-bold px-6 py-3.5 rounded-2xl text-xs transition-all flex items-center gap-2.5 shadow-xl shadow-emerald-500/25 cursor-pointer flex-shrink-0"
        >
          {generatingReport ? (
            <>
              <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping" />
              <span>Synthèse de l'audit en cours...</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 fill-slate-950" />
              <span>Générer le Rapport Stratégique (1 Clic)</span>
            </>
          )}
        </button>
      </div>

      {/* Main Split: Left AI Reports Viewer, Right Interactive Copilot Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: AI Reports Section */}
        <div className="lg:col-span-6 space-y-6">
          
          <div className="bg-rk-panel border border-rk-line rounded-3xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-rk-line pb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <h3 className="font-serif text-lg font-bold text-white">
                  Rapports Stratégiques IA
                </h3>
              </div>
              <span className="text-xs font-mono text-rk-muted">
                {agentReports.length} rapports archivés
              </span>
            </div>

            {/* List of Report Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {agentReports.map((rep) => (
                <button
                  key={rep.id}
                  onClick={() => setSelectedReport(rep)}
                  className={`px-3 py-2 rounded-xl text-xs font-mono whitespace-nowrap transition-all cursor-pointer border ${
                    selectedReport?.id === rep.id
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-semibold'
                      : 'bg-rk-bg border-rk-line-soft text-rk-muted hover:text-white'
                  }`}
                >
                  {rep.title.slice(0, 30)}...
                </button>
              ))}
            </div>

            {/* Active Report View (or Skeleton Loader when generating) */}
            {generatingReport ? (
              <div className="bg-rk-bg border border-rk-line-soft rounded-2xl p-5">
                <div className="text-xs font-mono text-emerald-400 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Le Copilote génère la structure décisionnelle...</span>
                </div>
                <ReportPreviewSkeleton />
              </div>
            ) : selectedReport ? (
              <div className="bg-rk-bg border border-rk-line-soft rounded-2xl p-5 space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-serif text-base font-bold text-white">
                      {selectedReport.title}
                    </h4>
                    <div className="flex items-center gap-2 text-[11px] font-mono text-rk-muted mt-1">
                      <span>Pôle : {selectedReport.pole}</span>
                      <span>•</span>
                      <span>{new Date(selectedReport.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={copyReportText}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-rk-text-secondary transition-colors"
                      title="Copier le rapport"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-rk-text-secondary transition-colors"
                      title="Imprimer / Exporter PDF"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {copied && (
                  <div className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-md">
                    ✓ Rapport copié dans le presse-papiers !
                  </div>
                )}

                <div className="space-y-3 text-xs text-rk-text-secondary leading-relaxed">
                  <div className="space-y-1">
                    <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-400 font-bold">
                      Synthèse Exécutive :
                    </span>
                    <p className="whitespace-pre-line bg-rk-panel p-3.5 rounded-xl border border-rk-line-soft">
                      {selectedReport.summary}
                    </p>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-mono uppercase tracking-widest text-amber-300 font-bold">
                      Recommandations Prioritaires :
                    </span>
                    <ul className="space-y-2">
                      {selectedReport.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2.5 bg-rk-panel p-3 rounded-xl border border-rk-line-soft">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {selectedReport.forfait_recommande && (
                    <div className="pt-2 flex items-center justify-between p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/20">
                      <span className="text-rk-text-secondary font-medium">Forfait Recommandé par l'IA :</span>
                      <span className="font-mono text-emerald-300 font-bold">{selectedReport.forfait_recommande}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

          </div>

        </div>

        {/* Right: Live Interactive Copilot Chat */}
        <div className="lg:col-span-6 space-y-6">
          
          <div className="bg-rk-panel border border-rk-line rounded-3xl p-6 h-full flex flex-col justify-between">
            
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-rk-line pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-bold text-white">
                      Copilote Décisionnel
                    </h3>
                    <p className="text-[11px] text-rk-muted font-mono">
                      Conseiller IA interne • Branché sur votre base en temps réel
                    </p>
                  </div>
                </div>

                <span className={`w-2.5 h-2.5 rounded-full ${aiEnabled === false ? 'bg-amber-400' : 'bg-emerald-400'} animate-pulse`} />
              </div>

              {aiEnabled === false && (
                <div className="flex items-start gap-2.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-3 text-[11px] text-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong className="font-semibold">IA non configurée.</strong> Le copilote répond actuellement
                    avec la base de connaissances interne. Ajoutez la variable <code className="font-mono">GEMINI_API_KEY</code>{' '}
                    côté serveur pour activer les réponses générées.
                  </span>
                </div>
              )}

              {/* Chat Message Scroll Area */}
              <div className="space-y-3 max-h-[380px] overflow-y-auto p-2 bg-rk-bg rounded-2xl border border-rk-line-soft">
                {chatMessages.map((m, idx) => {
                  const isUser = m.role === 'user';
                  return (
                    <div
                      key={idx}
                      className={`flex gap-2.5 text-xs sm:text-sm ${
                        isUser ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`p-3.5 rounded-2xl max-w-[85%] leading-relaxed ${
                          isUser
                            ? 'bg-blue-600 text-white rounded-tr-none font-medium'
                            : 'bg-rk-panel text-rk-text border border-rk-line rounded-tl-none'
                        }`}
                      >
                        <p className="whitespace-pre-line">{m.text}</p>
                      </div>
                    </div>
                  );
                })}

                {chatLoading && <ChatResponseSkeleton />}
              </div>

              {/* Quick Prompts */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-mono text-rk-muted">Questions stratégiques rapides :</span>
                <div className="flex flex-wrap gap-1.5">
                  {quickCopilotPrompts.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendChat(p)}
                      className="text-[11px] bg-white/5 hover:bg-white/10 text-rk-text-secondary px-2.5 py-1 rounded-lg border border-rk-line-soft transition-colors cursor-pointer"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendChat();
              }}
              className="pt-4 flex items-center gap-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Posez une question stratégique au Copilote Arckaton..."
                className="flex-1 bg-rk-bg border border-rk-line rounded-xl px-4 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
              />
              <button
                type="submit"
                disabled={chatLoading || !chatInput.trim()}
                className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 p-3 rounded-xl transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

          </div>

        </div>

      </div>

    </div>
  );
};
