import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { BlogPost } from '../../types';
import { 
  Camera, 
  ArrowRight, 
  MapPin, 
  TrendingUp, 
  Calendar, 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  SlidersHorizontal 
} from 'lucide-react';
import { motion } from 'motion/react';

export const FieldBlogSection: React.FC = () => {
  const { blogPosts, setActiveBlogPost } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'Tous les Récits' },
    { id: 'terrain', label: 'Opérations Terrain' },
    { id: 'client', label: 'Clients Satisfaits & ROI' },
    { id: 'tech', label: 'Ingénierie & Tech' },
    { id: 'arka', label: 'SaaS ARKA-PME' },
  ];

  const filteredPosts = blogPosts.filter((post) => {
    if (selectedCategory === 'all') return true;
    return post.category === selectedCategory;
  });

  return (
    <section id="blog" className="py-24 bg-[#080d1e] relative overflow-hidden border-t border-white/[0.08]">
      {/* Blueprint Grid and Lighting */}
      <div className="absolute inset-0 bg-blueprint-grid opacity-25 pointer-events-none" />
      <div className="absolute top-1/2 -left-40 w-96 h-96 bg-emerald-500/[0.04] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-40 w-96 h-96 bg-blue-500/[0.05] rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] px-3.5 py-1.5 rounded-full text-xs text-emerald-400 font-mono mb-4">
              <Camera className="w-3.5 h-3.5" />
              <span>Journal de Bord & Agents en Action • Yaoundé & Douala</span>
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight">
              Preuves par le terrain.<br />
              <span className="text-emerald-400 font-normal italic">
                Récits de déploiements et résultats clients.
              </span>
            </h2>
            <p className="text-sm sm:text-base text-slate-300 mt-4 leading-relaxed font-light">
              La technologie ne s'invente pas dans une tour d'ivoire. Découvrez comment nos cadreurs, ingénieurs et chefs de projets interviennent au cœur des commerces locaux pour bâtir des systèmes souverains et rentables.
            </p>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                  selectedCategory === c.id
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                    : 'bg-[#0f172e] text-slate-400 hover:text-white border border-white/[0.06]'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Blog Post Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
          {filteredPosts.map((post) => (
            <motion.article
              key={post.id}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              onClick={() => setActiveBlogPost(post)}
              className="bg-[#0b1329] border border-white/10 hover:border-emerald-500/40 rounded-3xl overflow-hidden cursor-pointer shadow-xl transition-all group flex flex-col justify-between"
            >
              <div>
                {/* Visual Thumbnail */}
                <div className="relative h-60 w-full overflow-hidden bg-slate-900">
                  <img
                    src={post.image}
                    alt={post.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0b1329] via-[#0b1329]/30 to-transparent" />

                  {/* Top Badges */}
                  <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase bg-black/60 backdrop-blur-md text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/30">
                      {post.category_label}
                    </span>
                    <span className="text-[10px] font-mono text-slate-300 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{post.read_time}</span>
                    </span>
                  </div>

                  {/* Field Mission Badge if applicable */}
                  {post.field_spec && (
                    <div className="absolute bottom-4 left-4 right-4 bg-black/70 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-xl text-[11px] font-mono text-slate-200 flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span className="truncate">{post.field_spec.lieu}</span>
                    </div>
                  )}

                  {/* Client ROI Badge if applicable */}
                  {post.client_quote && (
                    <div className="absolute bottom-4 left-4 right-4 bg-emerald-950/80 backdrop-blur-md border border-emerald-500/30 px-3 py-1.5 rounded-xl text-[11px] font-mono text-emerald-300 flex items-center gap-2">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span className="truncate font-semibold">{post.client_quote.metrics}</span>
                    </div>
                  )}
                </div>

                {/* Card Content */}
                <div className="p-6 sm:p-7">
                  <div className="text-xs text-slate-400 font-mono mb-2 flex items-center gap-2">
                    <span>{post.date}</span>
                    <span>•</span>
                    <span className="text-emerald-400">{post.author_name}</span>
                    <span className="text-slate-500">({post.author_role})</span>
                  </div>

                  <h3 className="font-serif text-xl sm:text-2xl font-bold text-white group-hover:text-emerald-300 transition-colors leading-snug">
                    {post.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-300 mt-3 font-light leading-relaxed line-clamp-3">
                    {post.excerpt}
                  </p>
                </div>
              </div>

              {/* Card Footer Action */}
              <div className="px-6 sm:px-7 pb-6 pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400 group-hover:text-emerald-400 transition-colors flex items-center gap-1.5 font-medium">
                  <span>Consulter le rapport complet</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="flex items-center gap-1.5">
                  {post.tags.slice(0, 2).map((t, idx) => (
                    <span key={idx} className="bg-white/[0.04] text-[10px] text-slate-400 px-2 py-0.5 rounded border border-white/[0.06]">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            </motion.article>
          ))}
        </div>

      </div>
    </section>
  );
};
