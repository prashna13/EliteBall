import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Trophy, Award, Sparkles, CheckCircle2 } from 'lucide-react';

const Leaderboard = () => {
  const { authenticatedFetch } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await authenticatedFetch('/leaderboard/global');
        if (response.ok) {
          const data = await response.json();
          setUsers(data);
        } else {
          setError('Failed to fetch leaderboard data');
        }
      } catch (err) {
        setError('Network error: Failed to connect to server');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <div style={{ color: 'var(--primary)', fontWeight: 600 }}>Loading global rankings...</div>
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

  // Extract top 3 for the podium
  const top3 = users.slice(0, 3);
  const rest = users.slice(3);

  // Reorder top 3 for visual display: [2nd, 1st, 3rd]
  const podiumOrder = [];
  if (top3[1]) podiumOrder.push({ ...top3[1], position: 2 });
  if (top3[0]) podiumOrder.push({ ...top3[0], position: 1 });
  if (top3[2]) podiumOrder.push({ ...top3[2], position: 3 });

  const getRankBadgeColor = (rank) => {
    if (rank === 1) return '#f59e0b'; // Gold
    if (rank === 2) return '#94a3b8'; // Silver
    if (rank === 3) return '#b45309'; // Bronze
    return 'transparent';
  };

  const getAccuracy = (u) => {
    const totalPossible = u.quizzes_completed * 10;
    if (totalPossible === 0) return '0%';
    return `${Math.round((u.total_correct_answers / totalPossible) * 100)}%`;
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '850px', margin: '0 auto' }}>
      <div style={{ marginBottom: '40px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px' }} className="text-gradient">
          GLOBAL STANDINGS
        </h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Prove your ball knowledge and climb the rankings. Only the elite reach the top.
        </p>
      </div>

      {/* Visual Podium Layout for Top 3 */}
      {top3.length > 0 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-end',
          gap: '16px',
          marginBottom: '48px',
          padding: '24px 0',
          position: 'relative'
        }}>
          {podiumOrder.map((user) => {
            const isFirst = user.position === 1;
            const cardHeight = isFirst ? '280px' : '230px';
            const scale = isFirst ? 'scale(1.05)' : 'scale(1)';
            const glowColor = user.position === 1 ? 'var(--primary-glow)' : user.position === 2 ? 'var(--secondary-glow)' : 'rgba(6, 182, 212, 0.2)';
            const accentBorder = user.position === 1 ? 'var(--primary)' : user.position === 2 ? 'var(--secondary)' : 'var(--accent-cyan)';

            return (
              <div
                key={user.id}
                className="glass-card"
                style={{
                  width: '180px',
                  height: cardHeight,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: scale,
                  borderColor: accentBorder,
                  boxShadow: `0 8px 32px 0 rgba(0, 0, 0, 0.3), 0 0 15px ${glowColor}`,
                  position: 'relative',
                  padding: '16px',
                  zIndex: isFirst ? 2 : 1
                }}
              >
                {/* Crown / Sparkle decoration */}
                {isFirst && (
                  <div style={{ position: 'absolute', top: '-28px', animation: 'float 2s ease-in-out infinite' }}>
                    <Sparkles size={24} color="#f59e0b" style={{ filter: 'drop-shadow(0 0 6px #f59e0b)' }} />
                  </div>
                )}

                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '1.2rem',
                  border: `2px solid ${accentBorder}`,
                  marginBottom: '16px',
                  color: accentBorder
                }}>
                  {user.position}
                </div>

                <div style={{ fontWeight: 700, fontSize: '1.05rem', textAlign: 'center', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', whiteSpace: 'nowrap' }}>
                  {user.username}
                </div>

                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>
                  {user.total_score} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: varName(user.position) }}>PTS</span>
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {user.quizzes_completed} Quizzes ({getAccuracy(user)})
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rest of the leaderboard in a modern list table */}
      <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              <th style={{ padding: '16px 24px' }}>Rank</th>
              <th style={{ padding: '16px 24px' }}>Username</th>
              <th style={{ padding: '16px 24px', textAlign: 'center' }}>Quizzes Taken</th>
              <th style={{ padding: '16px 24px', textAlign: 'center' }}>Accuracy</th>
              <th style={{ padding: '16px 24px', textAlign: 'right' }}>Total Points</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, index) => {
              const rank = index + 1;
              const isTop3 = rank <= 3;
              return (
                <tr key={user.id} style={{
                  borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                  background: isTop3 ? 'rgba(255, 255, 255, 0.01)' : 'transparent',
                }}>
                  <td style={{ padding: '18px 24px', fontWeight: 700 }}>
                    {isTop3 ? (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        background: getRankBadgeColor(rank),
                        color: rank === 1 ? '#000' : '#fff',
                        fontSize: '0.8rem'
                      }}>
                        {rank}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)', paddingLeft: '8px' }}>{rank}</span>
                    )}
                  </td>
                  <td style={{ padding: '18px 24px', fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {user.username}
                    </div>
                  </td>
                  <td style={{ padding: '18px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    {user.quizzes_completed}
                  </td>
                  <td style={{ padding: '18px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={12} color="var(--primary)" />
                      {getAccuracy(user)}
                    </span>
                  </td>
                  <td style={{ padding: '18px 24px', textAlign: 'right', fontWeight: 800, color: 'var(--primary)' }}>
                    {user.total_score} PTS
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Helper function to return label name color
const varName = (pos) => {
  if (pos === 1) return 'var(--primary)';
  if (pos === 2) return 'var(--secondary)';
  return 'var(--accent-cyan)';
};

export default Leaderboard;
