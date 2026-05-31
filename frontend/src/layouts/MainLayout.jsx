import React from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { useTheme } from '../theme/ThemeContext';

const MainLayout = ({ children, user, onLogout }) => {
  const { theme } = useTheme();

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--background)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'background-color 0.3s ease'
    }}>
      {/* Top Header */}
      <Navbar user={user} onLogout={onLogout} />

      {/* Main Body Grid */}
      <div style={{
        display: 'flex',
        flex: 1
      }}>
        {/* Left Side Navigation */}
        <div style={{
          display: 'none'
        }} className="md:block">
          <Sidebar />
        </div>

        {/* Dynamic Content Panel */}
        <main style={{
          flex: 1,
          padding: '1.5rem 2rem',
          maxWidth: '80rem',
          margin: '0 auto',
          width: '100%',
          overflowX: 'hidden'
        }}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
