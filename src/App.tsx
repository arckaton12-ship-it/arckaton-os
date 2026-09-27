/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { AppProvider, useApp } from './contexts/AppContext';
import { PublicSite } from './components/public/PublicSite';
import { DashboardLayout } from './components/dashboard/DashboardLayout';

function MainRouter() {
  const { mode, theme } = useApp();

  // La classe de thème est posée sur <html> : c'est le seul endroit qui
  // contrôle aussi le fond du <body>, sur lequel le mode sombre est codé
  // en dur. Sans cela, une bande sombre reste visible autour du contenu.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('theme-light', theme === 'light');
    root.classList.toggle('theme-dark', theme === 'dark');
    document.body.classList.toggle('theme-light', theme === 'light');
    document.body.classList.toggle('theme-dark', theme === 'dark');
  }, [theme]);

  return (
    <div className={theme === 'light' ? 'theme-light' : 'theme-dark'}>
      {mode === 'public' ? <PublicSite /> : <DashboardLayout />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <MainRouter />
      </AppProvider>
    </AuthProvider>
  );
}
