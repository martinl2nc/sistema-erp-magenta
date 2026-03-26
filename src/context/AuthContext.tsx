'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

interface AuthState {
  user: User | null;
  session: Session | null;
  role: 'admin' | 'vendedor' | null;
  nombre: string | null;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchUserProfile(userId: string): Promise<{ rol: string; nombre: string } | null> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from('perfiles_usuario')
      .select('rol, nombre')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Unexpected error fetching user profile:', err);
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    role: null,
    nombre: null,
    isLoading: true,
  });

  const loadProfile = useCallback(async (session: Session) => {
    const profile = await fetchUserProfile(session.user.id);
    setState({
      user: session.user,
      session,
      role: (profile?.rol as 'admin' | 'vendedor') || null,
      nombre: profile?.nombre || null,
      isLoading: false,
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;

        if (
          event === 'INITIAL_SESSION' ||
          event === 'SIGNED_IN' ||
          event === 'TOKEN_REFRESHED'
        ) {
          if (session?.user) {
            setTimeout(() => {
              if (mounted) loadProfile(session);
            }, 0);
          } else {
            setState({ user: null, session: null, role: null, nombre: null, isLoading: false });
          }
        } else if (event === 'SIGNED_OUT') {
          setState({ user: null, session: null, role: null, nombre: null, isLoading: false });
        } else if (event === 'USER_UPDATED') {
          setState(prev => ({ ...prev, user: session?.user || null, session }));
        }
      }
    );

    const safetyTimeout = setTimeout(() => {
      if (mounted) {
        setState(prev => {
          if (prev.isLoading) {
            console.warn('Auth safety timeout: forcing isLoading to false');
            return { ...prev, isLoading: false };
          }
          return prev;
        });
      }
    }, 5000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, [loadProfile]);

  const signOut = async () => {
    const supabase = createClient();
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error during sign out:', err);
    }
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));

    setState({ user: null, session: null, role: null, nombre: null, isLoading: false });
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ ...state, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
