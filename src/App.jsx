import React, { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { KeyboardControls } from '@react-three/drei';
import { Scene } from './Scene';
import { Visuals } from './components/Visuals';
import { useGameStore } from './store/useGameStore';
import { Heart, Trophy, RefreshCw, Play } from 'lucide-react';
import * as THREE from 'three';
import './App.css';

const keyboardMap = [
  { name: 'left', keys: ['ArrowLeft', 'KeyA'] },
  { name: 'right', keys: ['ArrowRight', 'KeyD'] },
  { name: 'jump', keys: ['Space'] },
];

function App() {
  const points = useGameStore((state) => state.points);
  const lives = useGameStore((state) => state.lives);
  const gameState = useGameStore((state) => state.gameState);
  const setGameState = useGameStore((state) => state.setGameState);
  const reset = useGameStore((state) => state.reset);

  // Watch lives to trigger Game Over
  useEffect(() => {
    if (lives <= 0 && gameState === 'PLAYING') {
      setGameState('GAMEOVER');
    }
  }, [lives, gameState, setGameState]);

  return (
    <KeyboardControls map={keyboardMap}>
      <div className="game-container">
        
        {/* ========================================================
            1. START MENU OVERLAY
           ======================================================== */}
        {gameState === 'START' && (
          <div className="menu-overlay start-screen">
            <div className="menu-content glass-panel">
              <h1 className="title-logo animate-pulse">VEGA</h1>
              <p className="subtitle">Universal Game Construction Kit</p>
              
              <div className="controls-guide">
                <h3>🎮 CONTROLS</h3>
                <div className="guide-grid">
                  <div><kbd>A</kbd> <kbd>D</kbd> or <kbd>←</kbd> <kbd>→</kbd></div>
                  <span>Lane Switch Left / Right</span>
                  <div><kbd>Space</kbd></div>
                  <span>Jump</span>
                </div>
              </div>

              <button className="btn-primary animate-glow" onClick={() => setGameState('PLAYING')}>
                <Play size={20} fill="currentColor" /> START ENGINE
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            2. GAME OVER OVERLAY
           ======================================================== */}
        {gameState === 'GAMEOVER' && (
          <div className="menu-overlay game-over-screen">
            <div className="menu-content glass-panel border-red">
              <h1 className="title-logo red-glow">GAME OVER</h1>
              <p className="subtitle">System critical. Engine core depleted.</p>
 
              <div className="score-summary">
                <Trophy size={32} color="#FFD700" />
                <span className="final-score">{points} PTS</span>
              </div>

              <button className="btn-primary btn-retry" onClick={() => reset()}>
                <RefreshCw size={18} /> RESTART SIMULATION
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            3. IN-GAME HUD
           ======================================================== */}
        {gameState === 'PLAYING' && (
          <div className="hud glass-panel">
            <div className="hud-metric">
              <Trophy size={18} className="icon-gold" />
              <span>SCORE: <strong>{points}</strong></span>
            </div>
            
            <div className="hud-metric">
              <Heart size={18} className="icon-red" />
              <span>LIVES: {Array.from({ length: 3 }).map((_, i) => (
                <span key={i} className={`heart-dot ${i < lives ? 'active' : 'depleted'}`}>❤</span>
              ))}</span>
            </div>
          </div>
        )}

        {/* ========================================================
            4. THE 3D CANVAS WORLD WITH HIGH-FIDELITY HDR CONFIG
           ======================================================== */}
        <div className={`canvas-wrapper ${gameState !== 'PLAYING' ? 'blurred' : ''}`}>
          <Canvas 
            shadows 
            gl={{ 
              antialias: true, 
              powerPreference: "high-performance",
              toneMapping: THREE.AgXToneMapping, 
              toneMappingExposure: 1.45
            }}
          >
            <Scene>
              <Visuals />
            </Scene>
          </Canvas>
        </div>
      </div>
    </KeyboardControls>
  );
}

export default App;

