import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Shield, User, Moon, Sun } from 'lucide-react';
import { useTheme } from '../theme/ThemeContext';
import { useToast } from './common/Toast';

const Navbar = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const isDark = theme.mode === 'dark';

  const handleThemeToggle = () => {
    toggleTheme();
    showToast(
      `Switched to ${theme.mode === 'light' ? 'Slate Dark' : 'Clean Light'} Mode`,
      'info',
      2000
    );
  };

  const handleSignOut = () => {
    onLogout();
    showToast('Securely signed out of SeeWise Platform', 'success', 3000);
  };

  return (
    <nav style={{
      height: '5.25rem',
      backgroundColor: 'var(--surface)',
      borderBottom: `1px solid var(--border)`,
      padding: '0 2rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.2)' : '0 2px 10px rgba(15, 23, 42, 0.03)'
    }}>
      {/* Brand Logo & Title */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem',
          cursor: 'pointer'
        }}
        onClick={() => navigate('/dashboard')}
      >
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <img
            src="/seewise_3d_logo.png"
            alt="SeeWise Logo"
            style={{
              height: '4.25rem',
              objectFit: 'contain',
              transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              filter: isDark ? 'drop-shadow(0 0 15px rgba(59,130,246,0.45))' : 'drop-shadow(0 0 10px rgba(37,99,235,0.2))'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'scale(1.08) rotate(-2deg)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'scale(1) rotate(0deg)';
            }}
          />
        </div>
        <div className="hidden sm:block">
          <h1 style={{
            margin: 0,
            fontSize: '1.5rem',
            fontWeight: theme.typography.fontWeight.extrabold,
            fontFamily: theme.typography.fontFamily.heading,
            color: 'var(--text-primary)',
            letterSpacing: '0.05em',
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem'
          }}>
            SEEWISE
            <span style={{
              fontSize: '0.675rem',
              fontFamily: theme.typography.fontFamily.mono,
              fontWeight: theme.typography.fontWeight.bold,
              color: 'var(--primary)',
              border: `1px solid var(--primary)`,
              padding: '0.125rem 0.5rem',
              borderRadius: '9999px',
              letterSpacing: '0.05em'
            }}>
              AI CORE
            </span>
          </h1>
        </div>
      </div>

      {/* Action Items & Profile */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1.25rem'
      }}>
        {/* Theme Switching Button */}
        <button
          onClick={handleThemeToggle}
          style={{
            padding: '0.55rem',
            backgroundColor: 'var(--surface-hover)',
            borderRadius: '0.75rem',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            border: `1px solid var(--border)`
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.color = 'var(--text-primary)';
            e.currentTarget.style.borderColor = 'var(--primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.color = 'var(--text-secondary)';
            e.currentTarget.style.borderColor = 'var(--border)';
          }}
          title={theme.mode === 'light' ? 'Activate Cyber Dark Mode' : 'Activate Clean Light Mode'}
        >
          {theme.mode === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {/* User Card */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.875rem',
          paddingRight: '1.25rem',
          borderRight: `1px solid var(--border)`,
          height: '2.25rem'
        }}>
          <div style={{
            width: '2.25rem',
            height: '2.25rem',
            borderRadius: '0.75rem',
            backgroundColor: 'var(--surface-hover)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `1px solid var(--border)`,
            color: 'var(--primary)'
          }}>
            <User size={16} />
          </div>
          <div style={{
            textAlign: 'left',
          }} className="hidden md:block">
            <div style={{
              fontSize: '0.825rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              fontFamily: theme.typography.fontFamily.heading,
              lineHeight: 1.2
            }}>
              {user?.full_name || 'Operator'}
            </div>
            <div style={{
              fontSize: '0.625rem',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              marginTop: '0.125rem',
              fontFamily: theme.typography.fontFamily.mono,
              fontWeight: 600
            }}>
              <Shield size={10} style={{ color: 'var(--success)' }} />
              {user?.role?.toUpperCase() || 'OPERATOR'}
            </div>
          </div>
        </div>

        {/* Secure Logout */}
        <button
          onClick={handleSignOut}
          style={{
            padding: '0.55rem',
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: '0.75rem',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
            e.currentTarget.style.color = 'var(--error)';
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
          title="Disconnect Console Session"
        >
          <LogOut size={18} />
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
