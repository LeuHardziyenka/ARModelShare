import type { Express } from 'express';
import { supabase } from '../db';
import { requireAuth } from '../middleware/auth';

export function registerAuthRoutes(app: Express) {
  // Sign up with email and password
  app.post('/api/auth/signup', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }

      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm for development
      });

      if (error) {
        return res.status(400).json({ message: error.message });
      }

      if (!data.user) {
        return res.status(500).json({ message: 'User creation failed' });
      }

      return res.json({
        user: {
          uid: data.user.id,
          email: data.user.email,
          displayName: data.user.user_metadata?.full_name || data.user.user_metadata?.name,
          photoURL: data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture,
        }
      });
    } catch (error: any) {
      console.error('Signup error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Sign in with email and password
  app.post('/api/auth/signin', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return res.status(401).json({ message: error.message });
      }

      if (!data.user || !data.session) {
        return res.status(401).json({ message: 'Authentication failed' });
      }

      return res.json({
        user: {
          uid: data.user.id,
          email: data.user.email,
          displayName: data.user.user_metadata?.full_name || data.user.user_metadata?.name,
          photoURL: data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture,
        },
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        }
      });
    } catch (error: any) {
      console.error('Signin error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get current user
  app.get('/api/auth/me', requireAuth, async (req, res) => {
    try {
      const { data, error } = await supabase.auth.admin.getUserById(req.user!.id);

      if (error || !data.user) {
        return res.status(404).json({ message: 'User not found' });
      }

      return res.json({
        user: {
          uid: data.user.id,
          email: data.user.email,
          displayName: data.user.user_metadata?.full_name || data.user.user_metadata?.name,
          photoURL: data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture,
        }
      });
    } catch (error: any) {
      console.error('Get user error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Sign out (client handles token removal, this is just for logging)
  app.post('/api/auth/signout', requireAuth, async (req, res) => {
    try {
      // Supabase auth.signOut() is client-side, server just acknowledges
      return res.json({ message: 'Signed out successfully' });
    } catch (error: any) {
      console.error('Signout error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });
}
