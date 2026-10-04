/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { MotionConfig } from 'motion/react';
import { AuthProvider } from './contexts/AuthContext';
import { AppProvider, useApp } from './contexts/AppContext';
import { ToastProvider } from './contexts/ToastContext';
import { PublicSite } from './components/public/PublicSite';

// Le dashboard (interne) est charge a la demande : un visiteur du site public
// ne telecharge donc pas le code de l'espace de travail. Cela allege le bundle
// initial servi aux visiteurs.
const DashboardLayout = React.lazy(() =>
  import('./components/dashboard/DashboardLayout').then((m) => ({ default: m.DashboardLayout }))
);

function MainRouter() {
  const { mode, theme } = useApp();

  // Les classes de thème sont appliquées une seule fois, dans AppContext
  // (sur <html> et <body>). Ici on ne fait que le wrapper local.
  return (
    <div className={theme === 'light' ? 'theme-light' : 'theme-dark'}>
      {mode === 'public' ? (
        <PublicSite />
      ) : (
        <React.Suspense
          fallback={
            <div className="min-h-screen flex items-center justify-center bg-rk-base text-rk-muted text-sm">
              Chargement de l'espace de travail…
            </div>
          }
        >
          <DashboardLayout />
        </React.Suspense>
      )}
    </div>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <ToastProvider>
        <AuthProvider>
          <AppProvider>
            <MainRouter />
          </AppProvider>
        </AuthProvider>
      </ToastProvider>
    </MotionConfig>
  );
}
