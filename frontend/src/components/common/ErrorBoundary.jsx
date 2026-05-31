import React, { Component } from 'react';
import { useTheme } from '../../theme/ThemeContext';
import Button from './Button';
import './ErrorBoundary.css';

class ErrorBoundaryClass extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} onRetry={this.handleRetry} />;
    }

    return this.props.children;
  }
}

const ErrorFallback = ({ error, onRetry }) => {
  const { theme } = useTheme();

  return (
    <div className="error-fallback" style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.xl,
      backgroundColor: theme.colors.background,
      gap: theme.spacing.lg
    }}>
      <div className="error-icon" style={{
        fontSize: '4rem',
        marginBottom: theme.spacing.md
      }}>
        ⚠️
      </div>
      <h1 className="error-title" style={{
        margin: 0,
        fontSize: theme.typography.fontSize['3xl'],
        fontWeight: theme.typography.fontWeight.bold,
        color: theme.colors.text.primary,
        textAlign: 'center'
      }}>
        Something went wrong
      </h1>
      <p className="error-message" style={{
        margin: 0,
        fontSize: theme.typography.fontSize.lg,
        color: theme.colors.text.secondary,
        textAlign: 'center',
        maxWidth: '600px'
      }}>
        An unexpected error occurred. Please try again or contact support if the problem persists.
      </p>
      {error && (
        <details className="error-details" style={{
          marginTop: theme.spacing.lg,
          padding: theme.spacing.lg,
          backgroundColor: theme.colors.surface,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: theme.borderRadius.lg,
          maxWidth: '800px',
          width: '100%'
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
      <div className="error-actions" style={{
        display: 'flex',
        gap: theme.spacing.md,
        marginTop: theme.spacing.lg
      }}>
        <Button onClick={onRetry} variant="primary">
          Try Again
        </Button>
        <Button onClick={() => window.location.href = '/'} variant="secondary">
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
};

const ErrorBoundary = (props) => {
  return <ErrorBoundaryClass {...props} />;
};

export default ErrorBoundary;
