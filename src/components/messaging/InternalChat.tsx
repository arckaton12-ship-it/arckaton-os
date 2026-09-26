import React, { useState } from 'react';
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
  ShieldCheck 
} from 'lucide-react';

export const InternalChat: React.FC = () => {
  const { messages, sendMessage } = useApp();
  const { user } = useAuth();

  const [activeChannel, setActiveChannel] = useState<string>('c-general');
  const [content, setContent] = useState('');

  const channels: Array<{ id: string; name: string; pole?: Pole; desc: string; isPrivate?: boolean }> = [
    { id: 'c-general', name: 'général', desc: 'Annonces globales, cohésion et vie de l\'agence' },
    { id: 'c-direction', name: 'direction-stratégie', pole: 'Direction', desc: 'Arbitrages budgétaires et suivi des marges', isPrivate: true },
    { id: 'c-tech', name: 'tech-architecture', pole: 'Tech', desc: 'ARKA-PME, passerelles Mobile Money et intégrations' },
    { id: 'c-creatif', name: 'studio-créatif', pole: 'Creatif', desc: 'Chartes, motion design et préparation des shootings' },
    { id: 'c-digital', name: 'growth-digital', pole: 'Digital', desc: 'Campagnes Google/Meta Ads et SEO local' },
    { id: 'c-client', name: 'terrain-activations', pole: 'Client', desc: 'Coordination des 9 sorties terrain mensuelles' },
  ];

  const currentChannelInfo = channels.find(c => c.id === activeChannel) || channels[0];

  const channelMessages = messages.filter(m => m.channel_id === activeChannel);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    sendMessage(activeChannel, content.trim());
    setContent('');
  };

  return (
    <div className="bg-[#0a122e] border border-white/10 rounded-3xl overflow-hidden flex flex-col md:flex-row h-[calc(100vh-180px)] min-h-[550px] animate-fadeIn">
      
      {/* Channels Sidebar */}
      <div className="w-full md:w-64 bg-[#070c1e] border-r border-white/10 flex flex-col justify-between">
        
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
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
              const isActive = activeChannel === ch.id;
              const poleColor = ch.pole ? POLE_COLORS[ch.pole] : null;

              return (
                <button
                  key={ch.id}
                  onClick={() => setActiveChannel(ch.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-600/20 text-white border border-blue-500/40 font-bold'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {ch.isPrivate ? (
                      <Lock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    ) : (
                      <Hash className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
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
        <div className="p-3 border-t border-white/10 bg-[#060a18] flex items-center gap-2.5">
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
      <div className="flex-1 flex flex-col justify-between bg-[#0a122e]">
        
        {/* Channel Header */}
        <div className="p-4 border-b border-white/10 bg-[#09122a] flex items-center justify-between">
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
              <p className="text-[11px] text-slate-400 font-mono">
                {currentChannelInfo.desc}
              </p>
            </div>
          </div>

          <div className="text-[11px] font-mono text-slate-400 hidden sm:flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Chiffrement Interne Arckaton OS</span>
          </div>
        </div>

        {/* Message Feed */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {channelMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400 space-y-2">
              <MessageSquare className="w-8 h-8 opacity-40 text-blue-400" />
              <p className="text-xs font-mono">Aucun message dans ce canal pour l'instant.</p>
              <p className="text-[11px] text-slate-400">Soyez le premier à poster une note de service ou une mise à jour d'équipe.</p>
            </div>
          ) : (
            channelMessages.map((m) => {
              const isMe = m.sender_name === user.name;
              const poleColor = POLE_COLORS[m.pole] || POLE_COLORS.Tech;

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
                      <span className="text-[11px] text-slate-400">({m.sender_role})</span>
                      <span className="text-[11px] text-slate-400">{m.created_at}</span>
                    </div>

                    <div className={`p-3 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                      isMe
                        ? 'bg-blue-600 text-white rounded-tr-none'
                        : 'bg-[#070c1e] text-slate-200 border border-white/10 rounded-tl-none'
                    }`}>
                      {m.content}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Message Input Form */}
        <form onSubmit={handleSend} className="p-4 border-t border-white/10 bg-[#09122a]">
          <div className="flex items-center gap-2 bg-[#070c1e] border border-white/10 rounded-2xl px-4 py-2 focus-within:border-blue-500 transition-colors">
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

    </div>
  );
};
