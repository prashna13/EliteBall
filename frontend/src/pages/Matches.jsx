import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Play, Lock, Clock, Calendar, CheckCircle } from 'lucide-react';

const Matches = () => {
  const { authenticatedFetch } = useAuth();
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const response = await authenticatedFetch('/matches/');
        if (response.ok) {
          const data = await response.json();
          setMatches(data);
        } else {
          setError('Failed to fetch matches');
        }
      } catch (err) {
        setError('Network error: Failed to connect to server');
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, []);

  const formatMatchDate = (dateString) => {
    const options = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  const handleStartQuiz = (matchId) => {
    navigate(`/quiz/${matchId}`);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <div style={{ color: 'var(--primary)', fontWeight: 600 }}>Loading matches...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card animate-fade-in" style={{ padding: '24px', textAlign: 'center', color: 'var(--danger)' }}>
        {error}
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '32px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px' }} className="text-gradient">
          2026 WORLD CUP FIXTURES
        </h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Select any finished match to play its match-events quiz and earn points.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
        gap: '24px'
      }}>
        {matches.map((match) => (
          <div key={match.id} className="glass-card" style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Status Badge */}
            <div style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: match.status === 'FINISHED' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              border: `1px solid ${match.status === 'FINISHED' ? 'var(--secondary)' : 'var(--warning)'}`,
              color: match.status === 'FINISHED' ? '#c084fc' : '#fbbf24',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              {match.status}
            </div>

            {/* Stadium / Info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '20px' }}>
              <Calendar size={14} />
              <span>{formatMatchDate(match.match_date)}</span>
            </div>

            {/* Match Teams & Score */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              margin: '16px 0 32px 0'
            }}>
              {/* Home Team */}
              <div style={{ flex: 1, textAlign: 'right' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{match.home_team}</h3>
              </div>

              {/* Score Display */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                minWidth: '70px',
                textAlign: 'center'
              }}>
                {match.status?.toUpperCase() === 'FINISHED' ? (
                  <span style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '2px', color: 'var(--primary)' }}>
                    {match.home_score} - {match.away_score}
                  </span>
                ) : (
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <Clock size={12} />
                    VS
                  </span>
                )}
              </div>

              {/* Away Team */}
              <div style={{ flex: 1, textAlign: 'left' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{match.away_team}</h3>
              </div>
            </div>

            {/* Stadium Info Bottom */}
            {match.stadium && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '24px', fontStyle: 'italic', textAlign: 'center' }}>
                {match.stadium}
              </div>
            )}

            {/* Action Button */}
            <div>
              {match.status?.toUpperCase() === 'FINISHED' ? (
                <button
                  onClick={() => handleStartQuiz(match.id)}
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <Play size={16} fill="currentColor" />
                  Take Quiz
                </button>
              ) : (
                <button
                  disabled
                  className="btn-secondary"
                  style={{ width: '100%', justifyContent: 'center', color: 'var(--text-muted)' }}
                >
                  <Lock size={16} />
                  Quiz Locked
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Matches;
