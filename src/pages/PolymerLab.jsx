import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export default function PolymerLab({ onBack }) {
  const [mode, setMode] = useState('explore'); // 'explore' | 'quiz'
  const [polymerType, setPolymerType] = useState('linear'); // 'linear' | 'branched' | 'networked'
  const [crystallinity, setCrystallinity] = useState(40); // 0% to 100% (Linear/Branched only)
  const [branchingDensity, setBranchingDensity] = useState(2); // 1 to 5 (Branched only)
  const [crosslinkDensity, setCrosslinkDensity] = useState(4); // 2 to 8 (Networked only)
  const [tensileStress, setTensileStress] = useState(0.0); // 0.0 to 2.5
  
  const [sceneReady, setSceneReady] = useState(false);
  const containerRef = useRef(null);
  
  const mountRef = useRef({
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    polymerGroup: null
  });

  // Quiz state
  const [quizState, setQuizState] = useState({
    currentQuestionIndex: 0,
    selectedOption: null,
    isAnswered: false,
    score: 0,
    attempts: 0,
    showAnswer: false
  });

  // Define practice quiz questions
  const quizQuestions = [
    {
      question: "Which molecular architecture is most likely to exhibit the highest degree of crystallinity?",
      options: [
        "Highly branched polymers (e.g., LDPE)",
        "Linear polymers with simple repeat units (e.g., HDPE)",
        "Cross-linked network polymers (e.g., vulcanized rubber)",
        "Random graft copolymers"
      ],
      correctAnswer: 1,
      explanation: "Linear chains with simple, symmetrical backbones can easily pack close together in highly ordered parallel arrays (crystalline regions). Side branches prevent close packing, and networks are permanently rigid and amorphous."
    },
    {
      question: "How does increasing the branching density affect the physical properties of a thermoplastic?",
      options: [
        "Increases density and increases tensile strength",
        "Increases crystallinity and increases melting point",
        "Decreases density, decreases crystallinity, and decreases strength",
        "Has no effect on mechanical or physical properties"
      ],
      correctAnswer: 2,
      explanation: "Branches create steric hindrance, preventing the polymer backbones from packing closely together. This reduces both the density and the crystallinity, making the polymer softer and weaker (e.g., LDPE vs HDPE)."
    },
    {
      question: "Vulcanization is a chemical process that alters polymer properties by doing what?",
      options: [
        "Breaking linear chains into shorter monomers",
        "Adding side branches to convert linear structures to branched ones",
        "Creating sulfur cross-links between polymer chains to form a network",
        "Aligning polymer chains to achieve 100% crystallinity"
      ],
      correctAnswer: 3,
      explanation: "Vulcanization introduces sulfur cross-links between linear rubber chains (polyisoprene). This prevents the chains from sliding past each other, turning a sticky thermoplastic into a highly elastic, cross-linked thermoset/elastomer."
    },
    {
      question: "Under applied tensile stress, how do linear polymer chains in the amorphous region behave?",
      options: [
        "They slide and align parallel to the direction of stress, causing plastic deformation",
        "They snap immediately due to covalent bond cleavage",
        "They contract in the direction of stress to resist load",
        "They crystallize instantly and become entirely rigid"
      ],
      correctAnswer: 0,
      explanation: "Under tension, the randomly coiled (amorphous) linear chains untangle and slide past one another, aligning in the direction of the stress. This sliding is responsible for the characteristic ductile drawing and plastic deformation of thermoplastics."
    },
    {
      question: "Why do cross-linked (networked) polymers not melt when heated?",
      options: [
        "They do not contain any carbon atoms",
        "The primary covalent cross-links tie the entire structure into a single macro-molecule that cannot slide",
        "The intermolecular van der Waals forces are too strong",
        "Heating makes them crystallize instantly, preventing liquid transition"
      ],
      correctAnswer: 1,
      explanation: "Networked/thermosetting polymers are joined by strong, covalent cross-links. Unlike thermoplastics where chains are held together by weak secondary bonds (which break upon heating), thermoset networks cannot slide. Excessive heating degrades/chars the polymer rather than melting it."
    },
    {
      question: "Which parameter describes the temperature range where an amorphous polymer transitions from a hard, glassy state to a soft, rubbery state?",
      options: [
        "Melting Temperature (Tm)",
        "Glass Transition Temperature (Tg)",
        "Eutectic Temperature (Te)",
        "Degradation Temperature (Td)"
      ],
      correctAnswer: 1,
      explanation: "The Glass Transition Temperature (Tg) is the temperature below which amorphous regions are rigid/glassy due to frozen chain movement, and above which they gain vibrational/rotational mobility, becoming flexible and rubbery."
    }
  ];

  // Helper structures details
  const getPolymerTypeInfo = (type) => {
    switch (type) {
      case 'linear':
        return {
          name: 'Linear Polymer',
          description: 'Long continuous chains held together by weak secondary forces. Highly capable of packing into parallel crystalline arrays.',
          densityDesc: 'High (due to close chain packing)',
          mechDesc: 'Thermoplastic. Ductile; chains slide under stress causing plastic drawing.'
        };
      case 'branched':
        return {
          name: 'Branched Polymer',
          description: 'Main backbone with short side branches. Branches obstruct close packing, lowering density and crystallizability.',
          densityDesc: 'Low-to-Medium (steric hindrance from branches)',
          mechDesc: 'Thermoplastic. Softer and more flexible than linear equivalents.'
        };
      case 'networked':
        return {
          name: 'Cross-Linked / Networked',
          description: 'Covalent bonds (cross-links) anchor adjacent chains in a 3D matrix. Prevents chain sliding entirely.',
          densityDesc: 'Medium-to-High (determined by cross-link grid spacing)',
          mechDesc: 'Thermoset/Elastomer. High elastic recovery under stress, rigid, does not melt.'
        };
      default:
        return {};
    }
  };

  const activeInfo = getPolymerTypeInfo(polymerType);

  // --- Three.js Initialization ---
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a); // slate-900

    const width = container.clientWidth;
    const height = container.clientHeight || 340;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 50);
    camera.position.set(3.2, 2.5, 3.8);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0, 0);

    mountRef.current.scene = scene;
    mountRef.current.camera = camera;
    mountRef.current.renderer = renderer;
    mountRef.current.controls = controls;

    // Ambient & Directional Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight1.position.set(5, 8, 4);
    scene.add(dirLight1);
    const dirLight2 = new THREE.DirectionalLight(0x06b6d4, 0.4); // Subtle cyan fill light
    dirLight2.position.set(-5, -5, -4);
    scene.add(dirLight2);

    // Bounding Box outline to represent the polymer volume
    const boxGeom = new THREE.BoxGeometry(2.4, 1.6, 1.6);
    const boxEdges = new THREE.EdgesGeometry(boxGeom);
    const boxLineMat = new THREE.LineBasicMaterial({ color: 0x334155, linewidth: 1.5 });
    const wireframe = new THREE.LineSegments(boxEdges, boxLineMat);
    scene.add(wireframe);

    // Polymer group container
    const polymerGroup = new THREE.Group();
    scene.add(polymerGroup);
    mountRef.current.polymerGroup = polymerGroup;

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
      const h = container.clientHeight || 340;
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
        polymerGroup: null
      };
      setSceneReady(false);
    };
  }, []);

  // --- Dynamic Polymer Re-drawing ---
  useEffect(() => {
    const scene = mountRef.current.scene;
    const polymerGroup = mountRef.current.polymerGroup;
    if (!scene || !polymerGroup) return;

    // Clear old meshes
    while (polymerGroup.children.length > 0) {
      const child = polymerGroup.children[0];
      child.geometry.dispose();
      if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
      else child.material.dispose();
      polymerGroup.remove(child);
    }

    // Colors
    const hostColor = 0x3b82f6; // Blue (Carbon backbone)
    const branchColor = 0xa855f7; // Purple branches
    const crosslinkColor = 0xf97316; // Orange cross-links
    const brokenCrosslinkColor = 0xef4444; // Red for snapped links

    // Monomer radius
    const monomerRadius = 0.045;
    const sphereGeom = new THREE.SphereGeometry(monomerRadius, 8, 8);
    const hostMat = new THREE.MeshStandardMaterial({ color: hostColor, roughness: 0.3, metalness: 0.1 });
    const branchMat = new THREE.MeshStandardMaterial({ color: branchColor, roughness: 0.3, metalness: 0.1 });
    const crosslinkMat = new THREE.MeshStandardMaterial({ color: crosslinkColor, roughness: 0.3 });
    const snappedMat = new THREE.MeshStandardMaterial({ color: brokenCrosslinkColor, roughness: 0.3, emissive: 0xef4444, emissiveIntensity: 0.5 });

    // Crystalline order (C = 0.0 is amorphous, C = 1.0 is perfectly straight)
    const C = crystallinity / 100;
    
    // Stretch scaling factors (Poisson contraction along Y and Z)
    const stretchX = 1.0 + 0.32 * tensileStress;
    const shrinkYZ = 1.0 / Math.sqrt(stretchX);

    // Number of chains
    const numChains = 6;
    
    // Define base offsets for the chains
    const chainOffsets = [
      { y: -0.4, z: -0.4, phaseY: 0, phaseZ: Math.PI/3 },
      { y: 0.4, z: -0.4, phaseY: Math.PI/4, phaseZ: Math.PI/2 },
      { y: -0.4, z: 0.4, phaseY: Math.PI/2, phaseZ: 0 },
      { y: 0.4, z: 0.4, phaseY: Math.PI/3, phaseZ: Math.PI },
      { y: 0.0, z: -0.2, phaseY: Math.PI, phaseZ: Math.PI/6 },
      { y: 0.0, z: 0.2, phaseY: Math.PI/6, phaseZ: Math.PI/4 }
    ];

    if (polymerType === 'linear' || polymerType === 'branched') {
      // --- Render Linear & Branched Chains ---
      const numSegments = 24;

      for (let cIdx = 0; cIdx < numChains; cIdx++) {
        const offset = chainOffsets[cIdx];
        const chainPoints = [];

        for (let s = 0; s <= numSegments; s++) {
          const t = s / numSegments;
          
          // X-coordinate spans from -1.1 to +1.1, scaled by stress stretch
          const x0 = -1.1 + 2.2 * t;
          const x = x0 * stretchX;

          // Y and Z fluctuate amorphously, but align parallel as crystallinity increases
          const amp = 0.28 * (1.0 - C);
          const y0 = offset.y + amp * Math.sin(t * 3.5 * Math.PI + offset.phaseY);
          const z0 = offset.z + amp * Math.cos(t * 3.5 * Math.PI + offset.phaseZ);

          const y = y0 * shrinkYZ;
          const z = z0 * shrinkYZ;

          chainPoints.push(new THREE.Vector3(x, y, z));

          // Render monomer sphere
          const sphereMesh = new THREE.Mesh(sphereGeom, hostMat);
          sphereMesh.position.set(x, y, z);
          polymerGroup.add(sphereMesh);
        }

        // Draw tube/line for the chain backbone
        const curve = new THREE.CatmullRomCurve3(chainPoints);
        const tubeGeom = new THREE.TubeGeometry(curve, 32, 0.02, 6, false);
        const tubeMat = new THREE.MeshStandardMaterial({ color: hostColor, roughness: 0.4 });
        const tubeMesh = new THREE.Mesh(tubeGeom, tubeMat);
        polymerGroup.add(tubeMesh);

        // --- Render Branches if Branched ---
        if (polymerType === 'branched') {
          // Add side branches along the chain
          // Number of branches per chain scale with branchingDensity slider
          for (let b = 1; b <= branchingDensity; b++) {
            // Pick a segment along the backbone to branch from
            const tBranch = (b / (branchingDensity + 1));
            const basePoint = curve.getPointAt(tBranch);

            // Branch curves outward orthogonally
            const branchLength = 0.25;
            const branchPoints = [basePoint];

            // Direction of branch is outward, perturbed by crystallinity (wiggles more in amorphous)
            const angle = (b * Math.PI * 0.7) + offset.phaseY;
            const ampBranch = 0.18 * (1.0 - C);

            const bx0 = basePoint.x + Math.sin(angle) * branchLength * 0.4;
            const by0 = basePoint.y + Math.cos(angle) * branchLength * shrinkYZ + ampBranch * Math.sin(angle);
            const bz0 = basePoint.z + Math.sin(angle * 1.5) * branchLength * shrinkYZ + ampBranch * Math.cos(angle);

            const bx = bx0;
            const by = by0;
            const bz = bz0;

            branchPoints.push(new THREE.Vector3(bx, by, bz));

            // Branch line/tube
            const branchCurve = new THREE.CatmullRomCurve3(branchPoints);
            const bTubeGeom = new THREE.TubeGeometry(branchCurve, 8, 0.015, 4, false);
            const bTubeMesh = new THREE.Mesh(bTubeGeom, branchMat);
            polymerGroup.add(bTubeMesh);

            // Branch end monomer bead
            const branchBead = new THREE.Mesh(sphereGeom, branchMat);
            branchBead.position.set(bx, by, bz);
            polymerGroup.add(branchBead);
          }
        }
      }
    } 
    else if (polymerType === 'networked') {
      // --- Render Networked / Cross-linked grid ---
      // We render a grid of 3D chain strands running along X-axis,
      // and add transversal crosslink bonds connecting them.
      const numSegments = 16;
      const numRows = 3;
      const numCols = 2; // 3x2 grid of backbones = 6 strands
      const gridChains = [];

      let chainIndex = 0;
      for (let r = 0; r < numRows; r++) {
        for (let c = 0; c < numCols; c++) {
          // Define row coordinates
          const gy = -0.5 + r * 0.5;
          const gz = -0.4 + c * 0.8;
          const chainPoints = [];

          for (let s = 0; s <= numSegments; s++) {
            const t = s / numSegments;
            const x = (-1.1 + 2.2 * t) * stretchX;
            // Slight thermal wiggle even in network
            const y = (gy + 0.06 * Math.sin(t * 4 * Math.PI + r)) * shrinkYZ;
            const z = (gz + 0.06 * Math.cos(t * 4 * Math.PI + c)) * shrinkYZ;

            chainPoints.push(new THREE.Vector3(x, y, z));

            // Render node sphere
            const sphereMesh = new THREE.Mesh(sphereGeom, hostMat);
            sphereMesh.position.set(x, y, z);
            polymerGroup.add(sphereMesh);
          }

          const curve = new THREE.CatmullRomCurve3(chainPoints);
          const tubeGeom = new THREE.TubeGeometry(curve, 20, 0.02, 6, false);
          const tubeMat = new THREE.MeshStandardMaterial({ color: hostColor, roughness: 0.4 });
          const tubeMesh = new THREE.Mesh(tubeGeom, tubeMat);
          polymerGroup.add(tubeMesh);

          gridChains.push(curve);
          chainIndex++;
        }
      }

      // Add cross-link bonds between adjacent chains
      // Density of crosslink is defined by crosslinkDensity slider
      const spacingX = 1.0 / (crosslinkDensity + 1);
      const isOverStressed = tensileStress > 2.0;

      for (let i = 0; i < gridChains.length; i++) {
        const nextChain = gridChains[(i + 1) % gridChains.length];

        for (let d = 1; d <= crosslinkDensity; d++) {
          const tPos = d * spacingX;
          const p1 = gridChains[i].getPointAt(tPos);
          const p2 = nextChain.getPointAt(tPos);

          // Calculate current distance of the link
          const dist = p1.distanceTo(p2);

          // If over-stressed, some links snap (broken mesh)
          // We render snapped links as split segments, colored red
          const shouldSnap = isOverStressed && (d % 2 === 0);

          if (shouldSnap) {
            // Snapped links: draw two half segments pointing inwards, showing fracture
            const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
            
            // Snap split points
            const split1 = new THREE.Vector3().lerpVectors(p1, mid, 0.65);
            const split2 = new THREE.Vector3().lerpVectors(p2, mid, 0.65);

            // Segment 1
            const cGeom1 = new THREE.TubeGeometry(new THREE.LineCurve3(p1, split1), 4, 0.015, 4, false);
            const cMesh1 = new THREE.Mesh(cGeom1, snappedMat);
            polymerGroup.add(cMesh1);

            // Segment 2
            const cGeom2 = new THREE.TubeGeometry(new THREE.LineCurve3(p2, split2), 4, 0.015, 4, false);
            const cMesh2 = new THREE.Mesh(cGeom2, snappedMat);
            polymerGroup.add(cMesh2);
          } 
          else {
            // Normal cross-link
            const linkGeom = new THREE.TubeGeometry(new THREE.LineCurve3(p1, p2), 4, 0.015, 4, false);
            const linkMesh = new THREE.Mesh(linkGeom, crosslinkMat);
            polymerGroup.add(linkMesh);
          }
        }
      }
    }

  }, [polymerType, crystallinity, branchingDensity, crosslinkDensity, tensileStress, sceneReady]);

  // Real-time calculations
  // Density increases with crystallinity
  const calculatedDensity = polymerType === 'linear' 
    ? 0.91 + (crystallinity / 100) * 0.06 // 0.91 g/cm3 to 0.97 g/cm3 (LDPE to HDPE range)
    : polymerType === 'branched'
      ? 0.89 + (crystallinity / 100) * 0.04 - (branchingDensity * 0.005) // LDPE / LLDPE range
      : 1.1 + (crosslinkDensity * 0.015) - (tensileStress * 0.005); // Thermoset rubber density

  // Stress-strain elastic response: resistance to force
  const stiffnessCoeff = polymerType === 'networked' 
    ? 25.0 + crosslinkDensity * 12.0 
    : 8.0 + (crystallinity / 100) * 15.0 - (polymerType === 'branched' ? branchingDensity * 2 : 0);

  const resultingStrain = tensileStress * (150 / stiffnessCoeff); // descriptive strain %

  // Check Quiz Answer
  const handleCheckQuizAnswer = (optionIdx) => {
    if (quizState.isAnswered) return;

    const isCorrect = optionIdx === quizQuestions[quizState.currentQuestionIndex].correctAnswer;

    setQuizState(prev => ({
      ...prev,
      selectedOption: optionIdx,
      isAnswered: true,
      score: isCorrect ? prev.score + 1 : prev.score,
      attempts: prev.attempts + 1
    }));
  };

  // Next Quiz Question
  const handleNextQuizQuestion = () => {
    setQuizState(prev => ({
      ...prev,
      currentQuestionIndex: (prev.currentQuestionIndex + 1) % quizQuestions.length,
      selectedOption: null,
      isAnswered: false,
      showAnswer: false
    }));
  };

  // Reset Quiz
  const handleResetQuiz = () => {
    setQuizState({
      currentQuestionIndex: 0,
      selectedOption: null,
      isAnswered: false,
      score: 0,
      attempts: 0,
      showAnswer: false
    });
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <button className="back-btn" onClick={onBack}>
          ← Back to Labs
        </button>
        <div className="header-title-row">
          <span className="logo-icon">🧬</span>
          <h1>Polymer Structure Lab</h1>
        </div>
        <p className="header-subtitle">Analyze Crystalline Ordering, Branching sterics, and Network Vulcanization</p>
      </header>

      <main className="app-content">
        {/* Left Column: 3D view and mechanical data */}
        <div className="left-column" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* 3D Visualizer */}
          <div className="viewer-card card" style={{ height: '360px' }}>
            <h3 style={{ position: 'absolute', top: '12px', left: '16px', zIndex: 1 }}>3D Molecular Model</h3>
            <div ref={containerRef} style={{ width: '100%', height: '100%', borderRadius: '12px', overflow: 'hidden' }} />
            
            {/* Color Legend */}
            <div className="axes-legend" style={{ zIndex: 1, bottom: '16px', left: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginRight: '14px', gap: '6px' }}>
                <span className="legend-dot" style={{ background: '#3b82f6' }}></span>
                <span style={{ fontSize: '0.72rem' }}>Carbon Backbone</span>
              </div>
              {polymerType === 'branched' && (
                <div style={{ display: 'flex', alignItems: 'center', marginRight: '14px', gap: '6px' }}>
                  <span className="legend-dot" style={{ background: '#a855f7' }}></span>
                  <span style={{ fontSize: '0.72rem' }}>Side Branch</span>
                </div>
              )}
              {polymerType === 'networked' && (
                <div style={{ display: 'flex', alignItems: 'center', marginRight: '14px', gap: '6px' }}>
                  <span className="legend-dot" style={{ background: '#f97316' }}></span>
                  <span style={{ fontSize: '0.72rem' }}>Covalent Crosslink</span>
                </div>
              )}
              {polymerType === 'networked' && tensileStress > 2.0 && (
                <div style={{ display: 'flex', alignItems: 'center', marginRight: '14px', gap: '6px' }}>
                  <span className="legend-dot" style={{ background: '#ef4444' }}></span>
                  <span style={{ fontSize: '0.72rem', color: '#fca5a5', fontWeight: 'bold' }}>Snapped Link (Fracture)</span>
                </div>
              )}
            </div>
          </div>

          {/* Mechanical Readouts / Gauge Panel */}
          <div className="card">
            <h3>Viscoelastic & Mechanical Properties</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '12px' }}>
              
              <div className="math-block" style={{ fontSize: '0.8rem', lineHeight: '1.6' }}>
                • Active Polymer: <strong>{activeInfo.name}</strong><br />
                • Theoretical Density: <strong>{calculatedDensity.toFixed(3)} g/cm³</strong><br />
                • Molecular Starch/Crystallinity: <strong>{polymerType !== 'networked' ? `${crystallinity}%` : 'Amorphous Network'}</strong>
              </div>

              <div className="math-block" style={{ fontSize: '0.8rem', lineHeight: '1.6' }}>
                • Tension Coefficient: <strong>{stiffnessCoeff.toFixed(1)} MPa</strong><br />
                • Deformation Strain: <strong>{resultingStrain.toFixed(1)}%</strong><br />
                • Structural State: <strong style={{ color: tensileStress > 2.0 && polymerType === 'networked' ? '#ef4444' : '#22c55e' }}>
                  {tensileStress === 0 ? 'Relaxed' : 
                   tensileStress > 2.0 && polymerType === 'networked' ? 'FAIL / Fracture' :
                   polymerType === 'networked' ? 'Elastic Stretching' : 'Plastic Drawing'}
                </strong><br />
                • Thermal Melting Capability: <strong>{polymerType === 'networked' ? 'Infusible (Thermoset)' : 'Remeltable (Thermoplastic)'}</strong>
              </div>

            </div>
          </div>

        </div>

        {/* Right Column: controls and quiz tabs */}
        <div className="right-column">
          
          {/* View Mode Toggle */}
          <div className="view-mode-tabs" style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
            <button 
              className={`mode-tab-btn ${mode === 'explore' ? 'active' : ''}`}
              onClick={() => setMode('explore')}
              style={{ flex: 1, padding: '10px', fontSize: '0.82rem', fontWeight: 700 }}
            >
              🔍 Explorer
            </button>
            <button 
              className={`mode-tab-btn ${mode === 'quiz' ? 'active' : ''}`}
              onClick={() => setMode('quiz')}
              style={{ flex: 1, padding: '10px', fontSize: '0.82rem', fontWeight: 700 }}
            >
              ✏️ Practice Quiz
            </button>
          </div>

          {mode === 'explore' ? (
            <>
              {/* Polymer Type Selector */}
              <div className="card">
                <h3>Polymer Architecture</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginTop: '12px' }}>
                  <button 
                    className={`preset-btn ${polymerType === 'linear' ? 'active-preset' : ''}`}
                    onClick={() => { setPolymerType('linear'); setTensileStress(0); }}
                  >
                    Linear
                  </button>
                  <button 
                    className={`preset-btn ${polymerType === 'branched' ? 'active-preset' : ''}`}
                    onClick={() => { setPolymerType('branched'); setTensileStress(0); }}
                  >
                    Branched
                  </button>
                  <button 
                    className={`preset-btn ${polymerType === 'networked' ? 'active-preset' : ''}`}
                    onClick={() => { setPolymerType('networked'); setTensileStress(0); }}
                  >
                    Networked
                  </button>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '12px', lineHeight: '1.4' }}>
                  {activeInfo.description}
                </p>
              </div>

              {/* Parametric Controls */}
              <div className="control-panel card">
                <h3>Molecular Parameters</h3>
                
                {/* Crystallinity Slider (Linear & Branched Only) */}
                {polymerType !== 'networked' && (
                  <div className="section">
                    <div className="index-row">
                      <span className="index-label">Degree of Crystallinity</span>
                      <span className="index-value" style={{ color: '#06b6d4' }}>{crystallinity}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={crystallinity}
                      onChange={(e) => setCrystallinity(parseInt(e.target.value))}
                      style={{ width: '100%', marginTop: '8px' }}
                    />
                    <p className="helper-text" style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Crystalline parallel alignment vs. random amorphous coiling.
                    </p>
                  </div>
                )}

                {/* Branching Density (Branched Only) */}
                {polymerType === 'branched' && (
                  <div className="section">
                    <div className="index-row">
                      <span className="index-label">Branching Density</span>
                      <span className="index-value" style={{ color: '#a855f7' }}>{branchingDensity} branches/chain</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={branchingDensity}
                      onChange={(e) => setBranchingDensity(parseInt(e.target.value))}
                      style={{ width: '100%', marginTop: '8px' }}
                    />
                    <p className="helper-text" style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      More branches obstruct chain packing, limiting maximum crystallinity.
                    </p>
                  </div>
                )}

                {/* Crosslink Density (Networked Only) */}
                {polymerType === 'networked' && (
                  <div className="section">
                    <div className="index-row">
                      <span className="index-label">Covalent Crosslink Density</span>
                      <span className="index-value" style={{ color: '#f97316' }}>{crosslinkDensity} links</span>
                    </div>
                    <input
                      type="range"
                      min="2"
                      max="8"
                      value={crosslinkDensity}
                      onChange={(e) => setCrosslinkDensity(parseInt(e.target.value))}
                      style={{ width: '100%', marginTop: '8px' }}
                    />
                    <p className="helper-text" style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Controls spacing of crosslink covalent bridges. More links increase stiffness.
                    </p>
                  </div>
                )}

                {/* Applied Tensile Stress (All) */}
                <div className="section" style={{ border: 'none', padding: 0 }}>
                  <div className="index-row">
                    <span className="index-label">Applied Tensile Stress (σ)</span>
                    <span className="index-value" style={{ color: '#ef4444' }}>{tensileStress.toFixed(2)} MPa</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="2.5"
                    step="0.05"
                    value={tensileStress}
                    onChange={(e) => setTensileStress(parseFloat(e.target.value))}
                    style={{ width: '100%', marginTop: '8px' }}
                  />
                  <p className="helper-text" style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {polymerType === 'networked' 
                      ? 'Stretches the crosslinks elastically. Snaps bridges under excessive stress (>2.0 MPa).'
                      : 'Untangles amorphous zones and slides chains parallel (plastic deformation).'}
                  </p>
                </div>

              </div>
            </>
          ) : (
            /* Quiz Mode Tab */
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--panel-border)', paddingBottom: '10px' }}>
                <h3 style={{ margin: 0 }}>Quiz Challenge</h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                  Score: {quizState.score} / {quizState.attempts} ({(quizState.attempts > 0 ? (quizState.score / quizState.attempts * 100) : 0).toFixed(0)}%)
                </span>
              </div>

              <div style={{ marginTop: '16px' }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                  Question {quizState.currentQuestionIndex + 1} of {quizQuestions.length}
                </span>
                <p style={{ fontSize: '0.88rem', fontWeight: 600, marginTop: '8px', lineHeight: '1.4' }}>
                  {quizQuestions[quizState.currentQuestionIndex].question}
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
                {quizQuestions[quizState.currentQuestionIndex].options.map((option, idx) => {
                  let btnClass = "preset-btn";
                  let borderStyle = "1px solid var(--panel-border)";
                  let bgStyle = "rgba(15, 23, 42, 0.4)";

                  if (quizState.isAnswered) {
                    if (idx === quizQuestions[quizState.currentQuestionIndex].correctAnswer) {
                      borderStyle = "1.5px solid #22c55e";
                      bgStyle = "rgba(34, 197, 94, 0.15)";
                    } else if (idx === quizState.selectedOption) {
                      borderStyle = "1.5px solid #ef4444";
                      bgStyle = "rgba(239, 68, 68, 0.15)";
                    }
                  } else if (idx === quizState.selectedOption) {
                    borderStyle = "1.5px solid var(--accent-cyan)";
                  }

                  return (
                    <button
                      key={idx}
                      className={btnClass}
                      onClick={() => handleCheckQuizAnswer(idx)}
                      disabled={quizState.isAnswered}
                      style={{ 
                        textAlign: 'left', 
                        padding: '10px 14px', 
                        fontSize: '0.78rem', 
                        border: borderStyle,
                        background: bgStyle,
                        whiteSpace: 'normal',
                        lineHeight: '1.4'
                      }}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>

              {quizState.isAnswered && (
                <div className="math-block" style={{ marginTop: '16px', fontSize: '0.78rem', border: '1px solid rgba(6, 182, 212, 0.3)', background: 'rgba(6, 182, 212, 0.05)' }}>
                  <strong>{quizState.selectedOption === quizQuestions[quizState.currentQuestionIndex].correctAnswer ? '✓ Correct!' : '✗ Incorrect.'}</strong>
                  <p style={{ marginTop: '6px', lineHeight: '1.4', color: 'var(--text-secondary)' }}>
                    {quizQuestions[quizState.currentQuestionIndex].explanation}
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button className="preset-btn" onClick={handleResetQuiz} style={{ flex: 1 }}>
                  Reset Score
                </button>
                <button 
                  className="launch-btn" 
                  onClick={handleNextQuizQuestion}
                  disabled={!quizState.isAnswered}
                  style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', background: quizState.isAnswered ? 'linear-gradient(135deg, var(--accent-cyan), #0891b2)' : '#475569', opacity: quizState.isAnswered ? 1 : 0.6 }}
                >
                  Next Question ➡️
                </button>
              </div>

            </div>
          )}

        </div>
      </main>

      {/* Polymer Mechanics Tutorial Card */}
      <section className="math-explanation card" style={{ marginTop: '24px', width: '100%' }}>
        <h3>Thermal & Mechanical Behavior of Polymers</h3>
        <p className="subtitle">Understanding molecular layout controls on real-world engineering properties.</p>
        <div className="steps-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          
          <div>
            <h4>1. Thermoplastics vs. Thermosets</h4>
            <p style={{ fontSize: '0.85rem', lineHeight: '1.5' }}>
              • <strong>Thermoplastics:</strong> Linear or branched chains bound together by secondary van der Waals forces. When heated, these secondary forces break, enabling the polymer to melt and flow (remeltable/recyclable).
              <br />
              • <strong>Thermosets:</strong> Highly cross-linked 3D networks. Covalent cross-links prevent chains from sliding, meaning they do not melt under heat. Excessive heat decomposes (burns) the structure.
            </p>
          </div>

          <div>
            <h4>2. Steric Hindrance & Crystallinity</h4>
            <p style={{ fontSize: '0.85rem', lineHeight: '1.5' }}>
              Polymer chains form crystalline domains when they pack parallel to each other. Linear polyethylene (HDPE) has a highly regular structure, achieving up to 80% crystallinity, making it strong and dense.
              <br /><br />
              Branched chains (LDPE) contain side groups that physically block the backbones from approaching close together. This sterilizing steric hindrance forces LDPE to remain highly amorphous (ductile, soft, lower density).
            </p>
          </div>

          <div>
            <h4>3. Rubber Elasticity & Failure</h4>
            <p style={{ fontSize: '0.85rem', lineHeight: '1.5' }}>
              Elastomers (like vulcanized rubber) contain a loose cross-linked network. In their resting state, chains are randomly coiled (high entropy).
              <br /><br />
              Tension stretches and straightens the chains, lowering entropy. Upon release, they return to their coiled entropic state instantly. Over-stressing a networked structure breaks the covalent cross-links, causing permanent material failure.
            </p>
          </div>

        </div>
      </section>

      <footer className="app-footer">
        <p>&copy; {new Date().getFullYear()} Polymer Engineering Laboratory. Built with Node, Three.js & CSS Flexbox.</p>
      </footer>
    </div>
  );
}
