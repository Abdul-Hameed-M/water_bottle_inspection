import React from 'react';
import { useTheme } from '../../theme/ThemeContext';
import './Loader.css';

const Loader = ({
  size = 'medium',
  variant = 'default',
  text,
  className = '',
  ...props
}) => {
  const { theme } = useTheme();

  const getSizeStyles = () => {
    const sizes = {
      small: {
        width: '1rem',
        height: '1rem',
        borderWidth: '2px'
      },
      medium: {
        width: '1.5rem',
        height: '1.5rem',
        borderWidth: '3px'
      },
      large: {
        width: '2rem',
        height: '2rem',
        borderWidth: '4px'
      },
      xlarge: {
        width: '3rem',
        height: '3rem',
        borderWidth: '5px'
      }
    };
    return sizes[size] || sizes.medium;
  };

  const getVariantStyles = () => {
    const variants = {
      default: {
        borderColor: theme.colors.border,
        borderTopColor: theme.colors.primary
      },
      primary: {
        borderColor: theme.colors.primary,
        borderTopColor: theme.colors.text.inverse
      },
      light: {
        borderColor: 'rgba(255, 255, 255, 0.3)',
        borderTopColor: '#ffffff'
      }
    };
    return variants[variant] || variants.default;
  };

  return (
    <div className={`loader-container ${className}`} style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.md
    }} {...props}>
      <div
        className="loader-spinner"
        style={{
          ...getSizeStyles(),
          ...getVariantStyles(),
          borderRadius: '50%',
          borderStyle: 'solid',
          animation: 'spin 0.6s linear infinite'
        }}
      />
      {text && (
        <p className="loader-text" style={{
          margin: 0,
          fontSize: theme.typography.fontSize.sm,
          color: theme.colors.text.secondary,
          fontWeight: theme.typography.fontWeight.medium
        }}>
          {text}
        </p>
      )}
    </div>
  );
};

// Skeleton loader component
export const Skeleton = ({
  width = '100%',
  height = '1rem',
  variant = 'rectangular',
  className = '',
  ...props
}) => {
  const { theme } = useTheme();

  return (
    <div
      className={`skeleton skeleton-${variant} ${className}`}
      style={{
        width,
        height,
        backgroundColor: theme.colors.surfaceHover,
        borderRadius: variant === 'circular' ? '50%' : theme.borderRadius.md,
        animation: 'shimmer 1.5s infinite',
        ...props
      }}
    />
  );
};

// Page loader component
export const PageLoader = ({ text = 'Loading...' }) => {
  const { theme } = useTheme();

  return (
    <div className="page-loader" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.background,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.lg,
      zIndex: 9999
    }}>
      <Loader size="xlarge" />
      <p style={{
        margin: 0,
        fontSize: theme.typography.fontSize.lg,
        color: theme.colors.text.secondary,
        fontWeight: theme.typography.fontWeight.medium
      }}>
        {text}
      </p>
    </div>
  );
};

export default Loader;
