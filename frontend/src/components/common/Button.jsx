import React from 'react';
import { useTheme } from '../../theme/ThemeContext';
import './Button.css';

const Button = ({
  children,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon: Icon,
  iconPosition = 'left',
  fullWidth = false,
  onClick,
  className = '',
  style = {},
  ...props
}) => {
  const { theme } = useTheme();

  const getVariantStyles = () => {
    const isDark = theme.mode === 'dark';
    const variants = {
      primary: {
        backgroundColor: theme.colors.primary,
        color: '#FFFFFF',
        border: 'none',
        boxShadow: isDark ? '0 4px 12px rgba(59, 130, 246, 0.2)' : '0 4px 12px rgba(37, 99, 235, 0.15)',
        transform: 'translateY(0px)',
      },
      secondary: {
        backgroundColor: theme.colors.surface,
        color: theme.colors.text.primary,
        border: `1px solid ${theme.colors.border}`,
        boxShadow: 'none',
        transform: 'translateY(0px)',
      },
      success: {
        backgroundColor: theme.colors.success,
        color: '#FFFFFF',
        border: 'none',
        boxShadow: isDark ? '0 4px 12px rgba(16, 185, 129, 0.2)' : '0 4px 12px rgba(16, 185, 129, 0.15)',
        transform: 'translateY(0px)',
      },
      danger: {
        backgroundColor: theme.colors.error,
        color: '#FFFFFF',
        border: 'none',
        boxShadow: isDark ? '0 4px 12px rgba(239, 68, 68, 0.2)' : '0 4px 12px rgba(239, 68, 68, 0.15)',
        transform: 'translateY(0px)',
      },
      ghost: {
        backgroundColor: 'transparent',
        color: theme.colors.text.primary,
        border: 'none',
        boxShadow: 'none',
        transform: 'translateY(0px)',
      }
    };
    return variants[variant] || variants.primary;
  };

  const getSizeStyles = () => {
    const sizes = {
      small: {
        padding: '0.4rem 0.8rem',
        fontSize: theme.typography.fontSize.xs,
        borderRadius: theme.borderRadius.md
      },
      medium: {
        padding: '0.625rem 1.25rem',
        fontSize: theme.typography.fontSize.sm,
        borderRadius: theme.borderRadius.lg
      },
      large: {
        padding: '0.8rem 1.6rem',
        fontSize: theme.typography.fontSize.base,
        borderRadius: theme.borderRadius.xl
      }
    };
    return sizes[size] || sizes.medium;
  };

  const handleClick = (e) => {
    if (!disabled && !loading && onClick) {
      onClick(e);
    }
  };

  return (
    <button
      className={`button button-${variant} button-${size} ${fullWidth ? 'button-full-width' : ''} ${loading ? 'button-loading' : ''} ${className}`}
      disabled={disabled || loading}
      onClick={handleClick}
      style={{
        ...getVariantStyles(),
        ...getSizeStyles(),
        ...style,
        width: fullWidth ? '100%' : 'auto',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        fontFamily: theme.typography.fontFamily.heading,
        fontWeight: theme.typography.fontWeight.semibold,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        position: 'relative',
        outline: 'none',
      }}
      onMouseEnter={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.transform = 'translateY(-1.5px)';
          if (variant === 'primary') {
            e.currentTarget.style.backgroundColor = theme.colors.primaryHover;
            e.currentTarget.style.boxShadow = theme.mode === 'dark' ? '0 6px 16px rgba(59, 130, 246, 0.3)' : '0 6px 16px rgba(37, 99, 235, 0.25)';
          } else if (variant === 'secondary' || variant === 'ghost') {
            e.currentTarget.style.backgroundColor = theme.colors.surfaceHover;
          } else if (variant === 'success') {
            e.currentTarget.style.boxShadow = theme.mode === 'dark' ? '0 6px 16px rgba(16, 185, 129, 0.3)' : '0 6px 16px rgba(16, 185, 129, 0.25)';
          } else if (variant === 'danger') {
            e.currentTarget.style.boxShadow = theme.mode === 'dark' ? '0 6px 16px rgba(239, 68, 68, 0.3)' : '0 6px 16px rgba(239, 68, 68, 0.25)';
          }
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0px)';
        e.currentTarget.style.backgroundColor = getVariantStyles().backgroundColor;
        e.currentTarget.style.boxShadow = getVariantStyles().boxShadow || 'none';
      }}
      onMouseDown={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.transform = 'translateY(0.5px) scale(0.98)';
        }
      }}
      onMouseUp={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.transform = 'translateY(-1.5px) scale(1)';
        }
      }}
      {...props}
    >
      {loading && (
        <span className="button-spinner" style={{
          width: '1rem',
          height: '1rem',
          border: `2px solid ${variant === 'secondary' || variant === 'ghost' ? theme.colors.text.primary : '#FFFFFF'}`,
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 0.6s linear infinite'
        }} />
      )}
      
      {!loading && Icon && iconPosition === 'left' && <Icon size={16} style={{ shrink: 0 }} />}
      
      <span>{children}</span>
      
      {!loading && Icon && iconPosition === 'right' && <Icon size={16} style={{ shrink: 0 }} />}
    </button>
  );
};

export default Button;
