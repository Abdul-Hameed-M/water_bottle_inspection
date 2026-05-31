import React from 'react';
import { useTheme } from '../theme/ThemeContext';

const StatCard = ({ title, value, unit = "", icon: Icon, colorClass = "", subtitle = "" }) => {
  const { theme } = useTheme();
  const isDark = theme.mode === 'dark';

  const getColor = () => {
    if (colorClass.includes('text-pass') || colorClass.includes('green')) return theme.colors.success;
    if (colorClass.includes('text-fail') || colorClass.includes('red')) return theme.colors.error;
    if (colorClass.includes('text-blue')) return theme.colors.primary;
    if (colorClass.includes('warning') || colorClass.includes('amber')) return theme.colors.warning;
    return theme.colors.text.primary;
  };

  const getGlow = () => {
    if (colorClass.includes('text-pass') || colorClass.includes('green')) return 'rgba(16, 185, 129, 0.08)';
    if (colorClass.includes('text-fail') || colorClass.includes('red')) return 'rgba(239, 68, 68, 0.08)';
    if (colorClass.includes('text-blue')) return 'rgba(37, 99, 235, 0.08)';
    if (colorClass.includes('warning') || colorClass.includes('amber')) return 'rgba(245, 158, 11, 0.08)';
    return 'transparent';
  };

  return (
    <div 
      style={{
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.xl,
        backgroundColor: theme.colors.surface,
        border: `1px solid ${theme.colors.border}`,
        boxShadow: theme.shadows.sm,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = theme.shadows.lg;
        e.currentTarget.style.borderColor = getColor();
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0px)';
        e.currentTarget.style.boxShadow = theme.shadows.sm;
        e.currentTarget.style.borderColor = theme.colors.border;
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <span style={{
          fontSize: '0.625rem',
          fontWeight: 700,
          letterSpacing: '0.075rem',
          color: theme.colors.text.secondary,
          fontFamily: theme.typography.fontFamily.mono,
          textTransform: 'uppercase'
        }}>
          {title}
        </span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', marginTop: '0.25rem' }}>
          <span style={{
            fontSize: theme.typography.fontSize['3xl'],
            fontWeight: 800,
            fontFamily: theme.typography.fontFamily.heading,
            color: getColor(),
            letterSpacing: '-0.025em'
          }}>
            {value}
          </span>
          {unit && (
            <span style={{
              fontSize: theme.typography.fontSize.xs,
              fontWeight: 700,
              fontFamily: theme.typography.fontFamily.mono,
              color: theme.colors.text.secondary,
              marginLeft: '0.125rem'
            }}>
              {unit}
            </span>
          )}
        </div>
        {subtitle && (
          <span style={{
            fontSize: '0.675rem',
            color: theme.colors.text.tertiary,
            fontFamily: theme.typography.fontFamily.sans,
            fontWeight: 500,
            marginTop: '0.125rem'
          }}>
            {subtitle}
          </span>
        )}
      </div>

      <div style={{
        padding: '0.625rem',
        borderRadius: theme.borderRadius.lg,
        backgroundColor: getGlow(),
        border: `1px solid ${theme.colors.border}`,
        color: getColor(),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s ease'
      }}>
        {Icon && <Icon size={20} />}
      </div>
    </div>
  );
};

export default StatCard;
