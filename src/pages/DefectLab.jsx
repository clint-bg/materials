import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// Conceptual quiz questions
const CONCEPTUAL_QUESTIONS = [
  {
    question: "What thermodynamic factor determines the equilibrium concentration of vacancies in a crystal at a given temperature?",
    options: [
      "The rate of plastic deformation",
      "The enthalpy of vacancy formation and thermal energy (kT)",
      "The density of dislocations in the material",
      "The external applied shear stress"
    ],
    answer: 1,
    explanation: "Vacancies are thermodynamic defects. Their equilibrium concentration is governed by the Arrhenius relation: Nv/N = exp(-Qv / kT), where Qv is the vacancy formation activation energy, T is temperature, and k is the Boltzmann constant."
  },
  {
    question: "An extra half-plane of atoms inserted into a crystal lattice describes what type of defect?",
    options: [
      "Screw Dislocation",
      "Vacancy",
      "Edge Dislocation",
      "Substitutional Impurity"
    ],
    answer: 2,
    explanation: "An edge dislocation is a line defect characterized by an extra half-plane of atoms terminating at the slip plane. It creates local compression above the dislocation line and tension below it."
  },
  {
    question: "The vector that defines the magnitude and direction of the lattice distortion of a dislocation is called the:",
    options: [
      "Bravais vector",
      "Burgers vector",
      "Miller vector",
      "Slip vector"
    ],
    answer: 1,
    explanation: "The Burgers vector (b) defines both the magnitude and direction of the lattice distortion associated with a dislocation. For an edge dislocation, b is perpendicular to the dislocation line."
  },
  {
    question: "When a small Carbon atom occupies the space between larger Iron atoms in a steel lattice, it is classified as a:",
    options: [
      "Substitutional Impurity",
      "Self-Interstitial",
      "Interstitial Impurity",
      "Frenkel Defect"
    ],
    answer: 2,
    explanation: "Small solute atoms (like Carbon, Hydrogen, or Nitrogen) that dissolve into the empty spaces between larger host atoms (like Iron) form interstitial solid solutions and are called interstitial impurities."
  },
  {
    question: "How do edge dislocations facilitate plastic deformation in metals?",
    options: [
      "By allowing atoms to diffuse rapidly through vacancies",
      "By sliding along specific planes (slip planes) under shear stress",
      "By locking the atoms into a rigid amorphous configuration",
      "By generating heat that melts the surrounding lattice"
    ],
    answer: 1,
    explanation: "Dislocations move along slip planes when a shear stress is applied. This motion (dislocation slip or glide) allows planes of atoms to slide over each other at much lower stresses than would be required to slide perfect planes, enabling ductile plastic deformation."
  },
  {
    question: "Which type of dislocation is characterized by a displacement field that is parallel to the dislocation line, forming a helical spiral ramp of atoms?",
    options: [
      "Edge Dislocation",
      "Screw Dislocation",
      "Mixed Dislocation",
      "Frank-Read Source"
    ],
    answer: 1,
    explanation: "A screw dislocation is created by applying a shear stress that skews the lattice planes. The Burgers vector is parallel to the dislocation line, forming a spiral ramp of atoms around the core."
  }
];

const DEFECT_TYPES = [
  { id: 'none', name: 'Perfect Crystal', desc: 'No defects. Standard periodic lattice arrangement.' },
  { id: 'vacancy', name: 'Vacancy (Point Defect)', desc: 'An atom is missing from its normal lattice site, causing surrounding atoms to relax inwards.' },
  { id: 'interstitial', name: 'Self-Interstitial (Point Defect)', desc: 'An extra host atom occupies a space between normal lattice sites, crowding the surrounding atoms outwards.' },
  { id: 'substitutional_large', name: 'Large Substitutional Impurity', desc: 'A host atom is replaced by a larger solute atom (green), causing outward lattice strain.' },
  { id: 'substitutional_small', name: 'Small Substitutional Impurity', desc: 'A host atom is replaced by a smaller solute atom (green), causing inward lattice strain.' },
  { id: 'interstitial_impurity', name: 'Interstitial Impurity', desc: 'A small foreign atom (orange) sits in the interstitial spaces, distorting local atomic bonds.' },
  { id: 'edge_dislocation', name: 'Edge Dislocation (Line Defect)', desc: 'An extra half-plane of atoms terminates in the crystal, causing local compression and tension.' },
  { id: 'screw_dislocation', name: 'Screw Dislocation (Line Defect)', desc: 'Shear stress deforms planes into a spiral ramp along the dislocation line.' }
];

export default function DefectLab({ onBack }) {
  const [mode, setMode] = useState('explore'); // 'explore' | 'quiz'
  const [defectType, setDefectType] = useState('none');
  const [strain, setStrain] = useState(1.0); // Strain magnitude slider
  const [showBonds, setShowBonds] = useState(true);
  const [sceneReady, setSceneReady] = useState(false);

  // Quiz state
  const [quizState, setQuizState] = useState({
    quizType: 0, // 0: Identify Defect, 1: Conceptual Question
    score: 0,
    attempts: 0,
    streak: 0,
    checked: false,
    isCorrect: false,
    targetDefect: 'none',
    activeConceptQuestion: CONCEPTUAL_QUESTIONS[0],
    studentGuessIndex: null, // For conceptual MCQ
    studentGuessDefect: '',   // For defect MCQ
    hintLevel: 0
  });

  const containerRef = useRef(null);
  const mountRef = useRef({
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    atomGroup: null,
    bondGroup: null,
    atomMeshes: [],
    bondLines: null
  });

  // Grid dimensions
  const Nx = 6;
  const Ny = 6;
  const Nz = 3;

  // Generate perfect lattice coordinates
  const perfectLattice = [];
  const bonds = [];

  for (let x = 0; x < Nx; x++) {
    for (let y = 0; y < Ny; y++) {
      for (let z = 0; z < Nz; z++) {
        perfectLattice.push({
          x: x - (Nx - 1) / 2, // Centered around 0
          y: y - (Ny - 1) / 2,
          z: z - (Nz - 1) / 2,
          ix: x,
          iy: y,
          iz: z
        });
      }
    }
  }

  // Pre-calculate adjacent connections (bonds)
  const getIndex = (x, y, z) => x * Ny * Nz + y * Nz + z;

  for (let x = 0; x < Nx; x++) {
    for (let y = 0; y < Ny; y++) {
      for (let z = 0; z < Nz; z++) {
        const idx = getIndex(x, y, z);
        if (x < Nx - 1) bonds.push({ a: idx, b: getIndex(x + 1, y, z) });
        if (y < Ny - 1) bonds.push({ a: idx, b: getIndex(x, y + 1, z) });
        if (z < Nz - 1) bonds.push({ a: idx, b: getIndex(x, y, z + 1) });
      }
    }
  }

  // --- Calculate deformed positions based on active defect ---
  const getDeformedPositions = (activeDefect, strainVal) => {
    const defectCenter = { x: 0.5, y: 0.5, z: 0.0 }; // Index (3, 3, 1) centered coordinate
    const positions = [];

    perfectLattice.forEach((atom, idx) => {
      let px = atom.x;
      let py = atom.y;
      let pz = atom.z;

      const dx = px - defectCenter.x;
      const dy = py - defectCenter.y;
      const dz = pz - defectCenter.z;
      const r = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (activeDefect === 'vacancy') {
        // Neighbors relax inwards towards the vacancy (at index 3, 3, 1)
        if (r > 0) {
          const factor = strainVal * 0.12 / (r * r * r);
          px -= dx * factor;
          py -= dy * factor;
          pz -= dz * factor;
        }
      } 
      else if (activeDefect === 'interstitial' || activeDefect === 'interstitial_impurity') {
        // Neighbors relax outwards from the interstitial atom placed at (0, 0, 0)
        const rx = px - 0.0;
        const ry = py - 0.0;
        const rz = pz - 0.0;
        const dist = Math.sqrt(rx * rx + ry * ry + rz * rz);
        if (dist > 0) {
          const factor = strainVal * 0.15 / (dist * dist * dist);
          px += rx * factor;
          py += ry * factor;
          pz += rz * factor;
        }
      } 
      else if (activeDefect === 'substitutional_large') {
        // Large substitutional impurity: neighbors relax outwards
        if (r > 0) {
          const factor = strainVal * 0.12 / (r * r * r);
          px += dx * factor;
          py += dy * factor;
          pz += dz * factor;
        }
      } 
      else if (activeDefect === 'substitutional_small') {
        // Small substitutional impurity: neighbors relax inwards
        if (r > 0) {
          const factor = strainVal * 0.10 / (r * r * r);
          px -= dx * factor;
          py -= dy * factor;
          pz -= dz * factor;
        }
      } 
      else if (activeDefect === 'edge_dislocation') {
        // Edge dislocation displacement fields along Z axis (slip plane is y = 0)
        // We use the continuous elastic deformation fields
        const xDis = 0.0;
        const yDis = 0.0;
        
        const rx = px - xDis;
        const ry = py - yDis;
        const dist = Math.sqrt(rx * rx + ry * ry);
        const angle = Math.atan2(ry, rx);

        if (dist > 0.1) {
          // Horizontal compression above core, tension below core
          // Vertical skewing around core
          const ux = -0.32 * strainVal * Math.sin(angle) / (dist + 0.3);
          const uy = 0.16 * strainVal * Math.cos(angle) / (dist + 0.3);
          px += ux;
          py += uy;
        }
      }
      else if (activeDefect === 'screw_dislocation') {
        // Screw dislocation displacement field along Z axis (helical spiral)
        const rx = px - 0.0;
        const ry = py - 0.0;
        const angle = Math.atan2(ry, rx); // from -PI to PI
        
        // Burgers vector parallel to Z axis.
        // Coordinate pz shifts proportional to polar angle to make a spiral ramp.
        const uz = strainVal * 0.45 * (angle / (2 * Math.PI));
        pz += uz;
      }

      positions.push([px, py, pz]);
    });

    return positions;
  };

  // --- Quiz Functions ---
  const generateNewQuestion = () => {
    const isConcept = Math.random() < 0.5;

    if (isConcept) {
      // Pick a random conceptual question
      let nextQ = quizState.activeConceptQuestion;
      while (nextQ.question === quizState.activeConceptQuestion.question) {
        nextQ = CONCEPTUAL_QUESTIONS[Math.floor(Math.random() * CONCEPTUAL_QUESTIONS.length)];
      }

      setQuizState((prev) => ({
        ...prev,
        quizType: 1,
        activeConceptQuestion: nextQ,
        studentGuessIndex: null,
        checked: false,
        isCorrect: false,
        hintLevel: 0
      }));
    } else {
      // Pick a random defect type (excluding 'none')
      const defectPool = ['vacancy', 'interstitial', 'substitutional_large', 'substitutional_small', 'interstitial_impurity', 'edge_dislocation', 'screw_dislocation'];
      const nextDefect = defectPool[Math.floor(Math.random() * defectPool.length)];

      setQuizState((prev) => ({
        ...prev,
        quizType: 0,
        targetDefect: nextDefect,
        studentGuessDefect: '',
        checked: false,
        isCorrect: false,
        hintLevel: 0
      }));

      // Render the target defect on canvas
      setDefectType(nextDefect);
      setStrain(1.2); // Set clearly visible strain
    }
  };

  const handleSelectConceptGuess = (idx) => {
    if (quizState.checked) return;
    setQuizState(prev => ({ ...prev, studentGuessIndex: idx }));
  };

  const handleSelectDefectGuess = (id) => {
    if (quizState.checked) return;
    setQuizState(prev => ({ ...prev, studentGuessDefect: id }));
  };

  const handleCheckQuizAnswer = () => {
    let isCorrect = false;
    if (quizState.quizType === 0) {
      // Defect Identification MCQ
      isCorrect = quizState.studentGuessDefect === quizState.targetDefect;
    } else {
      // Conceptual MCQ
      isCorrect = quizState.studentGuessIndex === quizState.activeConceptQuestion.answer;
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
    if (newMode === 'quiz') {
      generateNewQuestion();
    } else {
      setDefectType('none');
      setStrain(1.0);
    }
  };

  // --- Three.js Initialization ---
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Setup Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a); // slate-900

    const width = container.clientWidth;
    const height = container.clientHeight || 400;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 50);
    camera.position.set(5.5, 4.0, 7.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 2. Setup Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0, 0);

    mountRef.current.scene = scene;
    mountRef.current.camera = camera;
    mountRef.current.renderer = renderer;
    mountRef.current.controls = controls;

    // 3. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight1.position.set(6, 8, 5);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x3b82f6, 0.3); // Blue light
    dirLight2.position.set(-6, 2, -2);
    scene.add(dirLight2);

    // Coordinate Axes
    const createAxisLine = (endPoint, color) => {
      const geom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), endPoint]);
      const mat = new THREE.LineBasicMaterial({ color, linewidth: 2 });
      scene.add(new THREE.Line(geom, mat));
    };
    createAxisLine(new THREE.Vector3(3.2, 0, 0), 0xef4444); // X
    createAxisLine(new THREE.Vector3(0, 3.2, 0), 0x22c55e); // Y
    createAxisLine(new THREE.Vector3(0, 0, 1.8), 0x3b82f6); // Z

    // 4. Atom Mesh Instantiation
    const atomGroup = new THREE.Group();
    scene.add(atomGroup);
    mountRef.current.atomGroup = atomGroup;

    // Instantiate sphere geometries for atoms
    const sphereGeom = new THREE.SphereGeometry(0.24, 16, 16);
    const atomMeshes = [];

    perfectLattice.forEach((atom, idx) => {
      const mat = new THREE.MeshStandardMaterial({
        color: 0x64748b, // corner slate atoms
        roughness: 0.15,
        metalness: 0.05
      });
      const mesh = new THREE.Mesh(sphereGeom, mat);
      atomGroup.add(mesh);
      atomMeshes.push(mesh);
    });
    mountRef.current.atomMeshes = atomMeshes;

    // 5. Interstitial extra atoms (will be hidden/shown conditionally)
    const extraGeom = new THREE.SphereGeometry(0.24, 16, 16);
    const extraMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b, // amber self-interstitial
      roughness: 0.15
    });
    const extraAtomMesh = new THREE.Mesh(extraGeom, extraMat);
    scene.add(extraAtomMesh);
    mountRef.current.extraAtomMesh = extraAtomMesh;

    // 6. Bond Line Setup
    const bondGroup = new THREE.Group();
    scene.add(bondGroup);
    mountRef.current.bondGroup = bondGroup;

    const lineGeom = new THREE.BufferGeometry();
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x475569, // slate-600
      linewidth: 1.5,
      transparent: true,
      opacity: 0.4
    });
    const bondLines = new THREE.LineSegments(lineGeom, lineMat);
    bondGroup.add(bondLines);
    mountRef.current.bondLines = bondLines;

    // 7. Animation Loop
    let frameId;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 8. Resize Handler
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

      // Clear mount references to prevent crash on remount
      mountRef.current = {
        scene: null,
        camera: null,
        renderer: null,
        controls: null,
        atomGroup: null,
        bondGroup: null,
        atomMeshes: [],
        bondLines: null
      };
      setSceneReady(false);
    };
  }, []);

  // Update atom coordinates, colors, and bonds dynamically
  useEffect(() => {
    const scene = mountRef.current.scene;
    const atomMeshes = mountRef.current.atomMeshes;
    const bondLines = mountRef.current.bondLines;
    const extraAtomMesh = mountRef.current.extraAtomMesh;
    if (!scene || !atomMeshes || atomMeshes.length === 0 || !bondLines || !extraAtomMesh) return;

    // 1. Calculate Deformed Positions
    const deformedPositions = getDeformedPositions(defectType, strain);

    // 2. Hide vacancy atom or show substitute impurity
    const vacancyIndex = getIndex(3, 3, 1);

    perfectLattice.forEach((atom, idx) => {
      const mesh = atomMeshes[idx];
      const pos = deformedPositions[idx];
      
      mesh.position.set(pos[0], pos[1], pos[2]);
      mesh.visible = true;
      mesh.scale.set(1.0, 1.0, 1.0);

      // Default slate-600 color
      mesh.material.color.setHex(0x64748b);
      mesh.material.opacity = 1.0;
      mesh.material.transparent = false;

      if (defectType === 'vacancy' && idx === vacancyIndex) {
        // Hide missing atom in vacancy
        mesh.visible = false;
      }
      else if (defectType === 'substitutional_large' && idx === vacancyIndex) {
        // Solute atom is larger and green
        mesh.scale.set(1.35, 1.35, 1.35);
        mesh.material.color.setHex(0x22c55e); // Green
      }
      else if (defectType === 'substitutional_small' && idx === vacancyIndex) {
        // Solute atom is smaller and green
        mesh.scale.set(0.65, 0.65, 0.65);
        mesh.material.color.setHex(0x22c55e);
      }
    });

    // 3. Render extra interstitial atoms
    if (defectType === 'interstitial') {
      extraAtomMesh.position.set(0.0, 0.0, 0.0); // Center interstitial
      extraAtomMesh.scale.set(1.0, 1.0, 1.0);
      extraAtomMesh.material.color.setHex(0xf59e0b); // Host atom color (Amber)
      extraAtomMesh.visible = true;
    } 
    else if (defectType === 'interstitial_impurity') {
      extraAtomMesh.position.set(0.0, 0.0, 0.0);
      extraAtomMesh.scale.set(0.6, 0.6, 0.6); // Small interstitial
      extraAtomMesh.material.color.setHex(0xf97316); // Impurity color (Orange)
      extraAtomMesh.visible = true;
    } 
    else {
      extraAtomMesh.visible = false;
    }

    // 4. Draw/Update Bonds (lines connecting atoms)
    if (showBonds) {
      bondLines.visible = true;
      const linePositions = [];

      bonds.forEach((bond) => {
        // If a vacancy is active, remove bonds extending to/from the vacancy
        if (defectType === 'vacancy' && (bond.a === vacancyIndex || bond.b === vacancyIndex)) {
          return;
        }

        const p1 = deformedPositions[bond.a];
        const p2 = deformedPositions[bond.b];
        linePositions.push(...p1);
        linePositions.push(...p2);
      });

      bondLines.geometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
      bondLines.geometry.attributes.position.needsUpdate = true;
    } else {
      bondLines.visible = false;
    }

  }, [defectType, strain, showBonds, sceneReady]);

  // Quiz hints renderer
  const renderQuizHints = () => {
    if (quizState.hintLevel === 0) return null;

    return (
      <div className="hint-card">
        <h4>Hint:</h4>
        {quizState.quizType === 0 ? (
          // Defect ID MCQ hints
          <>
            {quizState.hintLevel >= 1 && (
              <p>
                1. Look closely at the center of the lattice grid. Rotate the camera to see if an atom is missing, or replaced by a foreign green/orange one.
              </p>
            )}
            {quizState.hintLevel >= 2 && (
              <p>
                2. If the planes of atoms buckle heavily down a line in the middle, it's a <strong>Line Defect (Edge Dislocation)</strong>. If a small orange atom sits in a gap, it is an <strong>interstitial impurity</strong>.
              </p>
            )}
          </>
        ) : (
          // Conceptual MCQ hints
          <>
            <p>{quizState.activeConceptQuestion.explanation.slice(0, 100)}...</p>
          </>
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
          <span className="logo-icon">🔬</span>
          <h1>Lattice Defects Visualizer</h1>
        </div>
        <p className="header-subtitle">Interact with Point and Line Deformations in 3D</p>
      </header>

      <main className="app-content">
        {/* Left Column: 3D Canvas & General Info */}
        <div className="left-column">
          <div className="viewer-card card" style={{ height: '400px' }}>
            <div ref={containerRef} style={{ width: '100%', height: '100%', borderRadius: '12px', overflow: 'hidden' }} />
            <div className="axes-legend">
              <span className="axis-badge axis-x">X Axis</span>
              <span className="axis-badge axis-y">Y Axis</span>
              <span className="axis-badge axis-z">Z Axis (Core Line)</span>
            </div>
          </div>

          {/* Controls Toggle bar */}
          <div className="card" style={{ padding: '16px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Lattice Visual Settings</h3>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                <input
                  type="checkbox"
                  checked={showBonds}
                  onChange={(e) => setShowBonds(e.target.checked)}
                />
                Show Atomic Bonds (Grid Wireframe)
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Sidebar Panel */}
        <div className="right-column">
          {/* Mode Tabs */}
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
            /* --- EXPLORE INTERFACE --- */
            <>
              <div className="control-panel card">
                <h3>Select Defect Configuration</h3>
                <p className="section-desc">Observe atomic displacement and strain fields in real time.</p>
                
                <div className="lattice-selector" style={{ gap: '8px' }}>
                  {DEFECT_TYPES.map((defect) => (
                    <button
                      key={defect.id}
                      className={`lattice-btn ${defectType === defect.id ? 'active' : ''}`}
                      onClick={() => setDefectType(defect.id)}
                      style={{ padding: '10px 14px' }}
                    >
                      <div className="lattice-btn-name">{defect.name}</div>
                      <div className="lattice-btn-desc" style={{ fontSize: '0.72rem' }}>{defect.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="card">
                <h3>Defect Strain Amplitude</h3>
                <p className="subtitle">Exaggerate the lattice distortion coordinate offsets.</p>
                <input
                  type="range"
                  min="0.2"
                  max="2.5"
                  step="0.05"
                  value={strain}
                  disabled={defectType === 'none'}
                  onChange={(e) => setStrain(parseFloat(e.target.value))}
                  style={{ width: '100%' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '6px', color: 'var(--text-secondary)' }}>
                  <span>Low Strain</span>
                  <span>Exaggerated Distortion</span>
                </div>
              </div>
            </>
          ) : (
            /* --- QUIZ INTERFACE --- */
            <>
              <div className="control-panel card">
                <div className="quiz-header" style={{ marginBottom: '8px' }}>
                  <h3>Lattice Defects Quiz</h3>
                  <div className="quiz-stats">
                    <span className="stat-badge">Score: {quizState.score}/{quizState.attempts}</span>
                    <span className="stat-badge streak">Streak: {quizState.streak} 🔥</span>
                  </div>
                </div>

                <div className="quiz-body">
                  {/* Point/Line ID Challenge */}
                  {quizState.quizType === 0 && (
                    <div>
                      <p className="instruction">
                        <strong>Identification Task:</strong> Inspect the 3D grid and identify the crystal defect currently rendered in the cell.
                      </p>

                      <div className="mcq-options" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                        {DEFECT_TYPES.filter(d => d.id !== 'none').map((defect) => {
                          const isSelected = quizState.studentGuessDefect === defect.id;
                          return (
                            <button
                              key={defect.id}
                              className={`opt-btn ${isSelected ? 'selected' : ''}`}
                              onClick={() => handleSelectDefectGuess(defect.id)}
                              disabled={quizState.checked}
                              style={{ textAlign: 'left', padding: '10px 14px', width: '100%', display: 'block' }}
                            >
                              {defect.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Conceptual Challenge */}
                  {quizState.quizType === 1 && (
                    <div>
                      <p className="instruction">
                        <strong>Concept Challenge:</strong> {quizState.activeConceptQuestion.question}
                      </p>

                      <div className="mcq-options" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                        {quizState.activeConceptQuestion.options.map((option, idx) => {
                          const isSelected = quizState.studentGuessIndex === idx;
                          return (
                            <button
                              key={idx}
                              className={`opt-btn ${isSelected ? 'selected' : ''}`}
                              onClick={() => handleSelectConceptGuess(idx)}
                              disabled={quizState.checked}
                              style={{ textAlign: 'left', padding: '10px 14px', width: '100%', display: 'block' }}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Verification Button */}
                  {!quizState.checked && (
                    <button
                      onClick={handleCheckQuizAnswer}
                      className="submit-btn"
                      disabled={quizState.quizType === 0 ? !quizState.studentGuessDefect : quizState.studentGuessIndex === null}
                      style={{ width: '100%', marginTop: '16px' }}
                    >
                      Verify Answer
                    </button>
                  )}

                  {/* Feedback Alert Card */}
                  {quizState.checked && (
                    <div className={`feedback-alert ${quizState.isCorrect ? 'correct' : 'incorrect'}`} style={{ marginTop: '16px' }}>
                      <div className="feedback-title">
                        {quizState.isCorrect ? '✨ Correct! Excellent job!' : '❌ Incorrect. Keep studying!'}
                      </div>
                      <p className="feedback-detail" style={{ fontSize: '0.8rem', lineHeight: '1.4' }}>
                        {quizState.quizType === 0 
                          ? `The defect was the ${DEFECT_TYPES.find(d => d.id === quizState.targetDefect).name}.`
                          : quizState.activeConceptQuestion.explanation
                        }
                      </p>
                      
                      <div className="feedback-actions">
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
            </>
          )}
        </div>
      </main>

      {/* Educational Tutorial Card */}
      <section className="math-explanation card" style={{ marginTop: '24px', width: '100%' }}>
        <h3>Crystal Defects and Materials Strengthening</h3>
        <p className="subtitle">How microscopic defects govern macro-mechanical properties.</p>
        <div className="steps-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          <div>
            <h4>1. Point Defects & Diffusion</h4>
            <p style={{ fontSize: '0.85rem', lineHeight: '1.5' }}>
              Point defects consist of local disruptions to the periodic arrangement.
              <br /><br />
              • <strong>Vacancies</strong> allow atoms to jump from site to site, enabling mass transport (solid-state diffusion) which governs processes like carburizing or grain growth.
              <br />
              • <strong>Interstitial Impurities</strong> (like Carbon in Iron) sit in interstitial voids, creating local strain fields that block dislocation slip, creating steel.
            </p>
          </div>

          <div>
            <h4>2. Line Defects (Dislocations)</h4>
            <p style={{ fontSize: '0.85rem', lineHeight: '1.5' }}>
              Dislocations are line defects whose motion constitutes <strong>plastic (permanent) deformation</strong>.
              <br /><br />
              Instead of shearing a whole plane of atoms simultaneously (which requires immense stress), metals deform by gliding dislocations one column at a time. Work hardening occurs when dislocations multiply and tangle with each other, blocking further slip.
            </p>
          </div>

          <div>
            <h4>3. Strengthening Mechanisms</h4>
            <p style={{ fontSize: '0.85rem', lineHeight: '1.5' }}>
              Materials engineers strengthen metals by blocking the glide of dislocations:
              <br /><br />
              • <strong>Solid Solution Strengthening:</strong> Adding substitutional or interstitial solute atoms creates local stress fields that pin dislocations.
              <br />
              • <strong>Grain Boundary Strengthening:</strong> Refining grain sizes introduces more boundaries, which act as barriers to dislocation glide.
            </p>
          </div>
        </div>
      </section>

      <footer className="app-footer">
        <p>&copy; {new Date().getFullYear()} Crystallography & Materials Science Lab Tool. Designed with Node & Three.js.</p>
      </footer>
    </div>
  );
}
