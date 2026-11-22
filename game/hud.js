import * as THREE from './three.module.min.js';

function createHud(hooks) {
  const root = document.getElementById('hud-root');

  // Create panels per CONTRACT: mission (16,16, 300 wide), dispatch (16,196, 280 wide), etc.
  // ... implementation ...

  return {
    update(snapshot) {
      // Render from snapshot
    },
    setPanels(mode) {
      // Visibility authority
    },
    showDialogue(name, text) {
      // Dialogue rendering
    }
  };
}

export { createHud };
