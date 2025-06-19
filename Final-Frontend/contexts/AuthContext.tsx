// src/contexts/AuthContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { Database } from '@/types/database';

type UserProfile = Database['public']['Tables']['users']['Row'];

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  pendingEmail: string | null;
  signUp: (
    email: string,
    password: string,
    userData: { username: string; phoneNumber: string; role: string }
  ) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  verifyEmail: (email: string, otp: string) => Promise<any>;
  resendVerification: (email: string) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] =
    useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // New: store the email you just signed up with
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  useEffect(() => {
    // on init, get session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      }
      setLoading(false);
    });

    // listen for changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', userId)
        .single();
      if (error) throw error;
      setUserProfile(data);
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    userData: { username: string; phoneNumber: string; role: string }
  ) => {
    // store for verification screen
    setPendingEmail(email);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // you can supply a redirect URL if using magic links
        emailRedirectTo: undefined,
      },
    });
    if (error) throw error;

    // create your app‑specific profile row
    if (data.user) {
      const { error: profileErr } = await supabase
        .from('users')
        .insert({
          user_id: data.user.id,
          email: email,
          username: userData.username,
          phone_number: userData.phoneNumber,
          password_hash: '', // Supabase handles auth
          role: userData.role,
          is_verified: false,
        });
      if (profileErr) throw profileErr;
    }

    return data;
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const verifyEmail = async (email: string, otp: string) => {
    // always use the passed‑in email
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'signup',
    });
    if (error) throw error;

    // mark your profile row as verified
    if (data.user) {
      const { error: updErr } = await supabase
        .from('users')
        .update({ is_verified: true })
        .eq('user_id', data.user.id);
      if (updErr) throw updErr;
    }
    return data;
  };

  const resendVerification = async (email: string) => {
    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });
    if (error) throw error;
    return data;
  };

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    pendingEmail,
    signUp,
    signIn,
    signOut,
    verifyEmail,
    resendVerification,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
