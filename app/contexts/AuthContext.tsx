import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import FirebaseAuthService from '../services/firebaseAuth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    try {
      console.log('🔐 Setting up auth listener...');
      unsubscribe = FirebaseAuthService.onAuthStateChanged((user) => {
        console.log('Auth state changed:', user ? 'User signed in' : 'User signed out');
        setUser(user);
        setLoading(false);
      });
      console.log('✅ Auth listener setup complete');
    } catch (error) {
      console.error('❌ Auth setup failed:', error);
      setLoading(false); // Don't stay loading forever
    }

    return () => {
      if (unsubscribe) {
        try {
          unsubscribe();
        } catch (error) {
          console.warn('Auth unsubscribe error:', error);
        }
      }
    };
  }, []);

  const signOut = async () => {
    try {
      setLoading(true);
      const result = await FirebaseAuthService.signOut();
      if (result.error) {
        console.error('Sign out error:', result.error);
        throw result.error;
      }
      // Don't manually set user to null - let onAuthStateChanged handle it
    } catch (error) {
      console.error('Sign out failed:', error);
      setLoading(false);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
