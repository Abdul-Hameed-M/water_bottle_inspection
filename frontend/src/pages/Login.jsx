import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ShieldAlert, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react';
import api from '../services/api';
import { useTheme } from '../theme/ThemeContext';
import { useToast } from '../components/common/Toast';

const Login = ({ onLoginSuccess }) => {
  const { theme } = useTheme();
  const { showToast } = useToast();
  const isDark = theme.mode === 'dark';

  const [email, setEmail] = useState('admin@seewise.com');
  const [password, setPassword] = useState('seewise123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', { email, password });
      const { access_token } = response.data;
      
      // Save JWT token
      localStorage.setItem('seewise_token', access_token);
      
      // Fetch user profile info
      const userResponse = await api.get('/auth/me');
      onLoginSuccess(userResponse.data);
      
      showToast(`Welcome back, ${userResponse.data.full_name || 'Operator'}!`, 'success', 3500);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Authentication failed. Please verify corporate credentials.');
      showToast('Authentication failed', 'error', 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      backgroundColor: '#070A13',
      fontFamily: theme.typography.fontFamily.sans,
      animation: 'fadeIn 0.4s ease-out'
    }} className="flex-col md:flex-row">
      
      {/* Left Column: Brand Hero Info Panel */}
      <div 
        style={{
          backgroundColor: '#0A0E1A',
          padding: '4rem 3rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          color: '#FFFFFF',
          position: 'relative',
          overflow: 'hidden',
          borderRight: '1px solid rgba(255, 255, 255, 0.05)'
        }}
        className="md:w-1/2"
      >
        {/* Background micro grid visual effect */}
        <div style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.05,
          backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          pointerEvents: 'none'
        }} />
        
        {/* Decorative cyber laser line */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '2px',
          height: '100%',
          background: 'linear-gradient(to bottom, #2563EB, #06B6D4, transparent)'
        }} />

        <div style={{ 
          zIndex: 10, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          textAlign: 'center',
          margin: '1rem auto 2.5rem auto',
          perspective: '1000px'
        }}>
          <style>{`
            @keyframes float3d {
              0% { transform: translateY(0px) rotateX(10deg) rotateY(-15deg) scale(1); }
              50% { transform: translateY(-12px) rotateX(14deg) rotateY(-10deg) scale(1.03); }
              100% { transform: translateY(0px) rotateX(10deg) rotateY(-15deg) scale(1); }
            }
          `}</style>
          <img 
            src="/seewise_logo.png" 
            alt="SeeWise Logo" 
            style={{
              height: '9rem',
              width: 'auto',
              objectFit: 'contain',
              transformStyle: 'preserve-3d',
              animation: 'float3d 6s ease-in-out infinite',
              filter: 'drop-shadow(0 15px 35px rgba(59, 130, 246, 0.65)) drop-shadow(0 0 50px rgba(6, 182, 212, 0.4)) drop-shadow(6px 6px 0px rgba(6, 182, 212, 0.7))',
              transition: 'all 0.5s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.filter = 'drop-shadow(0 20px 45px rgba(59, 130, 246, 0.8)) drop-shadow(0 0 60px rgba(6, 182, 212, 0.5)) drop-shadow(8px 8px 0px rgba(6, 182, 212, 0.85))';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = 'drop-shadow(0 15px 35px rgba(59, 130, 246, 0.65)) drop-shadow(0 0 50px rgba(6, 182, 212, 0.4)) drop-shadow(6px 6px 0px rgba(6, 182, 212, 0.7))';
            }}
          />
          <h2 style={{
            fontSize: '2.5rem',
            fontWeight: 950,
            fontFamily: theme.typography.fontFamily.heading,
            letterSpacing: '0.125em',
            marginTop: '1.25rem',
            marginBottom: '0',
            color: '#FFFFFF',
            textShadow: '0 8px 20px rgba(59, 130, 246, 0.5), 3px 3px 0px rgba(6, 182, 212, 0.7)',
            transform: 'translateZ(30px)'
          }}>
            SEEWISE
          </h2>
        </div>

        <div style={{ zIndex: 10, margin: '6rem 0' }} className="max-w-lg">
          <span style={{
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            fontSize: '0.625rem',
            fontFamily: theme.typography.fontFamily.mono,
            fontWeight: 700,
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            textTransform: 'uppercase',
            letterSpacing: '0.075em',
            display: 'inline-block'
          }}>
            Precision AI Quality Control
          </span>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 800,
            fontFamily: theme.typography.fontFamily.heading,
            letterSpacing: '-0.025em',
            lineHeight: 1.15,
            marginTop: '1.25rem',
            marginBottom: '1rem'
          }} className="md:text-4xl lg:text-5xl">
            Streamlining Factory Precision.
          </h1>
          <p style={{
            fontSize: '0.825rem',
            color: '#94A3B8',
            lineHeight: 1.6,
            margin: 0
          }}>
            Deploy state-of-the-art neural network layers directly onto production lines. Automatically inspect fluid volumes, labels, and verify container parameters with sub-millisecond latencies.
          </p>
        </div>

        <div style={{ zIndex: 10, display: 'flex', justifyContent: 'space-between', fontSize: '0.625rem', fontFamily: theme.typography.fontFamily.mono, color: '#64748B' }}>
          <span>CONSOLE v1.0.0 STABLE</span>
          <span>© 2026 SEEWISE INC.</span>
        </div>
      </div>

      {/* Right Column: Clean Industrial Login Form */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4rem 2rem',
          backgroundColor: isDark ? '#070A13' : '#FFFFFF'
        }}
        className="md:w-1/2"
      >
        <div style={{ width: '100%', maxWidth: '380px' }} className="space-y-6">
          <div className="space-y-1.5">
            <h2 style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              fontFamily: theme.typography.fontFamily.heading,
              color: isDark ? '#F8FAFB' : '#0F172A',
              letterSpacing: '-0.02em',
              margin: 0
            }}>
              Sign In
            </h2>
            <p style={{
              fontSize: theme.typography.fontSize.xs,
              color: theme.colors.text.secondary,
              margin: 0
            }}>
              Authenticate to connect securely to the industrial inspection panel.
            </p>
          </div>

          {error && (
            <div style={{
              padding: '0.75rem 1rem',
              backgroundColor: isDark ? 'rgba(239, 68, 68, 0.08)' : '#FEF2F2',
              borderRadius: theme.borderRadius.xl,
              border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2'}`,
              color: theme.colors.error,
              fontSize: '0.725rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.5rem',
              lineHeight: 1.4
            }} className="animate-shake">
              <ShieldAlert size={14} style={{ shrink: 0, marginTop: '0.1rem' }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <label style={{
                fontSize: '0.625rem',
                fontWeight: 700,
                letterSpacing: '0.075em',
                textTransform: 'uppercase',
                color: theme.colors.text.secondary,
                fontFamily: theme.typography.fontFamily.mono
              }}>
                Corporate Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@seewise.com"
                style={{
                  width: '100%',
                  padding: '0.675rem 1rem',
                  borderRadius: theme.borderRadius.xl,
                  border: `1px solid ${theme.colors.border}`,
                  backgroundColor: isDark ? '#141A2B' : '#FFFFFF',
                  color: theme.colors.text.primary,
                  fontFamily: theme.typography.fontFamily.sans,
                  fontSize: '0.825rem',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = theme.colors.primary;
                  e.target.style.boxShadow = isDark ? '0 0 10px rgba(59,130,246,0.2)' : '0 0 8px rgba(37,99,235,0.08)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = theme.colors.border;
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', position: 'relative' }}>
              <label style={{
                fontSize: '0.625rem',
                fontWeight: 700,
                letterSpacing: '0.075em',
                textTransform: 'uppercase',
                color: theme.colors.text.secondary,
                fontFamily: theme.typography.fontFamily.mono
              }}>
                Access Credential Token
              </label>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '0.675rem 2.5rem 0.675rem 1rem',
                  borderRadius: theme.borderRadius.xl,
                  border: `1px solid ${theme.colors.border}`,
                  backgroundColor: isDark ? '#141A2B' : '#FFFFFF',
                  color: theme.colors.text.primary,
                  fontFamily: theme.typography.fontFamily.sans,
                  fontSize: '0.825rem',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = theme.colors.primary;
                  e.target.style.boxShadow = isDark ? '0 0 10px rgba(59,130,246,0.2)' : '0 0 8px rgba(37,99,235,0.08)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = theme.colors.border;
                  e.target.style.boxShadow = 'none';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.875rem',
                  bottom: '0.6rem',
                  background: 'none',
                  border: 'none',
                  color: theme.colors.text.tertiary,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0
                }}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: theme.borderRadius.xl,
                backgroundColor: theme.colors.primary,
                color: '#FFFFFF',
                border: 'none',
                fontFamily: theme.typography.fontFamily.heading,
                fontSize: theme.typography.fontSize.sm,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s ease',
                boxShadow: isDark ? '0 4px 12px rgba(59, 130, 246, 0.2)' : '0 4px 12px rgba(37, 99, 235, 0.15)',
                boxSizing: 'border-box',
                marginTop: '0.5rem'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = theme.colors.primaryHover;
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.primary;
                e.currentTarget.style.transform = 'translateY(0px)';
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Configuring Session...</span>
                </>
              ) : (
                <>
                  <span>Access Platform</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Assist panel */}
          <div style={{
            padding: '1rem',
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'var(--surface-hover)',
            borderRadius: theme.borderRadius.xl,
            border: `1px solid ${theme.colors.border}`,
            fontSize: '0.675rem',
            fontFamily: theme.typography.fontFamily.mono,
            color: theme.colors.text.secondary,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: theme.colors.text.primary, fontWeight: 700 }}>
              <ShieldCheck size={13} style={{ color: theme.colors.success }} />
              <span>Operator Demo Authentication</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px dashed ${theme.colors.border}`, paddingBottom: '0.25rem' }}>
              <span>User Email:</span>
              <strong style={{ color: theme.colors.text.primary }}>admin@seewise.com</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Security Token:</span>
              <strong style={{ color: theme.colors.text.primary }}>seewise123</strong>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Login;
