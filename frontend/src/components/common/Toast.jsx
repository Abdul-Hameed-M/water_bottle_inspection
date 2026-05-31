import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { useTheme } from '../../theme/ThemeContext';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const { theme } = useTheme();
  const isDark = theme.mode === 'dark';

  const showToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = `toast_${Date.now()}`;
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const getToastColors = (type) => {
    const types = {
      success: {
        bg: isDark ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.08)',
        border: 'rgba(16, 185, 129, 0.35)',
        text: theme.colors.success,
        icon: CheckCircle2
      },
      warning: {
        bg: isDark ? 'rgba(245, 158, 11, 0.12)' : 'rgba(245, 158, 11, 0.08)',
        border: 'rgba(245, 158, 11, 0.35)',
        text: theme.colors.warning,
        icon: AlertTriangle
      },
      error: {
        bg: isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.08)',
        border: 'rgba(239, 68, 68, 0.35)',
        text: theme.colors.error,
        icon: AlertCircle
      },
      info: {
        bg: isDark ? 'rgba(6, 182, 212, 0.12)' : 'rgba(6, 182, 212, 0.08)',
        border: 'rgba(6, 182, 212, 0.35)',
        text: theme.colors.info,
        icon: Info
      }
    };
    return types[type] || types.info;
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast Portal Container */}
      <div
        style={{
          position: 'fixed',
          top: '1.5rem',
          right: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          zIndex: 9999,
          pointerEvents: 'none',
          maxWidth: '380px',
          width: '100%'
        }}
      >
        {toasts.map((toast) => {
          const colors = getToastColors(toast.type);
          const Icon = colors.icon;

          return (
            <div
              key={toast.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                padding: '0.875rem 1.125rem',
                backgroundColor: colors.bg,
                border: `1px solid ${colors.border}`,
                borderRadius: theme.borderRadius.xl,
                boxShadow: theme.shadows.xl,
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                color: colors.text,
                fontFamily: theme.typography.fontFamily.sans,
                fontSize: '0.8rem',
                fontWeight: theme.typography.fontWeight.semibold,
                pointerEvents: 'auto',
                animation: 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div style={{ marginTop: '0.125rem', flexShrink: 0 }}>
                <Icon size={16} />
              </div>
              <div style={{ flex: 1, paddingRight: '0.5rem', lineHeight: 1.4 }}>
                {toast.message}
              </div>
              <button
                onClick={() => dismissToast(toast.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: colors.text,
                  cursor: 'pointer',
                  opacity: 0.6,
                  transition: 'opacity 0.15s ease',
                  padding: '0.125rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: '0.125rem',
                  flexShrink: 0
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = 1; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = 0.6; }}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export default ToastProvider;
