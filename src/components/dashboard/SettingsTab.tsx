import React, { useEffect, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Settings, ShieldCheck, Database, Globe, RefreshCw, CheckCircle2, Loader2, AlertTriangle, WifiOff, Sparkles } from 'lucide-react';
import { OFFICIAL_KNOWLEDGE, FORFAITS_DATA } from '../../data/mockData';

interface HealthState {
  supabase: { adminClient: boolean; anonClient: boolean; contentItems: number | null; error: string | null };
  ai: { provider: string; model: string; configured: boolean } | null;
}

export const SettingsTab: React.FC = () => {
  const { leads, tasks, projets, isRealDataMode, purgeDemoData, restoreDemoData } = useApp();

  const [health, setHealth] = useState<HealthState | null>(null);
  const [healthError, setHealthError] = useState(false);

  const [agency, setAgency] = useState({
    phone: OFFICIAL_KNOWLEDGE.agency.phone || '',
    email: OFFICIAL_KNOWLEDGE.agency.email || '',
    location: OFFICIAL_KNOWLEDGE.agency.location || '',
  });
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const authHeaders = () => {
    const t = localStorage.getItem('arckaton_os_token') || '';
    return t ? { Authorization: `Bearer ${t}` } : undefined;
  };

  // Etat reel des services : l'onglet annoncait "IA operationnelle" en
  // permanence, meme sans cle configuree.
  useEffect(() => {
    let stopped = false;
    fetch('/api/health')
      .then((r) => r.json())
      .then((json) => {
        if (!stopped) setHealth(json);
      })
      .catch(() => {
        if (!stopped) setHealthError(true);
      });
    return () => {
      stopped = true;
    };
  }, []);

  // Coordonnees persistees
  useEffect(() => {
    let stopped = false;
    const load = async () => {
      try {
        const res = await fetch('/api/settings', { headers: authHeaders() });
        if (!res.ok) return;
        const json = await res.json();
        const s = json.settings || {};
        if (stopped) return;
        setAgency((prev) => ({
          phone: s.agency_phone || prev.phone,
          email: s.agency_email || prev.email,
          location: s.agency_location || prev.location,
        }));
      } catch {
        /* on garde les valeurs par defaut */
      } finally {
        if (!stopped) setLoadingSettings(false);
      }
    };
    load();
    return () => {
      stopped = true;
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(authHeaders() || {}) },
        body: JSON.stringify({
          agency_phone: agency.phone,
          agency_email: agency.email,
          agency_location: agency.location,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Enregistrement impossible');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setSaveError(err.message || 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  };

  const supabaseOk = Boolean(health?.supabase?.adminClient) && !health?.supabase?.error;
  const aiOk = Boolean(health?.ai?.configured);

  const StatusLine: React.FC<{ label: string; ok: boolean | null; children: React.ReactNode }> = ({ label, ok, children }) => (
    <div className="pt-2 flex items-center justify-between gap-3">
      <span className="text-slate-300">{label}</span>
      <span
        className={`font-mono flex items-center gap-1.5 text-right ${
          ok === null ? 'text-slate-400' : ok ? 'text-emerald-400' : 'text-amber-400'
        }`}
      >
        {ok === null ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin" />
            vérification…
          </>
        ) : (
          <>
            <span className={`w-2 h-2 rounded-full ${ok ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            {children}
          </>
        )}
      </span>
    </div>
  );

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl">

      {/* En-tête */}
      <div className="bg-[#0a0f2e] border border-white/10 p-6 rounded-3xl">
        <h2 className="font-serif text-2xl font-bold text-white flex items-center gap-2.5">
          <Settings className="w-5 h-5 text-emerald-400" />
          <span>Paramètres & Infrastructure Arckaton OS</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Configuration de l'agence, état réel des services connectés et bascule des données de démonstration.
        </p>
      </div>

      {/* Grille */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* État des services */}
        <div className="bg-[#0a0f2e] border border-white/10 p-6 rounded-3xl space-y-4">
          <h3 className="font-serif text-base font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>État réel des services</span>
          </h3>

          {healthError ? (
            <div className="flex items-start gap-2 text-[11px] font-mono text-amber-300 bg-amber-500/10 border border-amber-500/25 rounded-xl px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>Impossible de lire l'état du serveur. Les indicateurs ci-dessous ne sont pas vérifiables.</span>
            </div>
          ) : (
            <div className="space-y-3 text-xs divide-y divide-white/5">
              <StatusLine label="Base de données Supabase :" ok={health ? supabaseOk : null}>
                {supabaseOk
                  ? `connectée (${health?.supabase.contentItems ?? '?'} contenus publiés)`
                  : 'non connectée'}
              </StatusLine>

              <StatusLine label="Moteur IA Gemini :" ok={health ? aiOk : null}>
                {aiOk
                  ? `opérationnel (${health?.ai?.model})`
                  : 'non configuré — réponses de secours'}
              </StatusLine>

              <StatusLine label="Méthode 6 Pôles :" ok={null}>
                <span className="text-slate-400">procédures internes</span>
              </StatusLine>

              <StatusLine label="Contenu en mémoire :" ok={null}>
                <span className="text-slate-400">
                  {projets.length} projet(s) • {leads.length} lead(s) • {tasks.length} tâche(s)
                </span>
              </StatusLine>
            </div>
          )}

          {!aiOk && health && (
            <p className="text-[11px] text-slate-400 flex items-start gap-1.5">
              <Sparkles className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-400" />
              <span>
                Sans clé Gemini côté serveur, le copilote et l'agent chat répondent avec des réponses
                préparées. Ajoutez <code className="font-mono text-slate-300">GEMINI_API_KEY</code> sur le
                service Render pour activer l'IA réelle.
              </span>
            </p>
          )}

          {healthError && (
            <p className="text-[11px] text-slate-400 flex items-start gap-1.5">
              <WifiOff className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>Vérifiez la connexion réseau : le diagnostic serveur n'a pas abouti.</span>
            </p>
          )}
        </div>

        {/* Coordonnées de l'agence */}
        <div className="bg-[#0a0f2e] border border-white/10 p-6 rounded-3xl space-y-4">
          <h3 className="font-serif text-base font-bold text-white flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-400" />
            <span>Coordonnées de l'Agence</span>
          </h3>

          {loadingSettings ? (
            <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Chargement des valeurs enregistrées…
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-mono mb-1">Téléphone WhatsApp Principal</label>
                <input
                  type="text"
                  value={agency.phone}
                  onChange={(e) => setAgency({ ...agency, phone: e.target.value })}
                  placeholder="+237 6XX XX XX XX"
                  className="w-full bg-[#070c1e] border border-white/10 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Email Agence</label>
                <input
                  type="text"
                  value={agency.email}
                  onChange={(e) => setAgency({ ...agency, email: e.target.value })}
                  placeholder="contact@..."
                  className="w-full bg-[#070c1e] border border-white/10 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">Bureau Principal</label>
                <input
                  type="text"
                  value={agency.location}
                  onChange={(e) => setAgency({ ...agency, location: e.target.value })}
                  placeholder="Quartier, ville, pays"
                  className="w-full bg-[#070c1e] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              {saveError && (
                <div className="flex items-center gap-2 text-[11px] font-mono text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
                  <AlertTriangle className="w-3.5 h-3.5" /> {saveError}
                </div>
              )}

              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-2"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Enregistrer</span>
                </button>

                {saved && (
                  <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Enregistré sur le serveur</span>
                  </span>
                )}
              </div>
            </form>
          )}
        </div>

      </div>

      {/* Grille tarifaire */}
      <div className="bg-[#0a0f2e] border border-white/10 p-6 rounded-3xl space-y-4">
        <h3 className="font-serif text-base font-bold text-white">
          Grille Tarifaire de Référence
        </h3>
        <p className="text-[11px] text-slate-400">
          Valeurs indicatives communiquées au public. Le chiffrage d'un devis se saisit ligne par ligne
          dans le CRM : rien n'est calculé automatiquement à partir du nom du service.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          {FORFAITS_DATA.map((f) => (
            <div key={f.id} className="p-4 rounded-xl bg-[#070c1e] border border-white/5 space-y-1.5">
              <div className="font-semibold text-white">{f.name}</div>
              <div className="font-serif text-lg font-bold text-emerald-400">{f.creation_price}</div>
              <div className="text-slate-400 text-[11px]">Suivi : {f.monthly_price}</div>
              <div className="text-[11px] font-mono text-slate-400">{f.delai} • {f.retouches}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Données de démonstration */}
      <div className="bg-[#0a0f2e] border border-amber-500/30 p-6 rounded-3xl space-y-4">
        <h3 className="font-serif text-base font-bold text-white flex items-center gap-2 flex-wrap">
          <Database className="w-4 h-4 text-amber-400" />
          <span>Données de démonstration</span>
          <span className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
            isRealDataMode
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
          }`}>
            {isRealDataMode ? 'MODE DONNÉES RÉELLES' : 'MODE DÉMO ACTIF'}
          </span>
        </h3>

        <p className="text-xs text-slate-400 leading-relaxed">
          Les données fictives de démonstration (projets, leads, tâches, notifications, messagerie, agenda,
          rapports IA, réalisations, témoignages, articles) sont retirées de cet appareil. Vos données réelles
          (leads reçus via le site, membres, projets et devis enregistrés sur Supabase) sont conservées.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          {!isRealDataMode ? (
            <button
              onClick={() => {
                if (confirm("Vider toutes les données de démonstration de cet appareil ? (Action irréversible)")) {
                  purgeDemoData();
                }
              }}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Vider les données de démonstration</span>
            </button>
          ) : (
            <button
              onClick={() => {
                if (confirm("Réafficher les données de démonstration (fixtures) ?")) {
                  restoreDemoData();
                }
              }}
              className="bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/10 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-300" />
              <span>Restaurer les données de démonstration</span>
            </button>
          )}
          <span className="text-[11px] font-mono text-slate-400">
            {projets.length} projet(s) • {leads.length} lead(s) • {tasks.length} tâche(s) affichés
          </span>
        </div>
      </div>

    </div>
  );
};
