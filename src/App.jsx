import React, { useState } from 'react';
import Home from './pages/Home';
import CrystalLab from './pages/CrystalLab';
import DiffractionLab from './pages/DiffractionLab';

export default function App() {
  const [currentView, setCurrentView] = useState('home'); // 'home' | 'crystal_lab' | 'diffraction_lab'

  return (
    <>
      {currentView === 'home' && (
        <Home onLaunchLab={(labId) => {
          if (labId === 'crystal_lab') {
            setCurrentView('crystal_lab');
          } else if (labId === 'diffraction_lab') {
            setCurrentView('diffraction_lab');
          }
        }} />
      )}
      {currentView === 'crystal_lab' && (
        <CrystalLab onBack={() => setCurrentView('home')} />
      )}
      {currentView === 'diffraction_lab' && (
        <DiffractionLab onBack={() => setCurrentView('home')} />
      )}
    </>
  );
}
