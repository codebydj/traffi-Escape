/**
 * TRAFFIC ESCAPE — Main Entry Point
 * Handles canvas scaling, event bindings, keyboard/touch input, and game initialization.
 */

import { CONFIG } from './config.js';
import { Storage } from './storage.js';
import { Audio } from './audio.js';
import { UIManager } from './ui.js';
import { GarageManager } from './garage.js';
import { GameEngine, GAME_STATES } from './game.js';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas');
  if (!canvas) return;

  // Initialize UI & Garage Managers
  const uiManager = new UIManager();
  const garageManager = new GarageManager(uiManager.elements);
  garageManager.init();

  // Initialize Game Engine
  const game = new GameEngine(canvas, uiManager, garageManager);

  // Resize canvas to match internal 450x800 resolution
  function handleResize() {
    canvas.width = CONFIG.CANVAS_WIDTH;
    canvas.height = CONFIG.CANVAS_HEIGHT;
  }

  handleResize();
  window.addEventListener('resize', handleResize);

  // --- KEYBOARD CONTROLS ---
  window.addEventListener('keydown', (e) => {
    // Unlock AudioContext on first user key press
    Audio.unlock();

    if (e.repeat) return; // Prevent key repeat double movement

    if (game.state === GAME_STATES.PLAYING) {
      if (e.key === 'ArrowLeft' || e.code === 'KeyA') {
        if (game.player.moveLeft()) {
          Audio.playSteer();
        }
      } else if (e.key === 'ArrowRight' || e.code === 'KeyD') {
        if (game.player.moveRight()) {
          Audio.playSteer();
        }
      } else if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        game.togglePause();
        Audio.playClick();
      }
    } else if (game.state === GAME_STATES.PAUSED) {
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        game.togglePause();
        Audio.playClick();
      }
    }
  });

  // --- MOBILE TOUCH BUTTON CONTROLS ---
  const touchLeftBtn = document.getElementById('touchLeftBtn');
  const touchRightBtn = document.getElementById('touchRightBtn');

  if (touchLeftBtn) {
    touchLeftBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      Audio.unlock();
      if (game.state === GAME_STATES.PLAYING) {
        if (game.player.moveLeft()) {
          Audio.playSteer();
        }
      }
    });
  }

  if (touchRightBtn) {
    touchRightBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      Audio.unlock();
      if (game.state === GAME_STATES.PLAYING) {
        if (game.player.moveRight()) {
          Audio.playSteer();
        }
      }
    });
  }

  // --- UI BUTTON EVENT BINDINGS ---
  const bindClick = (id, handler) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        Audio.unlock();
        Audio.playClick();
        handler();
      });
    }
  };

  // Main Menu Buttons
  bindClick('playBtn', () => game.startNewGame());
  bindClick('garageBtn', () => game.setState(GAME_STATES.GARAGE));
  bindClick('settingsBtn', () => game.setState(GAME_STATES.SETTINGS));

  // Secondary Back Buttons
  bindClick('backToMenuFromGarage', () => game.setState(GAME_STATES.MENU));
  bindClick('closeSettingsBtn', () => game.setState(GAME_STATES.MENU));
  bindClick('mainMenuFromPauseBtn', () => game.setState(GAME_STATES.MENU));
  bindClick('mainMenuFromGameOverBtn', () => game.setState(GAME_STATES.MENU));

  // Pause Controls
  bindClick('pauseBtn', () => game.togglePause());
  bindClick('resumeBtn', () => game.togglePause());
  bindClick('restartFromPauseBtn', () => game.startNewGame());

  // Game Over Buttons
  bindClick('playAgainBtn', () => game.startNewGame());
  bindClick('garageFromGameOverBtn', () => game.setState(GAME_STATES.GARAGE));

  // Settings Mute Toggle
  bindClick('soundToggleBtn', () => {
    Audio.toggleSound();
    uiManager.refreshMenuStats();
  });

  // --- PAGE LIFECYCLE AUDIO HANDLING ---
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (game.state === GAME_STATES.PLAYING) {
        Audio.pauseEngine();
      }
    } else {
      if (game.state === GAME_STATES.PLAYING) {
        Audio.resumeEngine();
      }
    }
  });

  // Start Main Loop & Show Main Menu
  game.start();
});
