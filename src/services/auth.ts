import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { AuthError, AuthSession, AuthTokens, LoginCredentials, RegistrationPayload, User } from '../types/auth';
import { UserRole } from '../types/roles';
import { ApiError, apiRequest, NetworkError, setAccessToken } from './apiClient';
import { startSync, stopSync } from './backendSync';

const TOKEN_KEY = 'trustchain_auth_tokens';
const USER_KEY = 'trustchain_user_profile';

// Safe secure storage wrapper for iOS, Android, and Web
export const TokenStorage = {
  async saveTokens(tokens: AuthTokens): Promise<void> {
    const serialized = JSON.stringify(tokens);
    if (Platform.OS === 'web') {
      try {
        localStorage.setItem(TOKEN_KEY, serialized);
      } catch (e) {
        console.warn('LocalStorage error:', e);
      }
    } else {
      await SecureStore.setItemAsync(TOKEN_KEY, serialized);
    }
  },

  async getTokens(): Promise<AuthTokens | null> {
    try {
      let raw: string | null = null;
      if (Platform.OS === 'web') {
        raw = localStorage.getItem(TOKEN_KEY);
      } else {
        raw = await SecureStore.getItemAsync(TOKEN_KEY);
      }
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  async saveUser(user: User): Promise<void> {
    const serialized = JSON.stringify(user);
    if (Platform.OS === 'web') {
      try {
        localStorage.setItem(USER_KEY, serialized);
      } catch (e) {
        console.warn('LocalStorage error:', e);
      }
    } else {
      await SecureStore.setItemAsync(USER_KEY, serialized);
    }
  },

  async getUser(): Promise<User | null> {
    try {
      let raw: string | null = null;
      if (Platform.OS === 'web') {
        raw = localStorage.getItem(USER_KEY);
      } else {
        raw = await SecureStore.getItemAsync(USER_KEY);
      }
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  async clear(): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      } catch {}
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
    }
  },
};

// Seed enterprise demo database
const MOCK_USERS_DB: Array<{
  user: User;
  passwordHash: string; // Simulated server-side Argon2 hash
}> = [
  {
    user: {
      id: 'usr_op_001',
      email: 'anish@company.com',
      name: 'Anish Sharma',
      organization: 'Apex Global Logistics',
      assignedRole: 'operations-analyst',
      status: 'active',
      createdAt: '2026-01-15T08:00:00Z',
    },
    passwordHash: 'argon2id_mock_hash_password123',
  },
  {
    user: {
      id: 'usr_op_002',
      email: 'analyst@trustchain.com',
      name: 'Maya Lin',
      organization: 'Trustchain Global Hub',
      assignedRole: 'operations-analyst',
      status: 'active',
      createdAt: '2026-01-20T09:30:00Z',
    },
    passwordHash: 'argon2id_mock_hash_password123',
  },
  {
    user: {
      id: 'usr_mgr_001',
      email: 'manager@trustchain.com',
      name: 'David Vance',
      organization: 'Maersk Pacific Corridor',
      assignedRole: 'supply-chain-manager',
      status: 'active',
      createdAt: '2026-01-10T11:15:00Z',
    },
    passwordHash: 'argon2id_mock_hash_password123',
  },
  {
    user: {
      id: 'usr_wh_001',
      email: 'warehouse@trustchain.com',
      name: 'Rohit Verma',
      organization: 'Mumbai Central Hub (WH-MUM)',
      assignedRole: 'warehouse-operator',
      status: 'active',
      createdAt: '2026-02-01T07:45:00Z',
    },
    passwordHash: 'argon2id_mock_hash_password123',
  },
  {
    user: {
      id: 'usr_proc_001',
      email: 'procurement@trustchain.com',
      name: 'Sarah Chen',
      organization: 'Nordic Supplier Group',
      assignedRole: 'procurement-approver',
      status: 'active',
      createdAt: '2026-01-05T14:20:00Z',
    },
    passwordHash: 'argon2id_mock_hash_password123',
  },
  {
    user: {
      id: 'usr_adm_001',
      email: 'admin@trustchain.com',
      name: 'Elena Rostova',
      organization: 'TRUSTCHAIN Security & Compliance',
      assignedRole: 'administrator',
      status: 'active',
      createdAt: '2025-12-01T00:00:00Z',
    },
    passwordHash: 'argon2id_mock_hash_password123',
  },
];

class AuthService {
  private currentSession: AuthSession | null = null;

  async init(): Promise<AuthSession | null> {
    const tokens = await TokenStorage.getTokens();
    const user = await TokenStorage.getUser();
    if (tokens && user) {
      this.currentSession = { user, tokens };
      this.connectIfLive(tokens);
      return this.currentSession;
    }
    return null;
  }

  getCurrentSession(): AuthSession | null {
    return this.currentSession;
  }

  getCurrentUser(): User | null {
    return this.currentSession?.user ?? null;
  }

  private connectIfLive(tokens: AuthTokens) {
    // Sample sessions have tc_jwt_ tokens, which the server would reject.
    if (tokens.accessToken.startsWith('tc_jwt_')) return;
    setAccessToken(tokens.accessToken);
    startSync();
  }

  async login(credentials: LoginCredentials): Promise<AuthSession> {
    try {
      const session = await apiRequest<AuthSession>('/auth/login', {
        method: 'POST',
        body: { email: credentials.email, password: credentials.password, requested_role: credentials.requestedRole },
      });
      this.currentSession = session;
      setAccessToken(session.tokens.accessToken);
      await startSync();
      if (credentials.rememberMe !== false) {
        await TokenStorage.saveTokens(session.tokens);
        await TokenStorage.saveUser(session.user);
      }
      return session;
    } catch (err) {
      if (err instanceof ApiError) {
        const authError: AuthError = { code: err.code as AuthError['code'], message: err.message };
        throw authError;
      }
      if (!(err instanceof NetworkError)) throw err;
      // Server unreachable: continue with sample data, which every screen labels as offline.
    }

    // Simulate real network latency (500ms)
    await new Promise((resolve) => setTimeout(resolve, 500));

    const normalizedEmail = credentials.email.trim().toLowerCase();
    const account = MOCK_USERS_DB.find((item) => item.user.email.toLowerCase() === normalizedEmail);

    // Validation checks
    if (!account) {
      const err: AuthError = {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid work email or password. Please verify your credentials.',
      };
      throw err;
    }

    // Verify password (in production this uses backend Argon2 verify; here accepts valid standard test password 'password123' or any 6+ char password for registered mock users)
    if (credentials.password.length < 6) {
      const err: AuthError = {
        code: 'INVALID_CREDENTIALS',
        message: 'Password must be at least 6 characters long.',
      };
      throw err;
    }

    // Check account status
    if (account.user.status === 'pending_approval') {
      const err: AuthError = {
        code: 'ACCOUNT_PENDING_APPROVAL',
        message: 'Your account is pending administrator role verification and approval.',
      };
      throw err;
    }

    if (account.user.status === 'suspended') {
      const err: AuthError = {
        code: 'ACCOUNT_SUSPENDED',
        message: 'Your account has been deactivated by an organization administrator.',
      };
      throw err;
    }

    // Check role authorization if this is a role-specific portal login
    if (credentials.requestedRole && credentials.requestedRole !== account.user.assignedRole) {
      const roleNames: Record<UserRole, string> = {
        'operations-analyst': 'Operations Analyst',
        'supply-chain-manager': 'Supply Chain Manager',
        'warehouse-operator': 'Warehouse Operator',
        'procurement-approver': 'Procurement Approver',
        'administrator': 'Administrator',
      };
      const assigned = roleNames[account.user.assignedRole];
      const requested = roleNames[credentials.requestedRole];

      const err: AuthError = {
        code: 'ROLE_NOT_AUTHORIZED',
        message: `Access Denied: Your enterprise role is '${assigned}'. You are not authorized to access the ${requested} portal.`,
      };
      throw err;
    }

    // Generate simulated cryptographic JWT tokens
    const tokens: AuthTokens = {
      accessToken: `tc_jwt_acc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      refreshToken: `tc_jwt_ref_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      expiresIn: 3600,
    };

    const session: AuthSession = {
      user: {
        ...account.user,
        lastLoginAt: new Date().toISOString(),
      },
      tokens,
    };

    this.currentSession = session;
    if (credentials.rememberMe !== false) {
      await TokenStorage.saveTokens(tokens);
      await TokenStorage.saveUser(session.user);
    }

    return session;
  }

  async register(payload: RegistrationPayload): Promise<{
    user: User;
    requiresApproval: boolean;
    message: string;
  }> {
    await new Promise((resolve) => setTimeout(resolve, 600));

    const normalizedEmail = payload.email.trim().toLowerCase();
    const existing = MOCK_USERS_DB.find((item) => item.user.email.toLowerCase() === normalizedEmail);

    if (existing) {
      const err: AuthError = {
        code: 'VALIDATION_FAILED',
        message: 'An enterprise account already exists with this work email address.',
        field: 'email',
      };
      throw err;
    }

    // Roles requiring administrator assignment per PRD
    const requiresAdminApproval = [
      'administrator',
      'supply-chain-manager',
      'procurement-approver',
    ].includes(payload.requestedRole);

    const newUser: User = {
      id: `usr_${Date.now()}`,
      email: normalizedEmail,
      name: payload.name.trim(),
      organization: payload.organization.trim(),
      assignedRole: requiresAdminApproval ? 'operations-analyst' : payload.requestedRole,
      requestedRole: payload.requestedRole,
      status: requiresAdminApproval ? 'pending_approval' : 'active',
      createdAt: new Date().toISOString(),
    };

    MOCK_USERS_DB.push({
      user: newUser,
      passwordHash: 'argon2id_mock_hash_registered',
    });

    if (requiresAdminApproval) {
      return {
        user: newUser,
        requiresApproval: true,
        message: `Your registration request for '${payload.requestedRole}' has been submitted for administrator review and governance compliance.`,
      };
    }

    return {
      user: newUser,
      requiresApproval: false,
      message: 'Account created successfully. You can now sign in with your enterprise credentials.',
    };
  }

  async resetPassword(email: string): Promise<{ success: boolean; message: string }> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return {
      success: true,
      message: `If an active enterprise account is registered with ${email}, a password reset verification token has been transmitted to your secure email gateway.`,
    };
  }

  async logout(): Promise<void> {
    const refreshToken = this.currentSession?.tokens.refreshToken;
    if (refreshToken && !refreshToken.startsWith('tc_jwt_')) {
      apiRequest('/auth/logout', { method: 'POST', body: { refresh_token: refreshToken } }).catch(() => {});
    }
    stopSync();
    setAccessToken(null);
    this.currentSession = null;
    await TokenStorage.clear();
  }
}

export const authService = new AuthService();
export default authService;
