import React, { useEffect } from 'react';
import { useTheme } from '../../theme/ThemeContext';
import Button from './Button';
import './Modal.css';

const Modal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  size = 'medium',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  footer,
  className = '',
  ...props
}) => {
  const { theme } = useTheme();
  const isDark = theme.mode === 'dark';

  useEffect(() => {
    if (closeOnEscape && isOpen) {
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose, closeOnEscape]);

  const handleOverlayClick = (e) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  const getSizeStyles = () => {
    const sizes = {
      small: {
        maxWidth: '400px'
      },
      medium: {
        maxWidth: '600px'
      },
      large: {
        maxWidth: '850px'
      },
      xlarge: {
        maxWidth: '1200px'
      },
      full: {
        maxWidth: '95vw',
        maxHeight: '95vh'
      }
    };
    return sizes[size] || sizes.medium;
  };

  if (!isOpen) return null;

  return (
    <div
      className={`modal-overlay ${className}`}
      onClick={handleOverlayClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(5, 7, 13, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.lg,
        zIndex: 1000,
        animation: 'fadeIn 0.2s cubic-bezier(0.4, 0, 0.2, 1) forwards'
      }}
      {...props}
    >
      <div
        className="modal-content"
        style={{
          ...getSizeStyles(),
          width: '100%',
          maxHeight: '85vh',
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius['2xl'],
          border: `1px solid ${theme.colors.border}`,
          boxShadow: theme.shadows.xl,
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || showCloseButton) && (
          <div className="modal-header" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: theme.spacing.lg,
            borderBottom: `1px solid ${theme.colors.border}`,
            background: isDark ? '#141A2B' : '#FAFBFD'
          }}>
            <div className="modal-title-section" style={{
              flex: 1
            }}>
              {title && (
                <h2 className="modal-title" style={{
                  margin: 0,
                  fontSize: theme.typography.fontSize.lg,
                  fontWeight: theme.typography.fontWeight.bold,
                  fontFamily: theme.typography.fontFamily.heading,
                  color: theme.colors.text.primary,
                  lineHeight: theme.typography.lineHeight.tight,
                  letterSpacing: '0.01em'
                }}>
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="modal-subtitle" style={{
                  margin: `0.25rem 0 0 0`,
                  fontSize: theme.typography.fontSize.xs,
                  fontFamily: theme.typography.fontFamily.sans,
                  color: theme.colors.text.secondary,
                  lineHeight: theme.typography.lineHeight.normal
                }}>
                  {subtitle}
                </p>
              )}
            </div>
            {showCloseButton && (
              <button
                className="modal-close-button"
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  color: theme.colors.text.tertiary,
                  cursor: 'pointer',
                  padding: theme.spacing.sm,
                  borderRadius: theme.borderRadius.md,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                  marginLeft: theme.spacing.md
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.surfaceHover;
                  e.currentTarget.style.color = theme.colors.text.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = theme.colors.text.tertiary;
                }}
              >
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}
        <div className="modal-body" style={{
          flex: 1,
          padding: theme.spacing.lg,
          overflowY: 'auto',
          color: theme.colors.text.primary,
          fontFamily: theme.typography.fontFamily.sans,
          fontSize: theme.typography.fontSize.sm,
          lineHeight: theme.typography.lineHeight.normal
        }}>
          {children}
        </div>
        {footer && (
          <div className="modal-footer" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: theme.spacing.md,
            padding: theme.spacing.lg,
            borderTop: `1px solid ${theme.colors.border}`,
            background: isDark ? '#141A2B' : '#FAFBFD'
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
