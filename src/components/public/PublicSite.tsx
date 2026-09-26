import React from 'react';
import { Header } from './Header';
import { Hero } from './Hero';
import { BentoApproach } from './BentoApproach';
import { ProductArkaPme } from './ProductArkaPme';
import { Realisations } from './Realisations';
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
import { useApp } from '../../contexts/AppContext';

export const PublicSite: React.FC = () => {
  const { theme } = useApp();

  return (
    <div className={`min-h-screen bg-[#070c1e] text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950 transition-colors duration-300 ${theme === 'light' ? 'theme-light' : 'theme-dark'}`}>
      {/* Top Fixed Header */}
      <Header />

      {/* Main Public Content */}
      <main className="flex-1">
        <Hero />
        <BentoApproach />
        <ProductArkaPme />
        <Realisations />
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
    </div>
  );
};
