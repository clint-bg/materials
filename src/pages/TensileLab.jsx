import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export default function TensileLab({ onBack }) {
  const [mode, setMode] = useState('explore'); // 'explore' | 'quiz'
  const [material, setMaterial] = useState('steel'); // 'steel' | 'aluminum' | 'iron' | 'polyethylene'
  const [curveView, setCurveView] = useState('compare'); // 'engineering' | 'true' | 'compare'
  const [strainInput, setStrainInput] = useState(0.0); // Interactive strain slider (0.0 to 1.0)
  
  const [sceneReady, setSceneReady] = useState(false);
  const containerRef = useRef(null);
  const plotRef = useRef(null);
  
  const mountRef = useRef({
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    topGrip: null,
    bottomGrip: null,
    gaugeSegments: []
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
      question: "Why does the Engineering Stress-Strain curve decrease after reaching the Ultimate Tensile Strength (UTS)?",
      options: [
        "The material suddenly recrystallizes and softens",
        "It uses the original cross-sectional area (A₀) which doesn't account for localized necking thinning",
        "The atomic bonds begin to dissolve under high loads",
        "The elastic modulus drops to zero"
      ],
      correctAnswer: 1,
      explanation: "Engineering stress is calculated as Load divided by the *original* area (P / A₀). After UTS, localized necking rapidly reduces the actual area, so less force is needed to continue stretching it. Since the calculation still divides by the large A₀, the engineering stress appears to drop."
    },
    {
      question: "Why does the True Stress-Strain curve continuously rise up to fracture?",
      options: [
        "It divides the force by the instantaneous actual area (A_actual), which is rapidly shrinking due to necking",
        "True stress is calculated using gravity corrections",
        "Metals become infinitely stiff right before they snap",
        "The length of the dogbone drops to zero at fracture"
      ],
      correctAnswer: 0,
      explanation: "True stress is defined as P / A_actual. Because the actual cross-sectional area shrinks continuously and extremely rapidly during plastic deformation (especially necking), dividing the load by this small area causes the true stress value to climb steadily until fracture."
    },
    {
      question: "Which material behaves in a brittle manner, exhibiting almost zero plastic deformation before fracturing?",
      options: [
        "Structural Steel (A36)",
        "Aluminum Alloy (6061-T6)",
        "Gray Cast Iron",
        "High-Density Polyethylene"
      ],
      correctAnswer: 2,
      explanation: "Gray Cast Iron is a classic brittle material. Under tension, it deforms elastically up to about 0.5% strain and then snaps abruptly with zero plastic yielding, strain hardening, or necking."
    },
    {
      question: "What physical phenomenon occurs during the 'Yield Point Plateau' in mild structural steel?",
      options: [
        "Grains melt and recrystallize into a liquid phase",
        "Carbon solute atoms pin dislocations, which then tear free and slip in localized Lüders bands",
        "The material shrinks longitudinally while expanding radially",
        "Covalent cross-links snap, causing polymer drawing"
      ],
      correctAnswer: 1,
      explanation: "Mild steel exhibits a distinct yield plateau. Interstitial carbon atoms cluster around dislocations (pinning them). Once stress is high enough, dislocations tear free and slip rapidly across the specimen in visible bands (Lüders bands) at a nearly constant lower yield stress."
    },
    {
      question: "How do you convert engineering strain (e) to true strain (ε) up to the onset of necking?",
      options: [
        "ε = e²",
        "ε = ln(1 + e)",
        "ε = e / (1 - e)",
        "ε = exp(e) - 1"
      ],
      correctAnswer: 1,
      explanation: "True strain is defined as the integral of dL / L, which yields ε = ln(L / L₀). Since L / L₀ = 1 + e, the relationship ε = ln(1 + e) holds true up to the point where deformation becomes non-uniform (necking)."
    },
    {
      question: "What is the physical meaning of the '0.2% Offset Method'?",
      options: [
        "A method to find the ultimate tensile strength of brittle plastics",
        "It defines the yield strength for materials that transition smoothly from elastic to plastic without a sharp yield point",
        "It is the correction factor for thermal expansion in tensile grips",
        "It is the ratio of true stress to engineering stress at fracture"
      ],
      correctAnswer: 1,
      explanation: "Many metals (like aluminum or copper) yield smoothly without a distinct yield point. To define an engineering yield strength, we draw a line parallel to the elastic slope starting at 0.002 (0.2%) strain. Where this offset line intersects the curve is defined as the offset yield strength."
    }
  ];

  // Material properties database
  const materialProfiles = {
    steel: {
      name: "Structural Steel (A36)",
      E: 200.0, // GPa
      maxStrain: 0.30, // 30% engineering strain
      poisson: 0.30,
      utsStrain: 0.15,
      description: "Ductile structural steel. Shows a distinct elastic region, a sharp yield point plateau (Lüders bands), a strain hardening region, necking, and cup-and-cone ductile fracture.",
      getCurves: () => {
        const engPoints = [];
        const truePoints = [];
        const steps = 150;
        
        // Characteristic constants
        const sy = 250.0; // Yield stress (MPa)
        const s_uts = 400.0; // UTS (MPa)
        const sf = 320.0; // Fracture stress (MPa)
        const ey = 0.00125; // Yield strain
        const e_plateau = 0.015; // Plateau end
        const e_uts = 0.15; // UTS strain
        const ef = 0.30; // Fracture strain

        for (let i = 0; i <= steps; i++) {
          const e = (i / steps) * ef;
          let s = 0;

          // 1. Engineering Stress
          if (e < ey) {
            // Elastic
            s = e * (sy / ey);
          } else if (e < e_plateau) {
            // Yield plateau with small wiggles
            const t = (e - ey) / (e_plateau - ey);
            s = sy - 8.0 * Math.sin(t * 3 * Math.PI);
          } else if (e < e_uts) {
            // Strain hardening (power law approximation)
            const t = (e - e_plateau) / (e_uts - e_plateau);
            s = sy + (s_uts - sy) * Math.sin(t * Math.PI / 2);
          } else {
            // Necking down to fracture
            const t = (e - e_uts) / (ef - e_uts);
            s = s_uts - (s_uts - sf) * (t * t);
          }

          engPoints.push({ strain: e, stress: s });

          // 2. True Stress
          let sTrue = 0;
          if (e < e_uts) {
            sTrue = s * (1.0 + e);
          } else {
            // Post-necking: true stress keeps climbing as area collapses
            const t = (e - e_uts) / (ef - e_uts);
            const sTrue_uts = s_uts * (1.0 + e_uts);
            const sTrue_f = 540.0;
            sTrue = sTrue_uts + (sTrue_f - sTrue_uts) * t;
          }
          
          const trueStrain = e < e_uts ? Math.log(1.0 + e) : Math.log(1.0 + e_uts) + (e - e_uts);
          truePoints.push({ strain: trueStrain, stress: sTrue });
        }

        return { engPoints, truePoints, ey, sy, e_uts, s_uts, ef, sf, true_ef: Math.log(1.0 + e_uts) + (ef - e_uts), true_sf: 540.0 };
      }
    },
    aluminum: {
      name: "Aluminum Alloy (6061-T6)",
      E: 70.0,
      maxStrain: 0.16, // 16% engineering strain
      poisson: 0.33,
      utsStrain: 0.08,
      description: "Precipitation hardened aluminum. Modulus is lower than steel (~70 GPa). Transitions smoothly into plastic deformation (no sharp yield plateau), exhibiting strain hardening up to 8% strain before necking.",
      getCurves: () => {
        const engPoints = [];
        const truePoints = [];
        const steps = 150;
        
        const sy = 276.0; // Yield stress (MPa)
        const s_uts = 310.0;
        const sf = 240.0;
        const ey = 0.0039;
        const e_uts = 0.08;
        const ef = 0.16;

        for (let i = 0; i <= steps; i++) {
          const e = (i / steps) * ef;
          let s = 0;

          if (e < ey) {
            s = e * (sy / ey);
          } else if (e < e_uts) {
            // Smooth yield transition into strain hardening
            const t = (e - ey) / (e_uts - ey);
            s = sy + (s_uts - sy) * Math.pow(t, 0.45);
          } else {
            // Necking
            const t = (e - e_uts) / (ef - e_uts);
            s = s_uts - (s_uts - sf) * (t * t);
          }

          engPoints.push({ strain: e, stress: s });

          let sTrue = 0;
          if (e < e_uts) {
            sTrue = s * (1.0 + e);
          } else {
            const t = (e - e_uts) / (ef - e_uts);
            const sTrue_uts = s_uts * (1.0 + e_uts);
            const sTrue_f = 370.0;
            sTrue = sTrue_uts + (sTrue_f - sTrue_uts) * t;
          }
          const trueStrain = e < e_uts ? Math.log(1.0 + e) : Math.log(1.0 + e_uts) + (e - e_uts);
          truePoints.push({ strain: trueStrain, stress: sTrue });
        }

        return { engPoints, truePoints, ey, sy, e_uts, s_uts, ef, sf, true_ef: Math.log(1.0 + e_uts) + (ef - e_uts), true_sf: 370.0 };
      }
    },
    iron: {
      name: "Gray Cast Iron",
      E: 120.0,
      maxStrain: 0.006, // 0.6% engineering strain (Brittle)
      poisson: 0.25,
      utsStrain: 0.006,
      description: "High carbon cast iron. Extremely brittle. The graph is entirely linear elastic up to 0.6% strain, where it snaps instantly with zero plastic yielding, strain hardening, or necking.",
      getCurves: () => {
        const engPoints = [];
        const truePoints = [];
        const steps = 150;
        
        const sf = 200.0;
        const ef = 0.006;

        for (let i = 0; i <= steps; i++) {
          const e = (i / steps) * ef;
          // Entirely elastic
          const s = e * (sf / ef);
          
          engPoints.push({ strain: e, stress: s });
          
          // Since strain is tiny, engineering and true curves are identical
          truePoints.push({ strain: Math.log(1.0 + e), stress: s * (1.0 + e) });
        }

        return { engPoints, truePoints, ey: ef, sy: sf, e_uts: ef, s_uts: sf, ef, sf, true_ef: Math.log(1.0 + ef), true_sf: sf * (1.0 + ef) };
      }
    },
    polyethylene: {
      name: "High-Density Polyethylene (HDPE)",
      E: 1.0,
      maxStrain: 2.0, // 200% engineering strain (cold drawing!)
      poisson: 0.45,
      utsStrain: 0.15,
      description: "Ductile semicrystalline polymer. Stretches up to 200% strain via molecular chain alignment ('cold drawing'). True stress at fracture is extremely high due to major cross-section collapse.",
      getCurves: () => {
        const engPoints = [];
        const truePoints = [];
        const steps = 150;
        
        const sy = 24.0; // Yield stress (MPa)
        const s_plateau = 15.0; // Drawing stress
        const sf = 28.0; // Fracture stress
        const ey = 0.08; // Elastic limit (8% strain)
        const e_uts = 0.15;
        const ef = 2.0; // 200% strain limit

        for (let i = 0; i <= steps; i++) {
          const e = (i / steps) * ef;
          let s = 0;

          if (e < ey) {
            s = e * (sy / ey);
          } else if (e < e_uts) {
            // Yield drop
            const t = (e - ey) / (e_uts - ey);
            s = sy - (sy - s_plateau) * t;
          } else if (e < 1.4) {
            // Cold drawing plateau
            s = s_plateau;
          } else {
            // Orientation hardening near fracture
            const t = (e - 1.4) / (ef - 1.4);
            s = s_plateau + (sf - s_plateau) * Math.pow(t, 2);
          }

          engPoints.push({ strain: e, stress: s });

          // True stress is huge: s * (1 + e)
          const sTrue = s * (1.0 + e);
          const trueStrain = Math.log(1.0 + e);
          truePoints.push({ strain: trueStrain, stress: sTrue });
        }

        return { engPoints, truePoints, ey, sy, e_uts, s_uts: sy, ef, sf, true_ef: Math.log(1.0 + ef), true_sf: sf * (1.0 + ef) };
      }
    }
  };

  const activeProfile = materialProfiles[material];
  const { engPoints, truePoints, ey, sy, e_uts, s_uts, ef, sf, true_ef, true_sf } = activeProfile.getCurves();

  // Map the slider input (0.0 to 1.0) to active strain
  const activeStrain = strainInput * ef;

  // Find stress values at current strain
  const getInterpolatedStress = (points, targetStrain) => {
    if (targetStrain <= 0) return 0;
    if (targetStrain >= points[points.length - 1].strain) {
      return points[points.length - 1].stress;
    }
    
    // Binary search
    let low = 0;
    let high = points.length - 1;
    while (high - low > 1) {
      const mid = Math.floor((low + high) / 2);
      if (points[mid].strain > targetStrain) {
        high = mid;
      } else {
        low = mid;
      }
    }
    
    const p1 = points[low];
    const p2 = points[high];
    const t = (targetStrain - p1.strain) / (p2.strain - p1.strain);
    return p1.stress + (p2.stress - p1.stress) * t;
  };

  const currentEngStress = getInterpolatedStress(engPoints, activeStrain);
  
  // Calculate corresponding true strain & true stress
  // Since true strain is ln(1 + e) up to necking, and continues post necking:
  const getCorrespondingTrueVals = () => {
    if (activeStrain === 0) return { trueStrain: 0, trueStress: 0 };
    
    // Find index or interpolate in truePoints
    const ratio = activeStrain / ef;
    const targetIdx = Math.min(Math.floor(ratio * truePoints.length), truePoints.length - 1);
    const p = truePoints[targetIdx];
    return { trueStrain: p.strain, trueStress: p.stress };
  };

  const { trueStrain: currentTrueStrain, trueStress: currentTrueStress } = getCorrespondingTrueVals();

  // Instantaneous actual area: A = A0 / (1 + e) [assuming constant volume, up to necking]
  // Post necking, it drops even faster.
  const A0 = 100.0; // Nominal initial area (mm^2)
  const currentActualArea = activeStrain < e_uts
    ? A0 / (1.0 + activeStrain)
    : (ef - e_uts > 0)
      ? (A0 / (1.0 + e_uts)) * Math.exp(-1.8 * (activeStrain - e_uts) / (ef - e_uts))
      : A0 / (1.0 + activeStrain);

  const currentLoad = (currentEngStress * A0) / 1000.0; // Force in kN (Stress in MPa * Area in mm2 = N / 1000)

  // --- Three.js Dynamic Specimen Update ---
  useEffect(() => {
    const scene = mountRef.current.scene;
    const topGrip = mountRef.current.topGrip;
    const bottomGrip = mountRef.current.bottomGrip;
    const segments = mountRef.current.gaugeSegments;

    if (!scene || !topGrip || !bottomGrip || segments.length === 0) return;

    // Check if the specimen has fractured (snapped)
    const isFractured = strainInput >= 0.99 && material !== 'polyethylene'; // snaps at 1.0 (except polyethylene which drawing stays uniform)
    // Actually, cast iron snaps at 1.0, steel at 1.0, alum at 1.0. Let's make it snap at strainInput >= 0.98.
    const isSnapped = strainInput >= 0.97;

    // Gauge geometry dimensions
    const initialGaugeHeight = 1.0;
    
    // Elongation stretch factor
    const stretch = 1.0 + activeStrain;
    const currentGaugeHeight = initialGaugeHeight * stretch;

    // Poisson contraction factor (shrinks radius)
    const nu = activeProfile.poisson;
    const uniformShrink = 1.0 - nu * (activeStrain / (1.0 + activeStrain));

    // Grip positioning
    // Grips hold the two ends. Grips separate based on gauge height.
    if (isSnapped) {
      // Snapped: draw specimen halves separated by a fracture gap
      const gap = 0.25;
      topGrip.position.y = (currentGaugeHeight / 2) + 0.3 + gap;
      bottomGrip.position.y = -(currentGaugeHeight / 2) - 0.3 - gap;
    } else {
      topGrip.position.y = (currentGaugeHeight / 2) + 0.3;
      bottomGrip.position.y = -(currentGaugeHeight / 2) - 0.3;
    }

    // Specimen color turns orange/red where stress/strain is localized
    const baseColor = new THREE.Color(0x475569); // Slate-500 metal
    const strainColor = new THREE.Color(0xf97316); // Strain orange glow

    // Update gauge segment dimensions & positions
    const numSegs = segments.length;
    
    segments.forEach((seg, idx) => {
      // Resting position coordinate from -0.5 to +0.5
      const t = (idx - (numSegs - 1) / 2) / numSegs; // -0.5 to 0.5
      
      // Calculate active position along stretched Y-axis
      let posY = t * currentGaugeHeight;
      
      if (isSnapped) {
        const gap = 0.25;
        posY += (t > 0 ? gap : -gap);
      }

      seg.position.y = posY;

      // Calculate radius contraction
      let rContr = uniformShrink;

      // Apply necking localization near the center (index ~7)
      if (activeStrain > e_uts && material !== 'iron') {
        const neckDist = Math.abs(t) * 2; // distance from center (0 to 1)
        const neckFactor = Math.max(0.0, 1.0 - neckDist); // peaks at 1.0 in center
        
        // Progress of necking post-UTS (0 to 1)
        const neckProgress = (activeStrain - e_uts) / (ef - e_uts);
        
        // Specimen thins down in the middle by up to 50%
        const maxNeckCollapse = material === 'polyethylene' ? 0.4 : 0.55;
        rContr *= (1.0 - maxNeckCollapse * neckProgress * Math.pow(neckFactor, 2.5));
      }

      // Visual dimensions of segment
      const initialRadius = 0.2;
      const currentRadius = initialRadius * rContr;

      seg.scale.set(currentRadius / initialRadius, 1.0, currentRadius / initialRadius);

      // Color the segments based on localized stress/deformation
      // Neck center segment gets hot orange glow
      const stressRatio = activeStrain > e_uts 
        ? Math.max(0.0, 1.0 - Math.abs(t) * 3) * ((activeStrain - e_uts) / (ef - e_uts))
        : (activeStrain / e_uts) * 0.25;

      const segColor = baseColor.clone().lerp(strainColor, Math.min(stressRatio, 1.0));
      seg.material.color.copy(segColor);

      if (isSnapped && Math.abs(idx - (numSegs - 1) / 2) < 0.8) {
        // Hide the very center segment to show the break
        seg.visible = false;
      } else {
        seg.visible = true;
      }
    });

  }, [material, strainInput, activeStrain, sceneReady]);

  // --- Three.js Setup Specimen ---
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a); // slate-900

    const width = container.clientWidth;
    const height = container.clientHeight || 340;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 50);
    camera.position.set(0.0, 0.0, 2.8);

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

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 5, 5);
    scene.add(dirLight);

    // Grip models (Wider cylinders holding top and bottom)
    const gripGeom = new THREE.CylinderGeometry(0.32, 0.32, 0.4, 20);
    const gripMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6, metalness: 0.5 });
    
    const topGrip = new THREE.Mesh(gripGeom, gripMat);
    topGrip.position.set(0, 0.8, 0);
    scene.add(topGrip);
    mountRef.current.topGrip = topGrip;

    const bottomGrip = new THREE.Mesh(gripGeom, gripMat);
    bottomGrip.position.set(0, -0.8, 0);
    scene.add(bottomGrip);
    mountRef.current.bottomGrip = bottomGrip;

    // Build the gauge section as a series of segmented cylinders
    const numSegs = 15;
    const segHeight = 1.0 / numSegs;
    const segGeom = new THREE.CylinderGeometry(0.2, 0.2, segHeight, 16);
    
    const segments = [];
    for (let i = 0; i < numSegs; i++) {
      const segMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.3 });
      const segMesh = new THREE.Mesh(segGeom, segMat);
      scene.add(segMesh);
      segments.push(segMesh);
    }
    mountRef.current.gaugeSegments = segments;

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
        topGrip: null,
        bottomGrip: null,
        gaugeSegments: []
      };
      setSceneReady(false);
    };
  }, []);

  // --- Draw the Stress-Strain Curve Chart ---
  useEffect(() => {
    const canvas = plotRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    // Reset and draw background
    ctx.fillStyle = '#090d16'; // Dark tech backdrop
    ctx.fillRect(0, 0, w, h);

    const paddingLeft = 55;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 40;

    const graphWidth = w - paddingLeft - paddingRight;
    const graphHeight = h - paddingTop - paddingBottom;

    // X Max / Y Max values based on material (to scale graph axes dynamically)
    const xMax = ef * 1.1;
    const yMax = Math.max(sf, true_sf, s_uts) * 1.15;

    // Coordinate converters
    const toScreenX = (strainVal) => paddingLeft + (strainVal / xMax) * graphWidth;
    const toScreenY = (stressVal) => h - paddingBottom - (stressVal / yMax) * graphHeight;

    // Gridlines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    
    // Y Gridlines
    const numYGrid = 5;
    for (let i = 0; i <= numYGrid; i++) {
      const stressVal = (i / numYGrid) * yMax;
      const sy = toScreenY(stressVal);
      ctx.beginPath();
      ctx.moveTo(paddingLeft, sy);
      ctx.lineTo(w - paddingRight, sy);
      ctx.stroke();

      // Axis label
      ctx.fillStyle = '#64748b';
      ctx.font = '10px Outfit, Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(stressVal.toFixed(0), paddingLeft - 8, sy + 3);
    }

    // X Gridlines
    const numXGrid = 5;
    for (let i = 0; i <= numXGrid; i++) {
      const strainVal = (i / numXGrid) * xMax;
      const sx = toScreenX(strainVal);
      ctx.beginPath();
      ctx.moveTo(sx, paddingTop);
      ctx.lineTo(sx, h - paddingBottom);
      ctx.stroke();

      // Axis label
      ctx.fillStyle = '#64748b';
      ctx.font = '10px Outfit, Inter, sans-serif';
      ctx.textAlign = 'center';
      const labelText = material === 'polyethylene' 
        ? `${(strainVal * 100).toFixed(0)}%` 
        : strainVal.toFixed(2);
      ctx.fillText(labelText, sx, h - paddingBottom + 14);
    }

    // Draw Engineering Curve (Solid Cyan)
    if (curveView === 'engineering' || curveView === 'compare') {
      ctx.beginPath();
      ctx.strokeStyle = '#06b6d4'; // Cyan
      ctx.lineWidth = 2.5;
      engPoints.forEach((pt, idx) => {
        const sx = toScreenX(pt.strain);
        const sy = toScreenY(pt.stress);
        if (idx === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      });
      ctx.stroke();
    }

    // Draw True Curve (Dashed Purple)
    if (curveView === 'true' || curveView === 'compare') {
      ctx.beginPath();
      ctx.strokeStyle = '#a855f7'; // Purple
      ctx.lineWidth = 2.5;
      if (curveView === 'compare') {
        ctx.setLineDash([5, 4]); // Dashed line for true curve comparison
      }
      truePoints.forEach((pt, idx) => {
        const sx = toScreenX(pt.strain);
        const sy = toScreenY(pt.stress);
        if (idx === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      });
      ctx.stroke();
      ctx.setLineDash([]); // Reset dash
    }

    // Draw current tracking marker crosshair
    const isSnapped = strainInput >= 0.97;
    
    if (activeStrain > 0 && !isSnapped) {
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      
      // Engineering marker
      if (curveView === 'engineering' || curveView === 'compare') {
        const mx = toScreenX(activeStrain);
        const my = toScreenY(currentEngStress);
        
        ctx.beginPath();
        ctx.arc(mx, my, 5, 0, 2 * Math.PI);
        ctx.fillStyle = '#06b6d4';
        ctx.fill();
        ctx.stroke();
      }

      // True marker
      if (curveView === 'true' || curveView === 'compare') {
        const mx = toScreenX(currentTrueStrain);
        const my = toScreenY(currentTrueStress);
        
        ctx.beginPath();
        ctx.arc(mx, my, 5, 0, 2 * Math.PI);
        ctx.fillStyle = '#a855f7';
        ctx.fill();
        ctx.stroke();
      }
    }

    // Axis titles
    ctx.fillStyle = '#f8fafc';
    ctx.font = '11px Outfit, Inter, sans-serif';
    ctx.textAlign = 'center';
    
    // X-Axis
    const xLabel = material === 'polyethylene' ? 'Engineering Strain (%)' : 'Engineering Strain (e = ΔL/L₀)';
    ctx.fillText(xLabel, paddingLeft + graphWidth / 2, h - 6);

    // Y-Axis (rotated)
    ctx.save();
    ctx.translate(14, paddingTop + graphHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Stress (MPa)', 0, 0);
    ctx.restore();

    // Chart Legend
    ctx.font = '9px Outfit, Inter, sans-serif';
    ctx.textAlign = 'left';
    if (curveView === 'compare') {
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(paddingLeft + 15, paddingTop + 10, 12, 3);
      ctx.fillText('Engineering (s = P / A₀)', paddingLeft + 32, paddingTop + 13);

      ctx.fillStyle = '#a855f7';
      ctx.fillRect(paddingLeft + 15, paddingTop + 22, 12, 3);
      ctx.fillText('True (σ = P / A_inst)', paddingLeft + 32, paddingTop + 25);
    }

  }, [material, curveView, strainInput, activeStrain, currentEngStress, currentTrueStrain, currentTrueStress]);

  // Quiz navigation handlers
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

  const handleNextQuizQuestion = () => {
    setQuizState(prev => ({
      ...prev,
      currentQuestionIndex: (prev.currentQuestionIndex + 1) % quizQuestions.length,
      selectedOption: null,
      isAnswered: false,
      showAnswer: false
    }));
  };

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
          <span className="logo-icon">🏋️‍♂️</span>
          <h1>Tensile Testing Lab</h1>
        </div>
        <p className="header-subtitle">Evaluate Tensile Limits, Necking Instability, and True Stress Curves</p>
      </header>

      <main className="app-content">
        {/* Left Column: 3D Visualizer and Stress-Strain Plot */}
        <div className="left-column" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* 3D Dogbone Specimen View */}
          <div className="viewer-card card" style={{ height: '340px' }}>
            <h3 style={{ position: 'absolute', top: '12px', left: '16px', zIndex: 1 }}>3D Specimen Deformation</h3>
            <div ref={containerRef} style={{ width: '100%', height: '100%', borderRadius: '12px', overflow: 'hidden' }} />
            <div className="axes-legend" style={{ zIndex: 1, bottom: '16px', left: '16px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                {strainInput >= 0.97 && material !== 'polyethylene' 
                  ? '💥 Specimen Snap / Fracture Failure' 
                  : activeStrain > e_uts && material !== 'iron'
                    ? '🔥 Localized Necking Active' 
                    : '⚓ Uniform Specimen Elongation'}
              </span>
            </div>
          </div>

          {/* Stress Strain Chart Canvas */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <h3>Stress vs. Strain Curve Plot</h3>
            <p className="subtitle">Real-time load tracking on the tensile characteristic curves.</p>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px' }}>
              <canvas ref={plotRef} width="440" height="250" style={{ maxWidth: '100%', background: '#090d16', borderRadius: '8px', border: '1px solid var(--panel-border)' }} />
            </div>
          </div>

        </div>

        {/* Right Column: Parameters and stats */}
        <div className="right-column">
          
          {/* Toggle explore / quiz */}
          <div className="view-mode-tabs" style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
            <button 
              className={`mode-tab-btn ${mode === 'explore' ? 'active' : ''}`}
              onClick={() => setMode('explore')}
              style={{ flex: 1, padding: '10px', fontSize: '0.82rem', fontWeight: 700 }}
            >
              🔍 Tester Explorer
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
              {/* Material Selector */}
              <div className="card" style={{ padding: '16px 20px' }}>
                <label className="index-label" style={{ display: 'block', marginBottom: '4px' }}>Select Specimen Material:</label>
                <select 
                  className="structure-select"
                  value={material}
                  onChange={(e) => {
                    setMaterial(e.target.value);
                    setStrainInput(0.0); // Reset strain
                  }}
                >
                  <option value="steel">Structural Steel (A36)</option>
                  <option value="aluminum">Aluminum 6061-T6</option>
                  <option value="iron">Gray Cast Iron (Brittle)</option>
                  <option value="polyethylene">Polyethylene (HDPE)</option>
                </select>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: '1.4' }}>
                  {activeProfile.description}
                </p>
              </div>

              {/* Stress-Strain Curve View selector */}
              <div className="card" style={{ padding: '16px 20px' }}>
                <label className="index-label" style={{ display: 'block', marginBottom: '4px' }}>Curve Plot Mode:</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginTop: '8px' }}>
                  <button 
                    className={`preset-btn ${curveView === 'engineering' ? 'active-preset' : ''}`}
                    onClick={() => setCurveView('engineering')}
                    style={{ fontSize: '0.72rem' }}
                  >
                    Eng Curve
                  </button>
                  <button 
                    className={`preset-btn ${curveView === 'true' ? 'active-preset' : ''}`}
                    onClick={() => setCurveView('true')}
                    style={{ fontSize: '0.72rem' }}
                  >
                    True Curve
                  </button>
                  <button 
                    className={`preset-btn ${curveView === 'compare' ? 'active-preset' : ''}`}
                    onClick={() => setCurveView('compare')}
                    style={{ fontSize: '0.72rem' }}
                  >
                    Compare Both
                  </button>
                </div>
              </div>

              {/* Strain Slider Controls */}
              <div className="control-panel card">
                <h3>Tensile Tester Controls</h3>
                
                <div className="section" style={{ border: 'none', padding: 0 }}>
                  <div className="index-row">
                    <span className="index-label">Apply Specimen Strain (ε<sub>eng</sub>)</span>
                    <span className="index-value" style={{ color: '#06b6d4' }}>
                      {(activeStrain * 100).toFixed(2)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="1.0"
                    step="0.01"
                    value={strainInput}
                    onChange={(e) => setStrainInput(parseFloat(e.target.value))}
                    style={{ width: '100%', marginTop: '12px' }}
                  />
                  <p className="helper-text" style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {strainInput >= 0.97 && material !== 'polyethylene' 
                      ? 'The specimen has reached its fracture limit and snapped.' 
                      : activeStrain > e_uts && material !== 'iron' 
                        ? 'Yield exceeded. Unstable local necking is contracting the central gauge area.' 
                        : 'Uniform tensile load is stretching the specimen lattice structure.'}
                  </p>
                </div>
              </div>

              {/* Tensile Stats Card */}
              <div className="card">
                <h3>Experimental Statistics</h3>
                <p className="subtitle">Real-time parameters for the active tensile specimen.</p>
                
                <div className="math-block" style={{ marginTop: '12px', fontSize: '0.82rem', lineHeight: '1.7' }}>
                  • Elastic Modulus (E): <strong>{activeProfile.E.toFixed(1)} GPa</strong><br />
                  • Applied Strain (e): <strong>{activeStrain.toFixed(4)}</strong><br />
                  • Engineering Stress (s): <strong>{currentEngStress.toFixed(1)} MPa</strong><br />
                  • True Stress (σ): <strong>{currentTrueStress.toFixed(1)} MPa</strong><br />
                  • Instantaneous Grip Load (P): <strong>{currentLoad.toFixed(2)} kN</strong><br />
                  • Actual Area (A): <strong>{currentActualArea.toFixed(2)} mm<sup>2</sup></strong>
                </div>

                <p style={{ fontSize: '0.75rem', marginTop: '8px', lineHeight: '1.4', color: 'var(--text-secondary)' }}>
                  *Notice how the **True Stress** diverges upwards from **Engineering Stress** as strain increases, especially in the necking region where the actual area collapses.
                </p>
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
                      className="preset-btn"
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

      {/* Tensile Mechanics Tutorial Card */}
      <section className="math-explanation card" style={{ marginTop: '24px', width: '100%' }}>
        <h3>Fundamentals of Tensile Strain & Specimen Necking</h3>
        <p className="subtitle">Understanding mathematical stress models and plastic instabilities under uniaxial loads.</p>
        <div className="steps-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          
          <div>
            <h4>1. Engineering vs. True Definitions</h4>
            <p style={{ fontSize: '0.85rem', lineHeight: '1.5' }}>
              • <strong>Engineering stress (s):</strong> Force divided by the original cross-section area: s = P / A₀.<br />
              • <strong>True stress (σ):</strong> Force divided by the actual instantaneous cross-section area: σ = P / A.<br />
              • <strong>Engineering strain (e):</strong> Linear deformation: e = ΔL / L₀.<br />
              • <strong>True strain (ε):</strong> Integrates instantaneous deformations: ε = ln(1 + e) (pre-necking).
            </p>
          </div>

          <div>
            <h4>2. Necking Instability (Considère's Criterion)</h4>
            <p style={{ fontSize: '0.85rem', lineHeight: '1.5' }}>
              Uniform plastic strain increases a material's load capacity due to strain hardening. However, as the specimen stretches, its cross-sectional area contracts.
              <br /><br />
              At the Ultimate Tensile Strength (UTS), the increase in stress due to strain hardening is exactly balanced by the decrease in cross-sectional area: dσ / dε = σ.
              Beyond this point, deformation localizes in a small zone, forming a visible **neck**.
            </p>
          </div>

          <div>
            <h4>3. Fracture Failure Modes</h4>
            <p style={{ fontSize: '0.85rem', lineHeight: '1.5' }}>
              • <strong>Cup-and-Cone (Steel & Aluminum):</strong> Highly ductile fracture. Localized void coalescence inside the neck forms a micro-void network, fracturing along a 45-degree shear angle near the edges.
              <br />
              • <strong>Cleavage Snap (Cast Iron):</strong> Brittle fracture. Crystalline boundaries separate rapidly along cleavage planes with near-zero energy absorption.
            </p>
          </div>

        </div>
      </section>

      <footer className="app-footer">
        <p>&copy; {new Date().getFullYear()} Mechanical Metallurgy Laboratory. Built with Node, Three.js & HTML5 Canvas.</p>
      </footer>
    </div>
  );
}
