import React from 'react';
import { useApp } from '../../contexts/AppContext';
import { MessageCircle, FileText, Sparkles } from 'lucide-react';

/**
 * Points de conversion permanents du site public.
 *
 * - Mobile : barre collante en bas, accessible au pouce a tout moment du
 *   defilement (devis, conseiller, WhatsApp).
 * - Bureau : bouton WhatsApp flottant.
 *
 * Le numero WhatsApp vient de la config du site (table content_items), jamais
 * code en dur, afin qu'une modification du CMS se repercute ici.
 */
export const ConversionBar: React.FC = () => {
  const { ouvrirWizard, setIsAgentModalOpen, siteConfig } = useApp();

  const numero = siteConfig?.contact?.whatsapp_number?.replace(/[^0-9]/g, '');
  const lienWhatsApp = numero
    ? `https://wa.me/${numero}?text=${encodeURIComponent(
        'Bonjour Arckaton, je souhaite discuter de mon projet digital.'
      )}`
    : undefined;

  const actionBase =
    'flex flex-col items-center justify-center gap-1 rounded-xl py-2.5 text-xs font-medium transition-colors cursor-pointer';

  return (
    <>
      {/* Barre collante mobile */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-rk-line bg-rk-chrome/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-3 gap-2 px-3 py-2.5">
          <button
            type="button"
            onClick={() => ouvrirWizard('devis')}
            className={`${actionBase} bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold`}
          >
            <FileText className="w-4 h-4" aria-hidden="true" />
            <span>Devis gratuit</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAgentModalOpen(true)}
            className={`${actionBase} bg-white/[0.06] hover:bg-white/[0.12] text-rk-text border border-rk-line`}
          >
            <Sparkles className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            <span>Conseiller</span>
          </button>

          {lienWhatsApp ? (
            <a
              href={lienWhatsApp}
              target="_blank"
              rel="noopener noreferrer"
              className={`${actionBase} bg-white/[0.06] hover:bg-white/[0.12] text-rk-text border border-rk-line`}
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              <span>WhatsApp</span>
            </a>
          ) : (
            <button
              type="button"
              onClick={() => ouvrirWizard('devis')}
              className={`${actionBase} bg-white/[0.06] hover:bg-white/[0.12] text-rk-text border border-rk-line`}
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              <span>WhatsApp</span>
            </button>
          )}
        </div>
      </div>

      {/* Bouton flottant bureau */}
      {lienWhatsApp && (
        <a
          href={lienWhatsApp}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Discuter sur WhatsApp"
          className="hidden lg:flex fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 items-center justify-center shadow-xl shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-transform"
        >
          <MessageCircle className="w-6 h-6" aria-hidden="true" />
        </a>
      )}
    </>
  );
};