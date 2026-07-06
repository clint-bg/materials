import React, { useState } from 'react';
import Home from './pages/Home';
import CrystalLab from './pages/CrystalLab';
import DiffractionLab from './pages/DiffractionLab';
import DefectLab from './pages/DefectLab';
import DensityLab from './pages/DensityLab';
import PolymerLab from './pages/PolymerLab';
import TensileLab from './pages/TensileLab';

export default function App() {
  const [currentView, setCurrentView] = useState('home'); // 'home' | 'crystal_lab' | 'diffraction_lab' | 'defect_lab' | 'density_lab' | 'polymer_lab' | 'tensile_lab'

  return (
    <>
      {currentView === 'home' && (
        <Home onLaunchLab={(labId) => {
          if (labId === 'crystal_lab') {
            setCurrentView('crystal_lab');
          } else if (labId === 'diffraction_lab') {
            setCurrentView('diffraction_lab');
          } else if (labId === 'defect_lab') {
            setCurrentView('defect_lab');
          } else if (labId === 'density_lab') {
            setCurrentView('density_lab');
          } else if (labId === 'polymer_lab') {
            setCurrentView('polymer_lab');
          } else if (labId === 'tensile_lab') {
            setCurrentView('tensile_lab');
          }
        }} />
      )}
      {currentView === 'crystal_lab' && (
        <CrystalLab onBack={() => setCurrentView('home')} />
      )}
      {currentView === 'diffraction_lab' && (
        <DiffractionLab onBack={() => setCurrentView('home')} />
      )}
      {currentView === 'defect_lab' && (
        <DefectLab onBack={() => setCurrentView('home')} />
      )}
      {currentView === 'density_lab' && (
        <DensityLab onBack={() => setCurrentView('home')} />
      )}
      {currentView === 'polymer_lab' && (
        <PolymerLab onBack={() => setCurrentView('home')} />
      )}
      {currentView === 'tensile_lab' && (
        <TensileLab onBack={() => setCurrentView('home')} />
      )}
    </>
  );
}
