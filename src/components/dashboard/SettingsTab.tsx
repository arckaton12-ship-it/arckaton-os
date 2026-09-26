import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Settings, ShieldCheck, Key, Database, Globe, Phone, Mail, MapPin, RefreshCw, CheckCircle2 } from 'lucide-react';
import { OFFICIAL_KNOWLEDGE, FORFAITS_DATA } from '../../data/mockData';

export const SettingsTab: React.FC = () => {
  const { leads, tasks, agentReports } = useApp();
  const [waNumber, setWaNumber] = useState(OFFICIAL_KNOWLEDGE.agency.phone);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl">
      
      {/* Header */}
      <div className="bg-[#0a0f2e] border border-white/10 p-6 rounded-3xl">
        <h2 className="font-serif text-2xl font-bold text-white flex items-center gap-2.5">
          <Settings className="w-5 h-5 text-emerald-400" />
          <span>Paramètres & Infrastructure Arckaton OS</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Configuration de l'agence, passerelles de notification, et état des connexions logicielles.
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* System & AI Health */}
        <div className="bg-[#0a0f2e] border border-white/10 p-6 rounded-3xl space-y-4">
          <h3 className="font-serif text-base font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>État des Services & IA</span>
          </h3>

          <div className="space-y-3 text-xs divide-y divide-white/5">
            <div className="pt-2 flex items-center justify-between">
              <span className="text-slate-300">Moteur Gemini AI (Server-Side) :</span>
              <span className="text-emerald-400 font-mono flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Opérationnel (gemini-2.5-flash)
              </span>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-slate-300">Méthode 6 Pôles :</span>
              <span className="text-blue-400 font-mono">Chargée & active</span>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-slate-300">Stockage Local (Cockpit) :</span>
              <span className="text-amber-400 font-mono">{leads.length} leads • {tasks.length} tâches</span>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-slate-300">Mode Hors-ligne ARKA-PME :</span>
              <span className="text-emerald-400 font-mono">Compatible PWA / Local</span>
            </div>
          </div>
        </div>

        {/* Agency Info */}
        <div className="bg-[#0a0f2e] border border-white/10 p-6 rounded-3xl space-y-4">
          <h3 className="font-serif text-base font-bold text-white flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-400" />
            <span>Identité & Coordonnées Agence</span>
          </h3>

          <form onSubmit={handleSave} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 font-mono mb-1">Téléphone WhatsApp Principal</label>
              <input
                type="text"
                value={waNumber}
                onChange={(e) => setWaNumber(e.target.value)}
                className="w-full bg-[#070c1e] border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-mono mb-1">Email Agence</label>
              <input
                type="text"
                disabled
                value={OFFICIAL_KNOWLEDGE.agency.email}
                className="w-full bg-[#070c1e] border border-white/5 rounded-xl px-3 py-2 text-slate-400 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-mono mb-1">Bureau Principal</label>
              <input
                type="text"
                disabled
                value={OFFICIAL_KNOWLEDGE.agency.location}
                className="w-full bg-[#070c1e] border border-white/5 rounded-xl px-3 py-2 text-slate-400"
              />
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Enregistrer les paramètres
              </button>

              {saved && (
                <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mis à jour !</span>
                </span>
              )}
            </div>
          </form>
        </div>

      </div>

      {/* Forfaits Review Reference */}
      <div className="bg-[#0a0f2e] border border-white/10 p-6 rounded-3xl space-y-4">
        <h3 className="font-serif text-base font-bold text-white">
          Grille Tarifaire Officielle Référencée
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          {FORFAITS_DATA.map((f) => (
            <div key={f.id} className="p-4 rounded-xl bg-[#070c1e] border border-white/5 space-y-1.5">
              <div className="font-semibold text-white">{f.name}</div>
              <div className="font-serif text-lg font-bold text-emerald-400">{f.creation_price}</div>
              <div className="text-slate-400 text-[11px]">Suivi : {f.monthly_price}</div>
              <div className="text-[10px] font-mono text-slate-500">{f.delai} • {f.retouches}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
