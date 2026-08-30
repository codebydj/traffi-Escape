/**
 * TRAFFIC ESCAPE — UI & HUD Manager
 * Coordinates menu overlays, countdowns, HUD stat updates, and screen state transitions.
 */

import { Storage } from './storage.js';
import { formatDistance, formatScore } from './utils.js';

export class UIManager {
  constructor() {
    this.elements = {
      // Screens
      mainMenu: document.getElementById('mainMenu'),
      garageMenu: document.getElementById('garageMenu'),
      settingsMenu: document.getElementById('settingsMenu'),
      pauseMenu: document.getElementById('pauseMenu'),
      gameOverMenu: document.getElementById('gameOverMenu'),
      countdownScreen: document.getElementById('countdownScreen'),
      countdownText: document.getElementById('countdownText'),
      hud: document.getElementById('hud'),
      mobileControls: document.getElementById('mobileControls'),

      // HUD Stats
      hudLives: document.getElementById('hudLives'),
      hudLevel: document.getElementById('hudLevel'),
      hudScore: document.getElementById('hudScore'),
      hudBestScore: document.getElementById('hudBestScore'),
      hudCoins: document.getElementById('hudCoins'),
      hudDistance: document.getElementById('hudDistance'),
      hudSpeed: document.getElementById('hudSpeed'),
      activePowerups: document.getElementById('activePowerups'),

      // Menu Stat Displays
      menuBestScore: document.getElementById('menuBestScore'),
      menuTotalCoins: document.getElementById('menuTotalCoins'),
      garageCoins: document.getElementById('garageCoins'),
      soundToggleBtn: document.getElementById('soundToggleBtn'),

      // Game Over Stats
      finalScore: document.getElementById('finalScore'),
      finalDistance: document.getElementById('finalDistance'),
      finalCoins: document.getElementById('finalCoins'),
      finalLevel: document.getElementById('finalLevel'),
      finalBestScore: document.getElementById('finalBestScore'),
      newHighscoreBadge: document.getElementById('newHighscoreBadge')
    };
  }

  showScreen(targetId) {
    const screens = [
      this.elements.mainMenu,
      this.elements.garageMenu,
      this.elements.settingsMenu,
      this.elements.pauseMenu,
      this.elements.gameOverMenu,
      this.elements.countdownScreen
    ];

    screens.forEach(screen => {
      if (screen) {
        if (screen.id === targetId) {
          screen.classList.remove('hidden');
        } else {
          screen.classList.add('hidden');
        }
      }
    });

    // Handle HUD & Mobile Controls Visibility
    const isPlayingOrPaused = (targetId === 'hud' || targetId === 'pauseMenu' || targetId === 'countdownScreen');
    if (this.elements.hud) {
      if (isPlayingOrPaused) this.elements.hud.classList.remove('hidden');
      else this.elements.hud.classList.add('hidden');
    }

    if (this.elements.mobileControls) {
      if (targetId === 'hud') this.elements.mobileControls.classList.remove('hidden');
      else this.elements.mobileControls.classList.add('hidden');
    }

    // Refresh Menu Stats if returning to Main Menu
    if (targetId === 'mainMenu') {
      this.refreshMenuStats();
    }
  }

  refreshMenuStats() {
    if (this.elements.menuBestScore) {
      this.elements.menuBestScore.textContent = formatScore(Storage.getHighScore());
    }
    if (this.elements.menuTotalCoins) {
      this.elements.menuTotalCoins.textContent = `🪙 ${Storage.getTotalCoins().toLocaleString()}`;
    }
    if (this.elements.soundToggleBtn) {
      const enabled = Storage.getSoundEnabled();
      this.elements.soundToggleBtn.textContent = enabled ? '🔊 SOUND: ON' : '🔇 SOUND: OFF';
      this.elements.soundToggleBtn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    }
  }

  updateLives(livesCount) {
    if (!this.elements.hudLives) return;
    const hearts = this.elements.hudLives.querySelectorAll('.heart');
    hearts.forEach((heart, idx) => {
      if (idx < livesCount) {
        heart.classList.remove('lost');
      } else {
        heart.classList.add('lost');
      }
    });
  }

  updateHUD(score, bestScore, coins, distanceMeters, speedKmh, level) {
    if (this.elements.hudScore) this.elements.hudScore.textContent = formatScore(score);
    if (this.elements.hudBestScore) this.elements.hudBestScore.textContent = formatScore(bestScore);
    if (this.elements.hudCoins) this.elements.hudCoins.textContent = coins;
    if (this.elements.hudDistance) this.elements.hudDistance.textContent = formatDistance(distanceMeters);
    if (this.elements.hudSpeed) this.elements.hudSpeed.textContent = `${Math.floor(speedKmh)} km/h`;
    if (this.elements.hudLevel) this.elements.hudLevel.textContent = `LEVEL ${level}`;
  }

  updateActivePowerups(powerupTimers) {
    if (!this.elements.activePowerups) return;
    this.elements.activePowerups.innerHTML = '';

    Object.keys(powerupTimers).forEach(key => {
      const p = powerupTimers[key];
      if (p.timer > 0) {
        const item = document.createElement('div');
        item.className = `powerup-bar-item ${key}`;
        const pct = (p.timer / p.maxDuration) * 100;
        item.innerHTML = `
          <span>${p.icon}</span>
          <div class="powerup-bar-fill">
            <div class="powerup-bar-inner" style="width: ${pct}%"></div>
          </div>
        `;
        this.elements.activePowerups.appendChild(item);
      }
    });
  }

  showGameOver(score, distanceMeters, coins, level, isNewHighScore) {
    if (this.elements.finalScore) this.elements.finalScore.textContent = formatScore(score);
    if (this.elements.finalDistance) this.elements.finalDistance.textContent = formatDistance(distanceMeters);
    if (this.elements.finalCoins) this.elements.finalCoins.textContent = coins;
    if (this.elements.finalLevel) this.elements.finalLevel.textContent = level;
    if (this.elements.finalBestScore) this.elements.finalBestScore.textContent = formatScore(Storage.getHighScore());

    if (this.elements.newHighscoreBadge) {
      if (isNewHighScore) this.elements.newHighscoreBadge.classList.remove('hidden');
      else this.elements.newHighscoreBadge.classList.add('hidden');
    }

    this.showScreen('gameOverMenu');
  }

  setCountdownText(text) {
    if (this.elements.countdownText) {
      this.elements.countdownText.textContent = text;
    }
  }
}
