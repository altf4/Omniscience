import { StyleSheet } from 'react-native';

export const colors = {
  background: '#0f172a',
  surface: '#1e293b',
  surfaceHighlight: '#334155',
  primary: '#6366f1',
  primaryDark: '#4f46e5',
  textPrimary: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  success: '#22c55e',
  successDark: '#16a34a',
  warning: '#eab308',
  warningDark: '#ca8a04',
  danger: '#ef4444',
  dangerDark: '#dc2626',
  border: '#334155',
};

export const radius = {
  card: 12,
  input: 8,
  button: 8,
  pill: 24,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const commonStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.xxl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  input: {
    backgroundColor: colors.surfaceHighlight,
    borderRadius: radius.input,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  primaryButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
