import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { getPlaneVertices } from '../utils/crystalMath';
import { LATTICES } from '../utils/lattices';

export default function CrystalViewer({
  latticeType,
  millerIndices, // [h, k, l]
  mode,          // 'explore' | 'quiz_identify' | 'quiz_construct'
  constructIntercepts, // { x: val, y: val, z: val } e.g. 1, 0.5, 0.333, null (infinity)
  onSelectIntercept,  // callback (axis, value)
  showAnswer          // in quiz_identify, shows the actual plane
}) {
  const containerRef = useRef(null);
  const mountRef = useRef({
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    planeMesh: null,
    originMarker: null,
    handles: [],
    atomMeshes: []
  });

  // Track state in refs for Three.js click event handlers to avoid stale closures
  const stateRef = useRef({ mode, constructIntercepts, onSelectIntercept });
  useEffect(() => {
    stateRef.current = { mode, constructIntercepts, onSelectIntercept };
  }, [mode, constructIntercepts, onSelectIntercept]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Setup Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a); // Tailwind slate-900

    const width = container.clientWidth;
    const height = container.clientHeight || 450;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 50);
    camera.position.set(2.2, 1.8, 2.6);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 2. Setup Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 10;
    controls.minDistance = 1.2;
    controls.target.set(0.5, 0.5, 0.5);

    // Save refs for updates and teardown
    mountRef.current.scene = scene;
    mountRef.current.camera = camera;
    mountRef.current.renderer = renderer;
    mountRef.current.controls = controls;

    // 3. Add Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight1.position.set(5, 5, 5);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x06b6d4, 0.3); // Cyan glow light
    dirLight2.position.set(-5, 2, -2);
    scene.add(dirLight2);

    // 4. Create Grid / Unit Cell Box
    const boxGeom = new THREE.BoxGeometry(1, 1, 1);
    // Position geometry so coordinates are in [0, 1]^3 range
    boxGeom.translate(0.5, 0.5, 0.5);
    const edges = new THREE.EdgesGeometry(boxGeom);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x475569, // Slate-600
      linewidth: 2
    });
    const unitCellLines = new THREE.LineSegments(edges, lineMat);
    scene.add(unitCellLines);

    // 5. Draw Coordinate Axes (X: Red, Y: Green, Z: Blue)
    const axisLen = 1.5;
    const createAxis = (dir, color, label) => {
      const points = [new THREE.Vector3(0, 0, 0), dir.clone().multiplyScalar(axisLen)];
      const geom = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({ color, linewidth: 3 });
      const line = new THREE.Line(geom, mat);
      scene.add(line);

      // Add a small cone at the end
      const coneGeom = new THREE.ConeGeometry(0.03, 0.1, 16);
      coneGeom.translate(0, 0.05, 0);
      const coneMat = new THREE.MeshBasicMaterial({ color });
      const cone = new THREE.Mesh(coneGeom, coneMat);
      
      // Orient the cone
      if (dir.x > 0) {
        cone.rotation.z = -Math.PI / 2;
        cone.position.set(axisLen, 0, 0);
      } else if (dir.y > 0) {
        cone.position.set(0, axisLen, 0);
      } else if (dir.z > 0) {
        cone.rotation.x = Math.PI / 2;
        cone.position.set(0, 0, axisLen);
      }
      scene.add(cone);
    };

    createAxis(new THREE.Vector3(1, 0, 0), 0xef4444, 'X'); // Red
    createAxis(new THREE.Vector3(0, 1, 0), 0x22c55e, 'Y'); // Green
    createAxis(new THREE.Vector3(0, 0, 1), 0x3b82f6, 'Z'); // Blue

    // 6. Raycasting Setup for Intercept Clicking (Construct Mode)
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleCanvasClick = (event) => {
      // Only clickable in construct mode
      if (stateRef.current.mode !== 'quiz_construct') return;

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(mountRef.current.handles);

      if (intersects.length > 0) {
        const clickedHandle = intersects[0].object;
        const { axis, value } = clickedHandle.userData;
        if (stateRef.current.onSelectIntercept) {
          stateRef.current.onSelectIntercept(axis, value);
        }
      }
    };

    renderer.domElement.addEventListener('mousedown', handleCanvasClick);

    // 7. Animation loop
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
      const h = container.clientHeight || 450;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement) {
        renderer.domElement.removeEventListener('mousedown', handleCanvasClick);
        container.removeChild(renderer.domElement);
      }
      
      // Dispose materials/geometries
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      renderer.dispose();
    };
  }, []);

  // Update lattice atoms, plane, and handles when props change
  useEffect(() => {
    const scene = mountRef.current.scene;
    if (!scene) return;

    // --- A. Render Atoms ---
    // Clear old atoms
    mountRef.current.atomMeshes.forEach((mesh) => scene.remove(mesh));
    mountRef.current.atomMeshes = [];

    const lattice = LATTICES[latticeType];
    if (lattice) {
      const atomGeom = new THREE.SphereGeometry(0.09, 32, 32);
      
      lattice.atoms.forEach((atom) => {
        let color = 0x64748b; // corner: slate
        let sizeMultiplier = 1;
        if (atom.type === 'body') {
          color = 0xf59e0b; // body-center: amber
          sizeMultiplier = 1.1;
        } else if (atom.type === 'face') {
          color = 0x10b981; // face-center: emerald
          sizeMultiplier = 1.05;
        }

        const atomMat = new THREE.MeshStandardMaterial({
          color,
          roughness: 0.2,
          metalness: 0.1,
          transparent: true,
          opacity: 0.75
        });

        const mesh = new THREE.Mesh(atomGeom, atomMat);
        mesh.scale.set(sizeMultiplier, sizeMultiplier, sizeMultiplier);
        mesh.position.set(atom.pos[0], atom.pos[1], atom.pos[2]);
        scene.add(mesh);
        mountRef.current.atomMeshes.push(mesh);
      });
    }

    // --- B. Render Plane ---
    // Clear old plane
    if (mountRef.current.planeMesh) {
      scene.remove(mountRef.current.planeMesh);
      mountRef.current.planeMesh.geometry.dispose();
      mountRef.current.planeMesh = null;
    }

    // Determine what plane to draw
    let activeIndices = millerIndices;
    let shouldDrawPlane = true;

    if (mode === 'quiz_construct') {
      // In construct mode, we construct indices based on user selected intercepts
      const { x, y, z } = constructIntercepts;
      
      // Calculate indices from intercepts (reciprocals)
      // Example: x=0.5 (intercept at 1/2) -> h = 1/0.5 = 2.
      // If x=null (infinity) -> h = 0.
      const getIndex = (val) => {
        if (val === null) return 0;
        const rec = 1 / val;
        // Snap to closest integer to avoid float precision
        return Math.round(rec);
      };

      const h = getIndex(x);
      const k = getIndex(y);
      const l = getIndex(z);
      
      activeIndices = [h, k, l];
      shouldDrawPlane = (h !== 0 || k !== 0 || l !== 0);
    }

    if (shouldDrawPlane) {
      const [h, k, l] = activeIndices;
      const vertices = getPlaneVertices(h, k, l);

      if (vertices.length >= 3) {
        // Construct mesh
        const geom = new THREE.BufferGeometry();
        const positions = [];

        // Triangulate using triangle fan around vertex 0
        for (let i = 1; i < vertices.length - 1; i++) {
          positions.push(...vertices[0]);
          positions.push(...vertices[i]);
          positions.push(...vertices[i + 1]);
        }

        geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geom.computeVertexNormals();

        // Beautiful glassmorphism material for the plane
        const planeMat = new THREE.MeshStandardMaterial({
          color: mode === 'quiz_construct' ? 0xd946ef : 0x06b6d4, // Magenta for construct, Cyan for explore/identify
          transparent: true,
          opacity: 0.65,
          side: THREE.DoubleSide,
          roughness: 0.1,
          metalness: 0.2,
          shadowSide: THREE.DoubleSide
        });

        const mesh = new THREE.Mesh(geom, planeMat);
        scene.add(mesh);
        mountRef.current.planeMesh = mesh;
      }
    }

    // --- C. Render Shifted Origin ---
    if (mountRef.current.originMarker) {
      scene.remove(mountRef.current.originMarker);
      mountRef.current.originMarker = null;
    }

    if (mode === 'explore' || mode === 'quiz_identify') {
      const [h, k, l] = activeIndices;
      const xo = h < 0 ? 1 : 0;
      const yo = k < 0 ? 1 : 0;
      const zo = l < 0 ? 1 : 0;

      // Only draw marker if origin shifted
      if (xo !== 0 || yo !== 0 || zo !== 0) {
        const markerGeom = new THREE.SphereGeometry(0.04, 16, 16);
        const markerMat = new THREE.MeshBasicMaterial({ color: 0xeab308 }); // Yellow origin marker
        const marker = new THREE.Mesh(markerGeom, markerMat);
        marker.position.set(xo, yo, zo);
        scene.add(marker);
        mountRef.current.originMarker = marker;
      }
    }

    // --- D. Render Clickable Handles (Construct Mode) ---
    // Clear old handles
    mountRef.current.handles.forEach((h) => scene.remove(h));
    mountRef.current.handles = [];

    if (mode === 'quiz_construct') {
      const handleGeom = new THREE.SphereGeometry(0.05, 16, 16);
      
      const values = [1, 0.5, 0.333, -1, -0.5, -0.333];
      const axes = [
        { name: 'x', dir: new THREE.Vector3(1, 0, 0), color: 0xef4444 },
        { name: 'y', dir: new THREE.Vector3(0, 1, 0), color: 0x22c55e },
        { name: 'z', dir: new THREE.Vector3(0, 0, 1), color: 0x3b82f6 }
      ];

      axes.forEach(({ name: axisName, dir, color }) => {
        values.forEach((val) => {
          const isSelected = constructIntercepts[axisName] === val;
          
          // Handles can be styled differently if selected
          const handleMat = new THREE.MeshStandardMaterial({
            color: isSelected ? 0xd946ef : color, // Highlight selected in magenta
            roughness: 0.1,
            metalness: 0.5,
            emissive: isSelected ? 0xd946ef : 0x000000,
            emissiveIntensity: isSelected ? 0.6 : 0
          });

          const mesh = new THREE.Mesh(handleGeom, handleMat);
          // Position it along the axis: dir * val.
          // Note: coordinates can go negative, which is fine since we shift origin.
          mesh.position.copy(dir).multiplyScalar(val);
          mesh.userData = { axis: axisName, value: val };
          scene.add(mesh);
          mountRef.current.handles.push(mesh);
        });
      });
    }

  }, [latticeType, millerIndices, mode, constructIntercepts, showAnswer]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '380px' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%', borderRadius: '12px', overflow: 'hidden', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)' }} />
      <div className="axes-legend">
        <span className="axis-badge axis-x">X Axis (h)</span>
        <span className="axis-badge axis-y">Y Axis (k)</span>
        <span className="axis-badge axis-z">Z Axis (l)</span>
      </div>
    </div>
  );
}
