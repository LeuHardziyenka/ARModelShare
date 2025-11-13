import { useState, useEffect } from 'react';
import { authService } from '@/services/auth.service';
import type { UserProfile } from '@/types';

export function useAuth() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChange((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const user = await authService.signInWithEmail(email, password);
    setUser(user);
    return user;
  };

  const signUp = async (email: string, password: string) => {
    const user = await authService.signUpWithEmail(email, password);
    setUser(user);
    return user;
  };

  const signInWithGoogle = async () => {
    const user = await authService.signInWithGoogle();
    setUser(user);
    return user;
  };

  const signOut = async () => {
    await authService.signOut();
    setUser(null);
  };

  return {
    user,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
  };
}
