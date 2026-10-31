export type UserRole =
  | 'operations-analyst'
  | 'supply-chain-manager'
  | 'warehouse-operator'
  | 'procurement-approver'
  | 'administrator';

export interface RoleDefinition {
  id: UserRole;
  title: string;
  description: string;
  route: string;
  iconName: string;
  badgeColor: string;
  lightColor: string;
  adminApprovalRequired: boolean;
  defaultPermissions: string[];
}

export const ROLES: Record<UserRole, RoleDefinition> = {
  'operations-analyst': {
    id: 'operations-analyst',
    title: 'Operations Analyst',
    description: 'Investigate disruptions, analyse impact and create recovery plans.',
    route: '/(auth)/operations-analyst',
    iconName: 'activity',
    badgeColor: '#2563EB',
    lightColor: '#EAF3FF',
    adminApprovalRequired: false,
    defaultPermissions: ['disruptions:read', 'disruptions:analyze', 'plans:create'],
  },
  'supply-chain-manager': {
    id: 'supply-chain-manager',
    title: 'Supply Chain Manager',
    description: 'Monitor supply-chain operations and approve recovery decisions.',
    route: '/(auth)/supply-chain-manager',
    iconName: 'globe',
    badgeColor: '#0D9488',
    lightColor: '#E6FFFA',
    adminApprovalRequired: true,
    defaultPermissions: ['disruptions:read', 'plans:approve', 'operations:monitor', 'blockchain:verify'],
  },
  'warehouse-operator': {
    id: 'warehouse-operator',
    title: 'Warehouse Operator',
    description: 'Preview with sample data. Manage warehouse activities, inventory and goods status.',
    route: '/(auth)/warehouse-operator',
    iconName: 'package',
    badgeColor: '#16A34A',
    lightColor: '#F0FDF4',
    adminApprovalRequired: false,
    defaultPermissions: ['inventory:read', 'inventory:update', 'shipments:receive'],
  },
  'procurement-approver': {
    id: 'procurement-approver',
    title: 'Procurement Approver',
    description: 'Preview with sample data. Evaluate suppliers and approve procurement changes.',
    route: '/(auth)/procurement-approver',
    iconName: 'clipboard-check',
    badgeColor: '#8B5CF6',
    lightColor: '#F5F3FF',
    adminApprovalRequired: true,
    defaultPermissions: ['procurement:read', 'suppliers:evaluate', 'purchases:approve'],
  },
  'administrator': {
    id: 'administrator',
    title: 'Administrator',
    description: 'Preview with sample data. Manage users, roles, permissions and system configuration.',
    route: '/(auth)/administrator',
    iconName: 'shield',
    badgeColor: '#475569',
    lightColor: '#F1F5F9',
    adminApprovalRequired: true,
    defaultPermissions: ['admin:all', 'users:manage', 'audit:view'],
  },
};
