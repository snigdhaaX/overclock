import React, { createContext, useContext, useEffect, useState } from 'react';
import authService from '../services/auth';
import { AuthError, AuthSession, LoginCredentials, RegistrationPayload, User } from '../types/auth';

interface AuthContextType {
  session: AuthSession | null;
  user: User | null;
  isLoading: boolean;
  error: AuthError | null;
  login: (credentials: LoginCredentials) => Promise<AuthSession>;
  register: (payload: RegistrationPayload) => Promise<{ user: User; requiresApproval: boolean; message: string }>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<AuthError | null>(null);

  useEffect(() => {
    let isMounted = true;
    authService
      .init()
      .then((sess) => {
        if (isMounted) {
          setSession(sess);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (credentials: LoginCredentials): Promise<AuthSession> => {
    setError(null);
    setIsLoading(true);
    try {
      const sess = await authService.login(credentials);
      setSession(sess);
      setIsLoading(false);
      return sess;
    } catch (err: any) {
      setIsLoading(false);
      const authErr: AuthError = err?.code
        ? err
        : { code: 'INVALID_CREDENTIALS', message: err?.message || 'Authentication failed' };
      setError(authErr);
      throw authErr;
    }
  };

  const register = async (payload: RegistrationPayload) => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await authService.register(payload);
      setIsLoading(false);
      return res;
    } catch (err: any) {
      setIsLoading(false);
      const authErr: AuthError = err?.code
        ? err
        : { code: 'VALIDATION_FAILED', message: err?.message || 'Registration failed' };
      setError(authErr);
      throw authErr;
    }
  };

  const logout = async () => {
    await authService.logout();
    setSession(null);
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        isLoading,
        error,
        login,
        register,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default useAuth;
