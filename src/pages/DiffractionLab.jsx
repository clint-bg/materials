import React, { useState, useEffect, useRef } from 'react';

const QUIZ_QUESTIONS = [
  { name: 'NaCl (200)', lambda: 0.154, d: 0.282, theta: 15.8, material: 'NaCl (200) plane', source: 'Copper K-alpha' },
  { name: 'Silicon (111)', lambda: 0.154, d: 0.314, theta: 14.2, material: 'Silicon (111) plane', source: 'Copper K-alpha' },
  { name: 'Silicon (111) Mo', lambda: 0.071, d: 0.314, theta: 6.5, material: 'Silicon (111) plane', source: 'Molybdenum K-alpha' },
  { name: 'NaCl (200) Mo', lambda: 0.071, d: 0.282, theta: 7.2, material: 'NaCl (200) plane', source: 'Molybdenum K-alpha' },
  { name: 'Copper (111) Cu', lambda: 0.154, d: 0.208, theta: 21.7, material: 'Copper (111) plane', source: 'Copper K-alpha' },
  { name: 'Copper (111) Co', lambda: 0.179, d: 0.208, theta: 25.5, material: 'Copper (111) plane', source: 'Cobalt K-alpha' },
  { name: 'Organic Crystal', lambda: 0.200, d: 0.400, theta: 14.5, material: 'custom organic crystal', source: 'custom soft X-ray' }
];

export default function DiffractionLab({ onBack }) {
  // Navigation mode: 'explore' | 'quiz'
  const [mode, setMode] = useState('explore');

  // Physical parameters
  const [lambda, setLambda] = useState(0.154); // Wavelength in nm (default: Cu K-alpha = 0.154 nm)
  const [d, setD] = useState(0.282);       // Interplanar spacing in nm
  const [theta, setTheta] = useState(15.8);    // Incident angle in degrees
  const [isScanning, setIsScanning] = useState(false); // Auto-sweep angle

  // Quiz state
  const [quizState, setQuizState] = useState({
    questionType: 0, // 0: Find the Peak, 1: Calculate Lambda, 2: Calculate d
    activeQuestion: QUIZ_QUESTIONS[0],
    score: 0,
    attempts: 0,
    streak: 0,
    checked: false,
    isCorrect: false,
    showAnswer: false,
    studentGuess: '',
    hintLevel: 0
  });

  const canvasRef = useRef(null);
  const plotRef = useRef(null);
  const animationFrameRef = useRef(null);
  const timeRef = useRef(0);

  const latticePresets = [
    { name: 'NaCl (200) plane (0.282 nm)', val: 0.282 },
    { name: 'Silicon (111) plane (0.314 nm)', val: 0.314 },
    { name: 'Copper (111) plane (0.208 nm)', val: 0.208 }
  ];

  // Convert theta to radians
  const thetaRad = (theta * Math.PI) / 180;

  // Calculate path difference delta = 2 * d * sin(theta)
  const pathDifference = 2 * d * Math.sin(thetaRad);
  const lambdaRatio = pathDifference / lambda;

  // Determine if constructive interference is occurring (Bragg condition met)
  const closestInteger = Math.round(lambdaRatio);
  const isBraggPeak = Math.abs(lambdaRatio - closestInteger) < 0.04 && closestInteger > 0;
  const interferenceQuality = isBraggPeak ? 'Constructive' : (Math.abs(lambdaRatio - (closestInteger - 0.5)) < 0.08 ? 'Destructive' : 'Mixed');

  // --- Quiz Functions ---
  const generateNewQuestion = () => {
    // Pick a random question from QUIZ_QUESTIONS
    let nextQuestion = quizState.activeQuestion;
    while (nextQuestion.name === quizState.activeQuestion.name && QUIZ_QUESTIONS.length > 1) {
      const idx = Math.floor(Math.random() * QUIZ_QUESTIONS.length);
      nextQuestion = QUIZ_QUESTIONS[idx];
    }

    // Pick a random question type: 0, 1, or 2
    const nextType = Math.floor(Math.random() * 3);

    setQuizState((prev) => ({
      ...prev,
      questionType: nextType,
      activeQuestion: nextQuestion,
      checked: false,
      isCorrect: false,
      showAnswer: false,
      studentGuess: '',
      hintLevel: 0
    }));

    // Setup variables for the quiz question
    if (nextType === 0) {
      // Find the Peak: Lock wavelength & spacing, set angle away from peak
      setLambda(nextQuestion.lambda);
      setD(nextQuestion.d);
      setTheta(5.0); // Reset angle away from peak
      setIsScanning(false);
    } else {
      // Math calculation: Lock everything to the target states
      setLambda(nextQuestion.lambda);
      setD(nextQuestion.d);
      setTheta(nextQuestion.theta);
      setIsScanning(false);
    }
  };

  const handleCheckQuizAnswer = () => {
    let isCorrect = false;
    const { questionType, activeQuestion, studentGuess } = quizState;

    if (questionType === 0) {
      // Find the Peak: Check if current theta is close to target theta
      isCorrect = Math.abs(theta - activeQuestion.theta) < 0.5;
    } else if (questionType === 1) {
      // Calculate Lambda: Check if guess is close to activeQuestion.lambda
      const guess = parseFloat(studentGuess);
      isCorrect = !isNaN(guess) && Math.abs(guess - activeQuestion.lambda) <= 0.005;
    } else if (questionType === 2) {
      // Calculate d: Check if guess is close to activeQuestion.d
      const guess = parseFloat(studentGuess);
      isCorrect = !isNaN(guess) && Math.abs(guess - activeQuestion.d) <= 0.005;
    }

    setQuizState((prev) => ({
      ...prev,
      checked: true,
      isCorrect,
      score: prev.score + (isCorrect ? 1 : 0),
      attempts: prev.attempts + 1,
      streak: isCorrect ? prev.streak + 1 : 0
    }));
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setIsScanning(false);
    if (newMode === 'quiz') {
      generateNewQuestion();
    }
  };

  // Handle Scanning / Auto-sweep (Only active in Explore or Peak Alignment Quiz if not checked)
  useEffect(() => {
    const scan = () => {
      if (isScanning) {
        setTheta((prev) => {
          let next = prev + 0.2;
          if (next > 80) return 5;
          return parseFloat(next.toFixed(1));
        });
      }
      animationFrameRef.current = requestAnimationFrame(scan);
    };

    animationFrameRef.current = requestAnimationFrame(scan);
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [isScanning]);

  // Main drawing loop (Canvas Wave Animation)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let localFrameId;

    const draw = () => {
      ctx.fillStyle = '#0f172a'; // slate-900
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const w = canvas.width;
      const h = canvas.height;
      const x0 = w / 2;
      const y1 = 90;

      const scale = 320;
      const dPixel = d * scale;
      const y2 = y1 + dPixel;
      const y3 = y2 + dPixel;

      // Draw lattice planes
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);

      const drawPlaneLine = (y) => {
        ctx.beginPath();
        ctx.moveTo(30, y);
        ctx.lineTo(w - 30, y);
        ctx.stroke();
      };

      drawPlaneLine(y1);
      drawPlaneLine(y2);
      drawPlaneLine(y3);
      ctx.setLineDash([]);

      // Draw Atoms along the planes
      const drawAtoms = (y, colorClass) => {
        ctx.fillStyle = colorClass;
        for (let x = 50; x < w - 30; x += 40) {
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, 2 * Math.PI);
          ctx.fill();
        }
      };

      drawAtoms(y1, '#64748b');
      drawAtoms(y2, '#64748b');
      drawAtoms(y3, '#64748b');

      // Update wave time
      timeRef.current += 0.08;
      const t = timeRef.current;

      const lambdaPixel = lambda * scale;
      const amp = 10;
      const kVal = (2 * Math.PI) / lambdaPixel;
      const omega = 0.8;

      const thetaR = (theta * Math.PI) / 180;
      const cosT = Math.cos(thetaR);
      const sinT = Math.sin(thetaR);

      // Draw Ray 1
      const R1 = { x: x0, y: y1 };

      const drawSineRay = (R, phaseShift = 0, color = '#06b6d4') => {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;

        // Incident Wave
        let first = true;
        for (let s = -180; s <= 0; s += 2) {
          const rx = R.x + s * cosT;
          const ry = R.y + s * sinT;
          const waveVal = amp * Math.sin(kVal * s - t * omega + phaseShift);
          const wx = rx - waveVal * sinT;
          const wy = ry + waveVal * cosT;

          if (first) {
            ctx.moveTo(wx, wy);
            first = false;
          } else {
            ctx.lineTo(wx, wy);
          }
        }
        ctx.stroke();

        // Reflected Wave
        ctx.beginPath();
        ctx.strokeStyle = color;
        first = true;
        for (let s = 0; s <= 180; s += 2) {
          const rx = R.x + s * cosT;
          const ry = R.y - s * sinT;
          const waveVal = amp * Math.sin(kVal * s - t * omega + phaseShift);
          const wx = rx + waveVal * sinT;
          const wy = ry + waveVal * cosT;

          if (first) {
            ctx.moveTo(wx, wy);
            first = false;
          } else {
            ctx.lineTo(wx, wy);
          }
        }
        ctx.stroke();
      };

      drawSineRay(R1, 0, '#06b6d4');

      // Draw Ray 2
      const R2 = { x: x0, y: y2 };
      const phase2 = -2 * Math.PI * (2 * d * Math.sin(thetaR)) / lambda;
      drawSineRay(R2, phase2, isBraggPeak ? '#22c55e' : 'rgba(168, 85, 247, 0.7)');

      // Draw Wavefront & Geometry Helper Lines
      const dxIn = dPixel * sinT * cosT;
      const dyIn = dPixel * sinT * sinT;
      const Pin = { x: R2.x - dxIn, y: R2.y - dyIn };
      const PinOut = { x: R2.x + dxIn, y: R2.y - dyIn };

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);

      ctx.beginPath();
      ctx.moveTo(R1.x, R1.y);
      ctx.lineTo(Pin.x, Pin.y);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(R1.x, R1.y);
      ctx.lineTo(PinOut.x, PinOut.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Highlight the extra path length in glowing orange/yellow
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(Pin.x, Pin.y);
      ctx.lineTo(R2.x, R2.y);
      ctx.lineTo(PinOut.x, PinOut.y);
      ctx.stroke();

      // Label reflection origin and spacing d
      ctx.fillStyle = '#f8fafc';
      ctx.font = '11px Outfit, Inter, sans-serif';

      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.moveTo(R1.x - 30, R1.y);
      ctx.lineTo(R1.x - 30, R2.y);
      ctx.stroke();
      ctx.fillText(`d = ${d.toFixed(3)} nm`, R1.x - 100, R1.y + dPixel / 2 + 4);

      // Theta labels
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillText(`\u03B8 = ${theta.toFixed(1)}\u00B0`, R1.x - 60, R1.y - 12);
      ctx.fillText(`\u03B8 = ${theta.toFixed(1)}\u00B0`, R1.x + 40, R1.y - 12);

      // Path length indicator
      ctx.fillStyle = '#fbbf24';
      ctx.fillText(`Extra Path: 2d sin(\u03B8) = ${pathDifference.toFixed(3)} nm`, x0 - 90, h - 15);

      localFrameId = requestAnimationFrame(draw);
    };

    localFrameId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(localFrameId);
  }, [lambda, d, theta, isBraggPeak]);

  // Diffractogram Plot drawing loop (Canvas Graph)
  useEffect(() => {
    const canvas = plotRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, w, h);

    const paddingLeft = 45;
    const paddingRight = 15;
    const paddingTop = 15;
    const paddingBottom = 30;

    const graphWidth = w - paddingLeft - paddingRight;
    const graphHeight = h - paddingTop - paddingBottom;

    // Draw Grid Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;

    for (let i = 0; i <= 4; i++) {
      const y = paddingTop + (graphHeight * i) / 4;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(w - paddingRight, y);
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px Outfit, Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText((1.0 - i * 0.25).toFixed(2), paddingLeft - 8, y + 3);
    }

    const min2Theta = 10;
    const max2Theta = 150;

    for (let angle = 20; angle <= 140; angle += 20) {
      const pct = (angle - min2Theta) / (max2Theta - min2Theta);
      const x = paddingLeft + pct * graphWidth;

      ctx.beginPath();
      ctx.moveTo(x, paddingTop);
      ctx.lineTo(x, h - paddingBottom);
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px Outfit, Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${angle}\u00B0`, x, h - paddingBottom + 14);
    }

    ctx.fillStyle = '#f8fafc';
    ctx.fillText('Diffraction Angle 2θ (degrees)', paddingLeft + graphWidth / 2, h - 3);

    // Draw Diffraction Curve
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2;
    ctx.beginPath();

    let first = true;
    for (let xPixel = 0; xPixel < graphWidth; xPixel++) {
      const pct = xPixel / graphWidth;
      const twoThetaVal = min2Theta + pct * (max2Theta - min2Theta);
      const thetaValRad = (twoThetaVal / 2) * Math.PI / 180;

      const pathDiff = 2 * d * Math.sin(thetaValRad);
      const num = Math.sin(5 * Math.PI * pathDiff / lambda);
      const den = Math.sin(Math.PI * pathDiff / lambda);

      let intensity = 0;
      if (Math.abs(den) < 1e-4) {
        intensity = 1.0;
      } else {
        intensity = Math.pow(num / (5 * den), 2);
      }

      intensity = intensity * 0.95 + 0.01;
      const yPixel = h - paddingBottom - intensity * graphHeight;

      if (first) {
        ctx.moveTo(paddingLeft + xPixel, yPixel);
        first = false;
      } else {
        ctx.lineTo(paddingLeft + xPixel, yPixel);
      }
    }
    ctx.stroke();

    // --- Draw Current Position Marker (Red Line) ---
    // ANTI-CHEATING constraint: HIDE the red marker during Peak Alignment Quiz unless showing answers!
    const isPeakQuiz = mode === 'quiz' && quizState.questionType === 0;
    const hideMarker = isPeakQuiz && !quizState.checked;

    if (!hideMarker) {
      const cur2Theta = 2 * theta;
      if (cur2Theta >= min2Theta && cur2Theta <= max2Theta) {
        const pct = (cur2Theta - min2Theta) / (max2Theta - min2Theta);
        const markerX = paddingLeft + pct * graphWidth;

        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;

        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(markerX, paddingTop);
        ctx.lineTo(markerX, h - paddingBottom);
        ctx.stroke();
        ctx.setLineDash([]);

        // Plot intersection circle
        const curThetaRad = (theta * Math.PI) / 180;
        const pathDiff = 2 * d * Math.sin(curThetaRad);
        const num = Math.sin(5 * Math.PI * pathDiff / lambda);
        const den = Math.sin(Math.PI * pathDiff / lambda);
        let curIntensity = 0;
        if (Math.abs(den) < 1e-4) {
          curIntensity = 1.0;
        } else {
          curIntensity = Math.pow(num / (5 * den), 2);
        }
        curIntensity = curIntensity * 0.95 + 0.01;

        const markerY = h - paddingBottom - curIntensity * graphHeight;
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(markerX, markerY, 5, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
  }, [lambda, d, theta, mode, quizState.checked, quizState.questionType]);

  // Render Hints
  const renderQuizHints = () => {
    if (quizState.hintLevel === 0) return null;
    const { questionType, activeQuestion } = quizState;

    return (
      <div className="hint-card">
        <h4>Hint:</h4>
        {questionType === 0 && quizState.hintLevel >= 1 && (
          <p>
            1. Drag the angle (θ) slider slowly. Watch the <strong>Live Superposition Detector</strong> combining wave.
          </p>
        )}
        {questionType === 0 && quizState.hintLevel >= 2 && (
          <p>
            2. Peak intensity occurs when the waves reflect in-phase (green wave on screen). Maximize the amplitude!
          </p>
        )}
        {questionType === 1 && quizState.hintLevel >= 1 && (
          <p>
            1. Apply Bragg's Law: n*lambda = 2*d*sin(theta). Here, n = 1, spacing d = {activeQuestion.d} nm, and theta = {activeQuestion.theta}°.
          </p>
        )}
        {questionType === 1 && quizState.hintLevel >= 2 && (
          <p>
            2. Calculation: lambda = 2 * {activeQuestion.d} * sin({activeQuestion.theta}°). Make sure your calculator is in Degree mode!
          </p>
        )}
        {questionType === 2 && quizState.hintLevel >= 1 && (
          <p>
            1. Apply Bragg's Law: n*lambda = 2*d*sin(theta). Rearranging for plane spacing: d = lambda / (2*sin(theta)).
          </p>
        )}
        {questionType === 2 && quizState.hintLevel >= 2 && (
          <p>
            2. Calculation: d = {activeQuestion.lambda} / (2 * sin({activeQuestion.theta}°)).
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <button className="back-btn" onClick={onBack}>
          ← Back to Labs
        </button>
        <div className="header-title-row">
          <span className="logo-icon">📡</span>
          <h1>Bragg's Law Diffraction Lab</h1>
        </div>
        <p className="header-subtitle">Visualizing Wave Interference & Lattice Reflection</p>
      </header>

      <main className="app-content">
        {/* Left Column: Wave Animation & Oscilloscope */}
        <div className="left-column">
          <div className="viewer-card card" style={{ height: '340px' }}>
            <canvas ref={canvasRef} width="520" height="340" style={{ width: '100%', height: '100%', display: 'block' }} />
          </div>

          <div className="detector-card card">
            <h3>Live Superposition Detector</h3>
            <p className="subtitle">Summed wave amplitude entering X-ray detector.</p>
            <div className="detector-display-row">
              <div className="detector-wave-box">
                <svg width="100%" height="80" style={{ background: '#090d16', borderRadius: '8px' }}>
                  <path
                    d={Array.from({ length: 100 }, (_, i) => {
                      const x = (i / 99) * 260;
                      const amplitude = 30 * Math.abs(Math.cos(Math.PI * lambdaRatio));
                      const y = 40 + amplitude * Math.sin((i / 8) - (timeRef.current * 0.3));
                      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                    }).join(' ')}
                    fill="none"
                    stroke={isBraggPeak ? '#22c55e' : '#a855f7'}
                    strokeWidth="3"
                  />
                </svg>
              </div>
              <div className="detector-data">
                <div className="detector-status-label">Signal Intensity:</div>
                <div className={`detector-value ${isBraggPeak ? 'constructive-text' : ''}`}>
                  {(Math.pow(Math.cos(Math.PI * lambdaRatio), 2) * 100).toFixed(0)}%
                </div>
                <div className={`detector-badge ${isBraggPeak ? 'peak' : ''}`}>
                  {isBraggPeak ? 'Peak Signal 🌟' : 'No Reflection'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Sidebar (conditional between Explore and Quiz) */}
        <div className="right-column">
          {/* Mode Selector Tabs */}
          <div className="mode-tabs" style={{ marginBottom: '0px' }}>
            <button
              className={`mode-tab ${mode === 'explore' ? 'active' : ''}`}
              onClick={() => handleModeChange('explore')}
            >
              Explore Mode
            </button>
            <button
              className={`mode-tab ${mode === 'quiz' ? 'active' : ''}`}
              onClick={() => handleModeChange('quiz')}
            >
              Practice Quiz
            </button>
          </div>

          {mode === 'explore' ? (
            /* --- EXPLORE PANEL --- */
            <>
              <div className="control-panel card">
                <h3>Simulation Parameters</h3>
                <p className="section-desc">Tune the X-ray tube and crystal lattice structure.</p>

                <div className="section">
                  <div className="index-row">
                    <span className="index-label">Wavelength (λ)</span>
                    <span className="index-value" style={{ color: '#06b6d4' }}>{lambda.toFixed(3)} nm</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.25"
                    step="0.001"
                    value={lambda}
                    onChange={(e) => setLambda(parseFloat(e.target.value))}
                    style={{ width: '100%', margin: '8px 0' }}
                  />
                </div>

                <div className="section">
                  <div className="index-row">
                    <span className="index-label">Lattice Spacing (d)</span>
                    <span className="index-value" style={{ color: '#eab308' }}>{d.toFixed(3)} nm</span>
                  </div>
                  <input
                    type="range"
                    min="0.10"
                    max="0.45"
                    step="0.001"
                    value={d}
                    onChange={(e) => setD(parseFloat(e.target.value))}
                    style={{ width: '100%', margin: '8px 0' }}
                  />
                  <div className="preset-buttons" style={{ marginTop: '4px' }}>
                    {latticePresets.map((l) => (
                      <button key={l.name} className="preset-btn" onClick={() => setD(l.val)}>
                        {l.name.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="section">
                  <div className="index-row">
                    <span className="index-label">Reflection Angle (θ)</span>
                    <span className="index-value" style={{ color: '#ef4444' }}>{theta.toFixed(1)}°</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="80"
                    step="0.1"
                    value={theta}
                    onChange={(e) => setTheta(parseFloat(e.target.value))}
                    style={{ width: '100%', margin: '8px 0' }}
                  />

                  <div className="index-row" style={{ marginTop: '12px' }}>
                    <span className="index-label">Diffraction Angle (2θ)</span>
                    <span className="index-value" style={{ color: '#ef4444', fontSize: '1.2rem' }}>{(theta * 2).toFixed(1)}°</span>
                  </div>

                  <div style={{ marginTop: '12px', display: 'flex', gap: '10px' }}>
                    <button
                      className={`submit-btn ${isScanning ? 'stop-btn' : ''}`}
                      onClick={() => setIsScanning(!isScanning)}
                      style={{ flex: 1, padding: '8px', fontSize: '0.85rem' }}
                    >
                      {isScanning ? '⏸️ Pause Sweep' : '▶️ Sweep Angle (2θ Scan)'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="card" style={{ padding: '16px' }}>
                <h3>Diffractogram Plot (XRD Pattern)</h3>
                <p className="subtitle">Simulated intensity peak scan against 2θ diffraction.</p>
                <div style={{ height: '180px', width: '100%', marginTop: '8px', borderRadius: '8px', overflow: 'hidden' }}>
                  <canvas ref={plotRef} width="400" height="180" style={{ width: '100%', height: '100%', display: 'block' }} />
                </div>
              </div>
            </>
          ) : (
            /* --- QUIZ PANEL --- */
            <>
              <div className="control-panel card">
                <div className="quiz-header" style={{ marginBottom: '8px' }}>
                  <h3>Bragg Practice Quiz</h3>
                  <div className="quiz-stats">
                    <span className="stat-badge">Score: {quizState.score}/{quizState.attempts}</span>
                    <span className="stat-badge streak">Streak: {quizState.streak} 🔥</span>
                  </div>
                </div>

                <div className="quiz-body">
                  {/* Dynamic Question Prompt */}
                  {quizState.questionType === 0 && (
                    <div>
                      <p className="instruction">
                        <strong>Alignment Task:</strong> Drag the angle (θ) slider below to locate the 1st order (n=1) constructive diffraction peak for X-ray source wavelength <strong>λ = {quizState.activeQuestion.lambda.toFixed(3)} nm</strong> and plane spacing <strong>d = {quizState.activeQuestion.d.toFixed(3)} nm</strong>.
                      </p>
                      <p className="helper-text" style={{ fontStyle: 'italic' }}>
                        *Note: The red line marker on the diffractogram plot is disabled. Watch the waves or the detector output!
                      </p>

                      <div className="section" style={{ border: 'none', padding: 0 }}>
                        <div className="index-row">
                          <span className="index-label">Reflection Angle (θ)</span>
                          <span className="index-value" style={{ color: '#ef4444' }}>{theta.toFixed(1)}°</span>
                        </div>
                        <input
                          type="range"
                          min="5"
                          max="80"
                          step="0.1"
                          value={theta}
                          onChange={(e) => setTheta(parseFloat(e.target.value))}
                          disabled={quizState.checked}
                          style={{ width: '100%', margin: '12px 0 8px 0' }}
                        />
                      </div>
                    </div>
                  )}

                  {quizState.questionType === 1 && (
                    <div>
                      <p className="instruction">
                        <strong>Math Challenge:</strong> Under first-order Bragg reflection (n=1), a crystal with interplanar spacing <strong>d = {quizState.activeQuestion.d.toFixed(3)} nm</strong> reflects a peak signal at a theta angle of <strong>θ = {quizState.activeQuestion.theta.toFixed(1)}°</strong>.
                        <br /><br />
                        What is the <strong>wavelength (λ)</strong> of the incoming X-ray beam? (Answer in nm, round to 3 decimal places)
                      </p>
                      <div className="guess-inputs" style={{ margin: '12px 0' }}>
                        <div className="input-group">
                          <input
                            type="text"
                            value={quizState.studentGuess}
                            onChange={(e) => setQuizState(prev => ({ ...prev, studentGuess: e.target.value }))}
                            disabled={quizState.checked}
                            placeholder="e.g. 0.154"
                            style={{ width: '140px', fontSize: '1.2rem' }}
                          />
                          <span className="index-label" style={{ marginTop: '4px' }}>Wavelength (nm)</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {quizState.questionType === 2 && (
                    <div>
                      <p className="instruction">
                        <strong>Math Challenge:</strong> An X-ray source of wavelength <strong>λ = {quizState.activeQuestion.lambda.toFixed(3)} nm</strong> diffracts off a crystal lattice. The first-order (n=1) reflection peak is detected at <strong>θ = {quizState.activeQuestion.theta.toFixed(1)}°</strong>.
                        <br /><br />
                        What is the <strong>interplanar plane spacing (d)</strong> of this crystal? (Answer in nm, round to 3 decimal places)
                      </p>
                      <div className="guess-inputs" style={{ margin: '12px 0' }}>
                        <div className="input-group">
                          <input
                            type="text"
                            value={quizState.studentGuess}
                            onChange={(e) => setQuizState(prev => ({ ...prev, studentGuess: e.target.value }))}
                            disabled={quizState.checked}
                            placeholder="e.g. 0.282"
                            style={{ width: '140px', fontSize: '1.2rem' }}
                          />
                          <span className="index-label" style={{ marginTop: '4px' }}>Lattice Spacing (nm)</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Verification & Submit Button */}
                  {!quizState.checked && (
                    <button
                      onClick={handleCheckQuizAnswer}
                      className="submit-btn"
                      style={{ width: '100%', marginTop: '8px' }}
                    >
                      {quizState.questionType === 0 ? 'Verify Peak Angle' : 'Verify Calculation'}
                    </button>
                  )}

                  {/* Feedback Alert Card */}
                  {quizState.checked && (
                    <div className={`feedback-alert ${quizState.isCorrect ? 'correct' : 'incorrect'}`} style={{ marginTop: '16px' }}>
                      <div className="feedback-title">
                        {quizState.isCorrect ? '✨ Correct! Excellent job!' : '❌ Incorrect. Try again!'}
                      </div>
                      <p className="feedback-detail">
                        {quizState.isCorrect
                          ? `Bragg's condition is satisfied: λ = ${quizState.activeQuestion.lambda.toFixed(3)} nm, d = ${quizState.activeQuestion.d.toFixed(3)} nm at θ = ${quizState.activeQuestion.theta.toFixed(1)}°.`
                          : `The target parameters were: λ = ${quizState.activeQuestion.lambda.toFixed(3)} nm, d = ${quizState.activeQuestion.d.toFixed(3)} nm, θ = ${quizState.activeQuestion.theta.toFixed(1)}°.`
                        }
                      </p>

                      <div className="feedback-actions">
                        {!quizState.isCorrect && quizState.questionType === 0 && (
                          <button
                            className="secondary-btn"
                            onClick={() => {
                              setTheta(quizState.activeQuestion.theta);
                              setQuizState(prev => ({ ...prev, showAnswer: true }));
                            }}
                          >
                            Show Peak Angle
                          </button>
                        )}
                        <button className="primary-btn" onClick={generateNewQuestion}>
                          Next Question
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Quiz Helpers */}
                  <div className="quiz-controls-row" style={{ marginTop: '16px' }}>
                    {!quizState.checked && (
                      <button
                        className="text-btn"
                        onClick={() => setQuizState(prev => ({ ...prev, hintLevel: Math.min(prev.hintLevel + 1, 2) }))}
                      >
                        💡 Need a Hint?
                      </button>
                    )}
                    {!quizState.checked && (
                      <button className="text-btn skip-btn" onClick={generateNewQuestion}>
                        Skip Question ➡️
                      </button>
                    )}
                  </div>

                  {renderQuizHints()}
                </div>
              </div>

              {/* Show Diffractogram in Quiz (Always shown as reference, but marker represents current theta selection) */}
              <div className="card" style={{ padding: '16px' }}>
                <h3>Diffractogram Plot (XRD Pattern)</h3>
                <p className="subtitle">Simulated intensity peak scan against 2θ diffraction.</p>
                <div style={{ height: '180px', width: '100%', marginTop: '8px', borderRadius: '8px', overflow: 'hidden' }}>
                  <canvas ref={plotRef} width="400" height="180" style={{ width: '100%', height: '100%', display: 'block' }} />
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Educational Tutorial Card */}
      <section className="math-explanation card" style={{ marginTop: '24px', width: '100%' }}>
        <h3>Bragg's Diffraction Physics</h3>
        <p className="subtitle">Understanding the geometry of constructive wave interference.</p>
        <div className="steps-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          <div>
            <h4>Bragg's Law Formula</h4>
            <div className="math-block" style={{ fontSize: '1.2rem', textAlign: 'center', padding: '16px', borderLeft: 'none', borderTop: '3px solid var(--accent-cyan)' }}>
              nλ = 2d sin(θ)
            </div>
            <p style={{ marginTop: '12px', fontSize: '0.85rem' }}>
              Where:<br />
              • <strong>n</strong>: Order of reflection (integer: 1, 2, 3...)<br />
              • <strong>λ (lambda)</strong>: Wavelength of incoming X-rays<br />
              • <strong>d</strong>: Spacing between parallel atomic planes<br />
              • <strong>θ (theta)</strong>: Angle of incidence and reflection
            </p>
          </div>

          <div>
            <h4>Geometric Derivation</h4>
            <p style={{ fontSize: '0.85rem', lineHeight: '1.5' }}>
              When X-rays hit a crystal, the wave reflecting from the second plane travels further than the wave reflecting from the first.
              The extra distance is highlighted in <strong>yellow</strong> on the diagram.
              <br /><br />
              By trigonometry, the extra path is exactly:
              <br />
              <code style={{ color: 'var(--accent-cyan)' }}>Path Difference = AB + BC = d sin(θ) + d sin(θ) = 2d sin(θ)</code>
              <br /><br />
              If this extra distance is an integer multiple of the wavelength (e.g. 1λ, 2λ), the peaks line up and create <strong>constructive interference</strong>.
            </p>
          </div>

          <div>
            <h4>Current Calculation</h4>
            <div className="math-block" style={{ fontSize: '0.85rem', lineHeight: '1.6' }}>
              • Wavelength λ = <strong>{lambda.toFixed(3)} nm</strong><br />
              • Plane spacing d = <strong>{d.toFixed(3)} nm</strong><br />
              • Sin(θ) = <strong>{Math.sin(thetaRad).toFixed(3)}</strong><br />
              • Path length 2d sin(θ) = <strong>{pathDifference.toFixed(3)} nm</strong><br />
              • Ratio (2d sin(θ) / λ) = <strong>{lambdaRatio.toFixed(3)}</strong>
            </div>
            <p style={{ marginTop: '8px', fontSize: '0.82rem' }}>
              Result: <strong>{lambdaRatio.toFixed(2)}</strong> wavelengths fit into the extra path length.
              The waves are interfering <strong>{interferenceQuality.toLowerCase()}ly</strong> at this angle.
            </p>
          </div>
        </div>
      </section>

      <footer className="app-footer">
        <p>&copy; {new Date().getFullYear()} Crystallography & Materials Science Lab Tool. Designed with Node & HTML5 Canvas.</p>
      </footer>
    </div>
  );
}
