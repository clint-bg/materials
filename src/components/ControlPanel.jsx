import React from 'react';
import { formatMiller } from '../utils/crystalMath';
import { LATTICES } from '../utils/lattices';

export default function ControlPanel({
  mode,
  setMode,
  latticeType,
  setLatticeType,
  millerIndices,
  setMillerIndices,
  resetQuiz
}) {
  const [h, k, l] = millerIndices;

  const handleIndexChange = (index, delta) => {
    const newIndices = [...millerIndices];
    let newVal = newIndices[index] + delta;
    
    // Clamp between -3 and 3
    if (newVal < -3) newVal = -3;
    if (newVal > 3) newVal = 3;

    newIndices[index] = newVal;

    // Prevent [0, 0, 0]
    if (newIndices[0] === 0 && newIndices[1] === 0 && newIndices[2] === 0) {
      // Force change in another axis, or don't allow it
      return;
    }

    setMillerIndices(newIndices);
  };

  const handleLatticeChange = (type) => {
    setLatticeType(type);
  };

  return (
    <div className="control-panel card">
      <div className="mode-tabs">
        <button
          className={`mode-tab ${mode === 'explore' ? 'active' : ''}`}
          onClick={() => { setMode('explore'); }}
        >
          Explore
        </button>
        <button
          className={`mode-tab ${mode === 'quiz_identify' ? 'active' : ''}`}
          onClick={() => { setMode('quiz_identify'); resetQuiz(); }}
        >
          Quiz: Identify
        </button>
        <button
          className={`mode-tab ${mode === 'quiz_construct' ? 'active' : ''}`}
          onClick={() => { setMode('quiz_construct'); resetQuiz(); }}
        >
          Quiz: Construct
        </button>
      </div>

      <div className="section">
        <h3>Lattice Type</h3>
        <p className="section-desc">Select the crystal structure configuration.</p>
        <div className="lattice-selector">
          {Object.entries(LATTICES).map(([key, data]) => (
            <button
              key={key}
              className={`lattice-btn ${latticeType === key ? 'active' : ''}`}
              onClick={() => handleLatticeChange(key)}
            >
              <div className="lattice-btn-name">{data.name}</div>
              <div className="lattice-btn-desc">{data.description}</div>
            </button>
          ))}
        </div>
      </div>

      {mode === 'explore' && (
        <div className="section">
          <h3>Miller Indices {formatMiller(h, k, l)}</h3>
          <p className="section-desc">Adjust the indices to change the plane orientation.</p>
          
          <div className="index-controllers">
            {['h (x-axis)', 'k (y-axis)', 'l (z-axis)'].map((label, idx) => (
              <div key={label} className="index-row">
                <span className="index-label">{label}</span>
                <div className="index-controls">
                  <button 
                    className="control-btn minus"
                    onClick={() => handleIndexChange(idx, -1)}
                  >
                    -
                  </button>
                  <span className="index-value">
                    {millerIndices[idx] < 0 ? (
                      <span>{Math.abs(millerIndices[idx])}<sup>&macr;</sup></span>
                    ) : (
                      millerIndices[idx]
                    )}
                  </span>
                  <button 
                    className="control-btn plus"
                    onClick={() => handleIndexChange(idx, 1)}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="quick-presets">
            <span className="preset-label">Common planes:</span>
            <div className="preset-buttons">
              {['100', '110', '111', '211', '1̄10'].map((preset) => {
                let parsed;
                if (preset === '100') parsed = [1, 0, 0];
                else if (preset === '110') parsed = [1, 1, 0];
                else if (preset === '111') parsed = [1, 1, 1];
                else if (preset === '211') parsed = [2, 1, 1];
                else if (preset === '1̄10') parsed = [-1, 1, 0];

                return (
                  <button
                    key={preset}
                    className="preset-btn"
                    onClick={() => setMillerIndices(parsed)}
                  >
                    {preset.includes('1̄') ? '(\u012B10)' : `(${preset})`}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
