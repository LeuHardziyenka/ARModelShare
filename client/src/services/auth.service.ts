import { supabase } from '@/lib/supabase';
import type { UserProfile } from '@/types';
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js';

// Note: Auth is still handled by Supabase client-side for session management
// The backend validates tokens but doesn't manage sessions
export const authService = {
  // Sign up with email and password
  async signUpWithEmail(email: string, password: string): Promise<UserProfile> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;
    if (!data.user) throw new Error('No user returned from signup');

    return this.mapUser(data.user);
  },

  // Sign in with email and password
  async signInWithEmail(email: string, password: string): Promise<UserProfile> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    if (!data.user) throw new Error('No user returned from signin');

    return this.mapUser(data.user);
  },

  // Sign in with Google
  async signInWithGoogle(): Promise<UserProfile> {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (error) throw error;

    // For OAuth, we need to wait for the redirect
    // The user will be redirected and auth state will update
    throw new Error('Redirecting to Google...');
  },

  // Sign out
  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // Get current user
  getCurrentUser(): User | null {
    return supabase.auth.getUser().then(({ data }) => data.user).catch(() => null) as any;
  },

  // Subscribe to auth state changes
  onAuthStateChange(callback: (user: UserProfile | null) => void): () => void {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        callback(session?.user ? this.mapUser(session.user) : null);
      }
    );

    return () => subscription.unsubscribe();
  },

  // Map Supabase User to UserProfile
  mapUser(user: User): UserProfile {
    return {
      uid: user.id,
      email: user.email || '',
      displayName: user.user_metadata?.full_name || user.user_metadata?.name || undefined,
      photoURL: user.user_metadata?.avatar_url || user.user_metadata?.picture || undefined,
    };
  },
};
