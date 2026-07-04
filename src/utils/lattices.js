/**
 * Atom structural coordinates for Bravais Lattices in a 3D unit cell [0, 1]^3.
 * Each atom contains:
 * - pos: [x, y, z] coordinate
 * - type: 'corner' | 'body' | 'face' (to allow different sizing or coloring)
 */

export const LATTICES = {
  sc: {
    name: 'Simple Cubic (SC)',
    description: 'Atoms sit only at the eight corners of the unit cell.',
    atoms: [
      { pos: [0, 0, 0], type: 'corner' },
      { pos: [1, 0, 0], type: 'corner' },
      { pos: [0, 1, 0], type: 'corner' },
      { pos: [1, 1, 0], type: 'corner' },
      { pos: [0, 0, 1], type: 'corner' },
      { pos: [1, 0, 1], type: 'corner' },
      { pos: [0, 1, 1], type: 'corner' },
      { pos: [1, 1, 1], type: 'corner' }
    ]
  },
  bcc: {
    name: 'Body-Centered Cubic (BCC)',
    description: 'Atoms sit at the eight corners, plus one atom in the center of the cell.',
    atoms: [
      { pos: [0, 0, 0], type: 'corner' },
      { pos: [1, 0, 0], type: 'corner' },
      { pos: [0, 1, 0], type: 'corner' },
      { pos: [1, 1, 0], type: 'corner' },
      { pos: [0, 0, 1], type: 'corner' },
      { pos: [1, 0, 1], type: 'corner' },
      { pos: [0, 1, 1], type: 'corner' },
      { pos: [1, 1, 1], type: 'corner' },
      { pos: [0.5, 0.5, 0.5], type: 'body' }
    ]
  },
  fcc: {
    name: 'Face-Centered Cubic (FCC)',
    description: 'Atoms sit at the eight corners, plus one atom in the center of each of the six faces.',
    atoms: [
      { pos: [0, 0, 0], type: 'corner' },
      { pos: [1, 0, 0], type: 'corner' },
      { pos: [0, 1, 0], type: 'corner' },
      { pos: [1, 1, 0], type: 'corner' },
      { pos: [0, 0, 1], type: 'corner' },
      { pos: [1, 0, 1], type: 'corner' },
      { pos: [0, 1, 1], type: 'corner' },
      { pos: [1, 1, 1], type: 'corner' },
      // Face centers
      { pos: [0.5, 0.5, 0], type: 'face' },
      { pos: [0.5, 0.5, 1], type: 'face' },
      { pos: [0.5, 0, 0.5], type: 'face' },
      { pos: [0.5, 1, 0.5], type: 'face' },
      { pos: [0, 0.5, 0.5], type: 'face' },
      { pos: [1, 0.5, 0.5], type: 'face' }
    ]
  }
};
