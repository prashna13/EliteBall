import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Search, UserPlus, Check, X, Users, Trophy, Award, UserCheck, Inbox } from 'lucide-react';

const Friends = () => {
  const { authenticatedFetch } = useAuth();
  
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [friendLeaderboard, setFriendLeaderboard] = useState([]);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchFriendsData = async () => {
    try {
      // Fetch friends
      const friendsRes = await authenticatedFetch('/friends/');
      const friendsData = await friendsRes.json();
      
      // Fetch pending requests
      const pendingRes = await authenticatedFetch('/friends/requests/pending');
      const pendingData = await pendingRes.json();

      // Fetch friend leaderboard
      const leaderboardRes = await authenticatedFetch('/friends/leaderboard');
      const leaderboardData = await leaderboardRes.json();

      setFriends(friendsData);
      setPendingRequests(pendingData);
      setFriendLeaderboard(leaderboardData);
      setError('');
    } catch (err) {
      setError('Failed to fetch social connection data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFriendsData();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (searchQuery.trim().length < 2) {
      setSearchError('Search query must be at least 2 characters');
      return;
    }

    setSearchLoading(true);
    setSearchError('');
    try {
      const response = await authenticatedFetch(`/friends/search?username=${searchQuery}`);
      const data = await response.json();
      if (response.ok) {
        setSearchResults(data);
        if (data.length === 0) {
          setSearchError('No users found matching that username');
        }
      } else {
        setSearchError(data.detail || 'Search failed');
      }
    } catch (err) {
      setSearchError('Network error during search');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSendRequest = async (username) => {
    try {
      const response = await authenticatedFetch('/friends/request', {
        method: 'POST',
        body: JSON.stringify({ friend_username: username }),
      });
      if (response.ok) {
        // Update local search results state
        setSearchResults(prev =>
          prev.map(user =>
            user.username === username
              ? { ...user, friendship_status: 'PENDING_SENT' }
              : user
          )
        );
        fetchFriendsData();
      }
    } catch (err) {
      console.error('Failed to send friend request', err);
    }
  };

  const handleAcceptRequest = async (friendshipId) => {
    try {
      const response = await authenticatedFetch('/friends/accept', {
        method: 'POST',
        body: JSON.stringify({ friendship_id: friendshipId, action: 'ACCEPT' }),
      });
      if (response.ok) {
        // Refresh everything
        fetchFriendsData();
        // Clear search
        setSearchQuery('');
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Failed to accept request', err);
    }
  };

  const handleDeclineRequest = async (friendshipId) => {
    try {
      const response = await authenticatedFetch('/friends/decline', {
        method: 'POST',
        body: JSON.stringify({ friendship_id: friendshipId, action: 'DECLINE' }),
      });
      if (response.ok) {
        fetchFriendsData();
      }
    } catch (err) {
      console.error('Failed to decline request', err);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <div style={{ color: 'var(--primary)', fontWeight: 600 }}>Loading social dashboard...</div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '32px' }}>
      
      {/* Left Column: Friends list & Search */}
      <div>
        {/* Search Panel */}
        <div className="glass-card" style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Search size={20} color="var(--primary)" />
            Find Friends
          </h3>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Search by username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn-primary" style={{ padding: '0 24px' }} disabled={searchLoading}>
              {searchLoading ? 'Searching...' : 'Search'}
            </button>
          </form>

          {searchError && (
            <div style={{ color: '#f87171', fontSize: '0.85rem', marginBottom: '16px' }}>
              {searchError}
            </div>
          )}

          {searchResults.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(0,0,0,0.1)', padding: '16px', borderRadius: '8px' }}>
              {searchResults.map((user) => (
                <div key={user.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600 }}>{user.username}</span>
                  <div>
                    {user.friendship_status === 'NONE' && (
                      <button
                        onClick={() => handleSendRequest(user.username)}
                        className="btn-primary"
                        style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                      >
                        <UserPlus size={12} /> Add
                      </button>
                    )}
                    {user.friendship_status === 'PENDING_SENT' && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        Requested
                      </span>
                    )}
                    {user.friendship_status === 'PENDING_RECEIVED' && (
                      <button
                        onClick={() => handleAcceptRequest(user.friendship_id)}
                        className="btn-primary"
                        style={{ padding: '6px 12px', fontSize: '0.75rem', background: 'var(--secondary)', boxShadow: '0 4px 12px var(--secondary-glow)' }}
                      >
                        Accept
                      </button>
                    )}
                    {user.friendship_status === 'ACCEPTED' && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <UserCheck size={12} /> Friends
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Friends List Panel */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={20} color="var(--primary)" />
            Friend List ({friends.length})
          </h3>

          {friends.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-secondary)' }}>
              <Users size={32} style={{ color: 'var(--text-muted)', marginBottom: '12px', opacity: 0.5 }} />
              <p style={{ fontSize: '0.9rem' }}>No friends added yet. Use the search bar above to invite your friends!</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {friends.map((friend) => (
                <div key={friend.id} style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <h4 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '4px' }}>{friend.username}</h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>
                      {friend.total_score} PTS
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'right' }}>
                    <div>{friend.quizzes_completed} Quizzes</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Pending Requests & Comparative Friend Leaderboard */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* Pending Requests Panel */}
        {pendingRequests.length > 0 && (
          <div className="glass-card animate-fade-in" style={{ borderColor: 'var(--secondary)' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Inbox size={18} color="var(--secondary)" />
              Pending Invites ({pendingRequests.length})
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {pendingRequests.map((req) => (
                <div key={req.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(255,255,255,0.02)',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)'
                }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{req.user.username}</span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => handleAcceptRequest(req.id)}
                      style={{
                        padding: '6px',
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid var(--success)',
                        color: 'var(--success)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => handleDeclineRequest(req.id)}
                      style={{
                        padding: '6px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid var(--danger)',
                        color: 'var(--danger)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Friend Leaderboard comparison */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Trophy size={20} color="var(--primary)" />
            Friend Rankings
          </h3>

          {friendLeaderboard.length <= 1 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-secondary)' }}>
              <Award size={24} style={{ color: 'var(--text-muted)', marginBottom: '8px', opacity: 0.5 }} />
              <p style={{ fontSize: '0.85rem' }}>Add friends to compare scores on the private leaderboard standings.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {friendLeaderboard.map((entry) => (
                <div key={entry.username} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(255, 255, 255, 0.01)',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                      fontWeight: 800,
                      color: entry.rank === 1 ? 'var(--primary)' : 'var(--text-secondary)',
                      width: '20px'
                    }}>
                      #{entry.rank}
                    </span>
                    <span style={{ fontWeight: 600 }}>{entry.username}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <strong style={{ color: 'var(--primary)', fontWeight: 800 }}>{entry.total_score} PTS</strong>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                      Accuracy: {entry.accuracy}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Friends;
