import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole, Pole } from '../types';
import { CURRENT_PROFILES } from '../data/mockData';

interface AuthContextType {
  user: UserProfile;
  role: UserRole;
  switchUser: (userId: string) => void;
  availableUsers: UserProfile[];
  isAdmin: boolean;
  isSiteEditor: boolean;
  canManageFinances: boolean;
  canEditSite: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('arckaton_auth_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return CURRENT_PROFILES[0]; // Patrice M. (Admin)
  });

  useEffect(() => {
    localStorage.setItem('arckaton_auth_user', JSON.stringify(currentUser));
  }, [currentUser]);

  const switchUser = (userId: string) => {
    const target = CURRENT_PROFILES.find((p) => p.id === userId);
    if (target) {
      setCurrentUser(target);
    }
  };

  const isAdmin = currentUser.role === 'admin';
  const isSiteEditor = currentUser.role === 'site_editor' || isAdmin;
  const canManageFinances = isAdmin;
  const canEditSite = isSiteEditor;

  return (
    <AuthContext.Provider
      value={{
        user: currentUser,
        role: currentUser.role,
        switchUser,
        availableUsers: CURRENT_PROFILES,
        isAdmin,
        isSiteEditor,
        canManageFinances,
        canEditSite,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
