// Theme configuration for SeeWise Inspection System
export const lightTheme = {
  mode: 'light',
  colors: {
    background: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceHover: '#F1F5F9',
    border: '#E2E8F0',
    text: {
      primary: '#0F172A',
      secondary: '#475569',
      tertiary: '#94A3B8',
      inverse: '#FFFFFF'
    },
    primary: '#2563EB',
    primaryHover: '#1D4ED8',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#06B6D4',
    detection: {
      bottle: '#2563EB',
      proper_fill: '#10B981',
      under_fill: '#F59E0B',
      over_fill: '#EF4444',
      label_proper: '#10B981',
      label_torn: '#FBBF24',
      label_missing: '#EF4444'
    }
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(15, 23, 42, 0.05)',
    md: '0 4px 6px -1px rgba(15, 23, 42, 0.05), 0 2px 4px -1px rgba(15, 23, 42, 0.03)',
    lg: '0 10px 15px -3px rgba(15, 23, 42, 0.06), 0 4px 6px -2px rgba(15, 23, 42, 0.03)',
    xl: '0 20px 25px -5px rgba(15, 23, 42, 0.08), 0 10px 10px -5px rgba(15, 23, 42, 0.04)'
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem'
  },
  typography: {
    fontFamily: {
      sans: 'Poppins, sans-serif',
      mono: 'JetBrains Mono, monospace',
      heading: 'Outfit, sans-serif'
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
      '5xl': '3rem'
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75
    }
  },
  borderRadius: {
    sm: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    full: '9999px'
  },
  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '500ms cubic-bezier(0.4, 0, 0.2, 1)'
  }
};

export const darkTheme = {
  mode: 'dark',
  colors: {
    background: '#070A13',
    surface: '#111625',
    surfaceHover: '#1E2538',
    border: 'rgba(255, 255, 255, 0.08)',
    text: {
      primary: '#F8FAFB',
      secondary: '#94A3B8',
      tertiary: '#64748B',
      inverse: '#070A13'
    },
    primary: '#3B82F6',
    primaryHover: '#60A5FA',
    success: '#10B981',
    warning: '#FBBF24',
    error: '#F87171',
    info: '#06B6D4',
    detection: {
      bottle: '#3B82F6',
      proper_fill: '#10B981',
      under_fill: '#FBBF24',
      over_fill: '#F87171',
      label_proper: '#10B981',
      label_torn: '#FBBF24',
      label_missing: '#F87171'
    }
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.5)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.6), 0 2px 4px -1px rgba(0, 0, 0, 0.4)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.7), 0 4px 6px -2px rgba(0, 0, 0, 0.5)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.8), 0 10px 10px -5px rgba(0, 0, 0, 0.6)'
  },
  spacing: lightTheme.spacing,
  typography: lightTheme.typography,
  borderRadius: lightTheme.borderRadius,
  transitions: lightTheme.transitions
};

export default { lightTheme, darkTheme };
