import React, { useMemo, useState } from 'react';
import { Pole, POLE_COLORS, DataTransferEvent } from '../../types';
import { DATA_TYPE_LABELS } from '../../utils/dataFlux';
import { ArrowRight, Radio, Share2, Users } from 'lucide-react';

/** Carte « Flux » : les pôles deviennent des zones, les membres y sont
 * positionnés et chaque échange réel (dataTransfers) est tracé entre
 * l'émetteur et le destinataire. Le filtre Jour/Semaine/Mois/Année resserre
 * la fenêtre sur une période ; « Tout » remonte jusqu'aux anciens
 * enregistrements (qui n'ont pas d'horodatage machine). */
type Fenetre = 'jour' | 'semaine' | 'mois' | 'annee' | 'tout';

const FENETRES: Array<{ id: Fenetre; label: string; heure: number | null }> = [
  { id: 'jour', label: 'Jour', heure: 24 },
  { id: 'semaine', label: 'Semaine', heure: 24 * 7 },
  { id: 'mois', label: 'Mois', heure: 24 * 30 },
  { id: 'annee', label: 'Année', heure: 24 * 365 },
  { id: 'tout', label: 'Tout', heure: null },
];

const ZONES: Record<Pole, { x: number; y: number }> = {
  Direction: { x: 580, y: 120 },
  Creatif: { x: 185, y: 325 },
  Tech: { x: 580, y: 340 },
  Digital: { x: 975, y: 325 },
  Client: { x: 1060, y: 468 },
  Externe: { x: 580, y: 560 },
};

const ORDRE_POLES: Pole[] = ['Direction', 'Creatif', 'Tech', 'Digital', 'Client', 'Externe'];

interface MembreCarte {
  id: string;
  name: string;
  role?: string;
  pole: Pole;
  poste_titre?: string | null;
}

interface FluxMapProps {
  membres: MembreCarte[];
  transferts: DataTransferEvent[];
}

interface Noeud {
  id: string;
  name: string;
  role?: string;
  poste?: string;
  pole: Pole;
  x: number;
  y: number;
}

const dansFenetre = (f: DataTransferEvent, fenetre: Fenetre): boolean => {
  const spec = FENETRES.find((fz) => fz.id === fenetre);
  if (!spec || spec.heure === null) return true;
  if (!f.timestamp_iso) return false;
  const date = new Date(f.timestamp_iso).getTime();
  if (Number.isNaN(date)) return false;
  return Date.now() - date <= spec.heure * 3600 * 1000;
};

const initiales = (nom: string) =>
  nom
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const FluxMap: React.FC<FluxMapProps> = ({ membres, transferts }) => {
  const [fenetre, setFenetre] = useState<Fenetre>('jour');
  const [focusId, setFocusId] = useState<string | null>(null);

  // Nombre d'échanges par fenêtre (pour les pastilles des filtres).
  const effectifParFenetre = useMemo(() => {
    const m = {} as Record<Fenetre, number>;
    for (const fz of FENETRES) m[fz.id] = transferts.filter((f) => dansFenetre(f, fz.id)).length;
    return m;
  }, [transferts]);

  const filtres = useMemo(
    () => transferts.filter((f) => dansFenetre(f, fenetre)),
    [transferts, fenetre]
  );

  // Placement déterministe des membres par pôle : chaque zone reçoit ses
  // membres sur une ellipse autour du centre, sans chevauchement.
  const noeuds = useMemo(() => {
    const parPole: Record<Pole, MembreCarte[]> = {
      Direction: [],
      Creatif: [],
      Tech: [],
      Digital: [],
      Client: [],
      Externe: [],
    };
    for (const m of membres) {
      if (parPole[m.pole]) parPole[m.pole].push(m);
    }

    const result: Noeud[] = [];
    for (const pole of ORDRE_POLES) {
      const liste = parPole[pole];
      const zone = ZONES[pole];
      const rx = 55 + 16 * Math.floor(liste.length / 6);
      const ry = 40 + 12 * Math.floor(liste.length / 6);
      liste.forEach((m, i) => {
        const angle = (2 * Math.PI * i) / Math.max(liste.length, 1) - Math.PI / 2;
        result.push({
          id: m.id,
          name: m.name,
          role: m.role,
          poste: m.poste_titre || undefined,
          pole: m.pole,
          x: Math.round(zone.x + Math.cos(angle) * rx),
          y: Math.round(zone.y + Math.sin(angle) * ry),
        });
      });
    }
    return result;
  }, [membres]);

  const noeudParNom = useMemo(() => {
    const map = new Map<string, Noeud>();
    for (const n of noeuds) map.set(n.name.toLowerCase(), n);
    return map;
  }, [noeuds]);

  // Cordes tracées uniquement si les deux extrémités ont un membre à
  // l'annuaire : un échange vers « Direction » sans titulaire est ignoré.
  const cordes = useMemo(
    () =>
      filtres.map((f) => {
        const de = noeudParNom.get(f.from_member_name.toLowerCase());
        const vers = noeudParNom.get(f.to_member_name.toLowerCase());
        if (!de || !vers) return null;
        return { f, de, vers };
      }).filter((c): c is NonNullable<typeof c> => c !== null),
    [filtres, noeudParNom]
  );

  // Bilans entrée/sortie par pôle, limités à la fenêtre affichée.
  const bilanPole = useMemo(() => {
    const sorties = {} as Record<Pole, number>;
    const entrees = {} as Record<Pole, number>;
    for (const p of ORDRE_POLES) {
      sorties[p] = 0;
      entrees[p] = 0;
    }
    for (const c of cordes) {
      if (sorties[c.de.pole] !== undefined) sorties[c.de.pole] += 1;
      if (entrees[c.vers.pole] !== undefined) entrees[c.vers.pole] += 1;
    }
    return { sorties, entrees };
  }, [cordes]);

  const cordesDuMembre = (id: string) => {
    if (focusId === null) return false;
    return cordes.some((c) => c.de.id === id || c.vers.id === id);
  };

  const membreParId = useMemo(() => {
    const map = new Map<string, Noeud>();
    for (const n of noeuds) map.set(n.id, n);
    return map;
  }, [noeuds]);

  return (
    <div className="space-y-6">
      {/* Carte temps réel */}
      <div className="bg-rk-chrome border border-rk-line rounded-3xl p-5 sm:p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-blueprint-grid-animated opacity-20 pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-mono text-purple-400 mb-1">
              <Radio className="w-3.5 h-3.5" />
              <span>Cartographie temps réel des transferts inter-membres</span>
            </div>
            <h3 className="font-serif text-xl font-bold text-white">
              Flux de l'agence
            </h3>
            <p className="text-xs text-rk-muted mt-1 max-w-xl leading-relaxed">
              Cliquez sur un membre pour isoler ses échanges. Les cordes suivent
              les fils réellement tracés par les actions des membres, pas un
              scénario prédéfini.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 bg-rk-inset border border-rk-line p-1 rounded-xl">
            {FENETRES.map((fz) => (
              <button
                key={fz.id}
                type="button"
                onClick={() => setFenetre(fz.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                  fenetre === fz.id
                    ? 'bg-purple-600 text-white font-bold'
                    : 'text-rk-muted hover:text-white'
                }`}
              >
                {fz.label}
                <span className={`ml-1.5 ${fenetre === fz.id ? 'text-purple-200' : 'text-rk-muted/70'}`}>
                  {effectifParFenetre[fz.id]}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <svg viewBox="0 0 1160 660" className="w-full h-auto select-none" role="img" aria-label="Carte des flux inter-membres">
            <defs>
              <filter id="rk-flux-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Zones des pôles */}
            {ORDRE_POLES.map((pole) => {
              const zone = ZONES[pole];
              const couleur = POLE_COLORS[pole].hex;
              return (
                <g key={pole}>
                  <ellipse
                    cx={zone.x}
                    cy={zone.y}
                    rx={150}
                    ry={105}
                    fill="none"
                    stroke={couleur}
                    strokeOpacity={0.28}
                    strokeDasharray="3 7"
                    strokeWidth={1}
                  />
                  <text
                    x={zone.x}
                    y={zone.y - 88}
                    textAnchor="middle"
                    className="fill-current"
                    style={{ fill: couleur, fontSize: 13, fontFamily: 'ui-monospace, monospace', letterSpacing: 2 }}
                  >
                    {pole.toUpperCase()}
                  </text>
                  <text
                    x={zone.x}
                    y={zone.y + 100}
                    textAnchor="middle"
                    style={{ fill: couleur, fontSize: 12, fontFamily: 'ui-monospace, monospace', opacity: 0.9 }}
                  >
                    {'↘ ' + bilanPole.sorties[pole]} {'↖ ' + bilanPole.entrees[pole]}
                  </text>
                </g>
              );
            })}

            {/* Cordes animées : un échange par trait, couleur du pôle émetteur */}
            {cordes.map(({ f, de, vers }) => {
              const actif = focusId === null || cordesDuMembre(de.id) || cordesDuMembre(vers.id);
              return (
                <g key={f.id}>
                  <line
                    x1={de.x}
                    y1={de.y}
                    x2={vers.x}
                    y2={vers.y}
                    className="rk-flux-corde"
                    stroke={POLE_COLORS[de.pole].hex}
                    strokeOpacity={actif ? 0.65 : 0.1}
                    strokeWidth={actif ? 1.6 : 1}
                    style={{ animationDelay: `${(Math.abs(f.id.charCodeAt(f.id.length - 1) % 8) * 0.35).toFixed(2)}s` }}
                  />
                  <circle
                    cx={de.x + (vers.x - de.x) * 0.22}
                    cy={de.y + (vers.y - de.y) * 0.22}
                    r={2.2}
                    fill={POLE_COLORS[de.pole].hex}
                    opacity={actif ? 0.9 : 0.15}
                  />
                </g>
              );
            })}

            {/* Nœuds membres */}
            {noeuds.map((n, i) => (
              <g
                key={n.id}
                onClick={() => setFocusId(focusId === n.id ? null : n.id)}
                className="cursor-pointer"
              >
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={16}
                  fill={POLE_COLORS[n.pole].hex}
                  fillOpacity={focusId === null || cordesDuMembre(n.id) ? 0.22 : 0.06}
                  stroke={POLE_COLORS[n.pole].hex}
                  strokeWidth={focusId === n.id ? 2.6 : 1.6}
                  strokeOpacity={focusId === null || cordesDuMembre(n.id) ? 1 : 0.35}
                  filter={focusId === n.id ? 'url(#rk-flux-glow)' : undefined}
                />
                <text
                  x={n.x}
                  y={n.y + 3.5}
                  textAnchor="middle"
                  style={{
                    fill: '#fff',
                    fontSize: i % 7 === 0 ? 8 : 9,
                    fontFamily: 'ui-monospace, monospace',
                    fontWeight: 700,
                    opacity: focusId === null || cordesDuMembre(n.id) ? 1 : 0.4,
                  }}
                >
                  {initiales(n.name)}
                </text>
                <title>
                  {n.name}{n.role ? ` — ${n.role}` : ''}{n.poste ? ` (${n.poste})` : ''}
                </title>
              </g>
            ))}
          </svg>

          {/* Légende */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 pt-4 border-t border-rk-line">
            <span className="text-xs font-mono text-rk-muted uppercase tracking-wider">Pôles :</span>
            {ORDRE_POLES.map((pole) => (
              <span key={pole} className="inline-flex items-center gap-1.5 text-xs text-rk-text-secondary">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: POLE_COLORS[pole].hex, boxShadow: `0 0 8px ${POLE_COLORS[pole].hex}` }} />
                {pole}
              </span>
            ))}
            <span className="ml-auto text-xs font-mono text-rk-muted">
              {filtres.length} échange(s) sur la fenêtre
              {focusId !== null && (
                <button
                  type="button"
                  onClick={() => setFocusId(null)}
                  className="ml-3 text-purple-400 underline hover:text-purple-300 cursor-pointer"
                >
                  Afficher tout
                </button>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Journal de la fenêtre */}
      <div className="bg-rk-panel border border-rk-line rounded-3xl p-6">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-mono text-emerald-400 mb-1">
              <Radio className="w-3.5 h-3.5" />
              <span>Journal de la fenêtre {FENETRES.find((fz) => fz.id === fenetre)?.label.toLowerCase()}</span>
            </div>
            <h4 className="font-serif text-lg font-bold text-white">Derniers transferts</h4>
          </div>
          <span className="text-xs font-mono text-rk-muted bg-white/[0.04] px-3 py-1 rounded-full border border-rk-line">
            {filtres.length} paquet(s)
          </span>
        </div>

        {filtres.length === 0 ? (
          <div className="text-center py-10 text-xs text-rk-text-secondary space-y-2">
            <Share2 className="w-7 h-7 mx-auto opacity-50" />
            <p>Aucun échange enregistré dans cette fenêtre.</p>
            <p className="font-mono text-rk-muted">
              Assignez une tâche à un membre : le transfert apparaîtra en direct sur la carte.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
            {filtres.slice(0, 14).map((f) => {
              const de = membreParId.get(f.from_member_id);
              const vers = membreParId.get(f.to_member_id);
              return (
                <div
                  key={f.id}
                  className="bg-rk-bg border border-rk-line-soft hover:border-rk-line-strong rounded-xl px-4 py-3 text-xs transition-all"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-white">{f.from_member_name}</span>
                    <ArrowRight className="w-3 h-3 text-emerald-400" />
                    <span className="font-bold text-white">{f.to_member_name}</span>
                    <span className="ml-auto font-mono text-rk-muted whitespace-nowrap">{f.timestamp}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-rk-text-secondary">
                    <span>{DATA_TYPE_LABELS[f.data_type] || f.data_type}</span>
                    {de && de.poste && <span>• {de.poste}</span>}
                    {vers && vers.poste && <span>→ {vers.poste}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {membres.length === 0 && (
        <div className="flex items-center gap-3 bg-rk-bg border border-amber-500/30 text-amber-400/90 rounded-2xl px-4 py-3 text-xs">
          <Users className="w-4 h-4 shrink-0" />
          <span>
            Aucun membre à l'annuaire : les flux ne peuvent pas être tracés. Ajoutez votre équipe
            pour voir chaque échange circuler entre les pôles.
          </span>
        </div>
      )}
    </div>
  );
};

export default FluxMap;