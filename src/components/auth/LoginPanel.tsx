import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { ArrowLeft, Lock, LogIn, Mail, ShieldCheck, Loader2, UserPlus } from 'lucide-react';
import { apiRequest } from '../../utils/api';

export const LoginPanel: React.FC = () => {
  const { login, completeSession } = useAuth();
  const { setMode } = useApp();
  // Aucun identifiant pré-rempli : ni compte, ni mot de passe, ni identité
  // réelle dans le bundle envoyé au navigateur.
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // null tant que la question n'a pas ete posee au serveur. Le formulaire
  // de creation du Directeur est une operation unique : il ne doit
  // s'afficher que si aucun administrateur n'existe encore.
  const [needsBoot, setNeedsBoot] = useState<boolean | null>(null);
  const [bootChecked, setBootChecked] = useState(false);

  useEffect(() => {
    let stopped = false;
    const check = async () => {
      try {
        const j = await apiRequest<{ needs: boolean }>('/api/auth/bootstrap', {
          auth: false,
          timeoutMs: 60000,
        });
        if (!stopped) setNeedsBoot(Boolean(j?.needs));
      } catch {
        // Impossible de vérifier : on ne montre surtout pas le formulaire de
        // création d'un compte directeur, la route serveur refusera
        // elle-même l'opération si un admin existe déjà.
        if (!stopped) setNeedsBoot(false);
      } finally {
        if (!stopped) setBootChecked(true);
      }
    };
    check();
    return () => {
      stopped = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Connexion impossible');
    } finally {
      setBusy(false);
    }
  };

  const handleBootstrap = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const j = await apiRequest<any>('/api/auth/bootstrap', {
        method: 'POST',
        body: { name, email, password, phone },
        auth: false,
        timeoutMs: 90000,
        retries: 0,
      });
      if (j?.token && j?.member) {
        completeSession(j.token, j.member);
        return;
      }
      await login(email, password);
    } catch (err: any) {
      setError(err.message || "Échec de l'initialisation");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-rk-bg text-slate-100 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md">
        <div className="bg-rk-panel border border-white/10 rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/[0.05] rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-6">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-serif text-2xl font-bold text-white shadow-lg shadow-blue-500/20">
                A
              </div>
              <div>
                <h1 className="font-serif text-2xl font-bold text-white tracking-tight">
                  arckaton <span className="text-blue-400 font-mono text-sm align-middle ml-1">OS</span>
                </h1>
                <p className="text-xs text-slate-400 font-light mt-1 max-w-xs">
                  Espace de pilotage interne — accès réservé aux membres habilités par la direction.
                </p>
              </div>
            </div>

            {needsBoot === true && (
              <form onSubmit={handleBootstrap} className="space-y-4 border border-emerald-500/30 bg-emerald-500/5 p-4 rounded-2xl">
                <span className="text-xs font-mono text-emerald-400 uppercase flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5" />
                  Configuration initiale — Création du Directeur (admin)
                </span>
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Nom complet</label>
                  <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-rk-bg border border-white/10 rounded-xl p-2.5 text-sm text-white" />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Email professionnel</label>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-rk-bg border border-white/10 rounded-xl p-2.5 text-sm text-white" />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Mot de passe initial</label>
                  <input type="text" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-rk-bg border border-white/10 rounded-xl p-2.5 text-sm text-white" />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Téléphone (optionnel)</label>
                  <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-rk-bg border border-white/10 rounded-xl p-2.5 text-sm text-white" />
                </div>
                {error && <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl px-4 py-3">{error}</div>}
                <button type="submit" disabled={busy} className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  <span>Créer le compte Directeur</span>
                </button>
              </form>
            )}

            {needsBoot !== true && (
              <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1.5">Email professionnel</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="prenom@arckaton.com"
                    className="w-full bg-rk-bg border border-white/10 focus:border-emerald-500/50 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-400 outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1.5">Mot de passe</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-rk-bg border border-white/10 focus:border-emerald-500/50 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-400 outline-none transition-colors"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl px-4 py-3 leading-relaxed">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                <span>Se connecter à Arckaton OS</span>
              </button>
            </form>
            )}

            <div className="flex items-center justify-between pt-2 text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1.5">
                {bootChecked ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Session sécurisée</span>
                  </>
                ) : (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Vérification du serveur…</span>
                  </>
                )}
              </span>
              <button
                onClick={() => setMode('public')}
                className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Retour au site public</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};