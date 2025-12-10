// Error Boundary Component for SafeRoute AI Frontend
// Catches JavaScript errors anywhere in the child component tree
// Provides user-friendly error messages and recovery options

import React, { Component, ReactNode, ErrorInfo } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Alert,
  AlertTitle,
  Stack,
  Divider,
  Chip,
  IconButton,
  Collapse
} from '@mui/material';
import {
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Home as HomeIcon,
  ExpandMore as ExpandMoreIcon,
  BugReport as BugReportIcon,
  ContentCopy as CopyIcon
} from '@mui/icons-material';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  showDetails: boolean;
  retryCount: number;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackComponent?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  enableRetry?: boolean;
  maxRetries?: number;
  resetOnPropsChange?: boolean;
}

interface ErrorDetails {
  message: string;
  stack?: string;
  componentStack?: string;
  userAgent: string;
  timestamp: string;
  url: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      showDetails: false,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    this.logError(error, errorInfo);

    // Update state with error details
    this.setState({
      error,
      errorInfo
    });

    // Call onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { hasError, error } = this.state;
    const { resetOnPropsChange } = this.props;

    // Reset error boundary if props change (e.g., route change)
    if (hasError && prevProps !== this.props && resetOnPropsChange) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: '',
        showDetails: false
      });
    }

    // Auto-retry for network errors
    if (hasError && error && this.isNetworkError(error) && this.state.retryCount === 0) {
      this.scheduleRetry(2000); // Retry after 2 seconds for network errors
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  private logError = (error: Error, errorInfo: ErrorInfo) => {
    const errorDetails: ErrorDetails = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack || undefined,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      url: window.location.href
    };

    // Log to console for development
    console.group('🚨 Error Boundary Caught Error');
    console.error('Error:', error);
    console.error('Error Info:', errorInfo);
    console.error('Error Details:', errorDetails);
    console.groupEnd();

    // In production, send to error reporting service
    if (process.env.NODE_ENV === 'production') {
      this.sendErrorReport(errorDetails);
    }

    // Store in localStorage for debugging
    try {
      const storedErrors = JSON.parse(localStorage.getItem('saferoute_errors') || '[]');
      storedErrors.push(errorDetails);

      // Keep only last 10 errors
      if (storedErrors.length > 10) {
        storedErrors.shift();
      }

      localStorage.setItem('saferoute_errors', JSON.stringify(storedErrors));
    } catch (e) {
      console.warn('Failed to store error in localStorage:', e);
    }
  };

  private sendErrorReport = async (errorDetails: ErrorDetails) => {
    try {
      // In a real app, send to error reporting service
      await fetch('/api/errors/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...errorDetails,
          errorId: this.state.errorId,
          userAgent: navigator.userAgent,
          sessionId: sessionStorage.getItem('session_id')
        })
      });
    } catch (e) {
      console.warn('Failed to send error report:', e);
    }
  };

  private isNetworkError = (error: Error): boolean => {
    const networkErrorMessages = [
      'fetch',
      'network',
      'Failed to fetch',
      'NetworkError',
      'Connection refused'
    ];

    return networkErrorMessages.some(msg =>
      error.message.toLowerCase().includes(msg.toLowerCase())
    );
  };

  private scheduleRetry = (delay: number) => {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }

    this.retryTimeoutId = setTimeout(() => {
      this.handleRetry();
    }, delay);
  };

  private handleRetry = () => {
    const maxRetries = this.props.maxRetries || 3;

    if (this.state.retryCount < maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: '',
        showDetails: false,
        retryCount: prevState.retryCount + 1
      }));
    }
  };

  private handleRefresh = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private toggleDetails = () => {
    this.setState(prevState => ({
      showDetails: !prevState.showDetails
    }));
  };

  private copyErrorDetails = () => {
    const { error, errorInfo, errorId } = this.state;

    const errorText = `
Error ID: ${errorId}
Timestamp: ${new Date().toISOString()}
URL: ${window.location.href}
User Agent: ${navigator.userAgent}

Error Message: ${error?.message}

Stack Trace:
${error?.stack}

Component Stack:
${errorInfo?.componentStack}
    `.trim();

    navigator.clipboard.writeText(errorText).then(() => {
      // Could show a toast notification here
      console.log('Error details copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy error details:', err);
    });
  };

  private getErrorCategory = (error: Error): string => {
    if (this.isNetworkError(error)) return 'Network';
    if (error.message.includes('chunk')) return 'Loading';
    if (error.message.includes('Google') || error.message.includes('Maps')) return 'Maps';
    if (error.message.includes('safety') || error.message.includes('route')) return 'Safety';
    return 'Application';
  };

  private getErrorSeverity = (error: Error): 'error' | 'warning' | 'info' => {
    if (this.isNetworkError(error)) return 'warning';
    if (error.message.includes('chunk')) return 'info';
    return 'error';
  };

  render() {
    const { hasError, error, errorId, showDetails, retryCount } = this.state;
    const { children, fallbackComponent, enableRetry = true, maxRetries = 3 } = this.props;

    if (!hasError) {
      return children;
    }

    if (fallbackComponent) {
      return fallbackComponent;
    }

    const errorCategory = error ? this.getErrorCategory(error) : 'Unknown';
    const errorSeverity = error ? this.getErrorSeverity(error) : 'error';
    const canRetry = enableRetry && retryCount < maxRetries;

    return (
      <Box
        sx={{
          minHeight: '50vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 3,
          backgroundColor: 'background.default'
        }}
      >
        <Card sx={{ maxWidth: 600, width: '100%' }}>
          <CardContent>
            <Stack spacing={3}>
              {/* Header */}
              <Box textAlign="center">
                <ErrorIcon color="error" sx={{ fontSize: 48, mb: 2 }} />
                <Typography variant="h4" component="h1" gutterBottom>
                  Oops! Something went wrong
                </Typography>
                <Typography variant="body1" color="textSecondary">
                  SafeRoute AI encountered an unexpected error. Don't worry, we're here to help you get back on track.
                </Typography>
              </Box>

              {/* Error Alert */}
              <Alert severity={errorSeverity}>
                <AlertTitle>
                  {errorCategory} Error
                  <Chip
                    label={`ID: ${errorId.slice(-8)}`}
                    size="small"
                    sx={{ ml: 1 }}
                  />
                </AlertTitle>
                {error?.message && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {error.message}
                  </Typography>
                )}
              </Alert>

              {/* Action Buttons */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                {canRetry && (
                  <Button
                    variant="contained"
                    startIcon={<RefreshIcon />}
                    onClick={this.handleRetry}
                    disabled={retryCount >= maxRetries}
                  >
                    Try Again {retryCount > 0 && `(${retryCount}/${maxRetries})`}
                  </Button>
                )}

                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={this.handleRefresh}
                >
                  Refresh Page
                </Button>

                <Button
                  variant="text"
                  startIcon={<HomeIcon />}
                  onClick={this.handleGoHome}
                >
                  Go Home
                </Button>
              </Stack>

              {/* Helpful Tips */}
              <Alert severity="info">
                <AlertTitle>What you can do:</AlertTitle>
                <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                  <li>Try refreshing the page</li>
                  <li>Check your internet connection</li>
                  <li>Clear your browser cache if the problem persists</li>
                  {this.isNetworkError(error!) && (
                    <li>This appears to be a network issue - please check your connectivity</li>
                  )}
                </ul>
              </Alert>

              <Divider />

              {/* Error Details Toggle */}
              <Box>
                <Button
                  variant="text"
                  startIcon={<BugReportIcon />}
                  endIcon={<ExpandMoreIcon sx={{
                    transform: showDetails ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s'
                  }} />}
                  onClick={this.toggleDetails}
                  size="small"
                >
                  {showDetails ? 'Hide' : 'Show'} Technical Details
                </Button>

                <Collapse in={showDetails}>
                  <Card variant="outlined" sx={{ mt: 2, bgcolor: 'grey.50' }}>
                    <CardContent>
                      <Stack spacing={2}>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="subtitle2" color="textSecondary">
                            Error Details
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={this.copyErrorDetails}
                            title="Copy error details"
                          >
                            <CopyIcon fontSize="small" />
                          </IconButton>
                        </Box>

                        <Box>
                          <Typography variant="caption" color="textSecondary">
                            Error ID:
                          </Typography>
                          <Typography variant="body2" fontFamily="monospace">
                            {errorId}
                          </Typography>
                        </Box>

                        <Box>
                          <Typography variant="caption" color="textSecondary">
                            Timestamp:
                          </Typography>
                          <Typography variant="body2">
                            {new Date().toLocaleString()}
                          </Typography>
                        </Box>

                        {error?.stack && (
                          <Box>
                            <Typography variant="caption" color="textSecondary">
                              Stack Trace:
                            </Typography>
                            <Typography
                              variant="body2"
                              fontFamily="monospace"
                              fontSize="0.75rem"
                              sx={{
                                backgroundColor: 'grey.100',
                                p: 1,
                                borderRadius: 1,
                                maxHeight: 200,
                                overflow: 'auto'
                              }}
                            >
                              {error.stack}
                            </Typography>
                          </Box>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                </Collapse>
              </Box>

              {/* Contact Info */}
              <Alert severity="info" variant="outlined">
                <Typography variant="body2">
                  If this problem persists, please report it with the error ID{' '}
                  <strong>{errorId.slice(-8)}</strong> for faster assistance.
                </Typography>
              </Alert>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    );
  }
}

// HOC for wrapping components with error boundary
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Partial<ErrorBoundaryProps>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
};

// Hook for error reporting in functional components
export const useErrorHandler = () => {
  const reportError = React.useCallback((error: Error, errorInfo?: any) => {
    console.error('Manual error report:', error, errorInfo);

    // In production, send to error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Implementation would go here
    }
  }, []);

  return { reportError };
};

export default ErrorBoundary;