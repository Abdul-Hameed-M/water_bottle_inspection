import React from 'react';
import { useTheme } from '../../theme/ThemeContext';
import Button from './Button';
import Card from './Card';
import { AlertTriangle, RefreshCw, Home, Settings } from 'lucide-react';
import './ErrorFallback.css';

const ErrorFallback = ({
  error,
  resetError,
  showDetails = false,
  onRetry,
  onGoHome,
  onGoSettings
}) => {
  const { theme } = useTheme();

  const getErrorTitle = () => {
    if (error?.name === 'ChunkLoadError') return 'Failed to Load Resources';
    if (error?.name === 'NetworkError') return 'Network Connection Error';
    if (error?.name === 'TimeoutError') return 'Request Timeout';
    return 'Something Went Wrong';
  };

  const getErrorMessage = () => {
    if (error?.name === 'ChunkLoadError') {
      return 'Failed to load required resources. Please check your internet connection and try again.';
    }
    if (error?.name === 'NetworkError') {
      return 'Unable to connect to the server. Please check your network connection.';
    }
    if (error?.name === 'TimeoutError') {
      return 'The request took too long to complete. Please try again.';
    }
    return 'An unexpected error occurred. Please try again or contact support if the problem persists.';
  };

  const getErrorIcon = () => {
    if (error?.name === 'ChunkLoadError') return <AlertTriangle size={48} />;
    if (error?.name === 'NetworkError') return <AlertTriangle size={48} />;
    if (error?.name === 'TimeoutError') return <AlertTriangle size={48} />;
    return <AlertTriangle size={48} />;
  };

  return (
    <div className="error-fallback" style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.xl,
      backgroundColor: theme.colors.background
    }}>
      <Card
        variant="elevated"
        padding="xl"
        style={{
          maxWidth: '600px',
          width: '100%',
          textAlign: 'center'
        }}
      >
        <div className="error-icon" style={{
          marginBottom: theme.spacing.lg,
          color: theme.colors.error
        }}>
          {getErrorIcon()}
        </div>

        <h1 className="error-title" style={{
          fontSize: theme.typography.fontSize['2xl'],
          fontWeight: theme.typography.fontWeight.bold,
          color: theme.colors.text.primary,
          marginBottom: theme.spacing.md,
          margin: `0 0 ${theme.spacing.md} 0`
        }}>
          {getErrorTitle()}
        </h1>

        <p className="error-message" style={{
          fontSize: theme.typography.fontSize.base,
          color: theme.colors.text.secondary,
          marginBottom: theme.spacing.xl,
          margin: `0 0 ${theme.spacing.xl} 0`
        }}>
          {getErrorMessage()}
        </p>

        <div className="error-actions" style={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.md,
          alignItems: 'center'
        }}>
          {onRetry && (
            <Button
              onClick={onRetry}
              icon={RefreshCw}
              variant="primary"
              fullWidth
            >
              Try Again
            </Button>
          )}

          {resetError && (
            <Button
              onClick={resetError}
              icon={RefreshCw}
              variant="secondary"
              fullWidth
            >
              Reset Application
            </Button>
          )}

          <div style={{
            display: 'flex',
            gap: theme.spacing.md,
            width: '100%'
          }}>
            {onGoHome && (
              <Button
                onClick={onGoHome}
                icon={Home}
                variant="ghost"
                style={{ flex: 1 }}
              >
                Go to Dashboard
              </Button>
            )}

            {onGoSettings && (
              <Button
                onClick={onGoSettings}
                icon={Settings}
                variant="ghost"
                style={{ flex: 1 }}
              >
                Settings
              </Button>
            )}
          </div>
        </div>

        {showDetails && error && (
          <details className="error-details" style={{
            marginTop: theme.spacing.xl,
            padding: theme.spacing.lg,
            backgroundColor: theme.colors.surfaceHover,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.borderRadius.lg,
            textAlign: 'left'
          }}>
            <summary style={{
              cursor: 'pointer',
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.text.primary
            }}>
              Error Details
            </summary>
            <pre className="error-stack" style={{
              marginTop: theme.spacing.md,
              padding: theme.spacing.md,
              backgroundColor: theme.colors.background,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.borderRadius.md,
              fontSize: theme.typography.fontSize.xs,
              color: theme.colors.text.secondary,
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}>
              {error.toString()}
              {error.stack}
            </pre>
          </details>
        )}
      </Card>
    </div>
  );
};

export default ErrorFallback;
