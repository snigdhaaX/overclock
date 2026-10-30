import { UserRole } from './roles';

export interface User {
  id: string;
  email: string;
  name: string;
  organization: string;
  assignedRole: UserRole;
  requestedRole?: UserRole;
  status: 'active' | 'pending_approval' | 'suspended';
  avatarUrl?: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  issuedAt?: number;
  expiresAt?: number;
}

export interface AuthSession {
  user: User;
  tokens: AuthTokens;
}

export interface LoginCredentials {
  email: string;
  password: string;
  requestedRole?: UserRole;
  rememberMe?: boolean;
}

export interface RegistrationPayload {
  email: string;
  name: string;
  password: string;
  organization: string;
  requestedRole: UserRole;
  invitationCode?: string;
}

export interface AuthError {
  code:
    | 'INVALID_CREDENTIALS'
    | 'ROLE_NOT_AUTHORIZED'
    | 'ACCOUNT_PENDING_APPROVAL'
    | 'ACCOUNT_SUSPENDED'
    | 'NETWORK_ERROR'
    | 'VALIDATION_FAILED';
  message: string;
  field?: string;
}
