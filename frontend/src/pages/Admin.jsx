import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Upload, FileJson, CheckCircle2, AlertTriangle, Calendar } from 'lucide-react';

const Admin = () => {
  const { user, loading, authenticatedFetch, refreshUserData } = useAuth();
  const navigate = useNavigate();

  const [jsonText, setJsonText] = useState('');
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  const isAdmin = !!user?.is_admin;

  // Refresh user data so is_admin changes in Supabase apply without re-login
  useEffect(() => {
    const load = async () => {
      await refreshUserData();
      setCheckingAdmin(false);
    };
    load();
  }, []);

  const parsed = useMemo(() => {
    if (!jsonText.trim()) return null;
    try {
      return JSON.parse(jsonText);
    } catch {
      return null;
    }
  }, [jsonText]);

  const handleFile = async (file) => {
    setError('');
    setResult(null);
    if (!file) return;
    try {
      const text = await file.text();
      setJsonText(text);
    } catch {
      setError('Failed to read the selected file.');
    }
  };

  const handleSubmit = async () => {
    if (!isAdmin) return;
    setError('');
    setResult(null);

    if (!parsed) {
      setError('Invalid JSON. Please fix the JSON before uploading.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...parsed,
        replace_existing: replaceExisting,
      };

      const res = await authenticatedFetch('/admin/quizzes/import', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        const detail = data?.detail;
        if (Array.isArray(detail)) {
          setError(detail.map((e) => e.msg || JSON.stringify(e)).join('; '));
        } else if (typeof detail === 'string') {
          setError(detail);
        } else {
          setError('Upload failed.');
        }
        return;
      }

      setResult(data);
      setJsonText('');
    } catch {
      setError('Network error: Failed to connect to server.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || checkingAdmin) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ color: 'var(--primary)', fontWeight: 600 }}>Checking admin access...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="glass-card animate-fade-in" style={{ maxWidth: 560, textAlign: 'center' }}>
          <Shield size={56} color="var(--danger)" style={{ marginBottom: 12 }} />
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 8 }} className="text-gradient">
            Admin Access Required
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
            Your account does not have permission to upload quizzes.
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 20 }}>
            Logged in as <strong>{user?.username}</strong>
            {user?.is_admin === false && ' (is_admin is still false)'}
          </p>
          <button onClick={refreshUserData} className="btn-secondary">
            Refresh session
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 24, textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 8 }} className="text-gradient">
          ADMIN QUIZ UPLOADER
        </h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Upload a match quiz as JSON. Supports AI-generated format (match string + quiz array) or structured format.
        </p>
      </div>

      <div className="glass-card" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700 }}>
            <FileJson size={18} color="var(--primary)" />
            Import JSON
          </div>
          <label className="btn-secondary" style={{ cursor: 'pointer', padding: '10px 14px' }}>
            <Upload size={16} />
            Choose JSON file
            <input
              type="file"
              accept="application/json,.json"
              style={{ display: 'none' }}
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </label>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
          <input
            id="replaceExisting"
            type="checkbox"
            checked={replaceExisting}
            onChange={(e) => setReplaceExisting(e.target.checked)}
          />
          <label htmlFor="replaceExisting" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Replace existing quiz for this match (overwrite)
          </label>
        </div>

        <textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          placeholder='Paste your JSON here...'
          spellCheck={false}
          style={{
            width: '100%',
            minHeight: 320,
            marginTop: 14,
            padding: 14,
            borderRadius: 12,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            outline: 'none',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            fontSize: 13,
            lineHeight: 1.5,
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
          <button className="btn-primary" onClick={handleSubmit} disabled={submitting || !jsonText.trim()}>
            {submitting ? 'Uploading...' : 'Import Quiz'}
          </button>
        </div>
      </div>

      {error && (
        <div className="glass-card animate-fade-in" style={{ borderColor: 'var(--danger)', color: '#f87171' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, marginBottom: 6 }}>
            <AlertTriangle size={16} />
            Import failed
          </div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{error}</div>
        </div>
      )}

      {result && (
        <div className="glass-card animate-fade-in" style={{ borderColor: 'var(--success)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800, marginBottom: 8 }}>
            <CheckCircle2 size={18} color="var(--success)" />
            Imported successfully
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 16 }}>
            Match ID: <strong style={{ color: 'var(--text-primary)' }}>{result.match_id}</strong> · Quiz ID:{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{result.quiz_id}</strong> · Questions:{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{result.questions_created}</strong>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 16 }}>
            The quiz is live for users when the match status is <strong>FINISHED</strong>. Go to Matches and click “Take Quiz”.
          </p>
          <button onClick={() => navigate('/')} className="btn-primary">
            <Calendar size={16} />
            View on Matches page
          </button>
        </div>
      )}
    </div>
  );
};

export default Admin;

