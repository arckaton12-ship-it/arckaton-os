import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { BlogPost, ForfaitData } from '../../types';
import { 
  Globe, 
  FileText, 
  Sparkles, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  Lock, 
  Save,
  Megaphone,
  DollarSign,
  Phone,
  Layout,
  Layers,
  ArrowRight,
  Eye,
  Sliders
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const SiteAdmin: React.FC = () => {
  const { isSiteEditor, role, user } = useAuth();
  const { 
    siteConfig, 
    updateAnnouncementConfig, 
    updateHeroConfig, 
    updateContactConfig,
    forfaits,
    updateForfait,
    blogPosts,
    addBlogPost,
    updateBlogPost,
    deleteBlogPost,
    setActiveBlogPost
  } = useApp();

  const [activeTab, setActiveTab] = useState<'announcement' | 'hero' | 'forfaits' | 'blog' | 'contact'>('announcement');
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Announcement state form
  const [announcementForm, setAnnouncementForm] = useState(siteConfig.announcement);

  // Hero state form
  const [heroForm, setHeroForm] = useState(siteConfig.hero);

  // Contact state form
  const [contactForm, setContactForm] = useState(siteConfig.contact);

  // Selected Forfait to edit
  const [editingForfait, setEditingForfait] = useState<ForfaitData | null>(null);

  // New Blog Post Form Modal
  const [isBlogModalOpen, setIsBlogModalOpen] = useState(false);
  const [editingBlogPost, setEditingBlogPost] = useState<BlogPost | null>(null);
  const [blogFormData, setBlogFormData] = useState<Omit<BlogPost, 'id' | 'date'>>({
    title: '',
    slug: '',
    category: 'terrain',
    category_label: 'Opérations Terrain',
    read_time: '5 min',
    excerpt: '',
    content: '',
    author_name: user?.displayName || 'Agent Arckaton',
    author_role: 'Directeur des Opérations',
    image: 'https://images.unsplash.com/photo-1577962917302-cd874c4e31d2?auto=format&fit=crop&w=1200&q=80',
    tags: ['Terrain', 'Yaoundé', 'PME'],
    featured: false,
  });

  const triggerToast = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), 3000);
  };

  const handleSaveAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    updateAnnouncementConfig(announcementForm);
    triggerToast("Bandeau d'annonce du site mis à jour en direct !");
  };

  const handleSaveHero = (e: React.FormEvent) => {
    e.preventDefault();
    updateHeroConfig(heroForm);
    triggerToast("Section Héro et statistiques principales synchronisées en direct !");
  };

  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    updateContactConfig(contactForm);
    triggerToast("Canaux de contact et coordonnées agence mis à jour !");
  };

  const handleSaveForfait = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingForfait) {
      updateForfait(editingForfait.id, editingForfait);
      setEditingForfait(null);
      triggerToast(`Forfait "${editingForfait.name}" mis à jour avec succès !`);
    }
  };

  const handleSaveBlogPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBlogPost) {
      updateBlogPost(editingBlogPost.id, blogFormData);
      triggerToast("Article du Journal de Bord mis à jour !");
    } else {
      addBlogPost(blogFormData);
      triggerToast("Nouvel article terrain publié sur le site public !");
    }
    setIsBlogModalOpen(false);
    setEditingBlogPost(null);
  };

  const openNewBlogModal = () => {
    setEditingBlogPost(null);
    setBlogFormData({
      title: '',
      slug: '',
      category: 'terrain',
      category_label: 'Opérations Terrain',
      read_time: '5 min',
      excerpt: '',
      content: '',
      author_name: user?.displayName || 'Agent Arckaton',
      author_role: 'Opérations & Terrain',
      image: 'https://images.unsplash.com/photo-1577962917302-cd874c4e31d2?auto=format&fit=crop&w=1200&q=80',
      tags: ['Terrain', 'Commerce'],
      featured: false,
    });
    setIsBlogModalOpen(true);
  };

  const openEditBlogModal = (post: BlogPost) => {
    setEditingBlogPost(post);
    setBlogFormData({
      title: post.title,
      slug: post.slug,
      category: post.category,
      category_label: post.category_label,
      read_time: post.read_time,
      excerpt: post.excerpt,
      content: post.content,
      author_name: post.author_name,
      author_role: post.author_role,
      image: post.image,
      tags: post.tags,
      featured: post.featured,
      client_quote: post.client_quote,
      field_spec: post.field_spec,
    });
    setIsBlogModalOpen(true);
  };

  // Permission Gate: allows admin, superadmin, editor
  if (!isSiteEditor) {
    return (
      <div className="bg-[#0b1329] border border-rose-500/30 rounded-3xl p-8 text-center space-y-4 max-w-lg mx-auto my-12">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h3 className="font-serif text-xl font-bold text-white">Accès Réservé au Gestionnaire du Site</h3>
        <p className="text-xs text-slate-300 font-light leading-relaxed">
          Votre rôle actuel (<span className="text-rose-400 font-mono">{role}</span>) ne possède pas les privilèges d'administration CMS. Seuls les administrateurs et éditeurs du site peuvent modifier le contenu public.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {saveToast && (
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="fixed top-6 right-6 z-50 bg-emerald-500 text-slate-950 px-5 py-3 rounded-2xl font-mono text-xs font-bold shadow-2xl flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{saveToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="bg-[#0b1329] border border-white/10 p-6 sm:p-8 rounded-3xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/[0.03] rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono mb-3">
              <Globe className="w-3.5 h-3.5" />
              <span>Universal Live CMS • Souveraineté & Contrôle Total</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Gestionnaire Intégral du Site Public
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl font-light">
              Modifiez chaque segment du site en direct sans toucher au code : bandeau d'alerte, titres du hero, tarifs des forfaits, articles du journal de bord et canaux WhatsApp.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Mode Écriture Actif</span>
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-white/[0.08]">
          <button
            onClick={() => setActiveTab('announcement')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono transition-all cursor-pointer ${
              activeTab === 'announcement'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                : 'bg-[#070c1e] text-slate-400 hover:text-white border border-white/[0.06]'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>Bandeau d'Annonce</span>
          </button>

          <button
            onClick={() => setActiveTab('hero')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono transition-all cursor-pointer ${
              activeTab === 'hero'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                : 'bg-[#070c1e] text-slate-400 hover:text-white border border-white/[0.06]'
            }`}
          >
            <Layout className="w-3.5 h-3.5" />
            <span>Section Hero & Stats</span>
          </button>

          <button
            onClick={() => setActiveTab('forfaits')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono transition-all cursor-pointer ${
              activeTab === 'forfaits'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                : 'bg-[#070c1e] text-slate-400 hover:text-white border border-white/[0.06]'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Forfaits & Tarifs (3)</span>
          </button>

          <button
            onClick={() => setActiveTab('blog')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono transition-all cursor-pointer ${
              activeTab === 'blog'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                : 'bg-[#070c1e] text-slate-400 hover:text-white border border-white/[0.06]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Journal de Bord ({blogPosts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('contact')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono transition-all cursor-pointer ${
              activeTab === 'contact'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                : 'bg-[#070c1e] text-slate-400 hover:text-white border border-white/[0.06]'
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Canaux & Coordonnées</span>
          </button>
        </div>
      </div>

      {/* TAB 1 : BANDEAU D'ANNONCE */}
      {activeTab === 'announcement' && (
        <div className="bg-[#0b1329] border border-white/10 rounded-3xl p-6 sm:p-8">
          <div className="mb-6">
            <h3 className="font-serif text-xl font-bold text-white">Bandeau Supérieur d'Alerte & Événements</h3>
            <p className="text-xs text-slate-400 mt-1">S'affiche tout en haut du site public pour diffuser les alertes ou lancements majeurs.</p>
          </div>

          <form onSubmit={handleSaveAnnouncement} className="space-y-4 max-w-3xl">
            <div className="flex items-center gap-3 bg-[#070c1e] p-4 rounded-2xl border border-white/[0.06]">
              <input
                type="checkbox"
                id="announcement-enabled"
                checked={announcementForm.enabled}
                onChange={(e) => setAnnouncementForm({ ...announcementForm, enabled: e.target.checked })}
                className="w-4 h-4 accent-emerald-500"
              />
              <label htmlFor="announcement-enabled" className="text-xs font-mono text-white font-semibold cursor-pointer">
                Activer et afficher ce bandeau d'alerte sur le site public
              </label>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase mb-1.5">Badge de l'annonce :</label>
              <input
                type="text"
                value={announcementForm.badge}
                onChange={(e) => setAnnouncementForm({ ...announcementForm, badge: e.target.value })}
                className="w-full bg-[#070c1e] border border-white/10 rounded-xl p-3 text-xs text-white"
                placeholder="Ex: DÉPLOIEMENT T3 2026"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase mb-1.5">Texte principal du message :</label>
              <textarea
                rows={2}
                value={announcementForm.text}
                onChange={(e) => setAnnouncementForm({ ...announcementForm, text: e.target.value })}
                className="w-full bg-[#070c1e] border border-white/10 rounded-xl p-3 text-xs text-white resize-none"
                placeholder="Ex: Ouverture du pôle Grand Compte à Douala Bonanjo..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 uppercase mb-1.5">Intitulé du bouton d'action :</label>
                <input
                  type="text"
                  value={announcementForm.button_text}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, button_text: e.target.value })}
                  className="w-full bg-[#070c1e] border border-white/10 rounded-xl p-3 text-xs text-white"
                  placeholder="Ex: Découvrir le rapport"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-slate-400 uppercase mb-1.5">Lien cible (Ancre ou URL) :</label>
                <input
                  type="text"
                  value={announcementForm.target_url}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, target_url: e.target.value })}
                  className="w-full bg-[#070c1e] border border-white/10 rounded-xl p-3 text-xs text-white"
                  placeholder="#blog"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                <Save className="w-4 h-4" />
                <span>Enregistrer & Déployer</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2 : HERO SECTION & STATS */}
      {activeTab === 'hero' && (
        <div className="bg-[#0b1329] border border-white/10 rounded-3xl p-6 sm:p-8">
          <div className="mb-6">
            <h3 className="font-serif text-xl font-bold text-white">Section Héro Principale & Chiffres d'Autorité</h3>
            <p className="text-xs text-slate-400 mt-1">Le premier message que voient les prospects et clients en arrivant sur le site.</p>
          </div>

          <form onSubmit={handleSaveHero} className="space-y-5 max-w-3xl">
            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase mb-1.5">Badge de localisation & statut :</label>
              <input
                type="text"
                value={heroForm.badge}
                onChange={(e) => setHeroForm({ ...heroForm, badge: e.target.value })}
                className="w-full bg-[#070c1e] border border-white/10 rounded-xl p-3 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 uppercase mb-1.5">Titre principal (Ligne 1) :</label>
                <input
                  type="text"
                  value={heroForm.title_line_1}
                  onChange={(e) => setHeroForm({ ...heroForm, title_line_1: e.target.value })}
                  className="w-full bg-[#070c1e] border border-white/10 rounded-xl p-3 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-slate-400 uppercase mb-1.5">Titre mis en relief (Vert émeraude) :</label>
                <input
                  type="text"
                  value={heroForm.title_highlight}
                  onChange={(e) => setHeroForm({ ...heroForm, title_highlight: e.target.value })}
                  className="w-full bg-[#070c1e] border border-white/10 rounded-xl p-3 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase mb-1.5">Sous-titre descriptif :</label>
              <textarea
                rows={3}
                value={heroForm.subtitle}
                onChange={(e) => setHeroForm({ ...heroForm, subtitle: e.target.value })}
                className="w-full bg-[#070c1e] border border-white/10 rounded-xl p-3 text-xs text-white resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 uppercase mb-1.5">Bouton Action Primaire :</label>
                <input
                  type="text"
                  value={heroForm.cta_primary}
                  onChange={(e) => setHeroForm({ ...heroForm, cta_primary: e.target.value })}
                  className="w-full bg-[#070c1e] border border-white/10 rounded-xl p-3 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-slate-400 uppercase mb-1.5">Bouton Action Secondaire :</label>
                <input
                  type="text"
                  value={heroForm.cta_secondary}
                  onChange={(e) => setHeroForm({ ...heroForm, cta_secondary: e.target.value })}
                  className="w-full bg-[#070c1e] border border-white/10 rounded-xl p-3 text-xs text-white"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-white/[0.08]">
              <span className="text-xs font-mono text-slate-400 uppercase block mb-3 font-bold">Les 3 Métriques Clés du Héro :</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#070c1e] p-3.5 rounded-xl border border-white/[0.06]">
                  <input
                    type="text"
                    value={heroForm.stat_1_val}
                    onChange={(e) => setHeroForm({ ...heroForm, stat_1_val: e.target.value })}
                    className="w-full bg-transparent border-b border-white/10 text-emerald-400 font-bold text-base mb-1"
                  />
                  <input
                    type="text"
                    value={heroForm.stat_1_label}
                    onChange={(e) => setHeroForm({ ...heroForm, stat_1_label: e.target.value })}
                    className="w-full bg-transparent text-slate-400 text-[11px]"
                  />
                </div>

                <div className="bg-[#070c1e] p-3.5 rounded-xl border border-white/[0.06]">
                  <input
                    type="text"
                    value={heroForm.stat_2_val}
                    onChange={(e) => setHeroForm({ ...heroForm, stat_2_val: e.target.value })}
                    className="w-full bg-transparent border-b border-white/10 text-emerald-400 font-bold text-base mb-1"
                  />
                  <input
                    type="text"
                    value={heroForm.stat_2_label}
                    onChange={(e) => setHeroForm({ ...heroForm, stat_2_label: e.target.value })}
                    className="w-full bg-transparent text-slate-400 text-[11px]"
                  />
                </div>

                <div className="bg-[#070c1e] p-3.5 rounded-xl border border-white/[0.06]">
                  <input
                    type="text"
                    value={heroForm.stat_3_val}
                    onChange={(e) => setHeroForm({ ...heroForm, stat_3_val: e.target.value })}
                    className="w-full bg-transparent border-b border-white/10 text-emerald-400 font-bold text-base mb-1"
                  />
                  <input
                    type="text"
                    value={heroForm.stat_3_label}
                    onChange={(e) => setHeroForm({ ...heroForm, stat_3_label: e.target.value })}
                    className="w-full bg-transparent text-slate-400 text-[11px]"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                <Save className="w-4 h-4" />
                <span>Sauvegarder le Héro</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3 : FORFAITS & PRIX */}
      {activeTab === 'forfaits' && (
        <div className="space-y-6">
          <div className="bg-[#0b1329] border border-white/10 rounded-3xl p-6 sm:p-8">
            <div className="mb-6">
              <h3 className="font-serif text-xl font-bold text-white">Gestion des Forfaits Commerciaux</h3>
              <p className="text-xs text-slate-400 mt-1">Ajustez les prix de création, abonnements mensuels et quotas de sorties terrain.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {forfaits.map((f) => (
                <div key={f.id} className="bg-[#070c1e] border border-white/[0.08] rounded-2xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono text-emerald-400 uppercase font-bold">Forfait #{f.number}</span>
                      {f.recommended && (
                        <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                          Recommandé
                        </span>
                      )}
                    </div>
                    <h4 className="font-serif text-2xl font-bold text-white">{f.name}</h4>
                    <p className="text-xs text-slate-400 mt-1 font-light line-clamp-2">{f.tagline}</p>

                    <div className="mt-4 p-3 bg-white/[0.02] rounded-xl border border-white/[0.05] space-y-1 text-xs font-mono">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Création :</span>
                        <span className="text-white font-bold">{f.creation_price}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Mensuel :</span>
                        <span className="text-emerald-400 font-bold">{f.monthly_price}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Terrain :</span>
                        <span className="text-slate-300">{f.sorties_terrain}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setEditingForfait(f)}
                    className="mt-5 w-full bg-white/[0.06] hover:bg-white/[0.12] text-white py-2 rounded-xl text-xs font-mono flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Modifier les tarifs & livrables</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Edit Forfait Modal */}
          {editingForfait && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <div className="bg-[#0b1329] border border-white/15 rounded-3xl max-w-xl w-full p-6 sm:p-8 relative">
                <h3 className="font-serif text-2xl font-bold text-white mb-1">
                  Édition du Forfait {editingForfait.name}
                </h3>
                <p className="text-xs text-slate-400 mb-6">Mise à jour immédiate répercutée sur le comparateur et le devis.</p>

                <form onSubmit={handleSaveForfait} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono text-slate-400 uppercase mb-1">Prix Création (Libellé) :</label>
                      <input
                        type="text"
                        value={editingForfait.creation_price}
                        onChange={(e) => setEditingForfait({ ...editingForfait, creation_price: e.target.value })}
                        className="w-full bg-[#070c1e] border border-white/10 rounded-xl p-2.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono text-slate-400 uppercase mb-1">Montant brut FCFA :</label>
                      <input
                        type="number"
                        value={editingForfait.creation_price_amount}
                        onChange={(e) => setEditingForfait({ ...editingForfait, creation_price_amount: Number(e.target.value) })}
                        className="w-full bg-[#070c1e] border border-white/10 rounded-xl p-2.5 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono text-slate-400 uppercase mb-1">Prix Mensuel (Libellé) :</label>
                      <input
                        type="text"
                        value={editingForfait.monthly_price}
                        onChange={(e) => setEditingForfait({ ...editingForfait, monthly_price: e.target.value })}
                        className="w-full bg-[#070c1e] border border-white/10 rounded-xl p-2.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono text-slate-400 uppercase mb-1">Montant mensuel FCFA :</label>
                      <input
                        type="number"
                        value={editingForfait.monthly_price_amount}
                        onChange={(e) => setEditingForfait({ ...editingForfait, monthly_price_amount: Number(e.target.value) })}
                        className="w-full bg-[#070c1e] border border-white/10 rounded-xl p-2.5 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 uppercase mb-1">Sorties Terrain par mois :</label>
                    <input
                      type="text"
                      value={editingForfait.sorties_terrain}
                      onChange={(e) => setEditingForfait({ ...editingForfait, sorties_terrain: e.target.value })}
                      className="w-full bg-[#070c1e] border border-white/10 rounded-xl p-2.5 text-xs text-white"
                    />
                  </div>

                  <div className="pt-4 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setEditingForfait(null)}
                      className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Appliquer les modifications</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4 : JOURNAL DE BORD (BLOG) */}
      {activeTab === 'blog' && (
        <div className="bg-[#0b1329] border border-white/10 rounded-3xl p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="font-serif text-xl font-bold text-white">Articles & Témoignages Terrain</h3>
              <p className="text-xs text-slate-400 mt-1">Publiez les retours d'interventions, études de cas ROI et coulisses R&D.</p>
            </div>
            <button
              onClick={openNewBlogModal}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Rédiger un Récit d'Action</span>
            </button>
          </div>

          <div className="space-y-3">
            {blogPosts.map((post) => (
              <div
                key={post.id}
                className="bg-[#070c1e] border border-white/[0.06] hover:border-white/[0.14] rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
              >
                <div className="flex items-center gap-4">
                  <img
                    src={post.image}
                    alt={post.title}
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
                        {post.category_label}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">{post.date}</span>
                    </div>
                    <h4 className="font-serif text-base font-bold text-white mt-1 leading-snug">{post.title}</h4>
                    <span className="text-xs text-slate-400 font-mono">Auteur : {post.author_name}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto">
                  <button
                    onClick={() => setActiveBlogPost(post)}
                    className="p-2 bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Prévisualiser"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Voir</span>
                  </button>
                  <button
                    onClick={() => openEditBlogModal(post)}
                    className="p-2 bg-white/[0.04] hover:bg-white/[0.08] text-emerald-400 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Modifier"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Éditer</span>
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Supprimer cet article du journal de bord ?")) {
                        deleteBlogPost(post.id);
                        triggerToast("Article retiré avec succès !");
                      }
                    }}
                    className="p-2 bg-white/[0.04] hover:bg-rose-500/20 text-rose-400 rounded-xl text-xs transition-colors cursor-pointer"
                    title="Supprimer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Create/Edit Blog Modal */}
          {isBlogModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
              <div className="bg-[#0b1329] border border-white/15 rounded-3xl max-w-2xl w-full p-6 sm:p-8 relative my-8">
                <h3 className="font-serif text-2xl font-bold text-white mb-1">
                  {editingBlogPost ? "Modifier le Récit Terrain" : "Publier un Nouveau Récit d'Action"}
                </h3>
                <p className="text-xs text-slate-400 mb-6">Visible instantanément sur la page d'accueil dans la section Journal de Bord.</p>

                <form onSubmit={handleSaveBlogPost} className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono text-slate-400 uppercase mb-1">Titre de l'article :</label>
                    <input
                      type="text"
                      required
                      value={blogFormData.title}
                      onChange={(e) => setBlogFormData({ ...blogFormData, title: e.target.value })}
                      className="w-full bg-[#070c1e] border border-white/10 rounded-xl p-3 text-xs text-white"
                      placeholder="Ex: Immersion Terrain : 48h au marché..."
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono text-slate-400 uppercase mb-1">Catégorie :</label>
                      <select
                        value={blogFormData.category}
                        onChange={(e) => {
                          const cat = e.target.value as any;
                          const labels: Record<string, string> = {
                            terrain: 'Opérations Terrain',
                            client: 'Clients Satisfaits & ROI',
                            tech: 'Ingénierie & Tech',
                            arka: 'SaaS ARKA-PME',
                          };
                          setBlogFormData({ ...blogFormData, category: cat, category_label: labels[cat] });
                        }}
                        className="w-full bg-[#070c1e] border border-white/10 rounded-xl p-3 text-xs text-white"
                      >
                        <option value="terrain">Opérations Terrain</option>
                        <option value="client">Clients Satisfaits & ROI</option>
                        <option value="tech">Ingénierie & Tech</option>
                        <option value="arka">SaaS ARKA-PME</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-slate-400 uppercase mb-1">Temps de lecture :</label>
                      <input
                        type="text"
                        value={blogFormData.read_time}
                        onChange={(e) => setBlogFormData({ ...blogFormData, read_time: e.target.value })}
                        className="w-full bg-[#070c1e] border border-white/10 rounded-xl p-3 text-xs text-white"
                        placeholder="Ex: 5 min"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono text-slate-400 uppercase mb-1">Auteur :</label>
                      <input
                        type="text"
                        value={blogFormData.author_name}
                        onChange={(e) => setBlogFormData({ ...blogFormData, author_name: e.target.value })}
                        className="w-full bg-[#070c1e] border border-white/10 rounded-xl p-3 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono text-slate-400 uppercase mb-1">Rôle de l'auteur :</label>
                      <input
                        type="text"
                        value={blogFormData.author_role}
                        onChange={(e) => setBlogFormData({ ...blogFormData, author_role: e.target.value })}
                        className="w-full bg-[#070c1e] border border-white/10 rounded-xl p-3 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 uppercase mb-1">URL Image d'illustration :</label>
                    <input
                      type="text"
                      value={blogFormData.image}
                      onChange={(e) => setBlogFormData({ ...blogFormData, image: e.target.value })}
                      className="w-full bg-[#070c1e] border border-white/10 rounded-xl p-3 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 uppercase mb-1">Extrait court (Teaser) :</label>
                    <textarea
                      rows={2}
                      value={blogFormData.excerpt}
                      onChange={(e) => setBlogFormData({ ...blogFormData, excerpt: e.target.value })}
                      className="w-full bg-[#070c1e] border border-white/10 rounded-xl p-3 text-xs text-white resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 uppercase mb-1">Texte intégral de l'intervention :</label>
                    <textarea
                      rows={6}
                      required
                      value={blogFormData.content}
                      onChange={(e) => setBlogFormData({ ...blogFormData, content: e.target.value })}
                      className="w-full bg-[#070c1e] border border-white/10 rounded-xl p-3 text-xs text-white resize-none"
                    />
                  </div>

                  <div className="pt-4 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsBlogModalOpen(false)}
                      className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{editingBlogPost ? "Mettre à jour" : "Publier l'article"}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5 : CANAUX & COORDONNÉES */}
      {activeTab === 'contact' && (
        <div className="bg-[#0b1329] border border-white/10 rounded-3xl p-6 sm:p-8">
          <div className="mb-6">
            <h3 className="font-serif text-xl font-bold text-white">Canaux de Contact & Lignes Officielles</h3>
            <p className="text-xs text-slate-400 mt-1">Numéro WhatsApp direct, adresses physiques et téléphone d'urgence.</p>
          </div>

          <form onSubmit={handleSaveContact} className="space-y-4 max-w-3xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 uppercase mb-1.5">Numéro WhatsApp (Format URL international) :</label>
                <input
                  type="text"
                  value={contactForm.whatsapp_number}
                  onChange={(e) => setContactForm({ ...contactForm, whatsapp_number: e.target.value })}
                  className="w-full bg-[#070c1e] border border-white/10 rounded-xl p-3 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-slate-400 uppercase mb-1.5">Affichage du numéro WhatsApp :</label>
                <input
                  type="text"
                  value={contactForm.whatsapp_display}
                  onChange={(e) => setContactForm({ ...contactForm, whatsapp_display: e.target.value })}
                  className="w-full bg-[#070c1e] border border-white/10 rounded-xl p-3 text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 uppercase mb-1.5">Téléphone d'astreinte :</label>
                <input
                  type="text"
                  value={contactForm.phone_call}
                  onChange={(e) => setContactForm({ ...contactForm, phone_call: e.target.value })}
                  className="w-full bg-[#070c1e] border border-white/10 rounded-xl p-3 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-slate-400 uppercase mb-1.5">Email Officiel :</label>
                <input
                  type="email"
                  value={contactForm.email_contact}
                  onChange={(e) => setContactForm({ ...contactForm, email_contact: e.target.value })}
                  className="w-full bg-[#070c1e] border border-white/10 rounded-xl p-3 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase mb-1.5">Adresse Bureau Bastos / Yaoundé :</label>
              <input
                type="text"
                value={contactForm.address_yaounde}
                onChange={(e) => setContactForm({ ...contactForm, address_yaounde: e.target.value })}
                className="w-full bg-[#070c1e] border border-white/10 rounded-xl p-3 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase mb-1.5">Adresse Pôle Bonanjo / Douala :</label>
              <input
                type="text"
                value={contactForm.address_douala}
                onChange={(e) => setContactForm({ ...contactForm, address_douala: e.target.value })}
                className="w-full bg-[#070c1e] border border-white/10 rounded-xl p-3 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase mb-1.5">Engagement de Disponibilité / Support :</label>
              <input
                type="text"
                value={contactForm.disponibilite}
                onChange={(e) => setContactForm({ ...contactForm, disponibilite: e.target.value })}
                className="w-full bg-[#070c1e] border border-white/10 rounded-xl p-3 text-xs text-white"
              />
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                <Save className="w-4 h-4" />
                <span>Enregistrer les Coordonnées</span>
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
