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
  const { mode } = useApp();

  return (
    <>
      {mode === 'public' ? <PublicSite /> : <DashboardLayout />}
    </>
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
