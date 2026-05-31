import React from 'react';
import { useTheme } from '../../theme/ThemeContext';
import './StatusIndicator.css';

const StatusIndicator = ({
  status = 'idle',
  size = 'medium',
  showLabel = false,
  label,
  className = '',
  ...props
}) => {
  const { theme } = useTheme();

  const getStatusConfig = () => {
    const configs = {
      idle: {
        color: theme.colors.text.tertiary,
        label: 'Idle'
      },
      connecting: {
        color: theme.colors.warning,
        label: 'Connecting'
      },
      connected: {
        color: theme.colors.success,
        label: 'Connected'
      },
      streaming: {
        color: theme.colors.primary,
        label: 'Streaming'
      },
      error: {
        color: theme.colors.error,
        label: 'Error'
      },
      disconnected: {
        color: theme.colors.error,
        label: 'Disconnected'
      },
      loading: {
        color: theme.colors.info,
        label: 'Loading'
      },
      success: {
        color: theme.colors.success,
        label: 'Success'
      },
      warning: {
        color: theme.colors.warning,
        label: 'Warning'
      }
    };
    return configs[status] || configs.idle;
  };

  const getSizeStyles = () => {
    const sizes = {
      small: {
        width: '0.5rem',
        height: '0.5rem'
      },
      medium: {
        width: '0.75rem',
        height: '0.75rem'
      },
      large: {
        width: '1rem',
        height: '1rem'
      }
    };
    return sizes[size] || sizes.medium;
  };

  const config = getStatusConfig();
  const sizeStyles = getSizeStyles();

  return (
    <div className={`status-indicator status-${status} status-${size} ${className}`} style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: theme.spacing.sm
    }} {...props}>
      <div
        className="status-dot"
        style={{
          ...sizeStyles,
          backgroundColor: config.color,
          borderRadius: '50%',
          animation: status === 'streaming' || status === 'connecting' ? 'pulse 1.5s ease-in-out infinite' : 'none',
          boxShadow: `0 0 0 2px ${config.color}33`
        }}
      />
      {showLabel && (
        <span className="status-label" style={{
          fontSize: theme.typography.fontSize.sm,
          fontWeight: theme.typography.fontWeight.medium,
          color: config.color
        }}>
          {label || config.label}
        </span>
      )}
    </div>
  );
};

// Stream status component with additional information
export const StreamStatus = ({
  status = 'idle',
  fps = null,
  latency = null,
  resolution = null,
  source = null,
  className = ''
}) => {
  const { theme } = useTheme();

  return (
    <div className={`stream-status ${className}`} style={{
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing.lg,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      border: `1px solid ${theme.colors.border}`,
      borderRadius: theme.borderRadius.lg
    }}>
      <StatusIndicator status={status} size="large" showLabel />
      
      {(status === 'streaming' || status === 'connected') && (
        <div className="stream-metrics" style={{
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing.lg,
          fontSize: theme.typography.fontSize.sm,
          color: theme.colors.text.secondary
        }}>
          {fps !== null && (
            <div className="stream-metric" style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.xs
            }}>
              <span style={{ fontWeight: theme.typography.fontWeight.medium }}>
                FPS:
              </span>
              <span style={{ fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.text.primary }}>
                {Math.round(fps)}
              </span>
            </div>
          )}
          {latency !== null && (
            <div className="stream-metric" style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.xs
            }}>
              <span style={{ fontWeight: theme.typography.fontWeight.medium }}>
                Latency:
              </span>
              <span style={{ fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.text.primary }}>
                {Math.round(latency)}ms
              </span>
            </div>
          )}
          {resolution && (
            <div className="stream-metric" style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.xs
            }}>
              <span style={{ fontWeight: theme.typography.fontWeight.medium }}>
                Resolution:
              </span>
              <span style={{ fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.text.primary }}>
                {resolution}
              </span>
            </div>
          )}
          {source && (
            <div className="stream-metric" style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.xs
            }}>
              <span style={{ fontWeight: theme.typography.fontWeight.medium }}>
                Source:
              </span>
              <span style={{ fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.text.primary }}>
                {source}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StatusIndicator;
