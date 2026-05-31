import React from 'react';
import { useTheme } from '../../theme/ThemeContext';
import './Card.css';

const Card = ({
  children,
  title,
  subtitle,
  icon: Icon,
  actions,
  variant = 'default',
  hoverable = false,
  glass = false,
  padding = 'lg',
  className = '',
  onClick,
  style = {},
  ...props
}) => {
  const { theme } = useTheme();
  const isDark = theme.mode === 'dark';

  const getPaddingStyles = () => {
    const paddings = {
      none: '0',
      xs: theme.spacing.xs,
      sm: theme.spacing.sm,
      md: theme.spacing.md,
      lg: theme.spacing.lg,
      xl: theme.spacing.xl,
      '2xl': theme.spacing['2xl']
    };
    return paddings[padding] || paddings.lg;
  };

  const getVariantStyles = () => {
    if (glass) {
      return {
        background: isDark ? 'rgba(17, 22, 37, 0.7)' : 'rgba(255, 255, 255, 0.75)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: `1px solid ${theme.colors.border}`,
        boxShadow: isDark ? '0 8px 32px 0 rgba(0, 0, 0, 0.37)' : '0 8px 32px 0 rgba(31, 38, 135, 0.05)',
      };
    }

    const variants = {
      default: {
        backgroundColor: theme.colors.surface,
        border: `1px solid ${theme.colors.border}`,
        boxShadow: theme.shadows.sm,
      },
      elevated: {
        backgroundColor: theme.colors.surface,
        border: `1px solid ${theme.colors.border}`,
        boxShadow: theme.shadows.lg
      },
      outlined: {
        backgroundColor: 'transparent',
        border: `2px solid ${theme.colors.border}`
      },
      filled: {
        backgroundColor: theme.colors.primary,
        border: 'none',
        boxShadow: isDark ? '0 4px 20px rgba(59, 130, 246, 0.2)' : '0 4px 20px rgba(37, 99, 235, 0.15)',
      }
    };
    return variants[variant] || variants.default;
  };

  return (
    <div
      className={`card card-${variant} ${hoverable ? 'card-hoverable' : ''} ${onClick ? 'card-clickable' : ''} ${className}`}
      style={{
        ...getVariantStyles(),
        ...style,
        padding: getPaddingStyles(),
        borderRadius: theme.borderRadius['2xl'],
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: onClick ? 'pointer' : 'default',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden'
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (hoverable || onClick) {
          e.currentTarget.style.transform = 'translateY(-3px)';
          e.currentTarget.style.boxShadow = theme.shadows.xl;
          if (variant === 'default' && !glass) {
            e.currentTarget.style.borderColor = isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(37, 99, 235, 0.25)';
          }
        }
      }}
      onMouseLeave={(e) => {
        if (hoverable || onClick) {
          e.currentTarget.style.transform = 'translateY(0px)';
          e.currentTarget.style.boxShadow = getVariantStyles().boxShadow || 'none';
          if (variant === 'default' && !glass) {
            e.currentTarget.style.borderColor = theme.colors.border;
          }
        }
      }}
      {...props}
    >
      {(title || Icon || actions) && (
        <div className="card-header" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: title || subtitle ? theme.spacing.md : 0,
          paddingBottom: title || subtitle ? theme.spacing.sm : 0,
          borderBottom: title || subtitle ? `1px solid ${theme.colors.border}` : 'none'
        }}>
          <div className="card-title-section" style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.sm,
            flex: 1
          }}>
            {Icon && (
              <div className="card-icon" style={{
                color: variant === 'filled' ? theme.colors.text.inverse : theme.colors.primary,
                display: 'flex',
                alignItems: 'center',
                background: variant === 'filled' ? 'rgba(255,255,255,0.1)' : theme.colors.surfaceHover,
                padding: '0.4rem',
                borderRadius: theme.borderRadius.lg
              }}>
                <Icon size={20} />
              </div>
            )}
            <div className="card-title-text" style={{
              flex: 1
            }}>
              {title && (
                <h3 className="card-title" style={{
                  margin: 0,
                  fontSize: theme.typography.fontSize.base,
                  fontWeight: theme.typography.fontWeight.bold,
                  fontFamily: theme.typography.fontFamily.heading,
                  color: variant === 'filled' ? theme.colors.text.inverse : theme.colors.text.primary,
                  lineHeight: theme.typography.lineHeight.tight,
                  letterSpacing: '0.01em'
                }}>
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="card-subtitle" style={{
                  margin: 0,
                  fontSize: theme.typography.fontSize.xs,
                  fontFamily: theme.typography.fontFamily.sans,
                  color: variant === 'filled' ? 'rgba(255,255,255,0.8)' : theme.colors.text.secondary,
                  marginTop: '0.125rem',
                  lineHeight: theme.typography.lineHeight.normal
                }}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {actions && (
            <div className="card-actions" style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.sm
            }}>
              {actions}
            </div>
          )}
        </div>
      )}
      <div className="card-content" style={{
        color: variant === 'filled' ? theme.colors.text.inverse : theme.colors.text.primary,
        fontFamily: theme.typography.fontFamily.sans,
        fontSize: theme.typography.fontSize.sm,
        flex: 1
      }}>
        {children}
      </div>
    </div>
  );
};

export default Card;
