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
      </div>
    </div>
  );
}
