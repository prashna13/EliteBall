import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Trophy, Users, Calendar, LogOut, Award, Shield } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  const isActive = (path) => location.pathname === path;
  const isAdmin = !!user.is_admin;

  return (
    <nav className="glass-card" style={{
      borderRadius: '0 0 16px 16px',
      margin: '0 0 24px 0',
      padding: '16px 32px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTop: 'none',
      borderLeft: 'none',
      borderRight: 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => navigate('/')}>
        <Award size={32} color="var(--primary)" style={{ filter: 'drop-shadow(0 0 8px var(--primary-glow))' }} />
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '1px' }} className="text-gradient">
            ELITE BALL
          </h1>
          <span style={{ fontSize: '0.65rem', color: 'var(--primary)', letterSpacing: '2px', display: 'block', marginTop: '-3px' }}>
            KNOWLEDGE
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <Link to="/" className={`btn-secondary ${isActive('/') ? 'active-nav' : ''}`} style={{
          padding: '8px 16px',
          borderRadius: '8px',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: isActive('/') ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
          borderColor: isActive('/') ? 'var(--primary-glow)' : 'transparent',
          color: isActive('/') ? 'var(--primary)' : 'var(--text-secondary)'
        }}>
          <Calendar size={18} />
          Matches
        </Link>

        <Link to="/leaderboard" className={`btn-secondary ${isActive('/leaderboard') ? 'active-nav' : ''}`} style={{
          padding: '8px 16px',
          borderRadius: '8px',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: isActive('/leaderboard') ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
          borderColor: isActive('/leaderboard') ? 'var(--primary-glow)' : 'transparent',
          color: isActive('/leaderboard') ? 'var(--primary)' : 'var(--text-secondary)'
        }}>
          <Trophy size={18} />
          Leaderboard
        </Link>

        <Link to="/friends" className={`btn-secondary ${isActive('/friends') ? 'active-nav' : ''}`} style={{
          padding: '8px 16px',
          borderRadius: '8px',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: isActive('/friends') ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
          borderColor: isActive('/friends') ? 'var(--primary-glow)' : 'transparent',
          color: isActive('/friends') ? 'var(--primary)' : 'var(--text-secondary)'
        }}>
          <Users size={18} />
          Friends
        </Link>

        {isAdmin && (
          <Link to="/admin" className={`btn-secondary ${isActive('/admin') ? 'active-nav' : ''}`} style={{
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: isActive('/admin') ? 'rgba(139, 92, 246, 0.12)' : 'transparent',
            borderColor: isActive('/admin') ? 'var(--secondary-glow)' : 'transparent',
            color: isActive('/admin') ? 'var(--secondary)' : 'var(--text-secondary)'
          }}>
            <Shield size={18} />
            Admin
          </Link>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{user.username}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>
            {user.total_score} PTS
          </div>
        </div>
        
        <button onClick={logout} className="btn-secondary" style={{
          padding: '8px 12px',
          borderRadius: '8px',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(239, 68, 68, 0.1)',
          borderColor: 'transparent',
          color: 'var(--danger)',
          cursor: 'pointer'
        }}>
          <LogOut size={18} />
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
