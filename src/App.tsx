/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { AppProvider, useApp } from './contexts/AppContext';
import { PublicSite } from './components/public/PublicSite';
import { DashboardLayout } from './components/dashboard/DashboardLayout';

function MainRouter() {
  const { mode, theme } = useApp();

  // Les classes de thème sont appliquées une seule fois, dans AppContext
  // (sur <html> et <body>). Ici on ne fait que le wrapper local.
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
