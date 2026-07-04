import React, { useState } from 'react';
import { formatMiller } from '../utils/crystalMath';

export default function QuizInterface({
  mode,
  quizState,
  onCheckAnswer,
  onNextQuestion,
  onShowAnswer,
  constructIntercepts,
  onSelectIntercept
}) {
  const [guess, setGuess] = useState({ h: '', k: '', l: '' });
  const [hintLevel, setHintLevel] = useState(0);

  const handleInputChange = (field, value) => {
    // Only allow numbers and minus signs
    if (value === '' || /^-?\d*$/.test(value)) {
      setGuess(prev => ({ ...prev, [field]: value }));
    }
  };

  const submitGuess = (e) => {
    e.preventDefault();
    if (guess.h === '' || guess.k === '' || guess.l === '') return;
    
    onCheckAnswer([
      parseInt(guess.h, 10),
      parseInt(guess.k, 10),
      parseInt(guess.l, 10)
    ]);
  };

  const handleNext = () => {
    setGuess({ h: '', k: '', l: '' });
    setHintLevel(0);
    onNextQuestion();
  };

  const renderInterceptControls = () => {
    const axes = [
      { key: 'x', label: 'X Axis (h) Intercept' },
      { key: 'y', label: 'Y Axis (k) Intercept' },
      { key: 'z', label: 'Z Axis (l) Intercept' }
    ];

    const options = [
      { label: '\u221E (Parallel)', value: null },
      { label: '1', value: 1 },
      { label: '1/2', value: 0.5 },
      { label: '1/3', value: 0.333 },
      { label: '-1', value: -1 },
      { label: '-1/2', value: -0.5 },
      { label: '-1/3', value: -0.333 }
    ];

    return (
      <div className="intercept-controls">
        <p className="helper-text">
          Click on the 3D axes handles directly, or select the fractional intercepts below to position the slicing plane:
        </p>
        {axes.map(axis => (
          <div key={axis.key} className="axis-group">
            <span className="axis-label">{axis.label}</span>
            <div className="intercept-options">
              {options.map(opt => {
                const isSelected = constructIntercepts[axis.key] === opt.value;
                return (
                  <button
                    key={opt.label}
                    className={`opt-btn ${isSelected ? 'selected' : ''}`}
                    onClick={() => onSelectIntercept(axis.key, opt.value)}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderHints = () => {
    if (hintLevel === 0) return null;

    const [th, tk, tl] = quizState.targetIndices;

    if (mode === 'quiz_identify') {
      return (
        <div className="hint-card">
          <h4>Hint:</h4>
          {hintLevel >= 1 && (
            <p>
              1. Look at where the plane intersects the red (X), green (Y), and blue (Z) axes.
              {th === 0 && ' Note that the plane is parallel to the X-axis (intercept = \u221E).'}
              {tk === 0 && ' Note that the plane is parallel to the Y-axis (intercept = \u221E).'}
              {tl === 0 && ' Note that the plane is parallel to the Z-axis (intercept = \u221E).'}
            </p>
          )}
          {hintLevel >= 2 && (
            <p>
              2. Reciprocate the intercepts. For example, an intercept of 1/2 gives an index of 1 / (1/2) = 2.
              An intercept of \u221E gives an index of 1 / \u221E = 0.
            </p>
          )}
        </div>
      );
    } else {
      // quiz_construct
      return (
        <div className="hint-card">
          <h4>Hint:</h4>
          {hintLevel >= 1 && (
            <p>
              To construct {formatMiller(th, tk, tl)}:
              The intercepts should be the reciprocals of the Miller indices: 
              x = {th === 0 ? '\u221E' : `1/${th}`}, 
              y = {tk === 0 ? '\u221E' : `1/${tk}`}, 
              z = {tl === 0 ? '\u221E' : `1/${tl}`}.
            </p>
          )}
        </div>
      );
    }
  };

  return (
    <div className="quiz-interface card">
      <div className="quiz-header">
        <h3>Quiz Mode</h3>
        <div className="quiz-stats">
          <span className="stat-badge">Score: {quizState.score}/{quizState.attempts}</span>
          <span className="stat-badge streak">Streak: {quizState.streak} 🔥</span>
        </div>
      </div>

      {mode === 'quiz_identify' ? (
        <div className="quiz-body">
          <p className="instruction">Identify the Miller indices (hkl) of the cyan plane shown in the 3D unit cell.</p>

          <form onSubmit={submitGuess} className="guess-form">
            <div className="guess-inputs">
              <div className="input-group">
                <label>h</label>
                <input
                  type="text"
                  maxLength="2"
                  value={guess.h}
                  onChange={(e) => handleInputChange('h', e.target.value)}
                  disabled={quizState.checked}
                  placeholder="e.g. 1"
                />
              </div>
              <div className="input-group">
                <label>k</label>
                <input
                  type="text"
                  maxLength="2"
                  value={guess.k}
                  onChange={(e) => handleInputChange('k', e.target.value)}
                  disabled={quizState.checked}
                  placeholder="0"
                />
              </div>
              <div className="input-group">
                <label>l</label>
                <input
                  type="text"
                  maxLength="2"
                  value={guess.l}
                  onChange={(e) => handleInputChange('l', e.target.value)}
                  disabled={quizState.checked}
                  placeholder="1"
                />
              </div>
            </div>

            {!quizState.checked && (
              <button
                type="submit"
                className="submit-btn"
                disabled={guess.h === '' || guess.k === '' || guess.l === ''}
              >
                Submit Answer
              </button>
            )}
          </form>
        </div>
      ) : (
        <div className="quiz-body">
          <p className="instruction">
            Construct the crystal plane: <span className="highlight-text">{formatMiller(...quizState.targetIndices)}</span>
          </p>

          {renderInterceptControls()}

          {!quizState.checked && (
            <button
              onClick={onCheckAnswer}
              className="submit-btn"
            >
              Verify Construction
            </button>
          )}
        </div>
      )}

      {/* Answer status alert feedback */}
      {quizState.checked && (
        <div className={`feedback-alert ${quizState.isCorrect ? 'correct' : 'incorrect'}`}>
          <div className="feedback-title">
            {quizState.isCorrect ? '✨ Correct! Excellent job!' : '❌ Incorrect. Try again!'}
          </div>
          <p className="feedback-detail">
            {quizState.isCorrect 
              ? `The plane shown indeed corresponds to the Miller Indices ${formatMiller(...quizState.targetIndices)}.`
              : `The target was ${formatMiller(...quizState.targetIndices)}.`
            }
          </p>
          
          <div className="feedback-actions">
            {!quizState.isCorrect && mode === 'quiz_identify' && (
              <button className="secondary-btn" onClick={onShowAnswer}>
                Reveal Answer Plane
              </button>
            )}
            <button className="primary-btn" onClick={handleNext}>
              Next Question
            </button>
          </div>
        </div>
      )}

      {/* General Controls */}
      <div className="quiz-controls-row">
        {!quizState.checked && (
          <button
            className="text-btn"
            onClick={() => setHintLevel(prev => Math.min(prev + 1, 2))}
          >
            💡 Need a Hint?
          </button>
        )}
        {!quizState.checked && (
          <button className="text-btn skip-btn" onClick={handleNext}>
            Skip Question ➡️
          </button>
        )}
      </div>

      {renderHints()}
    </div>
  );
}
