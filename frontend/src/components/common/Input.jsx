import React from 'react';
import { useTheme } from '../../theme/ThemeContext';
import './Input.css';

const Input = ({
  type = 'text',
  label,
  placeholder,
  value,
  onChange,
  onBlur,
  onFocus,
  disabled = false,
  error = null,
  helperText,
  icon: Icon,
  iconPosition = 'left',
  size = 'medium',
  fullWidth = false,
  className = '',
  style = {},
  ...props
}) => {
  const { theme } = useTheme();
  const [focused, setFocused] = React.useState(false);
  const isDark = theme.mode === 'dark';

  const getSizeStyles = () => {
    const sizes = {
      small: {
        padding: '0.4rem 0.8rem',
        fontSize: theme.typography.fontSize.xs,
        borderRadius: theme.borderRadius.md
      },
      medium: {
        padding: '0.55rem 0.875rem',
        fontSize: theme.typography.fontSize.sm,
        borderRadius: theme.borderRadius.lg
      },
      large: {
        padding: '0.75rem 1.125rem',
        fontSize: theme.typography.fontSize.base,
        borderRadius: theme.borderRadius.xl
      }
    };
    return sizes[size] || sizes.medium;
  };

  const handleFocus = (e) => {
    setFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e) => {
    setFocused(false);
    if (onBlur) onBlur(e);
  };

  const getBorderColor = () => {
    if (error) return theme.colors.error;
    if (focused) return theme.colors.primary;
    return theme.colors.border;
  };

  const getShadowStyle = () => {
    if (focused && !error) {
      return isDark ? '0 0 12px rgba(59, 130, 246, 0.25)' : '0 0 12px rgba(37, 99, 235, 0.12)';
    }
    if (error) {
      return isDark ? '0 0 12px rgba(239, 68, 68, 0.25)' : '0 0 12px rgba(239, 68, 68, 0.12)';
    }
    return 'none';
  };

  return (
    <div className={`input-container ${fullWidth ? 'input-full-width' : ''} ${className}`} style={{
        width: fullWidth ? '100%' : 'auto',
        ...style
      }}>
      {label && (
        <label className="input-label" style={{
          display: 'block',
          marginBottom: theme.spacing.xs,
          fontSize: theme.typography.fontSize.xs,
          fontWeight: theme.typography.fontWeight.bold,
          fontFamily: theme.typography.fontFamily.heading,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          color: error ? theme.colors.error : theme.colors.text.secondary
        }}>
          {label}
        </label>
      )}
      <div className="input-wrapper" style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center'
      }}>
        {Icon && iconPosition === 'left' && (
          <div className="input-icon input-icon-left" style={{
            position: 'absolute',
            left: '0.75rem',
            color: error ? theme.colors.error : focused ? theme.colors.primary : theme.colors.text.tertiary,
            display: 'flex',
            alignItems: 'center',
            pointerEvents: 'none',
            zIndex: 10
          }}>
            <Icon size={16} />
          </div>
        )}
        <input
          type={type}
          className={`input input-${size} ${error ? 'input-error' : ''} ${focused ? 'input-focused' : ''}`}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          style={{
            ...getSizeStyles(),
            width: '100%',
            backgroundColor: theme.colors.surface,
            border: `1px solid ${getBorderColor()}`,
            boxShadow: getShadowStyle(),
            color: theme.colors.text.primary,
            fontFamily: theme.typography.fontFamily.sans,
            opacity: disabled ? 0.55 : 1,
            cursor: disabled ? 'not-allowed' : 'text',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            paddingLeft: Icon && iconPosition === 'left' ? '2.3rem' : '0.875rem',
            paddingRight: Icon && iconPosition === 'right' ? '2.3rem' : '0.875rem',
            outline: 'none'
          }}
          {...props}
        />
        {Icon && iconPosition === 'right' && (
          <div className="input-icon input-icon-right" style={{
            position: 'absolute',
            right: '0.75rem',
            color: error ? theme.colors.error : focused ? theme.colors.primary : theme.colors.text.tertiary,
            display: 'flex',
            alignItems: 'center',
            pointerEvents: 'none',
            zIndex: 10
          }}>
            <Icon size={16} />
          </div>
        )}
      </div>
      {(error || helperText) && (
        <p className="input-helper" style={{
          margin: `${theme.spacing.xs} 0 0 0`,
          fontSize: '0.7rem',
          fontFamily: theme.typography.fontFamily.sans,
          fontWeight: theme.typography.fontWeight.medium,
          color: error ? theme.colors.error : theme.colors.text.tertiary
        }}>
          {error || helperText}
        </p>
      )}
    </div>
  );
};

export default Input;
