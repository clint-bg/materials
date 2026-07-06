import React from 'react';
import crystalLabPreview from '../assets/crystal_lab_preview.jpg';
import xrdLabPreview from '../assets/xrd_lab_preview.jpg';
import defectLabPreview from '../assets/defect_lab_preview.jpg';
import densityLabPreview from '../assets/density_lab_preview.jpg';

export default function Home({ onLaunchLab }) {
  const labs = [
    {
      id: 'crystal_lab',
      title: 'Crystal Plane Lab',
      subtitle: 'Crystallography & Miller Indices',
      description: 'Explore 3D Bravais lattices (SC, BCC, FCC). Test your ability to identify and construct Miller indices (hkl) planes with interactive 3D slices.',
      image: crystalLabPreview,
      active: true,
      difficulty: 'Medium',
      topic: 'Materials Engineering'
    },
    {
      id: 'diffraction_lab',
      title: "Bragg's Law XRD Simulator",
      subtitle: 'X-Ray Diffraction Physics',
      description: 'Simulate monochromatic wave scattering through lattice planes. Learn how path length difference creates constructive diffraction peaks.',
      image: xrdLabPreview,
      active: true,
      difficulty: 'Hard',
      topic: 'Solid State Physics'
    },
    {
      id: 'defect_lab',
      title: 'Lattice Defect Visualizer',
      subtitle: 'Vacancies, Interstitials & Dislocations',
      description: 'Examine common crystal lattice defects in 3D. Simulate how interstitial impurities and dislocations shift atomic bounds.',
      image: defectLabPreview,
      active: true,
      difficulty: 'Medium',
      topic: 'Materials Science'
    },
    {
      id: 'density_lab',
      title: 'Planar Density Lab',
      subtitle: 'Crystal Packing & Miller Slices',
      description: 'Slice 3D crystal systems—including NaCl (Rock Salt), ZnS (Zinc Blende), CaF₂ (Fluorite), and BaTiO₃ (Perovskite)—with arbitrary Miller planes. Analyze 2D cross-sections and calculate planar packing densities in real time.',
      image: densityLabPreview,
      active: true,
      difficulty: 'Hard',
      topic: 'Materials Crystallography'
    }
  ];

  return (
    <div className="home-container">
      <header className="home-header">
        <div className="home-title-row">
          <span className="logo-icon animate-spin">💠</span>
          <h1>Virtual Chem-Eng Lab</h1>
        </div>
        <p className="home-subtitle">Interactive 3D Simulations for Chemistry & Materials Science</p>
      </header>

      <main className="home-dashboard">
        <h2 className="dashboard-title">Select a Virtual Laboratory</h2>
        <div className="labs-grid">
          {labs.map((lab) => (
            <div 
              key={lab.id} 
              className={`lab-card card ${lab.active ? 'active-lab' : 'disabled-lab'}`}
              onClick={lab.active ? () => onLaunchLab(lab.id) : null}
            >
              <div className="lab-card-image-container">
                {lab.image ? (
                  <img src={lab.image} alt={lab.title} className="lab-card-img" />
                ) : (
                  <div className="lab-card-placeholder">
                    <span>🔬 Coming Soon</span>
                  </div>
                )}
                <div className="lab-badges">
                  <span className="lab-badge topic-badge">{lab.topic}</span>
                </div>
              </div>

              <div className="lab-card-content">
                <div className="lab-card-header">
                  <h3>{lab.title}</h3>
                  <span className="lab-subtitle-text">{lab.subtitle}</span>
                </div>
                <p className="lab-desc">{lab.description}</p>
                <div className="lab-action-row">
                  {lab.active ? (
                    <button 
                      className="launch-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onLaunchLab(lab.id);
                      }}
                    >
                      Launch Simulator ➡️
                    </button>
                  ) : (
                    <span className="coming-soon-label">Simulation Under Construction</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="app-footer">
        <p>&copy; {new Date().getFullYear()} Virtual Chem-Eng Laboratory Portal. All Rights Reserved.</p>
      </footer>
    </div>
  );
}
