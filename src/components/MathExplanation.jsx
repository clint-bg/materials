import React from 'react';
import { formatMiller } from '../utils/crystalMath';

export default function MathExplanation({ millerIndices }) {
  const [h, k, l] = millerIndices;

  // Calculate intercepts
  const getInterceptStr = (val) => {
    if (val === 0) return '\u221E (infinity)'; // Infinity sign
    if (val < 0) {
      // Show negative intercept relative to shifted origin
      const absVal = Math.abs(val);
      if (absVal === 1) return '-1';
      return `-1/${absVal}`;
    }
    if (val === 1) return '1';
    return `1/${val}`;
  };

  const getReciprocalStr = (val) => {
    if (val === 0) return '1 / \u221E = 0';
    if (val < 0) {
      const absVal = Math.abs(val);
      if (absVal === 1) return `1 / (-1) = -1`;
      return `1 / (-1/${absVal}) = -${absVal}`;
    }
    if (val === 1) return '1 / 1 = 1';
    return `1 / (1/${val}) = ${val}`;
  };

  const hasNegative = h < 0 || k < 0 || l < 0;

  // Calculate Family of Planes
  const absIndices = [Math.abs(h), Math.abs(k), Math.abs(l)];
  const familyIndices = [...absIndices].sort((a, b) => b - a);

  // Helper to generate equivalent planes in a cubic system
  const getEquivalents = (h, k, l) => {
    const vals = [h, k, l];
    const results = new Set();
    
    // Generate all sign changes
    const signs = [
      [1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1],
      [-1, 1, 1], [-1, 1, -1], [-1, -1, 1], [-1, -1, -1]
    ];
    
    // Generate all permutations of indices
    const permute = (arr) => {
      const perms = [];
      const len = arr.length;
      if (len === 1) return [arr];
      for (let i = 0; i < len; i++) {
        const first = arr[i];
        const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
        const restPerms = permute(rest);
        for (const p of restPerms) {
          perms.push([first, ...p]);
        }
      }
      return perms;
    };
    
    const basePerms = permute(vals);
    
    for (const perm of basePerms) {
      for (const sign of signs) {
        const trial = [perm[0] * sign[0], perm[1] * sign[1], perm[2] * sign[2]];
        
        // Skip all zeros
        if (trial[0] === 0 && trial[1] === 0 && trial[2] === 0) continue;
        
        // Format with overlines for negative values
        const formatIndex = (val) => {
          if (val < 0) return `${Math.abs(val)}\u0304`;
          return val.toString();
        };
        const str = `(${formatIndex(trial[0])}${formatIndex(trial[1])}${formatIndex(trial[2])})`;
        results.add(str);
      }
    }
    
    return Array.from(results);
  };

  const equivalents = getEquivalents(h, k, l);
  const displayedEquivalents = equivalents.slice(0, 8);
  const hasMore = equivalents.length > 8;
  const equivalentPlanesStr = displayedEquivalents.join(', ') + (hasMore ? ', ...' : '') + ` (Total: ${equivalents.length} planes)`;

  return (
    <div className="math-explanation card">
      <h3>Crystallographic Math Walkthrough</h3>
      <p className="subtitle">
        How the plane {formatMiller(h, k, l)} is derived from intercepts.
      </p>

      <div className="steps-container">
        <div className="step-item">
          <div className="step-num">1</div>
          <div className="step-content">
            <h4>Determine the Intercepts</h4>
            <p>Read where the plane cuts the coordinate axes (in units of the lattice parameter):</p>
            <div className="math-block">
              x-intercept: <strong>{getInterceptStr(h)}</strong><br />
              y-intercept: <strong>{getInterceptStr(k)}</strong><br />
              z-intercept: <strong>{getInterceptStr(l)}</strong>
            </div>
            {hasNegative && (
              <div className="info-note">
                <strong>Origin Shift Active:</strong> Since one or more intercepts are negative, we translate the cell origin along that axis (e.g. to 1) to keep the plane visible inside the unit cell.
              </div>
            )}
          </div>
        </div>

        <div className="step-item">
          <div className="step-num">2</div>
          <div className="step-content">
            <h4>Take the Reciprocals</h4>
            <p>Miller indices are defined as the reciprocals of the fractional intercepts:</p>
            <div className="math-block">
              h = {getReciprocalStr(h)}<br />
              k = {getReciprocalStr(k)}<br />
              l = {getReciprocalStr(l)}
            </div>
          </div>
        </div>

        <div className="step-item">
          <div className="step-num">3</div>
          <div className="step-content">
            <h4>Clear Fractions & Format</h4>
            <p>Multiply by the Lowest Common Multiple (if fractional) to get the smallest integers. Enclose in parentheses.</p>
            <p>
              Crystallographers write negative indices with a bar above the number (e.g., 1̄ read as "bar one") instead of a minus sign:
            </p>
            <div className="math-result">
              Miller Indices: <span className="highlight-text">{formatMiller(h, k, l)}</span>
            </div>
          </div>
        </div>

        <div className="step-item">
          <div className="step-num">4</div>
          <div className="step-content">
            <h4>Determine Family of Planes</h4>
            <p>
              Planes that are symmetrically equivalent in a crystal system belong to the same <strong>family</strong>, denoted by curly braces: <code>{`{h k l}`}</code>.
            </p>
            <p>
              For a cubic crystal system, the family is represented by taking the absolute values of the indices and listing them in descending order.
            </p>
            <div className="math-result">
              Plane Family: <span className="highlight-text">{"{"}{familyIndices.join(' ')}{"}"}</span>
            </div>
            <p style={{ marginTop: '8px', fontSize: '0.8rem', lineHeight: '1.4' }}>
              <strong>Symmetrical equivalents in this family:</strong><br />
              <span style={{ color: 'var(--text-secondary)' }}>{equivalentPlanesStr}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
