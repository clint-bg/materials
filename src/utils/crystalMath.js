/**
 * Utility functions for crystallography calculations, specifically Miller indices
 * and plane intersections with a unit cell [0, 1]^3.
 */

// Helper: Vector dot product
function dot(v1, v2) {
  return v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
}

// Helper: Vector cross product
function cross(v1, v2) {
  return [
    v1[1] * v2[2] - v1[2] * v2[1],
    v1[2] * v2[0] - v1[0] * v2[2],
    v1[0] * v2[1] - v1[1] * v2[0]
  ];
}

// Helper: Normalize vector
function normalize(v) {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  if (len === 0) return [0, 0, 0];
  return [v[0] / len, v[1] / len, v[2] / len];
}

/**
 * Calculates the vertices of the polygon representing the crystal plane (hkl)
 * inside the unit cube [0, 1]^3.
 *
 * @param {number} h - Miller index h (integer, e.g. -3 to 3)
 * @param {number} k - Miller index k (integer, e.g. -3 to 3)
 * @param {number} l - Miller index l (integer, e.g. -3 to 3)
 * @returns {Array<Array<number>>} Array of [x, y, z] points sorted in coplanar order.
 */
export function getPlaneVertices(h, k, l) {
  // If all are zero, it's not a valid plane
  if (h === 0 && k === 0 && l === 0) {
    return [];
  }

  // 1. Calculate origin shift for negative indices
  const xo = h < 0 ? 1 : 0;
  const yo = k < 0 ? 1 : 0;
  const zo = l < 0 ? 1 : 0;

  // Plane equation: A*x + B*y + C*z = D
  const A = h;
  const B = k;
  const C = l;
  const D = 1 + h * xo + k * yo + l * zo;

  const rawPoints = [];
  const eps = 1e-7;

  // Helper to check if value is in unit cell bounds [0, 1]
  const inBounds = (val) => val >= -eps && val <= 1 + eps;

  // 2. Intersect with 12 edges of the unit cube

  // 4 edges parallel to X-axis:
  if (Math.abs(A) > eps) {
    // y=0, z=0
    let x = D / A;
    if (inBounds(x)) rawPoints.push([x, 0, 0]);

    // y=1, z=0
    x = (D - B) / A;
    if (inBounds(x)) rawPoints.push([x, 1, 0]);

    // y=0, z=1
    x = (D - C) / A;
    if (inBounds(x)) rawPoints.push([x, 0, 1]);

    // y=1, z=1
    x = (D - B - C) / A;
    if (inBounds(x)) rawPoints.push([x, 1, 1]);
  }

  // 4 edges parallel to Y-axis:
  if (Math.abs(B) > eps) {
    // x=0, z=0
    let y = D / B;
    if (inBounds(y)) rawPoints.push([0, y, 0]);

    // x=1, z=0
    y = (D - A) / B;
    if (inBounds(y)) rawPoints.push([1, y, 0]);

    // x=0, z=1
    y = (D - C) / B;
    if (inBounds(y)) rawPoints.push([0, y, 1]);

    // x=1, z=1
    y = (D - A - C) / B;
    if (inBounds(y)) rawPoints.push([1, y, 1]);
  }

  // 4 edges parallel to Z-axis:
  if (Math.abs(C) > eps) {
    // x=0, y=0
    let z = D / C;
    if (inBounds(z)) rawPoints.push([0, 0, z]);

    // x=1, y=0
    z = (D - A) / C;
    if (inBounds(z)) rawPoints.push([1, 0, z]);

    // x=0, y=1
    z = (D - B) / C;
    if (inBounds(z)) rawPoints.push([0, 1, z]);

    // x=1, y=1
    z = (D - A - B) / C;
    if (inBounds(z)) rawPoints.push([1, 1, z]);
  }

  // 3. Filter duplicate points
  const uniquePoints = [];
  const dupEps = 1e-4; // slightly wider for float checks

  for (const p of rawPoints) {
    // Snap close coordinates to exact boundary values [0, 1] to avoid rendering gaps
    const snapped = p.map(coord => {
      if (Math.abs(coord) < dupEps) return 0;
      if (Math.abs(coord - 1) < dupEps) return 1;
      return coord;
    });

    let isDup = false;
    for (const up of uniquePoints) {
      if (
        Math.abs(snapped[0] - up[0]) < dupEps &&
        Math.abs(snapped[1] - up[1]) < dupEps &&
        Math.abs(snapped[2] - up[2]) < dupEps
      ) {
        isDup = true;
        break;
      }
    }
    if (!isDup) {
      uniquePoints.push(snapped);
    }
  }

  // We need at least 3 points to form a polygon
  if (uniquePoints.length < 3) {
    return [];
  }

  // 4. Sort points in coplanar circular order
  // Compute centroid
  const centroid = [0, 0, 0];
  for (const p of uniquePoints) {
    centroid[0] += p[0];
    centroid[1] += p[1];
    centroid[2] += p[2];
  }
  centroid[0] /= uniquePoints.length;
  centroid[1] /= uniquePoints.length;
  centroid[2] /= uniquePoints.length;

  // Normal vector to plane
  const n = normalize([A, B, C]);

  // Select vector t not parallel to n
  const t = Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];

  // u = normalize(n x t)
  const u = normalize(cross(n, t));
  // v = n x u
  const v = cross(n, u);

  // Project points and compute angles
  const pointsWithAngle = uniquePoints.map(p => {
    const diff = [p[0] - centroid[0], p[1] - centroid[1], p[2] - centroid[2]];
    const pu = dot(diff, u);
    const pv = dot(diff, v);
    const angle = Math.atan2(pv, pu);
    return { point: p, angle };
  });

  // Sort by angle
  pointsWithAngle.sort((a, b) => a.angle - b.angle);

  return pointsWithAngle.map(item => item.point);
}

/**
 * Returns formatted Miller Index label, converting e.g., -1 to bar-1
 *
 * @param {number} h
 * @param {number} k
 * @param {number} l
 * @returns {string} Formatted string like (111) or (1̄01)
 */
export function formatMiller(h, k, l) {
  const formatIndex = (val) => {
    if (val < 0) {
      return `${Math.abs(val)}\u0304`; // Combining overline character
    }
    return val.toString();
  };
  return `(${formatIndex(h)}${formatIndex(k)}${formatIndex(l)})`;
}

/**
 * Checks if the student's guessed indices are equivalent to the target indices.
 * In crystallography, (h k l) is equivalent to (-h -k -l) as they represent parallel planes.
 */
export function checkIndicesEquivalence(target, student) {
  const [th, tk, tl] = target;
  const [sh, sk, sl] = student;

  // Cannot be all zero
  if (sh === 0 && sk === 0 && sl === 0) return false;

  // Direct check
  if (th === sh && tk === sk && tl === sl) return true;

  // Negation check (since (111) and (-1-1-1) are parallel)
  if (th === -sh && tk === -sk && tl === -sl) return true;

  return false;
}
