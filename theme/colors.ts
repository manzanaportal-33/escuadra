/**
 * Colores institucionales - SCG33
 * Morado #5f478b (logo y bordes del emblema)
 */
export const colors = {
  // Fondos (oscuros que combinan con el morado)
  background: '#1a1625',
  backgroundCard: '#252035',
  backgroundElevated: '#2d2842',

  // Texto
  text: '#f3f0f9',
  textSecondary: '#a89cc4',
  textMuted: '#6b5f7d',

  // Acento institucional (del logo)
  primary: '#5f478b',
  primaryLight: '#7a62a8',
  primaryDark: '#4a3870',

  // Bordes
  border: '#3d3552',
  borderLight: '#5a4d75',

  // Estados
  error: '#e53935',
  success: '#2e7d32',
  warning: '#ed6c02',

  // Tab bar y headers
  tabBar: '#252035',
  header: '#252035',
  tabActive: '#5f478b',
  tabInactive: '#6b5f7d',
} as const;

export type AppColors = typeof colors;
