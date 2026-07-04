import React, { useState } from 'react';
import Home from './pages/Home';
import CrystalLab from './pages/CrystalLab';

export default function App() {
  const [currentView, setCurrentView] = useState('home'); // 'home' | 'crystal_lab'

  return (
    <>
      {currentView === 'home' && (
        <Home onLaunchLab={(labId) => {
          if (labId === 'crystal_lab') {
            setCurrentView('crystal_lab');
          }
        }} />
      )}
      {currentView === 'crystal_lab' && (
        <CrystalLab onBack={() => setCurrentView('home')} />
      )}
    </>
  );
}
