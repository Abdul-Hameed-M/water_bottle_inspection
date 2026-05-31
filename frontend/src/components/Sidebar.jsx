import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Camera, BarChart3, Settings as SettingsIcon } from 'lucide-react';
import { useTheme } from '../theme/ThemeContext';

const Sidebar = () => {
  const { theme } = useTheme();
  const isDark = theme.mode === 'dark';

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Live Inspection', path: '/detection', icon: Camera },
    { name: 'Analytics Logs', path: '/analytics', icon: BarChart3 },
    { name: 'System Settings', path: '/settings', icon: SettingsIcon },
  ];

  return (
    <aside style={{
      width: '16rem',
      backgroundColor: 'var(--surface)',
      borderRight: `1px solid var(--border)`,
      minHeight: 'calc(100vh - 5.25rem)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '2rem 0',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    }}>
      {/* Navigation links stack */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.375rem',
        padding: '0 0.875rem'
      }}>
        {menuItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '0.875rem',
              padding: '0.8rem 1.125rem',
              borderRadius: theme.borderRadius.xl,
              fontSize: '0.825rem',
              fontFamily: theme.typography.fontFamily.heading,
              fontWeight: isActive ? 700 : 500,
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              textDecoration: 'none',
              backgroundColor: isActive 
                ? (isDark ? 'rgba(59, 130, 246, 0.08)' : 'rgba(37, 99, 235, 0.06)') 
                : 'transparent',
              color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
              borderLeft: isActive ? `3px solid var(--primary)` : '3px solid transparent',
              paddingLeft: isActive ? '1rem' : '1.125rem'
            })}
            onMouseEnter={(e) => {
              if (e.currentTarget.style.borderLeftColor === 'transparent') {
                e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }
            }}
            onMouseLeave={(e) => {
              if (e.currentTarget.style.borderLeftColor === 'transparent') {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }
            }}
          >
            <item.icon size={18} style={{ shrink: 0 }} />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </div>

      {/* Sidebar telemetry box */}
      <div style={{
        padding: '0 1.25rem',
        borderTop: `1px solid var(--border)`,
        paddingTop: '2rem',
        marginTop: '2rem'
      }}>
        <div style={{
          backgroundColor: isDark ? 'rgba(16, 185, 129, 0.04)' : 'rgba(16, 185, 129, 0.03)',
          borderRadius: theme.borderRadius.xl,
          padding: '1rem',
          border: isDark ? '1px solid rgba(16, 185, 129, 0.15)' : '1px solid rgba(16, 185, 129, 0.25)',
          boxShadow: isDark ? '0 0 15px rgba(16,185,129,0.03)' : 'none'
        }}>
          <span style={{
            fontSize: '0.625rem',
            color: 'var(--text-secondary)',
            fontFamily: theme.typography.fontFamily.mono,
            fontWeight: 700,
            display: 'block',
            letterSpacing: '0.075rem'
          }}>
            TELEMETRY STATUS
          </span>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginTop: '0.5rem'
          }}>
            <span style={{
              width: '0.5rem',
              height: '0.5rem',
              borderRadius: '50%',
              backgroundColor: 'var(--success)',
              boxShadow: '0 0 8px #10b981',
              display: 'inline-block',
              animation: 'pulse 1.5s ease-in-out infinite'
            }} />
            <span style={{
              fontSize: '0.725rem',
              fontWeight: 700,
              fontFamily: theme.typography.fontFamily.heading,
              color: 'var(--text-primary)',
              letterSpacing: '0.01em'
            }}>
              Inference Engine Active
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
