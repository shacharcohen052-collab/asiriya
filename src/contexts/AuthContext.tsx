'use client';

import { createContext, useContext, useEffect, useState } from 'react';
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
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  signInWithGoogle: () => Promise<any>;
  signOut: () => Promise<void>;
  getCurrentUser: () => Promise<any>;
  getUserProfile: () => Promise<UserProfile | null>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchProfile = async (userId: string): Promise<UserProfile | null> => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('id, email, display_name, role, is_approved, avatar_url, life_work, relationship_status, hobbies, path_duration, connection_strength, desired_quality')
          .eq('auth_user_id', userId)
          .eq('is_approved', true)
          .maybeSingle();
        if (!error && data) return data as UserProfile;
        if (error) console.error('Profile lookup failed', error.message);
      } catch (error) {
        console.error('Profile lookup failed', error);
      }
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
    return null;
  };

  const applySession = async (nextSession: any, isMounted: () => boolean) => {
    if (!isMounted()) return;
    setSession(nextSession);
    setUser(nextSession?.user ?? null);

    if (!nextSession?.user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setProfile(null);
    // Do not await this from inside onAuthStateChange. Supabase auth callbacks
    // must return immediately so the browser session can finish persisting.
    const nextProfile = await fetchProfile(nextSession.user.id);
    if (isMounted()) {
      setProfile(nextProfile);
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const isMounted = () => mounted;

    // The auth listener must stay synchronous. Profile loading happens in the
    // separate applySession task to avoid deadlocking OAuth session persistence.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void applySession(nextSession, isMounted);
    });

    supabase.auth
      .getSession()
      .then(({ data: { session: currentSession } }) => applySession(currentSession, isMounted))
      .catch((error) => {
        console.error('Session lookup failed', error);
        if (mounted) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, metadata: Record<string, string> = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: metadata.fullName || '' },
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

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  };

  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/`,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setLoading(false);
    if (error) throw error;
  };

  const getCurrentUser = async () => {
    const { data: { user: currentUser }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return currentUser;
  };

  const getUserProfile = async (): Promise<UserProfile | null> => {
    if (!user) return null;
    return fetchProfile(user.id);
  };

  const refreshProfile = async () => {
    if (!user) return;
    setProfile(await fetchProfile(user.id));
  };

  const value: AuthContextType = {
    user,
    session,
    profile,
    loading,
    isApproved: profile?.is_approved === true,
    isAdmin: profile?.role === 'admin',
    signUp,
    signIn,
    resetPassword,
    updatePassword,
    signInWithGoogle,
    signOut,
    getCurrentUser,
    getUserProfile,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
