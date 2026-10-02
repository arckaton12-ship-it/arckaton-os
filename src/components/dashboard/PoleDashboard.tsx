import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { POLE_COLORS, TaskStatus } from '../../types';
import { POLES_INFO } from '../../data/mockData';
import {
  FolderKanban, CheckSquare, Users, LogOut, Globe, Sparkles, ChevronUp, ChevronDown,
  CheckCircle2, Clock, TriangleAlert, Loader2
} from 'lucide-react';

export const PoleDashboard: React.FC = () => {
  const { member, logout, user } = useAuth();
  const { setMode, projets, tasks, leads, messages, notifications, updateTaskStatus, osMembers } = useApp();
  const [advice, setAdvice] = useState<string | null>(null);
  const [adviceLoading, setAdviceLoading] = useState(false);
  const [expand, setExpand] = useState<Record<string, boolean>>({});

  const pole = member?.pole || 'Direction';
  const poleInfo = POLES_INFO[pole] || { name: pole, manager: '', color: '#00c97a', desc: '' };
  const colors = POLE_COLORS[pole] || POLE_COLORS.Direction;
  // Responsable du pôle déduit de l'annuaire réel, jamais d'une liste figée.
  const responsablePole = osMembers.find((m) => m.pole === pole && m.role !== 'membre')?.name
    || osMembers.find((m) => m.pole === pole)?.name;

  const poleProjets = projets.filter((p) => p.pole === pole);
  const poleTasks = tasks.filter((t) => t.pole === pole);
  const poleLeads = leads.filter((l) => l.pole_assigned === pole);
  const poleNotifs = notifications.filter((n) => !n.read && (!n.pole || n.pole === pole));
  // Les échanges ne sont PAS cloisonnés par pôle d'expéditeur. Le filtre
  // d'origine (m.pole === pole) cachait le message d'un collegue a celui qui
  // le lisait : ecrit par Tech, il disparaissait du resume du Createur, alors
  // que le scenario de l OS est precisement "Tech transmet la maquette au
  // Creatif puis au Client". Le serveur renvoie deja le contenu du canal
  // demande, le resume se contente de l'afficher.
  const poleMessages = messages;

  const askCopilot = async () => {
    setAdviceLoading(true);
    try {
      const t = localStorage.getItem('arckaton_os_token');
      const res = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(t ? { Authorization: `Bearer ${t}` } : {}),
        },
        // La question inclut l'etat REEL du pole : la version precedente
        // envoyait une chaine figee (« donne-moi mes priorites »), donc le
        // copilote renvoyait la meme reponse a chaque clic. Les compteurs
        // varient avec l'activite, ce qui rend la reponse pertinente.
        body: JSON.stringify({
          pole,
          pathname: '/os/pole',
          role: member?.role || 'membre',
          query:
            `Priorités du pôle ${pole}. État réel : ${poleProjets.length} projet(s), ` +
            `${poleTasks.filter((t) => t.statut !== 'termine').length} tâche(s) ouverte(s) sur ${poleTasks.length}, ` +
            `${poleLeads.length} lead(s) assigné(s). Donne-moi 3 actions concrètes et priorisées pour cette semaine.`,
        }),
      });
      const json = await res.json().catch(() => ({}));
      setAdvice(json.advice || 'Conseil Arckaton OS généré.');
    } catch {
      setAdvice('Conseil indisponible hors-ligne.');
    } finally {
      setAdviceLoading(false);
    }
  };

  const statusBadge = (s?: TaskStatus) => {
    const map: Record<string, string> = {
      a_faire: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
      en_cours: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      revue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      termine: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    };
    return map[s || 'a_faire'] || map.a_faire;
  };

  return (
    <div className="min-h-screen bg-[#070c1e] text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#09122a]/95 backdrop-blur-md border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl ${colors.bg} border ${colors.border} flex items-center justify-center font-serif text-lg font-bold ${colors.text}`}>
            A
          </div>
          <div>
            <div className="font-serif font-bold text-white">
              Dashboard <span className="text-blue-400 font-mono text-xs">• {poleInfo.name}</span>
            </div>
            <div className="text-[11px] font-mono text-emerald-400">
              {user.poste_titre || member?.poste_titre || 'Membre'} — vue filtrée sur votre pôle
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={logout}
            className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 transition-colors cursor-pointer"
            title="Se déconnecter"
          >
            <LogOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMode('public')}
            className="bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs px-3 py-1.5 rounded-xl flex items-center gap-2 font-medium transition-all cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Site Public</span>
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-8 max-w-6xl w-full mx-auto space-y-6">
        {/* Welcome banner */}
        <div className={`bg-[#0b1329] border ${colors.border} rounded-3xl p-6 relative overflow-hidden`}>
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none" style={{ background: `${colors.hex}11` }} />
          <div className={`relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
            <div>
              <h1 className="font-serif text-2xl font-bold text-white">
                Bienvenue, {member?.name?.split(' ')[0]} <span className="text-emerald-400">.</span>
              </h1>
              <p className="text-xs text-slate-400 mt-1 font-light max-w-xl">
                {poleInfo.desc}
                {responsablePole ? ` Responsable : ${responsablePole}.` : ''} Votre espace affiche exclusivement les dossiers, tâches et leads de votre pôle.
              </p>
            </div>
            <div className="flex gap-3">
              <div className="bg-[#070c1e] border border-white/[0.06] rounded-2xl px-4 py-2.5 text-center">
                <div className="text-xl font-bold text-emerald-400 font-serif">{poleProjets.length}</div>
                <div className="text-[11px] font-mono text-slate-400">Projets</div>
              </div>
              <div className="bg-[#070c1e] border border-white/[0.06] rounded-2xl px-4 py-2.5 text-center">
                <div className="text-xl font-bold text-amber-400 font-serif">{poleTasks.filter((t) => t.statut === 'en_cours').length}</div>
                <div className="text-[11px] font-mono text-slate-400">En cours</div>
              </div>
              <div className="bg-[#070c1e] border border-white/[0.06] rounded-2xl px-4 py-2.5 text-center">
                <div className="text-xl font-bold text-blue-400 font-serif">{poleLeads.length}</div>
                <div className="text-[11px] font-mono text-slate-400">Leads pôle</div>
              </div>
            </div>
          </div>
        </div>

        {/* Projects scoped to pole */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <FolderKanban className="w-4 h-4 text-emerald-400" />
            <h2 className="font-serif text-lg font-bold text-white">Projets du Pôle {pole}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {poleProjets.length === 0 && (
              <div className="bg-[#0b1329] border border-white/[0.06] rounded-2xl p-6 text-sm text-slate-400">Aucun projet actif sur votre pôle actuellement.</div>
            )}
            {poleProjets.map((p) => (
              <div key={p.id} className="bg-[#0b1329] border border-white/[0.08] rounded-2xl p-5 hover:border-white/[0.15] transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-emerald-400">{p.client_code || 'PRJ'}</span>
                  <span className={`text-[11px] font-mono px-2 py-0.5 rounded border ${statusBadge(p.statut as any)}`}>{p.statut}</span>
                </div>
                <h3 className="font-serif text-base font-bold text-white mt-2">{p.name}</h3>
                <div className="text-[11px] text-slate-400 mt-0.5">{p.client_name} • {p.service}</div>
                <div className="mt-3">
                  <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                    <span>Progression</span>
                    <span className="text-emerald-400">{p.progression ?? 0}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${p.progression ?? 0}%` }} />
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 text-[11px] font-mono text-slate-400">
                  <Clock className="w-3 h-3" />
                  <span>{p.deadline}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Tasks scoped to pole */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <CheckSquare className="w-4 h-4 text-amber-400" />
            <h2 className="font-serif text-lg font-bold text-white">Tâches de votre pôle</h2>
          </div>
          <div className="bg-[#0b1329] border border-white/[0.08] rounded-2xl divide-y divide-white/[0.05]">
            {poleTasks.length === 0 && (
              <div className="p-6 text-sm text-slate-400">Aucune tâche assignée.</div>
            )}
            {poleTasks.map((t) => {
              const expanded = expand[t.id];
              return (
                <div key={t.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-white flex items-center gap-2">
                        {t.statut === 'termine' && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                        <span>{t.titre || t.title}</span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mt-1">
                        {t.assignee_name || t.assigned_to} • {t.poste_titre} • échéance : {t.date_echeance || t.due_date || '—'}
                      </div>
                      {expanded && t.description && (
                        <p className="text-xs text-slate-300 mt-2 leading-relaxed">{t.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <select
                        value={t.statut}
                        onChange={(e) => updateTaskStatus(t.id, e.target.value as TaskStatus)}
                        className={`text-[11px] font-mono px-2 py-1 rounded-lg bg-[#070c1e] border border-white/10 ${statusBadge(t.statut)}`}
                      >
                        <option value="a_faire">À faire</option>
                        <option value="en_cours">En cours</option>
                        <option value="revue">En revue</option>
                        <option value="termine">Terminé</option>
                      </select>
                      <button
                        onClick={() => setExpand({ ...expand, [t.id]: !expanded })}
                        className="p-1 text-slate-400 hover:text-white cursor-pointer"
                      >
                        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Leads scoped to pole */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-blue-400" />
            <h2 className="font-serif text-lg font-bold text-white">Leads récents du pôle</h2>
          </div>
          <div className="bg-[#0b1329] border border-white/[0.08] rounded-2xl divide-y divide-white/[0.05]">
            {poleLeads.length === 0 && (
              <div className="p-6 text-sm text-slate-400">Aucun lead reçu récemment en attente de traitement.</div>
            )}
            {poleLeads.slice(0, 6).map((l) => (
              <div key={l.id} className="p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-white">{l.name} — <span className="text-emerald-400">{l.project_type}</span></div>
                  <div className="text-[11px] font-mono text-slate-400">{l.phone} • {l.budget || 'Sur devis'}</div>
                </div>
                <span className="text-[11px] font-mono px-2 py-1 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20 flex-shrink-0">{l.statut}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Notifications & Copilot */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-[#0b1329] border border-white/[0.08] rounded-2xl p-6">
            <h2 className="font-serif text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              Alertes & Notifications
            </h2>
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {poleNotifs.length === 0 && (
                <div className="text-sm text-slate-400">Aucune alerte non lue. Tout est au vert.</div>
              )}
              {poleNotifs.slice(0, 8).map((n) => (
                <div key={n.id} className="bg-[#070c1e] border border-white/[0.05] rounded-xl px-4 py-2.5 text-xs">
                  <div className="text-white font-semibold flex items-center gap-1.5">
                    <TriangleAlert className="w-3 h-3 text-amber-400" />
                    {n.title}
                  </div>
                  <div className="text-slate-400 mt-0.5">{n.message}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 bg-[#070c1e] border border-white/[0.05] rounded-xl px-4 py-3 text-xs text-slate-400">
              <span className="text-slate-200">Derniers échanges :</span>{' '}
              {poleMessages.slice(0, 3).map((m) => `[${m.sender_name}] ${m.content}`).join(' • ') || '—'}
            </div>
          </section>

          <section className="bg-[#0b1329] border border-emerald-500/20 rounded-2xl p-6">
            <h2 className="font-serif text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              Copilote IA du Pôle {pole}
            </h2>
            <button
              onClick={askCopilot}
              disabled={adviceLoading}
              className="bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {adviceLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Mes priorités du jour
            </button>
            {advice && (
              <p className="mt-4 text-sm text-slate-200 leading-relaxed bg-[#070c1e] border border-white/[0.06] rounded-xl p-4">
                {advice}
              </p>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};