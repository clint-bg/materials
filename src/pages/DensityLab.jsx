import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// Atomic constants (radii in nm)
const LATTICE_NACL = 0.564;
const LATTICE_ZNS = 0.541;
const LATTICE_CAF2 = 0.546;
const LATTICE_BATIO3 = 0.401;

const R_CL = 0.181;
const R_NA = 0.102;
const R_S = 0.184;
const R_ZN = 0.074;
const R_CA = 0.100;
const R_F = 0.133;
const R_BA = 0.135;
const R_TI = 0.068;
const R_O = 0.140;

// Coordinate helpers for FCC
const getFccPositions = () => [
  // Corners
  [0,0,0], [1,0,0], [0,1,0], [0,0,1],
  [1,1,0], [1,0,1], [0,1,1], [1,1,1],
  // Face centers
  [0.5, 0.5, 0], [0.5, 0.5, 1],
  [0.5, 0, 0.5], [0.5, 1, 0.5],
  [0, 0.5, 0.5], [1, 0.5, 0.5]
];

export default function DensityLab({ onBack }) {
  const [structure, setStructure] = useState('nacl');
  const [h, setH] = useState(1);
  const [k, setK] = useState(0);
  const [l, setL] = useState(0);
  const [offsetN, setOffsetN] = useState(0.0);
  const [sceneReady, setSceneReady] = useState(false);

  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  
  const mountRef = useRef({
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    atomGroup: null,
    planeMesh: null,
    planeLine: null
  });

  // --- Dynamic atom coordinate builders ---
  const getNaclAtoms = () => {
    const list = [];
    // Chlorine Cl- (FCC)
    getFccPositions().forEach(pos => {
      list.push({ type: 'Cl', name: 'Chlorine (Cl⁻)', color: 0x22c55e, radius: R_CL, x: pos[0], y: pos[1], z: pos[2] });
    });
    // Sodium Na+ (Octahedral sites: edges + center)
    const naPositions = [
      [0.5, 0, 0], [0.5, 1, 0], [0.5, 0, 1], [0.5, 1, 1],
      [0, 0.5, 0], [1, 0.5, 0], [0, 0.5, 1], [1, 0.5, 1],
      [0, 0, 0.5], [1, 0, 0.5], [0, 1, 0.5], [1, 1, 0.5],
      [0.5, 0.5, 0.5]
    ];
    naPositions.forEach(pos => {
      list.push({ type: 'Na', name: 'Sodium (Na⁺)', color: 0xa855f7, radius: R_NA, x: pos[0], y: pos[1], z: pos[2] });
    });
    return list;
  };

  const getZnsAtoms = () => {
    const list = [];
    // Sulfur S2- (FCC)
    getFccPositions().forEach(pos => {
      list.push({ type: 'S', name: 'Sulfur (S²⁻)', color: 0xeab308, radius: R_S, x: pos[0], y: pos[1], z: pos[2] });
    });
    // Zinc Zn2+ (4 tetrahedral sites)
    const znPositions = [
      [0.25, 0.25, 0.25], [0.75, 0.75, 0.25],
      [0.75, 0.25, 0.75], [0.25, 0.75, 0.75]
    ];
    znPositions.forEach(pos => {
      list.push({ type: 'Zn', name: 'Zinc (Zn²⁺)', color: 0x3b82f6, radius: R_ZN, x: pos[0], y: pos[1], z: pos[2] });
    });
    return list;
  };

  const getCaf2Atoms = () => {
    const list = [];
    // Calcium Ca2+ (FCC)
    getFccPositions().forEach(pos => {
      list.push({ type: 'Ca', name: 'Calcium (Ca²⁺)', color: 0x0d9488, radius: R_CA, x: pos[0], y: pos[1], z: pos[2] });
    });
    // Fluorine F- (All 8 tetrahedral sites)
    const fPositions = [
      [0.25, 0.25, 0.25], [0.75, 0.25, 0.25], [0.25, 0.75, 0.25], [0.25, 0.25, 0.75],
      [0.75, 0.75, 0.25], [0.75, 0.25, 0.75], [0.25, 0.75, 0.75], [0.75, 0.75, 0.75]
    ];
    fPositions.forEach(pos => {
      list.push({ type: 'F', name: 'Fluorine (F⁻)', color: 0x38bdf8, radius: R_F, x: pos[0], y: pos[1], z: pos[2] });
    });
    return list;
  };

  const getBatio3Atoms = () => {
    const list = [];
    // Barium Ba2+ (Corners)
    const baPositions = [
      [0,0,0], [1,0,0], [0,1,0], [0,0,1],
      [1,1,0], [1,0,1], [0,1,1], [1,1,1]
    ];
    baPositions.forEach(pos => {
      list.push({ type: 'Ba', name: 'Barium (Ba²⁺)', color: 0x06b6d4, radius: R_BA, x: pos[0], y: pos[1], z: pos[2] });
    });
    // Titanium Ti4+ (Body center)
    list.push({ type: 'Ti', name: 'Titanium (Ti⁴⁺)', color: 0xe2e8f0, radius: R_TI, x: 0.5, y: 0.5, z: 0.5 });
    // Oxygen O2- (Face centers)
    const oPositions = [
      [0.5, 0.5, 0], [0.5, 0.5, 1],
      [0.5, 0, 0.5], [0.5, 1, 0.5],
      [0, 0.5, 0.5], [1, 0.5, 0.5]
    ];
    oPositions.forEach(pos => {
      list.push({ type: 'O', name: 'Oxygen (O²⁻)', color: 0xef4444, radius: R_O, x: pos[0], y: pos[1], z: pos[2] });
    });
    return list;
  };

  // Helper structure info retriever
  const getStructureParams = (type) => {
    switch (type) {
      case 'nacl':
        return {
          name: 'Rock Salt (NaCl)',
          a: LATTICE_NACL,
          atoms: getNaclAtoms(),
          legends: [
            { name: 'Chlorine (Cl⁻)', color: '#22c55e' },
            { name: 'Sodium (Na⁺)', color: '#a855f7' }
          ],
          formulaDesc: 'NaCl (Rock Salt) crystal structure. Alternating FCC lattices.'
        };
      case 'zns':
        return {
          name: 'Zinc Blende (ZnS)',
          a: LATTICE_ZNS,
          atoms: getZnsAtoms(),
          legends: [
            { name: 'Sulfur (S²⁻)', color: '#eab308' },
            { name: 'Zinc (Zn²⁺)', color: '#3b82f6' }
          ],
          formulaDesc: 'ZnS (Zinc Blende) structure. FCC Sulfur with 4 Zinc in tetrahedral voids.'
        };
      case 'caf2':
        return {
          name: 'Fluorite (CaF₂)',
          a: LATTICE_CAF2,
          atoms: getCaf2Atoms(),
          legends: [
            { name: 'Calcium (Ca²⁺)', color: '#0d9488' },
            { name: 'Fluorine (F⁻)', color: '#38bdf8' }
          ],
          formulaDesc: 'CaF₂ (Fluorite) structure. FCC Calcium with Fluorine filling all 8 tetrahedral sites.'
        };
      case 'batio3':
        return {
          name: 'Perovskite (BaTiO₃)',
          a: LATTICE_BATIO3,
          atoms: getBatio3Atoms(),
          legends: [
            { name: 'Barium (Ba²⁺)', color: '#06b6d4' },
            { name: 'Titanium (Ti⁴⁺)', color: '#e2e8f0' },
            { name: 'Oxygen (O²⁻)', color: '#ef4444' }
          ],
          formulaDesc: 'BaTiO₃ (Perovskite) structure. Ba at corners, Ti at center, O at faces.'
        };
      default:
        return { name: '', a: 0.5, atoms: [], legends: [], formulaDesc: '' };
    }
  };

  const activeParams = getStructureParams(structure);

  // --- Orthonormal Basis on Slicing Plane ---
  const getBasisVectors = () => {
    const normal = new THREE.Vector3(h, k, l);
    if (normal.lengthSq() === 0) {
      normal.set(1, 0, 0);
    } else {
      normal.normalize();
    }

    const u = new THREE.Vector3();
    const v = new THREE.Vector3();

    if (Math.abs(normal.x) < 1e-4 && Math.abs(normal.y) < 1e-4) {
      u.set(1, 0, 0);
    } else {
      u.set(-normal.y, normal.x, 0).normalize();
    }
    v.crossVectors(normal, u).normalize();

    return { normal, u, v };
  };

  // --- Plane-Cube Intersection Polygon ---
  const getIntersectionPolygon = () => {
    const { normal, u, v } = getBasisVectors();
    const vertices = [];

    const edges = [
      { a: [0,0,0], b: [1,0,0] }, { a: [0,0,0], b: [0,1,0] }, { a: [0,0,0], b: [0,0,1] },
      { a: [1,0,0], b: [1,1,0] }, { a: [1,0,0], b: [1,0,1] },
      { a: [0,1,0], b: [1,1,0] }, { a: [0,1,0], b: [0,1,1] },
      { a: [0,0,1], b: [1,0,1] }, { a: [0,0,1], b: [0,1,1] },
      { a: [1,1,0], b: [1,1,1] }, { a: [1,0,1], b: [1,1,1] }, { a: [0,1,1], b: [1,1,1] }
    ];

    edges.forEach(edge => {
      const fa = h * edge.a[0] + k * edge.a[1] + l * edge.a[2] - offsetN;
      const fb = h * edge.b[0] + k * edge.b[1] + l * edge.b[2] - offsetN;

      if (fa * fb < 0 || (fa === 0 && fb !== 0) || (fb === 0 && fa !== 0)) {
        let t = 0;
        if (Math.abs(fb - fa) > 1e-6) {
          t = -fa / (fb - fa);
        }
        const px = edge.a[0] + t * (edge.b[0] - edge.a[0]);
        const py = edge.a[1] + t * (edge.b[1] - edge.a[1]);
        const pz = edge.a[2] + t * (edge.b[2] - edge.a[2]);

        const uVal = px * u.x + py * u.y + pz * u.z;
        const vVal = px * v.x + py * v.y + pz * v.z;

        if (!vertices.some(vt => Math.abs(vt.u - uVal) < 1e-4 && Math.abs(vt.v - vVal) < 1e-4)) {
          vertices.push({ u: uVal, v: vVal, x3: px, y3: py, z3: pz });
        }
      }
    });

    if (vertices.length >= 3) {
      let cu = 0, cv = 0;
      vertices.forEach(vt => { cu += vt.u; cv += vt.v; });
      cu /= vertices.length;
      cv /= vertices.length;

      vertices.sort((a, b) => {
        const angleA = Math.atan2(a.v - cv, a.u - cu);
        const angleB = Math.atan2(b.v - cv, b.u - cu);
        return angleA - angleB;
      });
    }

    return vertices;
  };

  const calculatePlaneArea = (vertices) => {
    if (vertices.length < 3) return 0;
    let area = 0;
    for (let i = 0; i < vertices.length; i++) {
      const next = vertices[(i + 1) % vertices.length];
      area += (vertices[i].u * next.v - next.u * vertices[i].v);
    }
    return Math.abs(area) * 0.5 * activeParams.a * activeParams.a; // nm^2
  };

  const getIntersectingAtoms = () => {
    const { normal, u, v } = getBasisVectors();
    const lenN = Math.sqrt(h*h + k*k + l*l);
    const list = [];

    if (lenN === 0) return list;

    activeParams.atoms.forEach(atom => {
      const dLattice = (h * atom.x + k * atom.y + l * atom.z - offsetN) / lenN;
      const dNm = Math.abs(dLattice) * activeParams.a;

      if (dNm < atom.radius) {
        const px = atom.x - dLattice * normal.x;
        const py = atom.y - dLattice * normal.y;
        const pz = atom.z - dLattice * normal.z;

        const uVal = px * u.x + py * u.y + pz * u.z;
        const vVal = px * v.x + py * v.y + pz * v.z;
        const rProj = Math.sqrt(atom.radius * atom.radius - dNm * dNm);

        list.push({
          type: atom.type,
          name: atom.name,
          color: atom.color,
          u: uVal,
          v: vVal,
          r: rProj,
          dNm
        });
      }
    });

    return list;
  };

  // --- Three.js Initialization ---
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a); // slate-900

    const width = container.clientWidth;
    const height = container.clientHeight || 400;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 50);
    camera.position.set(2.8, 2.0, 3.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0.5, 0.5, 0.5);

    mountRef.current.scene = scene;
    mountRef.current.camera = camera;
    mountRef.current.renderer = renderer;
    mountRef.current.controls = controls;

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(4, 5, 3);
    scene.add(dirLight);

    // Box Wireframe
    const boxGeom = new THREE.BoxGeometry(1.0, 1.0, 1.0);
    const boxEdges = new THREE.EdgesGeometry(boxGeom);
    const boxLineMat = new THREE.LineBasicMaterial({ color: 0x475569, linewidth: 1.5 });
    const wireframe = new THREE.LineSegments(boxEdges, boxLineMat);
    wireframe.position.set(0.5, 0.5, 0.5);
    scene.add(wireframe);

    // Atom Group
    const atomGroup = new THREE.Group();
    scene.add(atomGroup);
    mountRef.current.atomGroup = atomGroup;

    // Slicing Plane Mesh
    const planeMeshMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35
    });
    const planeMesh = new THREE.Mesh(new THREE.BufferGeometry(), planeMeshMat);
    scene.add(planeMesh);
    mountRef.current.planeMesh = planeMesh;

    const planeLineMat = new THREE.LineBasicMaterial({ color: 0x06b6d4, linewidth: 2 });
    const planeLine = new THREE.LineLoop(new THREE.BufferGeometry(), planeLineMat);
    scene.add(planeLine);
    mountRef.current.planeLine = planeLine;

    let frameId;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight || 400;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    setSceneReady(true);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
          else obj.material.dispose();
        }
      });
      renderer.dispose();

      mountRef.current = {
        scene: null,
        camera: null,
        renderer: null,
        controls: null,
        atomGroup: null,
        planeMesh: null,
        planeLine: null
      };
      setSceneReady(false);
    };
  }, []);

  // --- Dynamic update of 3D atoms, slicing plane and 2D canvas ---
  useEffect(() => {
    const scene = mountRef.current.scene;
    const atomGroup = mountRef.current.atomGroup;
    const planeMesh = mountRef.current.planeMesh;
    const planeLine = mountRef.current.planeLine;

    if (!scene || !atomGroup || !planeMesh || !planeLine) return;

    // 1. Clear old atoms & recreate them for the active structure
    while (atomGroup.children.length > 0) {
      const child = atomGroup.children[0];
      child.geometry.dispose();
      child.material.dispose();
      atomGroup.remove(child);
    }

    activeParams.atoms.forEach(atom => {
      const sphereGeom = new THREE.SphereGeometry(atom.radius * 0.72, 16, 16);
      const sphereMat = new THREE.MeshStandardMaterial({
        color: atom.color,
        roughness: 0.2,
        metalness: 0.1
      });
      const mesh = new THREE.Mesh(sphereGeom, sphereMat);
      mesh.position.set(atom.x, atom.y, atom.z);
      atomGroup.add(mesh);
    });

    // 2. Re-calculate slicing plane vertices
    const polyVertices = getIntersectionPolygon();

    if (polyVertices.length >= 3) {
      planeMesh.visible = true;
      planeLine.visible = true;

      const geomPositions = [];
      const geomIndices = [];

      polyVertices.forEach(v => {
        geomPositions.push(v.x3, v.y3, v.z3);
      });

      for (let i = 1; i < polyVertices.length - 1; i++) {
        geomIndices.push(0, i, i + 1);
      }

      planeMesh.geometry.dispose();
      planeMesh.geometry = new THREE.BufferGeometry();
      planeMesh.geometry.setAttribute('position', new THREE.Float32BufferAttribute(geomPositions, 3));
      planeMesh.geometry.setIndex(geomIndices);
      planeMesh.geometry.computeVertexNormals();

      const linePositions = [];
      polyVertices.forEach(v => {
        linePositions.push(v.x3, v.y3, v.z3);
      });
      planeLine.geometry.dispose();
      planeLine.geometry = new THREE.BufferGeometry();
      planeLine.geometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    } else {
      planeMesh.visible = false;
      planeLine.visible = false;
    }

    // 3. Draw 2D projection on canvas
    draw2DPlane(polyVertices);

  }, [structure, h, k, l, offsetN, sceneReady]);

  // --- Draw the 2D Slice Canvas ---
  const draw2DPlane = (polyVertices) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cw = canvas.width;
    const ch = canvas.height;

    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, cw, ch);

    if (polyVertices.length < 3) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px Outfit, Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No plane intersection with unit cell', cw / 2, ch / 2);
      return;
    }

    let minU = Infinity, maxU = -Infinity;
    let minV = Infinity, maxV = -Infinity;

    polyVertices.forEach(v => {
      if (v.u < minU) minU = v.u;
      if (v.u > maxU) maxU = v.u;
      if (v.v < minV) minV = v.v;
      if (v.v > maxV) maxV = v.v;
    });

    const padding = 45;
    const uSpan = Math.max(maxU - minU, 0.05);
    const vSpan = Math.max(maxV - minV, 0.05);

    const scale = Math.min((cw - 2 * padding) / uSpan, (ch - 2 * padding) / vSpan);

    const uCenter = (minU + maxU) / 2;
    const vCenter = (minV + maxV) / 2;

    const toCanvasX = (uVal) => cw / 2 + (uVal - uCenter) * scale;
    const toCanvasY = (vVal) => ch / 2 - (vVal - vCenter) * scale;

    // Draw unit cell slicing boundary polygon
    ctx.beginPath();
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 3;
    polyVertices.forEach((v, idx) => {
      const cx = toCanvasX(v.u);
      const cy = toCanvasY(v.v);
      if (idx === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    });
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = 'rgba(6, 182, 212, 0.08)';
    ctx.fill();

    // Draw intersecting atom circles
    const intersectingAtoms = getIntersectingAtoms();

    intersectingAtoms.forEach(atom => {
      const cx = toCanvasX(atom.u);
      const cy = toCanvasY(atom.v);
      const pixelRadius = atom.r * (scale / activeParams.a);

      if (pixelRadius > 1.5) {
        ctx.beginPath();
        ctx.arc(cx, cy, pixelRadius, 0, 2 * Math.PI);
        // Map hex values to strings
        ctx.fillStyle = '#' + atom.color.toString(16).padStart(6, '0');
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 1.5, cy - 1.5, 3, 3);
      }
    });

    // Label vertices
    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px Outfit, Inter, sans-serif';
    ctx.textAlign = 'center';
    polyVertices.forEach(v => {
      const cx = toCanvasX(v.u);
      const cy = toCanvasY(v.v);
      const label = `(${v.x3.toFixed(1)}, ${v.y3.toFixed(1)}, ${v.z3.toFixed(1)})`;
      
      const dx = cx - cw/2;
      const dy = cy - ch/2;
      const dist = Math.sqrt(dx*dx + dy*dy) || 1;
      const lx = cx + (dx / dist) * 16;
      const ly = cy + (dy / dist) * 10 + 3;

      ctx.fillText(label, lx, ly);
    });
  };

  // Real-time calculations
  const polyVertices = getIntersectionPolygon();
  const planeArea = calculatePlaneArea(polyVertices);
  const intersectingAtoms = getIntersectingAtoms();

  // Sum area of circles
  let atomsArea = 0;
  intersectingAtoms.forEach(atom => {
    atomsArea += Math.PI * atom.r * atom.r;
  });
  const packingFraction = planeArea > 0 ? Math.min(atomsArea / planeArea, 1.0) : 0;

  const lenHkl = Math.sqrt(h*h + k*k + l*l);
  const dSpacing = lenHkl > 0 ? activeParams.a / lenHkl : 0;

  const selectPreset = (ph, pk, pl, pN) => {
    setH(ph);
    setK(pk);
    setL(pl);
    setOffsetN(pN);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <button className="back-btn" onClick={onBack}>
          ← Back to Labs
        </button>
        <div className="header-title-row">
          <span className="logo-icon">📐</span>
          <h1>Planar Density Lab</h1>
        </div>
        <p className="header-subtitle">Analyze Packing Factors and Miller Plane Intersections</p>
      </header>

      <main className="app-content">
        {/* Left Column: 3D view and 2D Projection view */}
        <div className="left-column" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* 3D Visualizer */}
          <div className="viewer-card card" style={{ height: '340px' }}>
            <h3 style={{ position: 'absolute', top: '12px', left: '16px', zIndex: 1 }}>3D Unit Cell ({activeParams.name})</h3>
            <div ref={containerRef} style={{ width: '100%', height: '100%', borderRadius: '12px', overflow: 'hidden' }} />
            <div className="axes-legend" style={{ zIndex: 1, flexWrap: 'wrap' }}>
              {activeParams.legends.map((leg) => (
                <div key={leg.name} style={{ display: 'flex', alignItems: 'center', marginRight: '12px', gap: '6px' }}>
                  <span className="legend-dot" style={{ background: leg.color }}></span>
                  <span style={{ fontSize: '0.72rem' }}>{leg.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 2D Projection Canvas */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <h3>2D Projection Plane (Cross-Section)</h3>
            <p className="subtitle">Projected atomic boundary intersections on the plane coordinate system.</p>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px' }}>
              <canvas ref={canvasRef} width="420" height="260" style={{ maxWidth: '100%', background: '#090d16', borderRadius: '8px', border: '1px solid var(--panel-border)' }} />
            </div>
          </div>

        </div>

        {/* Right Column: Parameters and stats */}
        <div className="right-column">
          
          {/* Structure Selector */}
          <div className="card" style={{ padding: '16px 20px' }}>
            <label className="index-label" style={{ display: 'block', marginBottom: '4px' }}>Choose Crystal Structure:</label>
            <select 
              className="structure-select"
              value={structure}
              onChange={(e) => {
                setStructure(e.target.value);
                setOffsetN(0.0); // Reset slice offset
              }}
            >
              <option value="nacl">Rock Salt (NaCl)</option>
              <option value="zns">Zinc Blende (ZnS)</option>
              <option value="caf2">Fluorite (CaF₂)</option>
              <option value="batio3">Perovskite (BaTiO₃)</option>
            </select>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: '1.4' }}>
              {activeParams.formulaDesc}
            </p>
          </div>

          {/* Controls Card */}
          <div className="control-panel card">
            <h3>Miller Plane Parameters</h3>
            <p className="section-desc">Specify indices (hkl) and shift normal offset (N).</p>

            <div className="section">
              <span className="index-label">Miller Indices (h k l)</span>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>h</label>
                  <input
                    type="number"
                    value={h}
                    onChange={(e) => setH(parseInt(e.target.value) || 0)}
                    style={{ width: '100%', textAlign: 'center', padding: '6px', fontSize: '1.0rem' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>k</label>
                  <input
                    type="number"
                    value={k}
                    onChange={(e) => setK(parseInt(e.target.value) || 0)}
                    style={{ width: '100%', textAlign: 'center', padding: '6px', fontSize: '1.0rem' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>l</label>
                  <input
                    type="number"
                    value={l}
                    onChange={(e) => setL(parseInt(e.target.value) || 0)}
                    style={{ width: '100%', textAlign: 'center', padding: '6px', fontSize: '1.0rem' }}
                  />
                </div>
              </div>
            </div>

            <div className="section">
              <div className="index-row">
                <span className="index-label">Plane Normal Offset (N)</span>
                <span className="index-value" style={{ color: '#06b6d4' }}>N = {offsetN.toFixed(2)}</span>
              </div>
              <p className="helper-text" style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                Equation: {h}x + {k}y + {l}z = {offsetN.toFixed(2)}
              </p>
              <input
                type="range"
                min="0.0"
                max={Math.max(Math.abs(h) + Math.abs(k) + Math.abs(l), 1.0)}
                step="0.02"
                value={offsetN}
                onChange={(e) => setOffsetN(parseFloat(e.target.value))}
                style={{ width: '100%', margin: '12px 0 6px 0' }}
              />
            </div>

            <div className="section" style={{ border: 'none', padding: 0 }}>
              <span className="index-label">Crystallographic Preset Planes:</span>
              <div className="preset-buttons" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginTop: '8px' }}>
                <button className="preset-btn" onClick={() => selectPreset(1, 0, 0, 0.0)}>
                  (1 0 0) Face
                </button>
                <button className="preset-btn" onClick={() => selectPreset(1, 0, 0, 0.5)}>
                  (1 0 0) Mid
                </button>
                <button className="preset-btn" onClick={() => selectPreset(1, 1, 0, 0.5)}>
                  (1 1 0) plane
                </button>
                <button className="preset-btn" onClick={() => selectPreset(1, 1, 1, 0.5)}>
                  (1 1 1) plane
                </button>
                <button className="preset-btn" onClick={() => selectPreset(1, 1, 1, 0.0)}>
                  (1 1 1) Corner
                </button>
                <button className="preset-btn" onClick={() => selectPreset(2, 1, 0, 0.4)}>
                  (2 1 0) plane
                </button>
              </div>
            </div>
          </div>

          {/* Plane Density Output Card */}
          <div className="card">
            <h3>Planar Density Statistics</h3>
            <p className="subtitle">Calculated packaging factors for the active intersection slice.</p>
            
            <div className="math-block" style={{ marginTop: '12px', fontSize: '0.82rem', lineHeight: '1.7' }}>
              • Lattice Parameter (a): <strong>{activeParams.a.toFixed(3)} nm</strong><br />
              • Interplanar Spacing (d<sub>hkl</sub>): <strong>{dSpacing.toFixed(3)} nm</strong><br />
              • Plane Area inside Cell: <strong>{planeArea.toFixed(3)} nm<sup>2</sup></strong><br />
              • Intersecting Atoms Count: <strong>{intersectingAtoms.length}</strong><br />
              • Projective Packing Fraction: <strong>{(packingFraction * 100).toFixed(1)}%</strong>
            </div>

            <p style={{ fontSize: '0.75rem', marginTop: '8px', lineHeight: '1.4', color: 'var(--text-secondary)' }}>
              *Note: The **Projective Packing Fraction** sums the area of the projected circular intersection slices of the atoms (sum of π × r²) and divides it by the cross-sectional plane area inside the cell.
            </p>
          </div>

        </div>
      </main>

      {/* Educational Tutorial Card */}
      <section className="math-explanation card" style={{ marginTop: '24px', width: '100%' }}>
        <h3>Crystallographic Planar Densities & Lattice Structures</h3>
        <p className="subtitle">Understanding Miller index slicing and area packing calculations across crystal structures.</p>
        <div className="steps-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          
          <div>
            <h4>1. Crystal System Geometries</h4>
            <p style={{ fontSize: '0.85rem', lineHeight: '1.5' }}>
              This lab features four critical engineering structures:
              <br /><br />
              • <strong>Rock Salt (NaCl):</strong> Interpenetrating FCC lattices shifted by a/2. Octahedral coordination.
              <br />
              • <strong>Zinc Blende (ZnS):</strong> Interpenetrating FCC lattices shifted by a/4. Tetrahedral coordination.
              <br />
              • <strong>Fluorite (CaF₂):</strong> FCC Calcium lattice with Fluorine filling all 8 tetrahedral sites.
              <br />
              • <strong>Perovskite (BaTiO₃):</strong> Multi-element cubic cell. High-temperature ferroelectric phase.
            </p>
          </div>

          <div>
            <h4>2. Slicing Plane Math</h4>
            <p style={{ fontSize: '0.85rem', lineHeight: '1.5' }}>
              The slicing plane is defined by the equation <code>hx + ky + lz = N</code>.
              <br /><br />
              As you switch structures and change Miller indices, the interplanar spacing changes. Because Perovskite has a smaller lattice constant (a = 0.401 nm) than Rock Salt (a = 0.564 nm), its cross-sectional plane areas and spacing are tighter, demonstrating atomic scaling.
            </p>
          </div>

          <div>
            <h4>3. Physical Packing Densities</h4>
            <p style={{ fontSize: '0.85rem', lineHeight: '1.5' }}>
              Textbook planar densities count atoms centered exactly on the plane (d = 0).
              <br /><br />
              In this simulator, we evaluate the **Real Physical Packing Fraction**: the actual area covered by the spherical volumes of atoms slicing through. Slide the offset (N) to watch the projected circles grow, shrink, and disappear as the slicing plane sweeps past them.
            </p>
          </div>

        </div>
      </section>

      <footer className="app-footer">
        <p>&copy; {new Date().getFullYear()} Crystallography & Materials Science Lab Tool. Designed with Node, Three.js & HTML5 Canvas.</p>
      </footer>
    </div>
  );
}
