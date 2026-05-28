import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useBottomSheet } from './BottomSheetContext';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: 'ADMIN' | 'STAFF' | 'PENDING' | 'RESIGNED';
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userProfile: UserProfile | null;
  loading: boolean;
  authError?: string | null;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const { showAlert } = useBottomSheet();

  // Fetch or create user profile
  const fetchOrCreateProfile = async (currentUser: User) => {
    try {
      // Try to get existing profile
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (existingProfile) {
        setUserProfile({
          id: existingProfile.id,
          email: existingProfile.email || currentUser.email || '',
          displayName: existingProfile.display_name || currentUser.user_metadata?.display_name || 'Unknown',
          role: existingProfile.role || 'PENDING',
          createdAt: existingProfile.created_at,
        });
        return;
      }

      // If no profile exists, create one
      if (fetchError?.code === 'PGRST116') {
        const isOwnerEmail = currentUser.email === 'panaod3826@gmail.com';
        const newRole = isOwnerEmail ? 'ADMIN' : 'PENDING';
        
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: currentUser.id,
            email: currentUser.email,
            display_name: currentUser.user_metadata?.display_name || 'Unknown',
            role: newRole,
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating profile:', insertError);
          // Set a temporary profile from user data
          setUserProfile({
            id: currentUser.id,
            email: currentUser.email || '',
            displayName: currentUser.user_metadata?.display_name || 'Unknown',
            role: isOwnerEmail ? 'ADMIN' : 'STAFF',
          });
          return;
        }

        if (newProfile) {
          setUserProfile({
            id: newProfile.id,
            email: newProfile.email || currentUser.email || '',
            displayName: newProfile.display_name || 'Unknown',
            role: newProfile.role,
            createdAt: newProfile.created_at,
          });
        }
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      // Fallback: create profile from user data
      const isOwnerEmail = currentUser.email === 'panaod3826@gmail.com';
      setUserProfile({
        id: currentUser.id,
        email: currentUser.email || '',
        displayName: currentUser.user_metadata?.display_name || 'Unknown',
        role: isOwnerEmail ? 'ADMIN' : 'STAFF',
      });
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (currentSession?.user) {
        fetchOrCreateProfile(currentSession.user).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          await fetchOrCreateProfile(currentSession.user);
        } else {
          setUserProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string, displayName: string) => {
    setAuthError(null);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        },
      },
    });
    
    if (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUserProfile(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session,
      userProfile, 
      loading, 
      authError, 
      signInWithEmail, 
      signUpWithEmail, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
