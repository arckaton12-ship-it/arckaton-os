import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Shield, ShieldAlert, ShieldCheck, UserCheck, ChevronDown, Check, Lock } from 'lucide-react';
import { POLE_COLORS } from '../../types';

export const RoleSwitcher: React.FC = () => {
  const { user, role, switchUser, availableUsers, isAdmin, isSiteEditor } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const roleLabels: Record<string, { label: string; badgeColor: string; description: string }> = {
    admin: {
      label: 'Administrateur',
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      description: 'Accès complet : Stratégie, Finances, RLS bypass, Validation des devis'
    },
    site_editor: {
      label: 'Éditeur de Site',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      description: 'Gestion CMS du site public (/site), Visuels, Tâches créatives'
    },
    membre: {
      label: 'Membre d\'Équipe',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      description: 'Accès opérationnel : Ses tâches, Messagerie par pôle, Projets assignés'
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 bg-rk-panel hover:bg-white/10 border border-rk-line px-3 py-1.5 rounded-xl text-xs transition-colors cursor-pointer"
      >
        <div className="w-6 h-6 rounded-lg bg-blue-600/30 border border-blue-400/40 flex items-center justify-center font-mono font-bold text-xs text-blue-300">
          {user.name.split(' ').map(n => n[0]).join('')}
        </div>
        
        <div className="text-left hidden sm:block">
          <div className="text-xs font-semibold text-white leading-none">{user.name}</div>
          <div className="text-xs font-mono text-rk-muted mt-0.5">{user.poste_titre}</div>
        </div>

        <span className={`text-xs font-mono px-2 py-0.5 rounded-md border ${roleLabels[role]?.badgeColor || ''}`}>
          {roleLabels[role]?.label}
        </span>

        <ChevronDown className="w-3.5 h-3.5 text-rk-muted" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 bg-rk-panel border border-rk-line-strong rounded-2xl shadow-2xl p-4 z-50 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-rk-line pb-2.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="font-serif text-sm font-bold text-white">Sélection du Profil & Rôle</span>
              </div>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                RLS Actif
              </span>
            </div>

            <p className="text-xs text-rk-muted leading-relaxed">
              Basculez entre les rôles de l'architecture Arckaton OS pour tester les permissions et vues spécifiques.
            </p>

            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {availableUsers.map((p) => {
                const isCurrent = p.id === user.id;
                const rInfo = roleLabels[p.role];

                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      switchUser(p.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-start justify-between p-2.5 rounded-xl text-left text-xs transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-blue-600/20 border border-blue-500/40 text-white'
                        : 'hover:bg-white/5 text-rk-text-secondary'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-white flex items-center gap-2">
                        <span>{p.name}</span>
                        <span className={`text-xs font-mono px-1.5 py-0.2 rounded border ${rInfo?.badgeColor}`}>
                          {p.role}
                        </span>
                      </div>
                      <div className="text-xs text-rk-muted font-mono mt-0.5">
                        {p.poste_titre} • Pôle {p.pole}
                      </div>
                    </div>

                    {isCurrent && <Check className="w-4 h-4 text-blue-400 flex-shrink-0 mt-1" />}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-rk-line text-xs font-mono text-rk-muted flex items-center justify-between">
              <span>Sécurité : Isolation Multi-rôles</span>
              <span className="text-emerald-400">Certifié Arckaton</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
