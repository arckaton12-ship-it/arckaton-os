import React, { useCallback, useEffect, useState } from 'react';
import { CalendarDays, RefreshCw, Phone, Check, X, CheckCircle2, Clock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { apiRequest, apiWrite } from '../../utils/api';

interface RdvServeur {
  rdv_ref: string;
  lead_ref?: string | null;
  pole: string;
  motif: string;
  debut_utc: string;
  duree_min: number;
  nom: string;
  telephone: string;
  email?: string | null;
  source: string;
  statut: 'demande' | 'confirme' | 'annule' | 'realise';
  cree_le: string;
}

type FiltreStatut = 'tous' | 'demande' | 'confirme' | 'annule' | 'realise';

const FUSEAU = 'Africa/Douala';

function heureDouala(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: FUSEAU,
    }).format(d);
  } catch {
    return iso;
  }
}

// Badge d'état : code couleur sobre, cohérent avec le reste de l'OS.
const LIBELLES_STATUT: Record<RdvServeur['statut'], string> = {
  demande: 'En demande',
  confirme: 'Confirmé',
  annule: 'Annulé',
  realise: 'Réalisé',
};

const CLASSE_STATUT: Record<RdvServeur['statut'], string> = {
  demande: 'text-blue-300 border-blue-500/40 bg-blue-500/10',
  confirme: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10',
  annule: 'text-slate-400 border-slate-500/40 bg-slate-500/10',
  realise: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10',
};

export const AgendaTab: React.FC = () => {
  const { isAdmin, role, user } = useAuth();
  const [rdvs, setRdvs] = useState<RdvServeur[]>([]);
  const [filtre, setFiltre] = useState<FiltreStatut>('tous');
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  // La confirmation est un acte de la direction (miroir de la règle serveur).
  const estDirection = isAdmin || role === 'direction' || user?.pole === 'Direction';

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const res = await apiRequest<{ appointments: RdvServeur[] }>('/api/appointments');
      setRdvs(Array.isArray(res.appointments) ? res.appointments : []);
    } catch (err) {
      setErreur(
        err instanceof Error
          ? err.message
          : 'Impossible de charger l’agenda. Vérifiez la connexion puis réessayez.'
      );
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  const agir = async (ref: string, action: 'confirmer' | 'annuler' | 'realiser') => {
    setErreur(null);
    try {
      await apiWrite(`/api/appointments/${encodeURIComponent(ref)}`, 'PATCH', { action });
      await charger();
    } catch (err) {
      setErreur(
        err instanceof Error ? err.message : 'Action impossible sur ce rendez-vous.'
      );
    }
  };

  const visibles = rdvs.filter((r) => filtre === 'tous' || r.statut === filtre);
  const enDemande = rdvs.filter((r) => r.statut === 'demande').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center">
            <CalendarDays className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-serif text-xl font-bold text-white">Agenda des rendez-vous</h2>
            <p className="text-xs text-rk-muted font-mono">
              {enDemande > 0
                ? `${enDemande} demande${enDemande > 1 ? 's' : ''} à traiter`
                : 'Aucune demande en attente'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void charger()}
          className="flex items-center gap-2 text-xs font-mono text-rk-muted hover:text-white bg-white/5 hover:bg-white/10 border border-rk-line px-3 py-2 rounded-lg transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${chargement ? 'animate-spin' : ''}`} aria-hidden="true" />
          Actualiser
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['tous', 'demande', 'confirme', 'realise', 'annule'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFiltre(f)}
            aria-pressed={filtre === f}
            className={`text-xs font-mono px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
              filtre === f
                ? 'bg-blue-500/20 border-blue-500/50 text-blue-200'
                : 'bg-white/5 border-rk-line text-rk-muted hover:text-white'
            }`}
          >
            {f === 'tous' ? 'Tous' : LIBELLES_STATUT[f]}
          </button>
        ))}
      </div>

      {erreur && (
        <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 font-mono">
          {erreur}
        </div>
      )}

      {chargement ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-white/5 border border-rk-line animate-pulse" />
          ))}
        </div>
      ) : visibles.length === 0 ? (
        <div className="text-center py-16 bg-rk-panel border border-rk-line rounded-2xl">
          <Clock className="w-8 h-8 mx-auto text-rk-muted opacity-50" aria-hidden="true" />
          <p className="mt-3 text-sm text-rk-muted">
            Aucun rendez-vous {filtre !== 'tous' ? 'dans ce filtre' : 'pour l’instant'}.
          </p>
          <p className="text-xs text-rk-muted/70 mt-1">
            Les demandes déposées sur le site public apparaissent ici automatiquement.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibles.map((r) => (
            <article
              key={r.rdv_ref}
              className="bg-rk-panel border border-rk-line rounded-2xl p-5 space-y-4"
            >
              <header className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-white truncate">
                      {r.nom}
                    </h3>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${CLASSE_STATUT[r.statut]}`}
                    >
                      {LIBELLES_STATUT[r.statut]}
                    </span>
                  </div>
                  <p className="text-xs text-rk-text-secondary mt-1">
                    {r.motif} · Pôle {r.pole}
                  </p>
                </div>
                <span className="text-xs font-mono text-rk-muted">
                  {r.telephone}
                </span>
              </header>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-rk-muted font-mono">
                  <span className="inline-flex items-center gap-1.5 text-blue-200">
                    <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                    {heureDouala(r.debut_utc)} ({r.duree_min} min)
                  </span>
                  {r.email && (
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" aria-hidden="true" />
                      {r.email}
                    </span>
                  )}
                  <span className="text-rk-muted/70">{r.rdv_ref}</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {r.statut === 'demande' && estDirection && (
                    <button
                      type="button"
                      onClick={() => void agir(r.rdv_ref, 'confirmer')}
                      className="inline-flex items-center gap-1.5 text-xs font-mono text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" aria-hidden="true" />
                      Confirmer
                    </button>
                  )}
                  {r.statut === 'demande' && (
                    <button
                      type="button"
                      onClick={() => void agir(r.rdv_ref, 'annuler')}
                      className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-300 bg-white/5 hover:bg-white/10 border border-rk-line px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" aria-hidden="true" />
                      Annuler
                    </button>
                  )}
                  {r.statut === 'confirme' && (
                    <button
                      type="button"
                      onClick={() => void agir(r.rdv_ref, 'realiser')}
                      className="inline-flex items-center gap-1.5 text-xs font-mono text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                      Marquer réalisé
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};