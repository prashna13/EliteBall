import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Check, X, ArrowRight, Award, ChevronRight, HelpCircle, Trophy, CheckCircle2 } from 'lucide-react';

const Quiz = () => {
  const { matchId } = useParams();
  const { authenticatedFetch, refreshUserData } = useAuth();
  const navigate = useNavigate();

  const [attempt, setAttempt] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);

  // Answering states
  const [selectedOption, setSelectedOption] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null); // { is_correct, correct_option, explanation, accumulated_score }

  // Final summary states
  const [summary, setSummary] = useState(null);
  const [fetchingSummary, setFetchingSummary] = useState(false);

  useEffect(() => {
    const startQuiz = async () => {
      try {
        const response = await authenticatedFetch('/quiz/attempts', {
          method: 'POST',
          body: JSON.stringify({ match_id: parseInt(matchId) }),
        });

        const data = await response.json();

        if (response.status === 400 && data.detail && data.detail.includes('already completed')) {
          setAlreadyCompleted(true);
          setLoading(false);
          return;
        }

        if (!response.ok) {
          setError(data.detail || 'Failed to start quiz');
          setLoading(false);
          return;
        }

        setAttempt(data);
        setCurrentQuestion(data.next_question);
      } catch (err) {
        setError('Network error: Failed to connect to server');
      } finally {
        setLoading(false);
      }
    };

    startQuiz();
  }, [matchId]);

  const handleSelectOption = (option) => {
    if (feedback || submitting) return; // Block changes after submission
    setSelectedOption(option);
  };

  const handleSubmitAnswer = async () => {
    if (!selectedOption || submitting || feedback) return;
    setSubmitting(true);
    try {
      const response = await authenticatedFetch(`/quiz/attempts/${attempt.id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ chosen_option: selectedOption }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || 'Failed to submit answer');
        return;
      }

      setFeedback({
        is_correct: data.is_correct,
        correct_option: data.correct_option,
        explanation: data.explanation,
        accumulated_score: data.accumulated_score,
        next_question: data.next_question,
        is_completed: data.is_completed,
      });

      // Update attempt score locally
      setAttempt(prev => ({
        ...prev,
        score: data.accumulated_score,
        is_completed: data.is_completed
      }));

    } catch (err) {
      setError('Failed to submit answer due to network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNextQuestion = () => {
    if (!feedback) return;
    
    if (feedback.is_completed) {
      // Completed, fetch summary
      fetchQuizSummary();
    } else {
      // Load next question
      setCurrentQuestion(feedback.next_question);
      setAttempt(prev => ({
        ...prev,
        current_question_index: prev.current_question_index + 1
      }));
      // Reset answering state
      setSelectedOption('');
      setFeedback(null);
    }
  };

  const fetchQuizSummary = async () => {
    setFetchingSummary(true);
    try {
      const response = await authenticatedFetch(`/quiz/attempts/${attempt.id}/summary`);
      if (response.ok) {
        const data = await response.json();
        setSummary(data);
        // Refresh points in navbar
        refreshUserData();
      } else {
        setError('Failed to load quiz summary');
      }
    } catch (err) {
      setError('Network error: Failed to fetch summary');
    } finally {
      setFetchingSummary(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', gap: '16px' }}>
        <HelpCircle size={48} className="animate-fade-in" style={{ color: 'var(--primary)', animation: 'float 2s ease-in-out infinite' }} />
        <div style={{ color: 'var(--primary)', fontWeight: 600 }}>Initializing quiz attempt...</div>
      </div>
    );
  }

  if (alreadyCompleted) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh' }}>
        <div className="glass-card animate-fade-in" style={{ maxWidth: '500px', textAlign: 'center', padding: '40px' }}>
          <CheckCircle2 size={64} color="var(--primary)" style={{ marginBottom: '16px' }} />
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '20px 0 10px 0' }} className="text-gradient">
            Quiz Already Played!
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '0.95rem' }}>
            You have already completed the quiz for this match. To keep leaderboards fair, each user is allowed only one attempt per match.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <button onClick={() => navigate('/')} className="btn-secondary">
              Back to Matches
            </button>
            <button onClick={() => navigate('/leaderboard')} className="btn-primary">
              <Trophy size={16} />
              View Leaderboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error && !attempt) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="glass-card animate-fade-in" style={{ padding: '24px', textAlign: 'center', color: 'var(--danger)', maxWidth: '400px' }}>
          <p style={{ marginBottom: '20px' }}>{error}</p>
          <button onClick={() => navigate('/')} className="btn-secondary">
            Back to Matches
          </button>
        </div>
      </div>
    );
  }

  // Render Completed Summary
  if (summary) {
    return (
      <div className="animate-fade-in" style={{ maxWidth: '750px', margin: '0 auto' }}>
        <div className="glass-card" style={{ textAlign: 'center', padding: '40px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <div style={{
              background: 'rgba(16, 185, 129, 0.1)',
              padding: '20px',
              borderRadius: '50%',
              border: '2px solid var(--primary)',
              boxShadow: '0 0 20px var(--primary-glow)'
            }}>
              <Award size={48} color="var(--primary)" />
            </div>
          </div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px' }} className="text-gradient">
            Quiz Completed!
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '24px' }}>
            {summary.quiz_title}
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            maxWidth: '360px',
            margin: '0 auto 32px auto'
          }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Score Earned</span>
              <strong style={{ fontSize: '1.5rem', color: 'var(--primary)' }}>+{summary.score} PTS</strong>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Accuracy</span>
              <strong style={{ fontSize: '1.5rem', color: 'var(--accent-cyan)' }}>
                {summary.correct_answers_count} / {summary.total_questions}
              </strong>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <button onClick={() => navigate('/')} className="btn-secondary">
              Fixtures
            </button>
            <button onClick={() => navigate('/leaderboard')} className="btn-primary">
              <Trophy size={16} />
              Leaderboard
            </button>
          </div>
        </div>

        {/* Detailed Question Review */}
        <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '16px', paddingLeft: '8px' }}>
          Question Review
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {summary.answers.map((ans, idx) => (
            <div key={idx} className="glass-card" style={{
              borderLeft: `4px solid ${ans.is_correct ? 'var(--success)' : 'var(--danger)'}`,
              padding: '20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '12px' }}>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 600 }}>
                  {idx + 1}. {ans.question_text}
                </h4>
                <div>
                  {ans.is_correct ? (
                    <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700, fontSize: '0.85rem' }}>
                      <Check size={16} /> Correct
                    </span>
                  ) : (
                    <span style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700, fontSize: '0.85rem' }}>
                      <X size={16} /> Incorrect
                    </span>
                  )}
                </div>
              </div>

              <div style={{ fontSize: '0.9rem', marginBottom: '12px' }}>
                <div style={{ marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Your Answer:</span>{' '}
                  <strong style={{ color: ans.is_correct ? 'var(--success)' : 'var(--danger)' }}>
                    Option {ans.chosen_option}
                  </strong>
                </div>
                {!ans.is_correct && (
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Correct Answer:</span>{' '}
                    <strong style={{ color: 'var(--success)' }}>
                      Option {ans.correct_option}
                    </strong>
                  </div>
                )}
              </div>

              {ans.explanation && (
                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  color: 'var(--text-secondary)',
                  border: '1px dashed var(--border-color)'
                }}>
                  <strong>Explanation:</strong> {ans.explanation}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Active quiz playing interface
  const totalQuestions = attempt.total_questions;
  const currentIdx = attempt.current_question_index;
  const progressPercent = (currentIdx / totalQuestions) * 100;
  const optionLetters = ['A', 'B', 'C', 'D'];

  const getOptionText = (letter) => {
    if (letter === 'A') return currentQuestion.option_a;
    if (letter === 'B') return currentQuestion.option_b;
    if (letter === 'C') return currentQuestion.option_c;
    return currentQuestion.option_d;
  };

  const getOptionButtonClass = (letter) => {
    if (feedback) {
      if (letter === feedback.correct_option) return 'opt-correct';
      if (selectedOption === letter && !feedback.is_correct) return 'opt-incorrect';
      return 'opt-disabled';
    }
    return selectedOption === letter ? 'opt-selected' : '';
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '680px', margin: '0 auto' }}>
      {/* Progress Bar Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <span>Question {currentIdx + 1} of {totalQuestions}</span>
          <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Score: {attempt.score} PTS</span>
        </div>
        <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{
            width: `${progressPercent}%`,
            height: '100%',
            background: 'linear-gradient(90deg, var(--primary), var(--accent-cyan))',
            boxShadow: '0 0 8px var(--primary-glow)',
            transition: 'width 0.3s ease'
          }}></div>
        </div>
      </div>

      {/* Main Question Card */}
      <div className="glass-card" style={{ padding: '36px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '32px', lineHeight: 1.4 }}>
          {currentQuestion.question_text}
        </h3>

        {/* Options Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {optionLetters.map((letter) => {
            const btnClass = getOptionButtonClass(letter);
            
            // Custom option button styling variables based on status class
            let bgColor = 'rgba(255, 255, 255, 0.02)';
            let borderColor = 'var(--border-color)';
            let textColor = 'var(--text-primary)';
            let cursorStyle = 'pointer';
            let glow = 'none';

            if (btnClass === 'opt-selected') {
              bgColor = 'rgba(16, 185, 129, 0.08)';
              borderColor = 'var(--primary)';
              glow = '0 0 10px rgba(16, 185, 129, 0.2)';
            } else if (btnClass === 'opt-correct') {
              bgColor = 'rgba(16, 185, 129, 0.15)';
              borderColor = 'var(--success)';
              textColor = '#34d399';
              glow = '0 0 12px rgba(16, 185, 129, 0.3)';
              cursorStyle = 'default';
            } else if (btnClass === 'opt-incorrect') {
              bgColor = 'rgba(239, 68, 68, 0.15)';
              borderColor = 'var(--danger)';
              textColor = '#f87171';
              cursorStyle = 'default';
            } else if (btnClass === 'opt-disabled') {
              bgColor = 'rgba(255,255,255,0.01)';
              borderColor = 'rgba(255,255,255,0.03)';
              textColor = 'var(--text-muted)';
              cursorStyle = 'default';
            }

            return (
              <button
                key={letter}
                onClick={() => handleSelectOption(letter)}
                disabled={feedback !== null || submitting}
                style={{
                  width: '100%',
                  padding: '16px 20px',
                  background: bgColor,
                  border: `1px solid ${borderColor}`,
                  borderRadius: '10px',
                  color: textColor,
                  cursor: cursorStyle,
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  boxShadow: glow,
                  transform: btnClass === 'opt-selected' ? 'translateX(4px)' : 'none'
                }}
              >
                {/* Option Badge */}
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  background: btnClass === 'opt-correct' ? 'var(--success)' : btnClass === 'opt-incorrect' ? 'var(--danger)' : 'rgba(255,255,255,0.05)',
                  color: btnClass === 'opt-correct' || btnClass === 'opt-incorrect' ? '#fff' : 'inherit',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  border: btnClass === 'opt-selected' ? '1px solid var(--primary)' : '1px solid transparent'
                }}>
                  {btnClass === 'opt-correct' ? <Check size={16} /> : btnClass === 'opt-incorrect' ? <X size={16} /> : letter}
                </span>
                
                <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>
                  {getOptionText(letter)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Control Action Button Container */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        {feedback ? (
          <button
            onClick={handleNextQuestion}
            className="btn-primary animate-fade-in"
            style={{ padding: '14px 28px' }}
          >
            {feedback.is_completed ? 'Finish Quiz' : 'Next Question'}
            <ArrowRight size={16} />
          </button>
        ) : (
          <button
            onClick={handleSubmitAnswer}
            disabled={!selectedOption || submitting}
            className="btn-primary"
            style={{ padding: '14px 28px' }}
          >
            {submitting ? 'Checking...' : 'Submit Answer'}
            <ChevronRight size={16} />
          </button>
        )}
      </div>

      {/* Answer Explanation Box */}
      {feedback && (
        <div className="glass-card animate-fade-in" style={{
          marginTop: '24px',
          borderLeft: `4px solid ${feedback.is_correct ? 'var(--success)' : 'var(--danger)'}`,
          background: 'rgba(13, 18, 36, 0.8)'
        }}>
          <h4 style={{
            fontSize: '1rem',
            fontWeight: 700,
            color: feedback.is_correct ? 'var(--success)' : 'var(--danger)',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {feedback.is_correct ? 'Correct! +10 Points' : `Incorrect. Correct Option was ${feedback.correct_option}`}
          </h4>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {feedback.explanation}
          </p>
        </div>
      )}

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid var(--danger)',
          color: '#f87171',
          padding: '12px',
          borderRadius: '8px',
          fontSize: '0.85rem',
          marginTop: '20px'
        }}>
          {error}
        </div>
      )}
    </div>
  );
};

export default Quiz;
