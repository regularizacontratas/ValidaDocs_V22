import { createContext, useEffect, useState, ReactNode } from 'react';
import { User } from '../types/database.types';
import { authRepository } from '../repositories/auth.repository';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();

    const unsubscribe = setupAuthListener();
    return () => {
      unsubscribe();
    };
  }, []);

  function setupAuthListener() {
    const { data: authListener } = authRepository.getCurrentUser().then(() => {
      return { subscription: { unsubscribe: () => {} } };
    });

    return () => {
      if (authListener) {
        authListener.subscription?.unsubscribe();
      }
    };
  }

  async function checkUser() {
    try {
      const result = await authRepository.getCurrentUserWithRole();

      if (result) {
        setUser(result.profile);
      }
    } catch (error) {
      console.error('Error al verificar usuario:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadUserProfile(userId: string) {
    try {
      const profile = await authRepository.getUserProfile(userId);
      setUser(profile);
    } catch (error) {
      console.error('Error al cargar perfil:', error);
    } finally {
      setLoading(false);
    }
  }

  async function signIn(email: string, password: string) {
    try {
      await authRepository.signIn(email, password);
      const result = await authRepository.getCurrentUserWithRole();
      if (result) {
        setUser(result.profile);
      }
    } catch (error) {
      console.error('Error en signIn:', error);
      throw error;
    }
  }

  async function signUp(email: string, password: string, name: string) {
    try {
      await authRepository.signUpAndUpsertUser(name, email, password);
      const result = await authRepository.getCurrentUserWithRole();
      if (result) {
        setUser(result.profile);
      }
    } catch (error) {
      console.error('Error en signUp:', error);
      throw error;
    }
  }

  async function signOut() {
    try {
      await authRepository.signOut();
      setUser(null);
    } catch (error) {
      console.error('Error en signOut:', error);
      throw error;
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
