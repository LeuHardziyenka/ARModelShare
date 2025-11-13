import { useState } from 'react';
import { useLocation } from 'wouter';
import Login from './Login';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export default function LoginContainer() {
  const [, setLocation] = useLocation();
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const { toast } = useToast();
  const [isLogin, setIsLogin] = useState(true);

  const handleEmailLogin = async (email: string, password: string) => {
    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
      
      toast({
        title: isLogin ? 'Signed in successfully' : 'Account created',
        description: 'Welcome to AR Models!',
      });
      
      setLocation('/dashboard');
    } catch (error: any) {
      console.error('Auth error:', error);
      toast({
        title: 'Authentication failed',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
      toast({
        title: 'Signed in with Google',
        description: 'Welcome to AR Models!',
      });
      setLocation('/dashboard');
    } catch (error: any) {
      console.error('Google auth error:', error);
      toast({
        title: 'Google sign-in failed',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
      throw error;
    }
  };

  return (
    <Login
      onEmailLogin={handleEmailLogin}
      onGoogleLogin={handleGoogleLogin}
      isLogin={isLogin}
      onToggleMode={() => setIsLogin(!isLogin)}
    />
  );
}
