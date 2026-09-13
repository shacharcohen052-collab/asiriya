'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { createClient } from '../lib/supabase/client';

interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  role: 'member' | 'admin';
  is_approved: boolean;
  avatar_url: string | null;
  life_work: string | null;
  relationship_status: string | null;
  hobbies: string | null;
  path_duration: string | null;
  connection_strength: string | null;
  desired_quality: string | null;
}

interface AuthContextType {
  user: any;
  session: any;
  profile: UserProfile | null;
  loading: boolean;
  isApproved: boolean;
  isAdmin: boolean;
  signUp: (email: string, password: string, metadata?: Record<string, string>) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signInWithGoogle: () => Promise<any>;
  signOut: () => Promise<void>;
  getCurrentUser: () => Promise<any>;
  getUserProfile: () => Promise<UserProfile | null>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  // Track last fetched userId to avoid redundant DB calls
  const lastFetchedUserId = useRef<string | null>(null);

  const fetchProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, email, display_name, role, is_approved, avatar_url, life_work, relationship_status, hobbies, path_duration, connection_strength, desired_quality')
        .eq('id', userId)
        .maybeSingle();
      if (error) return null;
      return data as UserProfile | null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    // Safety timeout — never hang longer than 5 seconds
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 5000);

    // Use onAuthStateChange as the single source of truth.
    // It fires immediately with the current session on mount (INITIAL_SESSION event),
    // so we don't need a separate getSession() call.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Only fetch profile if the user changed (avoids double-fetch on token refresh)
        if (lastFetchedUserId.current !== session.user.id) {
          lastFetchedUserId.current = session.user.id;
          const p = await fetchProfile(session.user.id);
          setProfile(p);
        }
      } else {
        lastFetchedUserId.current = null;
        setProfile(null);
      }

      // Mark loading done after first event
      clearTimeout(safetyTimer);
      setLoading(false);
    });

    return () => {
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, metadata: Record<string, string> = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: metadata?.fullName || '' },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
    return data;
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  // Google OAuth — uses same email-to-profile matching logic enforced by DB trigger
  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    lastFetchedUserId.current = null;
    setProfile(null);
  };

  const getCurrentUser = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  };

  const getUserProfile = async (): Promise<UserProfile | null> => {
    if (!user) return null;
    return fetchProfile(user.id);
  };

  const refreshProfile = async () => {
    if (!user) return;
    lastFetchedUserId.current = null; // force re-fetch
    const p = await fetchProfile(user.id);
    setProfile(p);
  };

  const isApproved = profile?.is_approved === true;
  const isAdmin = profile?.role === 'admin';

  const value: AuthContextType = {
    user,
    session,
    profile,
    loading,
    isApproved,
    isAdmin,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    getCurrentUser,
    getUserProfile,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
