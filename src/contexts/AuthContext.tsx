import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { UserProfile, UserRole, MemberProfile, Pole } from '../types';

interface AuthContextType {
  user: UserProfile;
  role: UserRole;
  member: MemberProfile | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  completeSession: (token: string, member: MemberProfile) => void;
  switchUser: (userId: string) => void;
  availableUsers: UserProfile[];
  hasPerm: (perm: string) => boolean;
  isAdmin: boolean;
  isSiteEditor: boolean;
  canManageFinances: boolean;
  canEditSite: boolean;
  canBat: boolean;
  scopePole: Pole | 'all';
}

const TOKEN_KEY = 'arckaton_os_token';
const MEMBER_KEY = 'arckaton_os_member';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const toUserProfile = (m: MemberProfile): UserProfile => ({
  id: m.id,
  name: m.name,
  email: m.email,
  role: m.role,
  phone: m.phone || undefined,
  poste_id: m.poste_id || undefined,
  poste_titre: m.poste_titre || undefined,
  pole: m.pole,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [member, setMember] = useState<MemberProfile | null>(() => {
    const saved = localStorage.getItem(MEMBER_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return null;
  });
  const [loading, setLoading] = useState<boolean>(true);

  const refreshMe = useCallback(async () => {
    const t = localStorage.getItem(TOKEN_KEY);
    if (!t) {
      setMember(null);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${t}` } });
      if (!res.ok) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(MEMBER_KEY);
        setToken(null);
        setMember(null);
        return;
      }
      const data = await res.json();
      setMember(data.member);
    } catch (err) {
      // Hors-ligne / serveur indisponible : on conserve la session locale
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Connexion impossible');
    }
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(MEMBER_KEY, JSON.stringify(data.member));
    setToken(data.token);
    setMember(data.member);
  }, []);

  const logout = useCallback(async () => {
    const t = localStorage.getItem(TOKEN_KEY);
    if (t) {
      fetch('/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${t}` } }).catch(() => {});
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(MEMBER_KEY);
    setToken(null);
    setMember(null);
  }, []);

  const completeSession = useCallback((t: string, m: MemberProfile) => {
    localStorage.setItem(TOKEN_KEY, t);
    localStorage.setItem(MEMBER_KEY, JSON.stringify(m));
    setToken(t);
    setMember(m);
  }, []);

  const hasPerm = useCallback(
    (perm: string): boolean => {
      if (!member) return false;
      if (!member.active) return false;
      if (member.role === 'admin') return true;
      return (member.permissions || []).includes(perm);
    },
    [member]
  );

  const user = useMemo<UserProfile>(() => (member ? toUserProfile(member) : ({} as UserProfile)), [member]);
  const role: UserRole = member ? member.role : 'membre';
  const isAuthenticated = Boolean(token && member);
  const isAdmin = role === 'admin';
  const isSiteEditor = hasPerm('content');
  const canManageFinances = hasPerm('finance');
  const canEditSite = isSiteEditor;
  const canBat = hasPerm('bat');
  const scopePole: Pole | 'all' = member && member.role !== 'admin' ? member.pole : 'all';

  const value: AuthContextType = {
    user,
    role,
    member,
    isAuthenticated,
    loading,
    login,
    logout,
    refreshMe,
    completeSession,
    switchUser: () => {}, // remplacé par la vraie auth : fin de la simulation
    availableUsers: [],
    hasPerm,
    isAdmin,
    isSiteEditor,
    canManageFinances,
    canEditSite,
    canBat,
    scopePole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};