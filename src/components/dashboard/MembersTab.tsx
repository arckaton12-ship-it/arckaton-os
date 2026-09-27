import React, { useEffect, useState } from 'react';
import { MemberProfile, Pole, UserRole } from '../../types';
import { POLES_INFO } from '../../data/mockData';
import { useApp } from '../../contexts/AppContext';
import { POLE_COLORS } from '../../types';
import {
  Users, Plus, Pencil, Trash2, Power, ShieldCheck, Activity, X, Save, Loader2, UserPlus
} from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur',
  site_editor: 'Gestionnaire Contenu',
  membre: 'Membre',
};

const PERMS: { key: string; label: string }[] = [
  { key: 'content', label: 'Édition du contenu (CMS)' },
  { key: 'bat', label: 'Suivi BAT (validation livrables)' },
  { key: 'finance', label: 'Finance & devis' },
];

interface ActivityRow {
  id: string;
  actor_name: string;
  action: string;
  kind: string;
  ref: string;
  details: any;
  created_at: string;
}

const tokenHeader = () => {
  const t = localStorage.getItem('arckaton_os_token');
  return t ? { Authorization: `Bearer ${t}` } : {};
};

export const MembersTab: React.FC = () => {
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { refreshOsMembers } = useApp();

  const blank = {
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'membre' as UserRole,
    pole: 'Tech' as Pole,
    poste_id: '',
    poste_titre: '',
    permissions: [] as string[],
    active: true,
  };
  const [form, setForm] = useState(blank);

  const load = async () => {
    setLoading(true);
    try {
      const [mRes, aRes] = await Promise.all([
        fetch('/api/members', { headers: tokenHeader() }),
        fetch('/api/activity', { headers: tokenHeader() }),
      ]);
      const mj = await mRes.json().catch(() => ({ members: [] }));
      const aj = await aRes.json().catch(() => ({ activity: [] }));
      if (!mRes.ok) {
        // Un 401 signifie session périmée, pas annuaire vide : le message
        // doit le dire, sinon l'utilisateur conclude à une perte de données.
        setError(
          mRes.status === 401
            ? 'Session expirée : le renouvellement a échoué. Reconnectez-vous pour retrouver vos membres et vos données.'
            : mRes.status === 403
              ? mj.error || 'Accès refusé par la direction.'
              : mj.error || 'Chargement impossible'
        );
        setMembers([]);
        setActivity([]);
        return;
      }
      setError(null);
      setMembers(mj.members || []);
      setActivity(aj.activity || []);
    } catch (err) {
      setError('Serveur indisponible — vérifiez la table members (migration 002).');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const togglePerm = (key: string) => {
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(key) ? f.permissions.filter((p) => p !== key) : [...f.permissions, key],
    }));
  };

  const openEdit = (m: MemberProfile) => {
    setEditId(m.id);
    setForm({
      name: m.name,
      email: m.email,
      password: '',
      phone: m.phone || '',
      role: m.role,
      pole: m.pole,
      poste_id: m.poste_id || '',
      poste_titre: m.poste_titre || '',
      permissions: m.permissions || [],
      active: m.active,
    });
    setModal('edit');
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const url = modal === 'add' ? '/api/members' : `/api/members/${editId}`;
      const method = modal === 'add' ? 'POST' : 'PATCH';
      const body: any = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        role: form.role,
        pole: form.pole,
        poste_id: form.poste_id,
        poste_titre: form.poste_titre,
        permissions: form.permissions,
      };
      if (modal === 'add') body.password = form.password;
      if (modal === 'edit' && form.password) body.password = form.password;
      if (modal === 'edit') body.active = form.active;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...tokenHeader() },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || 'Erreur lors de l\'enregistrement');
      } else {
        setMessage(modal === 'add' ? 'Membre ajouté et compte activé.' : 'Profil membre mis à jour.');
        setModal(null);
        load();
        // L'annuaire partagé alimente le Kanban, les projets et la messagerie :
        // il doit refléter le changement sans recharger la page.
        refreshOsMembers();
      }
    } catch (err: any) {
      setError(String(err?.message || err));
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (m: MemberProfile) => {
    try {
      const res = await fetch(`/api/members/${m.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...tokenHeader() },
        body: JSON.stringify({ active: !m.active }),
      });
      if (res.ok) {
        setMessage(m.active ? `Compte de ${m.name} désactivé (login refusé).` : `Compte de ${m.name} réactivé.`);
        load();
        refreshOsMembers();
      } else {
        const j = await res.json().catch(() => ({}));
        setError(j.error || 'Erreur');
      }
    } catch (err) {
      setError('Erreur réseau');
    }
  };

  const removeMember = async (m: MemberProfile) => {
    if (!confirm(`Supprimer définitivement le compte et l'accès OS de ${m.name} ?`)) return;
    try {
      const res = await fetch(`/api/members/${m.id}`, { method: 'DELETE', headers: tokenHeader() });
      if (res.ok) {
        setMessage(`Compte de ${m.name} supprimé définitivement.`);
        load();
        refreshOsMembers();
      } else {
        const j = await res.json().catch(() => ({}));
        setError(j.error || 'Erreur');
      }
    } catch (err) {
      setError('Erreur réseau');
    }
  };

  const fmtDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <div className="bg-[#0b1329] border border-white/10 rounded-3xl p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Accès Direction — Gestion des Membres OS</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Membres & Habilitations
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl font-light">
              Seul le boss ajoute, active, désactive ou retire des membres. Chaque membre a un rôle, un pôle et des permissions (content / bat / finance).
            </p>
          </div>
          <button
            onClick={() => {
              setForm(blank);
              setModal('add');
              setError(null);
              setMessage(null);
            }}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 self-start md:self-auto"
          >
            <UserPlus className="w-4 h-4" />
            <span>Ajouter un membre</span>
          </button>
        </div>
      </div>

      {error && <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-2xl px-4 py-3">{error}</div>}
      {message && <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-2xl px-4 py-3">{message}</div>}

      {loading ? (
        <div className="text-center py-16 text-slate-400 flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Chargement des membres…
        </div>
      ) : (
        <div className="bg-[#0b1329] border border-white/10 rounded-3xl overflow-hidden">
          <div className="divide-y divide-white/[0.06]">
            {members.map((m) => {
              const poleColor = POLE_COLORS[m.pole as Pole] || POLE_COLORS.Direction;
              return (
                <div key={m.id} className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-11 h-11 rounded-xl ${poleColor.bg} border ${poleColor.border} flex items-center justify-center font-mono font-bold text-sm ${poleColor.text}`}>
                      {m.name.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-sm">{m.name}</span>
                        <span className="text-[11px] font-mono bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30">
                          {ROLE_LABELS[m.role] || m.role}
                        </span>
                        <span className={`text-[11px] font-mono py-0.5 px-2 rounded border ${poleColor.bg} ${poleColor.border} ${poleColor.text}`}>
                          {POLES_INFO[m.pole]?.name || m.pole}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mt-1">
                        {m.email} • {m.poste_titre || 'Poste à définir'}
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {(m.permissions || []).map((p) => (
                          <span key={p} className="text-[9px] font-mono bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
                            perm:{p}
                          </span>
                        ))}
                        {m.role === 'admin' && (
                          <span className="text-[9px] font-mono bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded border border-rose-500/20">
                            toutes permissions
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end lg:self-auto">
                    <span className={`text-[11px] font-mono px-2 py-0.5 rounded ${m.active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                      {m.active ? 'ACTIF' : 'DÉSACTIVÉ'}
                    </span>
                    <button
                      onClick={() => toggleActive(m)}
                      className="p-2 bg-white/[0.04] hover:bg-white/[0.1] text-slate-300 rounded-xl transition-colors cursor-pointer"
                      title={m.active ? 'Désactiver (refuser le login)' : 'Réactiver'}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openEdit(m)}
                      className="p-2 bg-white/[0.04] hover:bg-emerald-500/20 text-emerald-400 rounded-xl transition-colors cursor-pointer"
                      title="Modifier"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeMember(m)}
                      className="p-2 bg-white/[0.04] hover:bg-rose-500/20 text-rose-400 rounded-xl transition-colors cursor-pointer"
                      title="Supprimer définitivement"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
            {/* « Aucun membre trouvé » n'a de sens que si le chargement a
                réussi. L'afficher après une erreur de session donnait
                l'impression que l'annuaire était vide. */}
            {members.length === 0 && !error && (
              <div className="p-10 text-center text-sm text-slate-400">
                Aucun membre trouvé. Utilisez « Ajouter un membre » pour créer un compte avec son nom, son pôle et ses permissions.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Journal d'activité */}
      {activity.length > 0 && (
        <div className="bg-[#0b1329] border border-white/10 rounded-3xl p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-5">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h3 className="font-serif text-lg font-bold text-white">Journal d'activité récent</h3>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {activity.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 bg-[#070c1e] border border-white/[0.05] rounded-xl px-4 py-2.5 text-xs">
                <div className="text-slate-300">
                  <span className="text-emerald-400 font-mono">{a.actor_name}</span>
                  <span> — </span>
                  <span className="text-white">{a.action}</span>
                  <span className="text-slate-400"> ({a.kind}/{a.ref})</span>
                </div>
                <span className="text-[11px] font-mono text-slate-400 flex-shrink-0">{fmtDate(a.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals add / edit */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="bg-[#0b1329] border border-white/15 rounded-3xl max-w-xl w-full p-6 sm:p-8 relative my-8">
            <button
              onClick={() => setModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-serif text-2xl font-bold text-white mb-1 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" />
              {modal === 'add' ? 'Ajouter un membre OS' : 'Modifier le membre'}
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Le compte est créé dans Supabase Auth et activé immédiatement. Le membre pourra se connecter à l'entrée Arckaton OS.
            </p>

            <form onSubmit={save} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-400 uppercase mb-1">Nom complet *</label>
                  <input
                    type="text" required value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-[#070c1e] border border-white/10 rounded-xl p-3 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-400 uppercase mb-1">Email *</label>
                  <input
                    type="email" required value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-[#070c1e] border border-white/10 rounded-xl p-3 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-mono text-slate-400 uppercase mb-1">Rôle</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                    className="w-full bg-[#070c1e] border border-white/10 rounded-xl p-3 text-xs text-white"
                  >
                    <option value="membre">Membre</option>
                    <option value="site_editor">Gestionnaire Contenu</option>
                    <option value="admin">Administrateur</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-mono text-slate-400 uppercase mb-1">Pôle</label>
                  <select
                    value={form.pole}
                    onChange={(e) => setForm({ ...form, pole: e.target.value as Pole })}
                    className="w-full bg-[#070c1e] border border-white/10 rounded-xl p-3 text-xs text-white"
                  >
                    {Object.keys(POLES_INFO).map((p) => (
                      <option key={p} value={p}>{POLES_INFO[p].name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-400 uppercase mb-1">Poste (titre)</label>
                  <input
                    type="text" value={form.poste_titre}
                    onChange={(e) => setForm({ ...form, poste_titre: e.target.value })}
                    placeholder="Ex: Dev Full-Stack / CTO"
                    className="w-full bg-[#070c1e] border border-white/10 rounded-xl p-3 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-400 uppercase mb-1">Téléphone</label>
                  <input
                    type="text" value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+237 …"
                    className="w-full bg-[#070c1e] border border-white/10 rounded-xl p-3 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 uppercase mb-1">
                  {modal === 'add' ? 'Mot de passe initial *' : 'Nouveau mot de passe (laisser vide pour ne rien changer)'}
                </label>
                <input
                  type="text" required={modal === 'add'} value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="minimum 6 caractères"
                  className="w-full bg-[#070c1e] border border-white/10 rounded-xl p-3 text-xs text-white"
                />
              </div>

              <div>
                <span className="block text-xs font-mono text-slate-400 uppercase mb-2">Permissions</span>
                <div className="space-y-2">
                  {PERMS.map((p) => (
                    <label key={p.key} className="flex items-center gap-3 bg-[#070c1e] border border-white/[0.06] p-3 rounded-xl text-xs text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.permissions.includes(p.key)}
                        onChange={() => togglePerm(p.key)}
                        className="w-4 h-4 accent-emerald-500"
                      />
                      {p.label}
                    </label>
                  ))}
                </div>
              </div>

              {modal === 'edit' && (
                <label className="flex items-center gap-3 bg-[#070c1e] border border-white/[0.06] p-3 rounded-xl text-xs text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                    className="w-4 h-4 accent-emerald-500"
                  />
                  Compte actif (le membre peut se connecter)
                </label>
              )}

              {error && <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl px-4 py-3">{error}</div>}

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button" onClick={() => setModal(null)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit" disabled={busy}
                  className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer"
                >
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {modal === 'add' ? 'Créer le compte' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};