import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { Pole, POLE_COLORS, ChannelMessage } from '../../types';
import { 
  MessageSquare, 
  Send, 
  Hash, 
  Users, 
  Lock, 
  Smile, 
  Paperclip, 
  Clock,
  ShieldCheck,
  Trash2,
  X,
  Play
} from 'lucide-react';
import { useDialogA11y } from '../../hooks/useDialogA11y';

// Scenarios de simulation : chaque etape est ecrite par le membre suivant
const SIM_SCENARIOS: Array<{ id: string; label: string; hint: string; steps: string[] }> = [
  {
    id: 'relais',
    label: 'Passage de relais projet',
    hint: 'Tech transmet la maquette au Creatif puis au Client',
    steps: [
      'Maquette de la page vitrine integree sur la branche de test, aucun souci bloquant. Je la passe en revue ce soir.',
      'Recu, je retravaille le hero et les visuels produits pour qu\'on ait la V2 avant la presentation client.',
      'Version prete pour validation. Merci d\'ajouter le numero de telephone sur le pied de page.',
      'Telephone ajoute et test du parcours de prise de contact effectue, tout remonte correctement.'
    ]
  },
  {
    id: 'ajustement',
    label: 'Ajustement budgetaire',
    hint: 'Le Client demande un extra, la Direction arbitre',
    steps: [
      'Le client souhaite ajouter une campagne Meta Ads sur le prochain projet, hors devis initial.',
      'Je chiffre l\'option en jours-homme : 3 jours Tech et 2 jours Digital, a valider avant de relancer le client.',
      'Valide au forfait, on absorbe sur la marge du projet. Je mets a jour le suivi commercial.',
      'Client informe de l\'option et de l\'impact budgetaire, il confirme la signature aujourd\'hui.'
    ]
  },
  {
    id: 'blocage',
    label: 'Blocage technique + escalade',
    hint: 'Un blocage remonte, arbitrage puis resolution',
    steps: [
      'Blocage sur la passerelle de paiement : le webhook de confirmation ne remonte plus chez le client.',
      'Je remonte le detail a la Direction, on est a deux jours du lancement et sans solution de repli.',
      'On active le mode degrade (paiement a la livraison) en attendant, et je Mobilise le prestataire externalise.',
      'Mode degrade en production chez le client, aucun impact utilisateur. Correctif webhook planifie vendredi.'
    ]
  },
  {
    id: 'terrain',
    label: 'Sortie terrain + activation',
    hint: 'Le Client planifie, le Digital declenche, la Tech surveille',
    steps: [
      'Sortie terrain confirmee pour samedi, 60 flyers et 2 roll-up a imprimer avant vendredi midi.',
      'Publicite geolocalisee programmee samedi matin, budget 35 000 FCFA sur 4 jours.',
      'Point technique : la connexion 4G est faible sur le spot, je prevois une box de secours et un cache hors-ligne.',
      'Activation terminee, 142 contacts collectes sur place, photos et chiffres envoyes au client.'
    ]
  }
];

export const InternalChat: React.FC = () => {
  const { messages, sendMessage, osMembers, simulateExchange, setActiveChannel, deleteMessage } = useApp();
  const { user } = useAuth();

  const [channel, setChannel] = useState<string>('c-general');
  const [content, setContent] = useState('');

  // Le contexte rafraîchit le canal affiché depuis la base. Sans ce signal,
  // un message posté par un collègue n'apparaît qu'au rechargement de la page.
  useEffect(() => {
    setActiveChannel(channel);
  }, [channel, setActiveChannel]);

  // Simulateur d'echanges multi-membres
  const [isSimOpen, setIsSimOpen] = useState(false);
  const dialogRef = useDialogA11y<HTMLDivElement>(isSimOpen, () => setIsSimOpen(false));
  const [simScenario, setSimScenario] = useState<string>(SIM_SCENARIOS[0].id);
  const [simParticipants, setSimParticipants] = useState<string[]>([]);

  const channels: Array<{ id: string; name: string; pole?: Pole; desc: string; isPrivate?: boolean }> = [
    { id: 'c-general', name: 'général', desc: 'Annonces globales, cohésion et vie de l\'agence' },
    { id: 'c-direction', name: 'direction-stratégie', pole: 'Direction', desc: 'Arbitrages budgétaires et suivi des marges', isPrivate: true },
    { id: 'c-tech', name: 'tech-architecture', pole: 'Tech', desc: 'ARKA-PME, passerelles Mobile Money et intégrations' },
    { id: 'c-creatif', name: 'studio-créatif', pole: 'Creatif', desc: 'Chartes, motion design et préparation des shootings' },
    { id: 'c-digital', name: 'growth-digital', pole: 'Digital', desc: 'Campagnes Google/Meta Ads et SEO local' },
    { id: 'c-client', name: 'terrain-activations', pole: 'Client', desc: 'Coordination des 9 sorties terrain mensuelles' },
  ];

  const currentChannelInfo = channels.find(c => c.id === channel) || channels[0];

  const channelMessages = messages.filter(m => m.channel_id === channel);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    sendMessage(channel, content.trim());
    setContent('');
  };

  const previewSteps = useMemo(
    () => SIM_SCENARIOS.find((s) => s.id === simScenario)?.steps || [],
    [simScenario]
  );

  const handleRunSimulation = () => {
    if (simParticipants.length < 2) return;
    const scenario = SIM_SCENARIOS.find((s) => s.id === simScenario);
    if (!scenario) return;

    const participants = simParticipants
      .map((name) => osMembers.find((m) => m.name === name))
      .filter((m): m is (typeof osMembers)[number] => Boolean(m))
      .map((m) => ({ id: m.id, name: m.name, role: m.poste_titre || m.role, pole: m.pole }));

    if (participants.length < 2) return;

    const count = simulateExchange(participants, channel, scenario.steps);
    if (count > 0) {
      setIsSimOpen(false);
      setSimParticipants([]);
    }
  };

  return (
    <div className="bg-rk-panel border border-rk-line rounded-3xl overflow-hidden flex flex-col md:flex-row h-[calc(100vh-180px)] min-h-[550px] animate-fadeIn">
      
      {/* Channels Sidebar */}
      <div className="w-full md:w-64 bg-rk-bg border-r border-rk-line flex flex-col justify-between">
        
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-rk-line pb-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-400" />
              <h3 className="font-serif text-sm font-bold text-white">Canaux Agence</h3>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Direct
            </span>
          </div>

          <div className="space-y-1">
            {channels.map((ch) => {
              const isActive = channel === ch.id;
              const poleColor = ch.pole ? POLE_COLORS[ch.pole] : null;

              return (
                <button
                  key={ch.id}
                  onClick={() =>  setChannel( ch.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-600/20 text-white border border-blue-500/40 font-bold'
                      : 'text-rk-muted hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {ch.isPrivate ? (
                      <Lock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    ) : (
                      <Hash className="w-3.5 h-3.5 text-rk-muted flex-shrink-0" />
                    )}
                    <span className="truncate">{ch.name}</span>
                  </div>

                  {ch.pole && (
                    <span className={`text-[9px] px-1.5 py-0.2 rounded ${poleColor?.bg} ${poleColor?.text}`}>
                      {ch.pole.slice(0, 4)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* User presence footer */}
        <div className="p-3 border-t border-rk-line bg-rk-inset flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-[11px] font-mono font-bold text-blue-300">
            {user.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="text-left overflow-hidden">
            <div className="text-xs font-semibold text-white truncate">{user.name}</div>
            <div className="text-[11px] font-mono text-emerald-400 truncate flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-emerald-400" />
              <span>En ligne • {user.poste_titre || user.role}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col justify-between bg-rk-panel">
        
        {/* Channel Header */}
        <div className="p-4 border-b border-rk-line bg-rk-chrome flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hash className="w-5 h-5 text-blue-400" />
            <div>
              <h4 className="font-serif text-sm font-bold text-white flex items-center gap-2">
                <span>{currentChannelInfo.name}</span>
                {currentChannelInfo.pole && (
                  <span className={`text-[11px] font-mono px-2 py-0.5 rounded border ${POLE_COLORS[currentChannelInfo.pole].bg} ${POLE_COLORS[currentChannelInfo.pole].text} ${POLE_COLORS[currentChannelInfo.pole].border}`}>
                    Pôle {currentChannelInfo.pole}
                  </span>
                )}
              </h4>
              <p className="text-[11px] text-rk-muted font-mono">
                {currentChannelInfo.desc}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSimOpen(true)}
              className="flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-300 transition-colors cursor-pointer"
              title="Simuler un échange entre plusieurs membres pour tester les flux"
            >
              <Users className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Simuler un échange multi-membres</span>
              <span className="sm:hidden">Simuler</span>
            </button>
            <div className="text-[11px] font-mono text-rk-muted hidden md:flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Chiffrement Interne Arckaton OS</span>
            </div>
          </div>
        </div>

        {/* Message Feed */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {channelMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-rk-muted space-y-2">
              <MessageSquare className="w-8 h-8 opacity-40 text-blue-400" />
              <p className="text-xs font-mono">Aucun message dans ce canal pour l'instant.</p>
              <p className="text-[11px] text-rk-muted">Soyez le premier à poster une note de service ou une mise à jour d'équipe.</p>
            </div>
          ) : (
            channelMessages.map((m) => {
              // Compare les identifiants, pas les noms : deux collegues
              // portant le meme nom ne doivent pas voir le message de l autre
              // passer pour le leur.
              const isMe = m.sender_id === user.id;
              const poleColor = POLE_COLORS[m.pole] || POLE_COLORS.Tech;
              const parMoi = m.sender_id === user.id || user.role === 'admin' || user.poste_id === 'p1';

              return (
                <div
                  key={m.id}
                  className={`flex items-start gap-3 ${isMe ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-mono font-bold flex-shrink-0 ${
                    isMe
                      ? 'bg-blue-600 text-white'
                      : `${poleColor.bg} ${poleColor.text} border ${poleColor.border}`
                  }`}>
                    {m.sender_name.charAt(0)}
                  </div>

                  <div className={`space-y-1 max-w-[80%] ${isMe ? 'text-right' : 'text-left'}`}>
                    <div className="flex items-center gap-2 text-[11px] font-mono">
                      <span className="font-bold text-white">{m.sender_name}</span>
                      <span className="text-[11px] text-rk-muted">({m.sender_role})</span>
                      <span className="text-[11px] text-rk-muted">{m.created_at}</span>
                    </div>

                    <div className="group/bulle relative">
                      <div className={`p-3 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                        isMe
                          ? 'bg-blue-600 text-white rounded-tr-none'
                          : 'bg-rk-bg text-rk-text border border-rk-line rounded-tl-none'
                      }`}>
                        {m.content}
                      </div>
                      {parMoi && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('Supprimer ce message ?')) deleteMessage(m.id);
                          }}
                          title="Supprimer ce message"
                          aria-label="Supprimer ce message"
                          className="absolute -top-2 right-0 opacity-0 group-hover/bulle:opacity-100 focus:opacity-100 transition-opacity p-1 rounded-md bg-rk-bg border border-rk-line text-rk-muted hover:text-red-400 hover:border-red-500/40"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Message Input Form */}
        <form onSubmit={handleSend} className="p-4 border-t border-rk-line bg-rk-chrome">
          <div className="flex items-center gap-2 bg-rk-bg border border-rk-line rounded-2xl px-4 py-2 focus-within:border-blue-500 transition-colors">
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`Envoyer un message sur #${currentChannelInfo.name}...`}
              className="flex-1 bg-transparent text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none"
            />

            <button
              type="submit"
              disabled={!content.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white p-2 rounded-xl transition-all cursor-pointer flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>

      </div>

      {/* Simulateur d'échange multi-membres */}
      {isSimOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-backdrop-in">
          <div
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Simulateur d'échange multi-membres"
            className="bg-rk-panel border border-amber-500/25 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden outline-none animate-modal-in"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-rk-line">
              <div>
                <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" />
                  Simuler un échange multi-membres
                </h3>
                <p className="text-[11px] text-rk-muted font-mono mt-0.5">
                  Vérifie la circulation des flux entre pôles (la console de l'organigramme recording automatiquement)
                </p>
              </div>
              <button
                onClick={() => setIsSimOpen(false)}
                aria-label="Fermer"
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-rk-muted hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-[11px] font-mono text-rk-text-secondary uppercase mb-2">Canal de destination</label>
                <select
                  value={channel}
                  onChange={(e) =>  setChannel( e.target.value)}
                  className="w-full bg-rk-bg border border-rk-line rounded-xl px-3 py-2 text-xs text-white"
                >
                  {channels.map((c) => (
                    <option key={c.id} value={c.id}>#{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-rk-text-secondary uppercase mb-2">Scénario</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SIM_SCENARIOS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSimScenario(s.id)}
                      className={`text-left p-3 rounded-xl border transition-colors cursor-pointer ${
                        simScenario === s.id
                          ? 'border-amber-400/50 bg-amber-500/10'
                          : 'border-rk-line bg-rk-bg hover:border-rk-line-bold'
                      }`}
                    >
                      <div className="text-xs font-semibold text-white">{s.label}</div>
                      <div className="text-[11px] text-rk-muted mt-0.5 leading-snug">{s.hint}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-rk-text-secondary uppercase mb-2">
                  Membres participants ({simParticipants.length} sélectionné(s))
                </label>
                {osMembers.length === 0 ? (
                  <p className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                    Aucun membre enregistré pour le moment. Ajoutez votre équipe dans l'onglet Équipe : les participants
                    apparaîtront ici automatiquement.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {osMembers.map((m) => {
                      const active = simParticipants.includes(m.name);
                      return (
                        <button
                          key={m.id}
                          onClick={() =>
                            setSimParticipants((prev) =>
                              prev.includes(m.name) ? prev.filter((n) => n !== m.name) : [...prev, m.name]
                            )
                          }
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono border transition-colors cursor-pointer ${
                            active
                              ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                              : 'bg-rk-bg border-rk-line text-rk-text-secondary hover:border-rk-line-bold'
                          }`}
                        >
                          {m.name} · {m.pole}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] font-mono text-rk-muted">
                  {previewSteps.length} message(s) seront générés en alternance
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsSimOpen(false)}
                    className="px-4 py-2 text-xs text-rk-muted hover:text-white cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleRunSimulation}
                    disabled={simParticipants.length < 2}
                    className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-2 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Lancer la simulation</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
