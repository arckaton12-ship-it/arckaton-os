import React from 'react';
import { useApp } from '../../contexts/AppContext';
import { 
  X, 
  MapPin, 
  Calendar, 
  User, 
  Clock, 
  Quote, 
  TrendingUp, 
  Cpu, 
  ArrowRight, 
  CheckCircle2, 
  Share2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDialogA11y } from '../../hooks/useDialogA11y';

export const BlogReaderModal: React.FC = () => {
  const { activeBlogPost, setActiveBlogPost, setIsQuoteModalOpen } = useApp();
  const dialogRef = useDialogA11y<HTMLDivElement>(!!activeBlogPost, () => setActiveBlogPost(null));

  if (!activeBlogPost) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          ref={dialogRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label={activeBlogPost.title}
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.96 }}
          transition={{ duration: 0.25 }}
          className="bg-rk-panel border border-rk-line-strong rounded-3xl max-w-3xl w-full relative shadow-2xl overflow-hidden my-8 outline-none"
        >
          {/* Close button */}
          <button
            onClick={() => setActiveBlogPost(null)}
            className="absolute top-4 right-4 z-20 bg-black/60 hover:bg-black/80 text-white/80 hover:text-white p-2 rounded-full border border-rk-line-bold transition-all cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>

          {/* Hero Banner */}
          <div className="relative h-64 sm:h-80 w-full overflow-hidden bg-slate-900">
            <img
              src={activeBlogPost.image}
              alt={activeBlogPost.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b1329] via-[#0b1329]/40 to-transparent" />

            {/* Badges */}
            <div className="absolute top-4 left-4 flex flex-wrap gap-2">
              <span className="text-xs font-mono uppercase bg-emerald-500 text-slate-950 px-3 py-1 rounded-full font-bold">
                {activeBlogPost.category_label}
              </span>
              <span className="text-xs font-mono text-slate-200 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-rk-line">
                {activeBlogPost.read_time}
              </span>
            </div>
          </div>

          {/* Content Body */}
          <div className="p-6 sm:p-10 space-y-6">
            
            {/* Meta header */}
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-400 mb-2">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{activeBlogPost.date}</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <User className="w-3.5 h-3.5" />
                  <span>{activeBlogPost.author_name} ({activeBlogPost.author_role})</span>
                </span>
              </div>

              <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-tight">
                {activeBlogPost.title}
              </h2>
            </div>

            {/* Field Mission Technical Specs Box if exists */}
            {activeBlogPost.field_spec && (
              <div className="bg-rk-bg border border-emerald-500/30 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono uppercase font-bold tracking-wider">
                  <MapPin className="w-4 h-4" />
                  <span>Fiche Technique d'Intervention Terrain</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono pt-1">
                  <div className="bg-white/[0.03] p-3 rounded-xl border border-rk-line-soft">
                    <span className="text-slate-400 block text-[11px]">Zone de déploiement :</span>
                    <span className="text-white font-medium">{activeBlogPost.field_spec.lieu}</span>
                  </div>
                  <div className="bg-white/[0.03] p-3 rounded-xl border border-rk-line-soft">
                    <span className="text-slate-400 block text-[11px]">Matériel déployé :</span>
                    <span className="text-white font-medium">{activeBlogPost.field_spec.materiel}</span>
                  </div>
                  <div className="bg-white/[0.03] p-3 rounded-xl border border-rk-line-soft">
                    <span className="text-slate-400 block text-[11px]">Agents mobilisés :</span>
                    <span className="text-emerald-300 font-medium">{activeBlogPost.field_spec.agents_mobilises.join(' • ')}</span>
                  </div>
                  <div className="bg-white/[0.03] p-3 rounded-xl border border-rk-line-soft">
                    <span className="text-slate-400 block text-[11px]">Livrables générés :</span>
                    <span className="text-white font-medium">{activeBlogPost.field_spec.livrables_generes}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Client Quote & Verified ROI Metrics if exists */}
            {activeBlogPost.client_quote && (
              <div className="bg-gradient-to-r from-emerald-950/40 via-[#070c1e] to-blue-950/30 border border-emerald-500/40 rounded-2xl p-6 relative">
                <Quote className="w-8 h-8 text-emerald-500/20 absolute top-4 right-4" />
                <p className="text-sm sm:text-base text-emerald-200 italic leading-relaxed font-light">
                  "{activeBlogPost.client_quote.quote}"
                </p>
                <div className="mt-4 pt-3 border-t border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-white">{activeBlogPost.client_quote.author}</div>
                    <div className="text-[11px] font-mono text-slate-400">{activeBlogPost.client_quote.role} • {activeBlogPost.client_quote.company}</div>
                  </div>
                  <div className="bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 rounded-xl text-xs font-mono text-emerald-300 font-bold self-start sm:self-auto">
                    {activeBlogPost.client_quote.metrics}
                  </div>
                </div>
              </div>
            )}

            {/* Main content body formatted */}
            <div className="text-sm sm:text-base text-slate-300 font-light leading-relaxed whitespace-pre-line space-y-4 pt-2">
              {activeBlogPost.content}
            </div>

            {/* Tags strip */}
            <div className="pt-4 border-t border-rk-line flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono text-slate-400">Mots-clés :</span>
              {activeBlogPost.tags.map((tag, idx) => (
                <span key={idx} className="text-xs font-mono bg-white/[0.05] border border-rk-line text-slate-300 px-2.5 py-1 rounded-lg">
                  #{tag}
                </span>
              ))}
            </div>

            {/* Conversion CTA in Modal */}
            <div className="bg-rk-bg border border-rk-line rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-serif text-lg font-bold text-white">Vous souhaitez un déploiement similaire ?</h4>
                <p className="text-xs text-slate-400 mt-0.5">Nos équipes évaluent vos besoins et interviennent sous 48h à Yaoundé ou Douala.</p>
              </div>
              <button
                onClick={() => {
                  setActiveBlogPost(null);
                  setIsQuoteModalOpen(true);
                }}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-5 py-3 rounded-xl flex items-center gap-2 cursor-pointer transition-all shadow-lg shadow-emerald-500/20 flex-shrink-0"
              >
                <span>Calculer mon devis</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
