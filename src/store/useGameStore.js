import { create } from 'zustand';

export const useGameStore = create((set) => ({
  dimension: '3D', // '2D' or '3D'
  points: 0,
  lives: 3,
  gameState: 'START', // START, PLAYING, GAMEOVER
  playerPosition: { x: 0, y: 0, z: 0 },
  respawnCount: 0,
  particleTrigger: null,
  
  setDimension: (dim) => set({ dimension: dim }),
  addPoints: (val) => set((state) => ({ points: state.points + val })),
  loseLife: () => set((state) => ({ 
    lives: Math.max(0, state.lives - 1), 
    respawnCount: state.respawnCount + 1 
  })),
  setGameState: (status) => set({ gameState: status }),
  setPlayerPosition: (pos) => set({ playerPosition: pos }),
  triggerParticles: (pos, type) => set({ particleTrigger: { pos, type, id: Math.random() } }),
  reset: () => set({ points: 0, lives: 3, gameState: 'PLAYING', playerPosition: { x: 0, y: 0, z: 0 }, respawnCount: 0, particleTrigger: null }),
}));

