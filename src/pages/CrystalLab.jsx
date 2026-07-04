import React, { useState, useEffect } from 'react';
import CrystalViewer from '../components/CrystalViewer';
import ControlPanel from '../components/ControlPanel';
import QuizInterface from '../components/QuizInterface';
import MathExplanation from '../components/MathExplanation';
import { checkIndicesEquivalence } from '../utils/crystalMath';

// A curated pool of crystallographic planes for the quiz
const QUIZ_POOL = [
  [1, 0, 0], [0, 1, 0], [0, 0, 1], // Simple face intersections
  [1, 1, 0], [1, 0, 1], [0, 1, 1], // Diagonals
  [1, 1, 1],                        // Main diagonal
  [2, 0, 0], [0, 2, 0], [0, 0, 2], // Deeper cuts
  [2, 1, 0], [1, 2, 0], [0, 2, 1], // Mixed
  [2, 1, 1], [1, 2, 1], [1, 1, 2], 
  [-1, 1, 0], [1, -1, 0],           // Negative indices (Shifted origin)
  [-1, 1, 1], [1, 1, -1], [-1, -1, 1]
];

export default function CrystalLab({ onBack }) {
  const [mode, setMode] = useState('explore'); // 'explore' | 'quiz_identify' | 'quiz_construct'
  const [latticeType, setLatticeType] = useState('sc'); // 'sc' | 'bcc' | 'fcc'
  const [millerIndices, setMillerIndices] = useState([1, 1, 1]); // for explore mode
  
  // Construct mode state
  const [constructIntercepts, setConstructIntercepts] = useState({
    x: null,
    y: null,
    z: null
  });

  // Quiz state
  const [quizState, setQuizState] = useState({
    targetIndices: [1, 0, 0],
    score: 0,
    attempts: 0,
    streak: 0,
    checked: false,
    isCorrect: false,
    showAnswer: false
  });

  // Pick a random question for the quiz
  const generateNewQuestion = () => {
    let nextTarget = quizState.targetIndices;
    // Keep generating until we get a different target than the current one
    while (JSON.stringify(nextTarget) === JSON.stringify(quizState.targetIndices)) {
      const idx = Math.floor(Math.random() * QUIZ_POOL.length);
      nextTarget = QUIZ_POOL[idx];
    }

    setQuizState((prev) => ({
      ...prev,
      targetIndices: nextTarget,
      checked: false,
      isCorrect: false,
      showAnswer: false
    }));

    // Reset construction state
    setConstructIntercepts({ x: null, y: null, z: null });
  };

  // Initialize the first question when switching to quiz modes
  const resetQuiz = () => {
    setQuizState({
      targetIndices: QUIZ_POOL[Math.floor(Math.random() * QUIZ_POOL.length)],
      score: 0,
      attempts: 0,
      streak: 0,
      checked: false,
      isCorrect: false,
      showAnswer: false
    });
    setConstructIntercepts({ x: null, y: null, z: null });
  };

  // Handle clicking on an intercept handle (X, Y, or Z axis)
  const handleSelectIntercept = (axis, value) => {
    setConstructIntercepts((prev) => {
      // Toggle value if clicked again
      const currentVal = prev[axis];
      return {
        ...prev,
        [axis]: currentVal === value ? null : value
      };
    });
  };

  // Verify answer in Identify mode
  const handleCheckIdentifyAnswer = (guessedIndices) => {
    const isCorrect = checkIndicesEquivalence(quizState.targetIndices, guessedIndices);
    
    setQuizState((prev) => ({
      ...prev,
      checked: true,
      isCorrect,
      score: prev.score + (isCorrect ? 1 : 0),
      attempts: prev.attempts + 1,
      streak: isCorrect ? prev.streak + 1 : 0
    }));
  };

  // Verify answer in Construct mode
  const handleCheckConstructAnswer = () => {
    // Map selected intercepts back to Miller indices
    const getIndex = (val) => {
      if (val === null) return 0;
      return Math.round(1 / val);
    };

    const studentIndices = [
      getIndex(constructIntercepts.x),
      getIndex(constructIntercepts.y),
      getIndex(constructIntercepts.z)
    ];

    const isCorrect = checkIndicesEquivalence(quizState.targetIndices, studentIndices);

    setQuizState((prev) => ({
      ...prev,
      checked: true,
      isCorrect,
      score: prev.score + (isCorrect ? 1 : 0),
      attempts: prev.attempts + 1,
      streak: isCorrect ? prev.streak + 1 : 0
    }));
  };

  // Load a new question on component mount
  useEffect(() => {
    generateNewQuestion();
  }, []);

  return (
    <div className="app-container">
      <header className="app-header">
        <button className="back-btn" onClick={onBack}>
          ← Back to Labs
        </button>
        <div className="header-title-row">
          <span className="logo-icon">💠</span>
          <h1>Crystal Plane Lab</h1>
        </div>
        <p className="header-subtitle">Interactive 3D Miller Indices Tutor</p>
      </header>

      <main className="app-content">
        <div className="left-column">
          <div className="viewer-card card">
            <CrystalViewer
              latticeType={latticeType}
              millerIndices={mode === 'explore' ? millerIndices : quizState.targetIndices}
              mode={mode}
              constructIntercepts={constructIntercepts}
              onSelectIntercept={handleSelectIntercept}
              showAnswer={quizState.showAnswer}
            />
          </div>
          
          {mode === 'explore' ? (
            <MathExplanation millerIndices={millerIndices} />
          ) : (
            <div className="quiz-instruction-card card">
              <h3>Quick Controls Tutorial</h3>
              <ul>
                <li><strong>Rotate:</strong> Click & Drag Left Mouse Button.</li>
                <li><strong>Zoom:</strong> Scroll mouse wheel.</li>
                <li><strong>Pan:</strong> Click & Drag Right Mouse Button.</li>
                {mode === 'quiz_construct' && (
                  <li>
                    <strong>Construct:</strong> Click the colored spheres directly on the axes inside the 3D cell to place your plane intercepts.
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        <div className="right-column">
          <ControlPanel
            mode={mode}
            setMode={setMode}
            latticeType={latticeType}
            setLatticeType={setLatticeType}
            millerIndices={millerIndices}
            setMillerIndices={setMillerIndices}
            resetQuiz={resetQuiz}
          />

          {mode !== 'explore' && (
            <QuizInterface
              mode={mode}
              quizState={quizState}
              onCheckAnswer={mode === 'quiz_identify' ? handleCheckIdentifyAnswer : handleCheckConstructAnswer}
              onNextQuestion={generateNewQuestion}
              onShowAnswer={() => setQuizState(prev => ({ ...prev, showAnswer: true }))}
              constructIntercepts={constructIntercepts}
              onSelectIntercept={handleSelectIntercept}
            />
          )}
        </div>
      </main>

      <footer className="app-footer">
        <p>&copy; {new Date().getFullYear()} Crystallography & Materials Science Lab Tool. Designed with Node & Three.js.</p>
      </footer>
    </div>
  );
}
