import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Trash2, Upload, Loader2, X, ImageIcon } from 'lucide-react';
import { ProjectMedia } from '../../types';
import { apiRequest, apiUpload, apiBlobUrl, apiWrite } from '../../utils/api';

interface MediaGalleryProps {
  projectRef: string;
  visitId?: string;
}

// Galerie des preuves de terrain d'une sortie de captation. Les octets
// vivent dans PostgreSQL ; ce composant n'affiche que des vignettes
// chargees via `fetch` (jeton en en-tete), jamais par un `<img src>`
// direct qui n'enverrait pas l'authentification.
export const MediaGallery: React.FC<MediaGalleryProps> = ({ projectRef, visitId }) => {
  const [medias, setMedias] = useState<ProjectMedia[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apercu, setApercu] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  // `urls` dans une ref pour revoquer les object URLs au demontage sans
  // dependre de l'etat au moment de la fermeture.
  const urlsRef = useRef<Record<string, string>>(urls);
  urlsRef.current = urls;

  const charger = useCallback(async () => {
    if (!projectRef) return;
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({ project_ref: projectRef });
      if (visitId) query.set('visit_id', visitId);
      const data = await apiRequest<{ media: ProjectMedia[] }>(`/api/media?${query.toString()}`);
      const liste = data.media || [];
      setMedias(liste);
      for (const m of liste) {
        apiBlobUrl(`/api/media/${encodeURIComponent(m.id)}`)
          .then((url) =>
            setUrls((prev) => {
              if (prev[m.id]) {
                URL.revokeObjectURL(url);
                return prev;
              }
              return { ...prev, [m.id]: url };
            })
          )
          .catch(() => undefined);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Galerie indisponible');
    } finally {
      setLoading(false);
    }
  }, [projectRef, visitId]);

  useEffect(() => {
    void charger();
  }, [charger]);

  useEffect(
    () => () => {
      const restants = urlsRef.current;
      Object.keys(restants).forEach((cle) => URL.revokeObjectURL(restants[cle]));
    },
    []
  );

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          setError(`${file.name} : format non supporté (JPEG, PNG, WebP ou GIF)`);
          continue;
        }
        await apiUpload('/api/media', file, {
          project_ref: projectRef,
          ...(visitId ? { visit_id: visitId } : {}),
          filename: file.name,
        });
      }
      await charger();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l'envoi");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDelete = async (m: ProjectMedia) => {
    if (!window.confirm('Supprimer cette preuve de terrain ?')) return;
    try {
      await apiWrite(`/api/media/${encodeURIComponent(m.id)}`, 'DELETE');
      setUrls((prev) => {
        if (prev[m.id]) URL.revokeObjectURL(prev[m.id]);
        const suivant = { ...prev };
        delete suivant[m.id];
        return suivant;
      });
      setMedias((prev) => prev.filter((x) => x.id !== m.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Suppression impossible');
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-purple-300" />
          Preuves terrain ({medias.length})
        </span>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-200 border border-purple-500/30 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
        >
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          <span>{uploading ? 'Envoi…' : 'Ajouter'}</span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
      </div>

      {error && <p className="text-[11px] text-rose-300">{error}</p>}

      {loading && medias.length === 0 ? (
        <p className="text-[11px] text-slate-500 font-mono">Chargement de la galerie…</p>
      ) : medias.length === 0 ? (
        <p className="text-[11px] text-slate-500 font-mono">Aucune preuve pour cette sortie.</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
          {medias.map((m) => (
            <div key={m.id} className="relative group aspect-square rounded-lg overflow-hidden border border-white/10 bg-[#070c1e]">
              {urls[m.id] ? (
                <img
                  src={urls[m.id]}
                  alt={m.filename}
                  className="w-full h-full object-cover cursor-zoom-in"
                  onClick={() => setApercu(urls[m.id])}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              )}
              <button
                type="button"
                onClick={() => void handleDelete(m)}
                title="Supprimer"
                className="absolute top-1 right-1 p-1 rounded-md bg-black/60 text-rose-300 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {apercu && (
        <div
          className="fixed inset-0 z-[100] bg-black/85 flex items-center justify-center p-4"
          onClick={() => setApercu(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={() => setApercu(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <img src={apercu} alt="Preuve de terrain" className="max-h-[90vh] max-w-[90vw] rounded-lg" />
        </div>
      )}
    </div>
  );
};
