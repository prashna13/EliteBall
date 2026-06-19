import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Trophy, Plus, UserPlus, Users, Trash2, LogOut, Copy, Check } from 'lucide-react';

const Leagues = () => {
  const { user, authenticatedFetch } = useAuth();
  const [leagues, setLeagues] = useState([]);
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [selectedLeagueDetails, setSelectedLeagueDetails] = useState(null);
  const [newLeagueName, setNewLeagueName] = useState('');
  const [joinLeagueName, setJoinLeagueName] = useState('');
  
  const [loadingLeagues, setLoadingLeagues] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [copiedName, setCopiedName] = useState(false);

  useEffect(() => {
    fetchLeagues();
  }, []);

  const fetchLeagues = async () => {
    setLoadingLeagues(true);
    try {
      const res = await authenticatedFetch('/leagues/');
      if (res.ok) {
        const data = await res.json();
        setLeagues(data);
        if (data.length > 0 && !selectedLeague) {
          // Auto select first league
          setSelectedLeague(data[0]);
          fetchLeagueDetails(data[0].id);
        }
      }
    } catch (err) {
      setActionError('Failed to fetch leagues list.');
    } finally {
      setLoadingLeagues(false);
    }
  };

  const fetchLeagueDetails = async (leagueId) => {
    setLoadingDetails(true);
    setActionError('');
    try {
      const res = await authenticatedFetch(`/leagues/${leagueId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedLeagueDetails(data);
      } else {
        const data = await res.json();
        setActionError(data.detail || 'Failed to fetch league details.');
      }
    } catch (err) {
      setActionError('Network error while loading league standings.');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSelectLeague = (league) => {
    setSelectedLeague(league);
    fetchLeagueDetails(league.id);
  };

  const handleCreateLeague = async (e) => {
    e.preventDefault();
    setActionError('');
    setActionSuccess('');
    if (!newLeagueName.trim()) return;

    try {
      const res = await authenticatedFetch('/leagues/', {
        method: 'POST',
        body: JSON.stringify({ name: newLeagueName.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewLeagueName('');
        setActionSuccess(`League "${data.name}" created successfully!`);
        setLeagues((prev) => [...prev, data]);
        setSelectedLeague(data);
        fetchLeagueDetails(data.id);
      } else {
        setActionError(data.detail || 'Could not create league.');
      }
    } catch {
      setActionError('Network error: league creation failed.');
    }
  };

  const handleJoinLeague = async (e) => {
    e.preventDefault();
    setActionError('');
    setActionSuccess('');
    if (!joinLeagueName.trim()) return;

    try {
      const res = await authenticatedFetch('/leagues/join', {
        method: 'POST',
        body: JSON.stringify({ name: joinLeagueName.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setJoinLeagueName('');
        setActionSuccess(`Successfully joined league "${data.name}"!`);
        setLeagues((prev) => [...prev, data]);
        setSelectedLeague(data);
        fetchLeagueDetails(data.id);
      } else {
        setActionError(data.detail || 'Could not join league.');
      }
    } catch {
      setActionError('Network error: join request failed.');
    }
  };

  const handleLeaveLeague = async (leagueId) => {
    if (!window.confirm('Are you sure you want to leave this league?')) return;
    setActionError('');
    setActionSuccess('');

    try {
      const res = await authenticatedFetch(`/leagues/${leagueId}/leave`, {
        method: 'POST',
      });
      if (res.ok) {
        setActionSuccess('Successfully left the league.');
        const updated = leagues.filter((l) => l.id !== leagueId);
        setLeagues(updated);
        if (updated.length > 0) {
          setSelectedLeague(updated[0]);
          fetchLeagueDetails(updated[0].id);
        } else {
          setSelectedLeague(null);
          setSelectedLeagueDetails(null);
        }
      } else {
        const data = await res.json();
        setActionError(data.detail || 'Could not leave league.');
      }
    } catch {
      setActionError('Network error: failed to leave league.');
    }
  };

  const handleDeleteLeague = async (leagueId) => {
    if (!window.confirm('WARNING: Are you sure you want to delete this league? This will remove all members and delete the standings forever.')) return;
    setActionError('');
    setActionSuccess('');

    try {
      const res = await authenticatedFetch(`/leagues/${leagueId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setActionSuccess('League successfully deleted.');
        const updated = leagues.filter((l) => l.id !== leagueId);
        setLeagues(updated);
        if (updated.length > 0) {
          setSelectedLeague(updated[0]);
          fetchLeagueDetails(updated[0].id);
        } else {
          setSelectedLeague(null);
          setSelectedLeagueDetails(null);
        }
      } else {
        const data = await res.json();
        setActionError(data.detail || 'Could not delete league.');
      }
    } catch {
      setActionError('Network error: failed to delete league.');
    }
  };

  const copyLeagueName = () => {
    if (!selectedLeague) return;
    navigator.clipboard.writeText(selectedLeague.name);
    setCopiedName(true);
    setTimeout(() => setCopiedName(false), 2000);
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 24, textAlign: 'center' }}>
        <h2 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: 8 }} className="text-gradient">
          PRIVATE LEAGUES
        </h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Create private leagues to challenge your friends and colleagues to dynamic scoreboards.
        </p>
      </div>

      {(actionError || actionSuccess) && (
        <div 
          className="glass-card animate-fade-in" 
          style={{ 
            borderColor: actionError ? 'var(--danger)' : 'var(--success)', 
            color: actionError ? '#f87171' : '#4ade80',
            marginBottom: 20,
            padding: 14
          }}
        >
          {actionError || actionSuccess}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24, alignItems: 'start' }} className="responsive-grid">
        {/* Left column - Leagues navigation and creation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          <div className="glass-card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users size={18} color="var(--primary)" />
              My Leagues
            </h3>
            
            {loadingLeagues ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading leagues...</p>
            ) : leagues.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic', marginBottom: 0 }}>
                You are not in any private leagues. Join or create one below!
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {leagues.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => handleSelectLeague(l)}
                    className="btn-secondary"
                    style={{
                      width: '100%',
                      justifyContent: 'flex-start',
                      padding: '12px 14px',
                      background: selectedLeague?.id === l.id ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                      border: selectedLeague?.id === l.id ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                      color: selectedLeague?.id === l.id ? 'var(--primary)' : 'var(--text-primary)',
                      textAlign: 'left'
                    }}
                  >
                    <Trophy size={16} style={{ flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="glass-card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Plus size={18} color="var(--primary)" />
              Create League
            </h3>
            <form onSubmit={handleCreateLeague} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                type="text"
                value={newLeagueName}
                onChange={(e) => setNewLeagueName(e.target.value)}
                placeholder="Enter unique league name"
                required
                maxLength={40}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  outline: 'none'
                }}
              />
              <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                <Plus size={16} /> Create League
              </button>
            </form>
          </div>

          <div className="glass-card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <UserPlus size={18} color="var(--secondary)" />
              Join League
            </h3>
            <form onSubmit={handleJoinLeague} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                type="text"
                value={joinLeagueName}
                onChange={(e) => setJoinLeagueName(e.target.value)}
                placeholder="Enter exact league name"
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  outline: 'none'
                }}
              />
              <button type="submit" className="btn-secondary" style={{ width: '100%', justifyContent: 'center', borderColor: 'var(--secondary)' }}>
                <UserPlus size={16} /> Join League
              </button>
            </form>
          </div>
        </div>

        {/* Right column - Standings details */}
        <div className="glass-card" style={{ minHeight: 480 }}>
          {loadingDetails ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: 400 }}>
              <p style={{ color: 'var(--primary)', fontWeight: 600 }}>Loading Standings...</p>
            </div>
          ) : !selectedLeagueDetails ? (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: 400, textAlign: 'center', padding: 20 }}>
              <Trophy size={48} color="var(--text-muted)" style={{ marginBottom: 16 }} />
              <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 8 }}>No League Selected</h3>
              <p style={{ color: 'var(--text-secondary)', maxWidth: 400 }}>
                Select a league from the sidebar or create one to view the group standings.
              </p>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, borderBottom: '1px solid var(--border-color)', paddingBottom: 18, marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 4 }} className="text-gradient">
                    {selectedLeagueDetails.name}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    <span>Owner ID: {selectedLeagueDetails.owner_id}</span>
                    <span>·</span>
                    <button 
                      onClick={copyLeagueName} 
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        color: 'var(--primary)', 
                        cursor: 'pointer', 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: 4,
                        padding: 0
                      }}
                    >
                      {copiedName ? <Check size={14} /> : <Copy size={14} />}
                      {copiedName ? 'Copied name!' : 'Copy name to share'}
                    </button>
                  </div>
                </div>


              </div>

              {/* Standings Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      <th style={{ padding: '12px 8px', width: '60px' }}>Rank</th>
                      <th style={{ padding: '12px 12px' }}>User</th>
                      <th style={{ padding: '12px 12px', textAlign: 'center' }}>Quizzes</th>
                      <th style={{ padding: '12px 12px', textAlign: 'right' }}>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedLeagueDetails.members.map((member, index) => {
                      const isTop3 = index < 3;
                      const rankColors = ['#ffd700', '#c0c0c0', '#cd7f32'];
                      return (
                        <tr 
                          key={member.id} 
                          style={{ 
                            borderBottom: '1px solid rgba(255,255,255,0.03)',
                            background: index % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent'
                          }}
                        >
                          <td style={{ padding: '16px 8px', fontWeight: 700 }}>
                            {isTop3 ? (
                              <span 
                                style={{ 
                                  display: 'inline-flex', 
                                  justifyContent: 'center', 
                                  alignItems: 'center', 
                                  width: 24, 
                                  height: 24, 
                                  borderRadius: '50%', 
                                  background: rankColors[index],
                                  color: '#0b0f19',
                                  fontSize: '0.8rem'
                                }}
                              >
                                {index + 1}
                              </span>
                            ) : (
                              <span style={{ paddingLeft: 8, color: 'var(--text-secondary)' }}>{index + 1}</span>
                            )}
                          </td>
                          <td style={{ padding: '16px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div 
                                style={{ 
                                  width: 32, 
                                  height: 32, 
                                  borderRadius: '50%', 
                                  background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 700,
                                  color: '#fff',
                                  fontSize: '0.85rem'
                                }}
                              >
                                {member.username[0].toUpperCase()}
                              </div>
                              <span style={{ fontWeight: 600 }}>{member.username}</span>
                            </div>
                          </td>
                          <td style={{ padding: '16px 12px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            {member.quizzes_completed}
                          </td>
                          <td style={{ padding: '16px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>
                            {member.total_score} pts
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Leave / Delete League Controls */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 32, borderTop: '1px solid var(--border-color)', paddingTop: 18 }}>
                {user && selectedLeagueDetails.owner_id === user.id ? (
                  <button 
                    onClick={() => handleDeleteLeague(selectedLeagueDetails.id)} 
                    className="btn-secondary" 
                    style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: 'var(--danger)', color: '#f87171' }}
                  >
                    <Trash2 size={14} /> Delete League
                  </button>
                ) : (
                  <button 
                    onClick={() => handleLeaveLeague(selectedLeagueDetails.id)} 
                    className="btn-secondary" 
                    style={{ borderColor: 'var(--danger)', color: '#f87171' }}
                  >
                    <LogOut size={14} /> Leave League
                  </button>
                )}
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Leagues;
