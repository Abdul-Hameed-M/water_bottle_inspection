import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LogOut, Shield, User, Moon, Sun,
  LayoutDashboard, Camera, BarChart3, Settings as SettingsIcon,
  Activity, Menu, X
} from 'lucide-react';
import { useTheme } from '../theme/ThemeContext';
import { useToast } from './common/Toast';

const NAV_ITEMS = [
  { name: 'Dashboard',       path: '/dashboard',  icon: LayoutDashboard,  short: 'Home'      },
  { name: 'Live Inspection', path: '/detection',  icon: Camera,           short: 'Inspect'   },
  { name: 'Analytics',       path: '/analytics',  icon: BarChart3,        short: 'Analytics' },
  { name: 'Settings',        path: '/settings',   icon: SettingsIcon,     short: 'Settings'  },
];

const Navbar = ({ user, onLogout }) => {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const isDark     = theme.mode === 'dark';
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleThemeToggle = () => {
    toggleTheme();
    showToast(`Switched to ${theme.mode === 'light' ? 'Dark' : 'Light'} Mode`, 'info', 2000);
  };

  const handleSignOut = () => {
    onLogout();
    showToast('Securely signed out of SeeWise Platform', 'success', 3000);
  };

  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <>
      <nav style={{
        height: '5.25rem', // Taller, premium space
        backgroundColor: isDark ? 'rgba(17, 22, 37, 0.92)' : 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(12px)',
        webkitBackdropFilter: 'blur(12px)',
        borderBottom: `1px solid var(--border)`,
        padding: '0 2.5rem', // Spacious lateral padding
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: isDark
          ? '0 4px 30px rgba(0,0,0,0.4)'
          : '0 4px 15px rgba(15,23,42,0.04)',
        gap: '1.25rem',
      }}>

        {/* ── Brand ── */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', flexShrink: 0 }}
          onClick={() => navigate('/dashboard')}
        >
          <img
            src="/seewise_logo.png"
            alt="SeeWise"
            style={{
              height: '3.6rem', // Larger, visible logo
              objectFit: 'contain',
              filter: isDark
                ? 'drop-shadow(0 0 12px rgba(59,130,246,0.5))'
                : 'drop-shadow(0 0 8px rgba(37,99,235,0.25))',
              transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            onMouseEnter={e => e.target.style.transform = 'scale(1.08) rotate(2deg)'}
            onMouseLeave={e => e.target.style.transform = 'scale(1) rotate(0deg)'}
          />
          <div className="hidden sm:block">
            <div style={{
              fontSize: '1.2rem', // Taller brand text
              fontWeight: 800,
              fontFamily: theme.typography.fontFamily.heading,
              color: 'var(--text-primary)',
              letterSpacing: '0.06em',
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
            }}>
              SEEWISE
              <span style={{
                fontSize: '0.6rem',
                fontFamily: theme.typography.fontFamily.mono,
                fontWeight: 700,
                color: 'var(--primary)',
                border: '1px solid var(--primary)',
                padding: '0.125rem 0.5rem',
                borderRadius: '999px',
                letterSpacing: '0.06em',
                backgroundColor: isDark ? 'rgba(59,130,246,0.05)' : 'rgba(37,99,235,0.03)'
              }}>
                AI CORE
              </span>
            </div>
            <div style={{
              fontSize: '0.625rem', // Spacious brand sub-caption
              color: 'var(--text-secondary)',
              fontFamily: theme.typography.fontFamily.mono,
              fontWeight: 700,
              letterSpacing: '0.08em',
              marginTop: '0.2rem',
            }}>
              INDUSTRIAL BOTTLE INSPECTION
            </div>
          </div>
        </div>

        {/* ── Centre Nav Links (desktop) ── */}
        <div
          className="hidden md:flex"
          style={{ alignItems: 'center', gap: '0.75rem', flex: 1, justifyContent: 'center' }}
        >
          {NAV_ITEMS.map(item => {
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.55rem',
                  padding: '0.65rem 1.25rem', // Larger tabs
                  borderRadius: '0.8rem',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.88rem', // Larger fonts
                  fontFamily: theme.typography.fontFamily.heading,
                  fontWeight: active ? 700 : 600,
                  color: active ? 'var(--primary)' : 'var(--text-secondary)',
                  backgroundColor: active
                    ? (isDark ? 'rgba(59,130,246,0.12)' : 'rgba(37,99,235,0.08)')
                    : 'transparent',
                  borderBottom: active ? '2px solid var(--primary)' : '2px solid transparent',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  whiteSpace: 'nowrap',
                  boxShadow: active && !isDark ? '0 4px 12px rgba(37,99,235,0.08)' : 'none'
                }}
                onMouseEnter={e => {
                  if (!active) {
                    e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }
                }}
                title={item.name}
              >
                <item.icon size={17} />
                {item.name}
              </button>
            );
          })}
        </div>

        {/* ── Right controls ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexShrink: 0 }}>

          {/* Live indicator */}
          <div
            className="hidden lg:flex"
            style={{ alignItems: 'center', gap: '0.5rem', marginRight: '0.25rem' }}
          >
            <span style={{
              width: '8px', height: '8px', borderRadius: '50%',
              backgroundColor: 'var(--success)',
              boxShadow: '0 0 10px var(--success)',
              animation: 'pulse 1.5s ease-in-out infinite',
              display: 'inline-block',
            }} />
            <span style={{
              fontSize: '0.675rem', fontFamily: theme.typography.fontFamily.mono,
              fontWeight: 800, color: 'var(--success)', letterSpacing: '0.08em',
            }}>
              LIVE
            </span>
          </div>

          {/* Theme toggle */}
          <button
            onClick={handleThemeToggle}
            style={{
              padding: '0.65rem', // Larger toggle button
              backgroundColor: 'var(--surface-hover)',
              borderRadius: '0.8rem',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s ease',
              border: '1px solid var(--border)',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            title={theme.mode === 'light' ? 'Dark Mode' : 'Light Mode'}
          >
            {theme.mode === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          {/* User info */}
          <div
            className="hidden sm:flex"
            style={{
              alignItems: 'center', gap: '0.75rem',
              paddingRight: '1rem', borderRight: '1px solid var(--border)', height: '2.5rem',
            }}
          >
            <div style={{
              width: '2.4rem', height: '2.4rem', borderRadius: '0.75rem', // Larger avatar
              backgroundColor: 'var(--surface-hover)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid var(--border)', color: 'var(--primary)',
            }}>
              <User size={16} />
            </div>
            <div>
              <div style={{
                fontSize: '0.88rem', fontWeight: 700, // Taller font size
                fontFamily: theme.typography.fontFamily.heading,
                color: 'var(--text-primary)', lineHeight: 1.2,
              }}>
                {user?.full_name || 'Operator'}
              </div>
              <div style={{
                fontSize: '0.625rem', color: 'var(--text-secondary)',
                display: 'flex', alignItems: 'center', gap: '0.2rem',
                fontFamily: theme.typography.fontFamily.mono, fontWeight: 700,
                marginTop: '0.1rem'
              }}>
                <Shield size={10} style={{ color: 'var(--success)' }} />
                {user?.role?.toUpperCase() || 'OPERATOR'}
              </div>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleSignOut}
            style={{
              padding: '0.65rem', backgroundColor: 'transparent', border: 'none',
              borderRadius: '0.8rem', color: 'var(--text-secondary)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = 'var(--error)'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            title="Sign Out"
          >
            <LogOut size={18} />
          </button>

          {/* Mobile hamburger */}
          <button
            className="flex md:hidden"
            onClick={() => setMobileOpen(o => !o)}
            style={{
              padding: '0.65rem', backgroundColor: 'var(--surface-hover)',
              borderRadius: '0.8rem', border: '1px solid var(--border)',
              color: 'var(--text-secondary)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>

      {/* ── Mobile Dropdown Menu ── */}
      {mobileOpen && (
        <div
          className="flex md:hidden"
          style={{
            position: 'fixed', top: '5.25rem', left: 0, right: 0, zIndex: 99,
            backgroundColor: 'var(--surface)',
            borderBottom: '1px solid var(--border)',
            padding: '1rem',
            display: 'flex', flexDirection: 'column', gap: '0.45rem',
            boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
            transition: 'all 0.3s ease',
          }}
        >
          {NAV_ITEMS.map(item => {
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); setMobileOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.85rem',
                  padding: '0.85rem 1.25rem', borderRadius: '0.8rem', border: 'none',
                  cursor: 'pointer', width: '100%', textAlign: 'left',
                  fontSize: '0.925rem',
                  fontFamily: theme.typography.fontFamily.heading,
                  fontWeight: active ? 700 : 600,
                  color: active ? 'var(--primary)' : 'var(--text-secondary)',
                  backgroundColor: active
                    ? (isDark ? 'rgba(59,130,246,0.12)' : 'rgba(37,99,235,0.08)')
                    : 'transparent',
                }}
              >
                <item.icon size={18} />
                {item.name}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
};

export default Navbar;

