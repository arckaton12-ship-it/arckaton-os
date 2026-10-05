import React from 'react';
import { Header } from './Header';
import { SectionNav } from './SectionNav';
import { BackToTop } from './BackToTop';
import { Hero } from './Hero';
import { TrustStrip } from './TrustStrip';
import { ConversionBar } from './ConversionBar';
import { BentoApproach } from './BentoApproach';
import { ProductArkaPme } from './ProductArkaPme';
import { Realisations } from './Realisations';
import { Testimonials } from './Testimonials';
import { FieldBlogSection } from './FieldBlogSection';
import { Forfaits } from './Forfaits';
import { AboutApproach } from './AboutApproach';
import { Faq } from './Faq';
import { ContactSection } from './ContactSection';
import { Footer } from './Footer';
import { QuoteModal } from './QuoteModal';
import { TrialModal } from './TrialModal';
import { AgentModal } from './AgentModal';
import { ClientPortalModal } from './ClientPortalModal';
import { BlueprintModal } from './BlueprintModal';
import { LegalModal } from './LegalModal';
import { useApp } from '../../contexts/AppContext';

export const PublicSite: React.FC = () => {
  const { theme } = useApp();

  return (
    <div className={`min-h-dvh bg-rk-bg text-rk-text flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950 transition-colors duration-300 ${theme === 'light' ? 'theme-light' : 'theme-dark'}`}>
      {/* Top Fixed Header */}
      <Header />

      {/* Navigation mobile collee (chips de sections) */}
      <SectionNav />

      {/* Main Public Content */}
      <main className="flex-1 pb-20 lg:pb-0">
        <Hero />
        <TrustStrip />
        <BentoApproach />
        <ProductArkaPme />
        <Realisations />
        <Testimonials />
        <FieldBlogSection />
        <Forfaits />
        <AboutApproach />
        <Faq />
        <ContactSection />
      </main>

      {/* Global Footer */}
      <Footer />

      {/* Interactive Modals */}
      <QuoteModal />
      <TrialModal />
      <AgentModal />
      <ClientPortalModal />
      <BlueprintModal />
      <LegalModal />

      {/* Points de conversion permanents (barre mobile, WhatsApp) */}
      <ConversionBar />
      <BackToTop />
    </div>
  );
};
