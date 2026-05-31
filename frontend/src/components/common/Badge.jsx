import React from 'react';
import { useTheme } from '../../theme/ThemeContext';
import './Badge.css';

const Badge = ({
  children,
  variant = 'default',
  size = 'medium',
  icon: Icon,
  className = '',
  style = {},
  glow = false,
  ...props
}) => {
  const { theme } = useTheme();
  const isDark = theme.mode === 'dark';

  const getVariantStyles = () => {
    const isTranslucent = ['success', 'warning', 'error', 'info', 'default'].includes(variant);
    
    if (isTranslucent) {
      const colors = {
        default: {
          bg: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(37, 99, 235, 0.08)',
          border: isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(37, 99, 235, 0.2)',
          text: theme.colors.primary,
          glow: 'rgba(59, 130, 246, 0.2)'
        },
        success: {
          bg: isDark ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.08)',
          border: isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)',
          text: theme.colors.success,
          glow: 'rgba(16, 185, 129, 0.2)'
        },
        warning: {
          bg: isDark ? 'rgba(245, 158, 11, 0.12)' : 'rgba(245, 158, 11, 0.08)',
          border: isDark ? 'rgba(245, 158, 11, 0.3)' : 'rgba(245, 158, 11, 0.2)',
          text: theme.colors.warning,
          glow: 'rgba(245, 158, 11, 0.2)'
        },
        error: {
          bg: isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.08)',
          border: isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)',
          text: theme.colors.error,
          glow: 'rgba(239, 68, 68, 0.2)'
        },
        info: {
          bg: isDark ? 'rgba(6, 182, 212, 0.12)' : 'rgba(6, 182, 212, 0.08)',
          border: isDark ? 'rgba(6, 182, 212, 0.3)' : 'rgba(6, 182, 212, 0.2)',
          text: theme.colors.info,
          glow: 'rgba(6, 182, 212, 0.2)'
        }
      };
      
      const active = colors[variant] || colors.default;
      return {
        backgroundColor: active.bg,
        border: `1px solid ${active.border}`,
        color: active.text,
        boxShadow: glow ? `0 0 10px ${active.glow}` : 'none'
      };
    }

    const variants = {
      outline: {
        backgroundColor: 'transparent',
        color: theme.colors.text.primary,
        border: `1px solid ${theme.colors.border}`
      },
      ghost: {
        backgroundColor: theme.colors.surfaceHover,
        color: theme.colors.text.secondary,
        border: `1px solid ${theme.colors.border}`
      }
    };
    return variants[variant] || variants.ghost;
  };

  const getSizeStyles = () => {
    const sizes = {
      small: {
        padding: '0.2rem 0.4rem',
        fontSize: '0.675rem',
        borderRadius: theme.borderRadius.sm
      },
      medium: {
        padding: '0.3rem 0.6rem',
        fontSize: theme.typography.fontSize.xs,
        borderRadius: theme.borderRadius.md
      },
      large: {
        padding: '0.4rem 0.8rem',
        fontSize: theme.typography.fontSize.sm,
        borderRadius: theme.borderRadius.lg
      }
    };
    return sizes[size] || sizes.medium;
  };

  return (
    <span
      className={`badge badge-${variant} badge-${size} ${className}`}
      style={{
        ...getVariantStyles(),
        ...getSizeStyles(),
        ...style,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        fontFamily: theme.typography.fontFamily.mono,
        fontWeight: theme.typography.fontWeight.semibold,
        lineHeight: theme.typography.lineHeight.tight,
        whiteSpace: 'nowrap',
        letterSpacing: '0.025em'
      }}
      {...props}
    >
      {Icon && <Icon size={11} style={{ shrink: 0 }} />}
      <span>{children}</span>
    </span>
  );
};

export default Badge;
