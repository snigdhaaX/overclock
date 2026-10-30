/**
 * TRUSTCHAIN Design System Colors
 * Primary specification: Pixel-accurate enterprise mobile supply chain platform
 */

export const Colors = {
  // Brand Primary & Accents
  primary: '#1769F5',
  primaryDark: '#0D4EC3',
  primaryLight: '#3B82F6',
  primaryGlow: 'rgba(23, 105, 245, 0.25)',
  accentCyan: '#06B6D4',
  accentElectric: '#2563EB',

  // Deep Navy & Backgrounds
  deepNavy: '#10234D',
  navyDark: '#0A1733',
  background: '#F7FAFF',
  backgroundLight: '#FFFFFF',
  white: '#FFFFFF',
  surfaceCard: '#FFFFFF',
  lightBlue: '#EAF3FF',
  lightBlueHover: '#DFECFE',

  // Typography
  textPrimary: '#10213F',
  textSecondary: '#718096',
  textMuted: '#94A3B8',
  textLight: '#F8FAFC',
  textWhite: '#FFFFFF',

  // Borders & Dividers
  border: '#E5ECF5',
  borderLight: '#EEF3F9',
  borderFocus: '#1769F5',

  // Functional Statuses
  success: '#16A47B',
  successLight: '#E8F8F3',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  info: '#0284C7',
  infoLight: '#E0F2FE',

  // Role Badges & Specific Colors
  roles: {
    operationsAnalyst: {
      primary: '#1769F5',
      light: '#EAF3FF',
      text: '#1769F5',
      badge: 'rgba(23, 105, 245, 0.12)',
    },
    supplyChainManager: {
      primary: '#0D9488',
      light: '#E6FFFA',
      text: '#0D9488',
      badge: 'rgba(13, 148, 136, 0.12)',
    },
    warehouseOperator: {
      primary: '#16A34A',
      light: '#F0FDF4',
      text: '#16A34A',
      badge: 'rgba(22, 163, 74, 0.12)',
    },
    procurementApprover: {
      primary: '#9333EA',
      light: '#FAF5FF',
      text: '#9333EA',
      badge: 'rgba(147, 51, 234, 0.12)',
    },
    administrator: {
      primary: '#1E293B',
      light: '#F1F5F9',
      text: '#1E293B',
      badge: 'rgba(30, 41, 59, 0.12)',
    },
  },

  // Shadows
  shadowColor: '#0F172A',
} as const;

export default Colors;
