import React from 'react';
import { useApp } from '../../contexts/AppContext';
import { X, Bell, Check, ArrowUpRight, User, AlertCircle, Sparkles } from 'lucide-react';
import { useDialogA11y } from '../../hooks/useDialogA11y';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (tab: string) => void;
}

// Libellé lisible de la source, déduit du `link` ou du type
const sourceLabel = (n: { link?: string; type?: string }): string => {
  if (n.link === '/leads' || n.type === 'lead') return 'CRM & Devis';
  if (n.link === '/tasks' || n.type === 'task') return 'Tâches & Kanban';
  if (n.link === '/projects') return 'Projets & Production';
  if (n.link === '/messaging' || n.type === 'message') return 'Messagerie interne';
  if (n.link === '/members') return 'Membres & Habilitations';
  if (n.link === '/crm') return 'CRM & Devis';
  if (n.link === '/siteadmin') return 'Gestion du site';
  return 'Vue d’ensemble';
};

export const NotificationsDrawer: React.FC<Props> = ({ isOpen, onClose, onNavigate }) => {
  const { notifications, markNotificationAsRead, clearNotifications } = useApp();
  const dialogRef = useDialogA11y<HTMLDivElement>(isOpen, onClose);

  if (!isOpen) return null;

  // Clic = marquer comme lu + rediriger vers la source
  const handleClick = (n: { id: string; link?: string }) => {
    markNotificationAsRead(n.id);
    const target = n.link;
    if (target && target !== '/' && onNavigate) {
      onNavigate(target.replace(/^\//, ''));
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm animate-backdrop-in"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Notifications Arckaton OS"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-rk-panel border-l border-rk-line-strong h-full flex flex-col shadow-2xl outline-none animate-drawer-in"
      >
        
        {/* Top Header */}
        <div className="p-5 border-b border-rk-line flex items-center justify-between bg-rk-bg">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-white">Notifications Arckaton OS</h3>
              <p className="text-[11px] text-slate-400 font-mono">
                {notifications.filter(n => !n.read).length} non lues
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <button
                onClick={clearNotifications}
                className="text-[11px] text-slate-400 hover:text-white font-mono px-2 py-1"
              >
                Tout effacer
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Fermer les notifications"
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="text-center py-16 text-slate-400 space-y-3">
              <Check className="w-8 h-8 mx-auto opacity-40 text-emerald-400" />
              <p className="text-xs">Toutes les alertes sont à jour. Aucun événement non traité.</p>
            </div>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                title={`Ouvrir : ${sourceLabel(n)}`}
                className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer group ${
                  n.read
                    ? 'bg-rk-bg/60 border-rk-line-soft opacity-70 hover:opacity-100'
                    : 'bg-rk-panel border-blue-500/30 shadow-sm hover:border-blue-400/60'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${n.read ? 'bg-slate-500' : 'bg-blue-400 animate-pulse'}`} />
                    <span className="text-xs font-semibold text-white">{n.title}</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 flex-shrink-0">
                    {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  {n.message}
                </p>

                <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-rk-line-soft">
                  <span className="text-emerald-400">Pôle : {n.pole_target || n.pole}</span>
                  <span className="inline-flex items-center gap-1 text-blue-300 group-hover:text-blue-200 font-semibold">
                    {sourceLabel(n)}
                    <ArrowUpRight className="w-3 h-3" />
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

      </div>
    </div>
  );
};
