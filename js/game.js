/**
 * TRAFFIC ESCAPE — Main Game Engine & State Machine
 * Coordinates 60 FPS game loop, collision detection, powerup effects, scoring, levels, audio, and state transitions.
 */

import { CONFIG } from './config.js';
import { Storage } from './storage.js';
import { Audio } from './audio.js';
import { Road } from './road.js';
import { Player } from './player.js';
import { TrafficManager } from './traffic.js';
import { CoinManager } from './coin.js';
import { PowerupManager } from './powerups.js';
import { ParticleEngine } from './particles.js';
import { checkAABB } from './utils.js';

export const GAME_STATES = {
  MENU: 'MENU',
  GARAGE: 'GARAGE',
  HOW_TO_PLAY: 'HOW_TO_PLAY',
  SETTINGS: 'SETTINGS',
  COUNTDOWN: 'COUNTDOWN',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  GAME_OVER: 'GAME_OVER'
};

export class GameEngine {
  constructor(canvas, uiManager, garageManager) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ui = uiManager;
    this.garage = garageManager;

    this.state = GAME_STATES.MENU;

    // Sub-Systems Initialization
    this.road = new Road(CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    this.player = new Player(this.road);
    this.traffic = new TrafficManager(this.road);
    this.coins = new CoinManager(this.road);
    this.powerups = new PowerupManager(this.road);
    this.particles = new ParticleEngine();

    // Game Run Stats
    this.score = 0;
    this.distanceMeters = 0;
    this.runCoins = 0;
    this.speed = CONFIG.STARTING_SPEED;
    this.level = 1;
    this.isNewHighScore = false;

    // Powerup Expiry Trackers
    this.prevBoostTimer = 0;
    this.prevMagnetTimer = 0;

    // Countdown State Variable
    this.countdownValue = 3;
    this.countdownTimer = 0;

    // Delta Time Tracking
    this.lastTime = 0;
  }

  start() {
    this.ui.showScreen('mainMenu');
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  setState(newState) {
    this.state = newState;

    if (newState === GAME_STATES.MENU) {
      Audio.stopEngine();
      this.ui.showScreen('mainMenu');
    } else if (newState === GAME_STATES.GARAGE) {
      Audio.stopEngine();
      this.garage.updateGarageView();
      this.ui.showScreen('garageMenu');
    } else if (newState === GAME_STATES.HOW_TO_PLAY) {
      Audio.stopEngine();
      this.ui.showScreen('howToPlayMenu');
    } else if (newState === GAME_STATES.SETTINGS) {
      Audio.stopEngine();
      this.ui.showScreen('settingsMenu');
    } else if (newState === GAME_STATES.PAUSED) {
      Audio.pauseEngine();
      this.ui.showScreen('pauseMenu');
    }
  }

  startNewGame() {
    // Apply selected car skin from storage
    this.player.setSkin(Storage.getSelectedCar());

    // Reset Engine Entities & Counters
    this.score = 0;
    this.distanceMeters = 0;
    this.runCoins = 0;
    this.speed = CONFIG.STARTING_SPEED;
    this.level = 1;
    this.isNewHighScore = false;
    this.prevBoostTimer = 0;
    this.prevMagnetTimer = 0;

    this.player.reset();
    this.traffic.reset();
    this.coins.reset();
    this.powerups.reset();
    this.particles.reset();

    // Trigger Play Ignition Sound
    Audio.playIgnition();

    // Begin Countdown
    this.countdownValue = 3;
    this.countdownTimer = 0;
    this.ui.setCountdownText('3');
    Audio.playCountdownTick(false);
    this.ui.showScreen('countdownScreen');
    this.state = GAME_STATES.COUNTDOWN;
  }

  togglePause() {
    if (this.state === GAME_STATES.PLAYING) {
      this.setState(GAME_STATES.PAUSED);
    } else if (this.state === GAME_STATES.PAUSED) {
      Audio.resumeEngine();
      this.ui.showScreen('hud');
      this.state = GAME_STATES.PLAYING;
    }
  }

  loop(currentTime) {
    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    this.update(dt);
    this.render();

    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    if (this.state === GAME_STATES.MENU || this.state === GAME_STATES.GARAGE) {
      // Auto-scrolling ambient traffic simulation for menu backdrop
      this.road.update(CONFIG.STARTING_SPEED * 0.7, 0, dt);
      this.traffic.update(CONFIG.STARTING_SPEED * 0.7, 1, dt);
      return;
    }

    if (this.state === GAME_STATES.COUNTDOWN) {
      this.countdownTimer += dt;
      if (this.countdownTimer >= 0.8) {
        this.countdownTimer = 0;
        this.countdownValue--;
        if (this.countdownValue > 0) {
          this.ui.setCountdownText(String(this.countdownValue));
          Audio.playCountdownTick(false);
        } else if (this.countdownValue === 0) {
          this.ui.setCountdownText('GO!');
          Audio.playCountdownTick(true);
          Audio.playIgnition();
        } else {
          // Transition to active gameplay & start engine sound
          this.state = GAME_STATES.PLAYING;
          Audio.startEngine();
          this.ui.showScreen('hud');
        }
      }
      return;
    }

    if (this.state !== GAME_STATES.PLAYING) return;

    // --- ACTIVE PLAYING STATE UPDATES ---

    // 1. Calculate Dynamic Speed & Level Scaling
    let currentSpeed = CONFIG.STARTING_SPEED + (this.distanceMeters / 100) * CONFIG.SPEED_ACCELERATION;
    if (this.player.boostTimer > 0) {
      currentSpeed *= 1.4; // 40% speed boost when Boost active
    }
    this.speed = Math.min(CONFIG.MAX_SPEED, currentSpeed);

    // 2. Update Dynamic Engine Sound Pitch & Volume
    Audio.updateEngine(this.speed, this.player.boostTimer > 0);

    // 3. Detect Powerup Expiry Transitions
    if (this.prevBoostTimer > 0 && this.player.boostTimer <= 0) {
      Audio.playPowerupExpire('boost');
    }
    if (this.prevMagnetTimer > 0 && this.player.magnetTimer <= 0) {
      Audio.playPowerupExpire('magnet');
    }
    this.prevBoostTimer = this.player.boostTimer;
    this.prevMagnetTimer = this.player.magnetTimer;

    // 4. Accumulate Distance & Score
    const speedKmH = this.speed * 12;
    this.distanceMeters += (this.speed * 60 * dt) * 0.08;

    const scoreMultiplier = this.player.boostTimer > 0 ? 2 : 1;
    this.score += (this.speed * 20 * dt) * scoreMultiplier;

    // 5. Level System Progression
    const calculatedLevel = Math.floor(this.distanceMeters / CONFIG.LEVEL_DISTANCE) + 1;
    if (calculatedLevel > this.level) {
      this.level = calculatedLevel;
      Audio.playLevelUp();
      const popupText = (this.level === 4) ? 'LEVEL 4! 4-LANE HIGHWAY!' : `LEVEL ${this.level}!`;
      this.particles.addFloatingText(this.road.width / 2, this.road.height / 3, popupText, '#facc15', 26);
    }

    // 6. Entity Updates
    this.road.update(this.speed, this.distanceMeters, this.level, dt);
    this.player.update(dt);
    this.traffic.update(this.speed, this.player, this.level, this.distanceMeters, dt);
    this.coins.update(this.speed, this.player, dt, (coin) => this.handleCollectCoin(coin));
    this.powerups.update(this.speed, this.player, dt, (type) => this.handleCollectPowerup(type));
    this.particles.update(dt);

    // Emit exhaust particles periodically
    if (Math.random() < 0.3) {
      this.particles.emitExhaustSmoke(this.player.x, this.player.y);
    }

    // 7. Near-Miss Dodging Detection System
    this.checkNearMisses();

    // 8. Player Collision Detection with Traffic Vehicles
    if (!this.player.isInvincible) {
      const playerBounds = this.player.getBounds();

      for (let v of this.traffic.vehicles) {
        if (checkAABB(playerBounds, v.getBounds(), 6, 8)) {
          this.handlePlayerCollision(v);
          break;
        }
      }
    }

    // 9. Update HUD
    const activeTimers = {
      boost: { timer: this.player.boostTimer, maxDuration: CONFIG.BOOST_DURATION, icon: '⚡' },
      magnet: { timer: this.player.magnetTimer, maxDuration: CONFIG.MAGNET_DURATION, icon: '🧲' }
    };

    this.ui.updateLives(this.player.lives);
    this.ui.updateHUD(
      this.score,
      Storage.getHighScore(),
      this.runCoins,
      this.distanceMeters,
      speedKmH,
      this.level
    );
    this.ui.updateActivePowerups(activeTimers);
  }

  handleCollectCoin(coin) {
    this.runCoins++;
    Storage.addCoins(1);
    this.score += CONFIG.COIN_VALUE;
    Audio.playCoin();
    this.particles.emitCoinSparkles(coin.x, coin.y);
    this.particles.addFloatingText(coin.x, coin.y - 10, `+${CONFIG.COIN_VALUE}`, '#facc15', 16);
  }

  handleCollectPowerup(powerupType) {
    Audio.playPowerup(powerupType);
    if (powerupType.id === 'shield') {
      this.player.shieldActive = true;
      this.particles.addFloatingText(this.player.x, this.player.y - 30, 'SHIELD ACTIVE!', '#38bdf8', 22);
    } else if (powerupType.id === 'boost') {
      this.player.boostTimer = CONFIG.BOOST_DURATION;
      this.particles.addFloatingText(this.player.x, this.player.y - 30, 'SPEED BOOST!', '#facc15', 22);
    } else if (powerupType.id === 'magnet') {
      this.player.magnetTimer = CONFIG.MAGNET_DURATION;
      this.particles.addFloatingText(this.player.x, this.player.y - 30, 'COIN MAGNET!', '#a855f7', 22);
    }
  }

  checkNearMisses() {
    const pBounds = this.player.getBounds();

    for (let v of this.traffic.vehicles) {
      if (v.passedPlayer) continue;

      // If vehicle has passed slightly below player Y position
      if (v.y > this.player.y + 10) {
        v.passedPlayer = true;

        // Check if dodging occurred very closely (within 18px horizontally)
        const dx = Math.abs(this.player.x - v.x);
        const nearMissThreshold = (this.player.width + v.width) / 2 + 18;

        if (dx < nearMissThreshold && dx > (this.player.width + v.width) / 2 - 2) {
          // Trigger Near Miss Bonus!
          this.score += CONFIG.NEAR_MISS_BONUS;
          Audio.playNearMiss();
          this.particles.addFloatingText(this.player.x, this.player.y - 40, 'NEAR MISS! +100', '#22c55e', 18);
        }
      }
    }
  }

  handlePlayerCollision(vehicle) {
    if (this.player.shieldActive) {
      // Shield absorbs hit
      this.player.shieldActive = false;
      Audio.playShieldBreak();
      this.player.triggerInvincibility(CONFIG.INVINCIBILITY_DURATION);
      this.particles.addFloatingText(this.player.x, this.player.y - 30, 'SHIELD BROKEN!', '#38bdf8', 20);
      this.particles.addTrauma(0.4);
      return;
    }

    // Direct vehicle crash
    this.player.lives--;
    Audio.playCrash();
    this.particles.emitCrashDebris(this.player.x, this.player.y, this.player.skin.color);

    if (this.player.lives > 0) {
      // Still have remaining lives
      this.player.triggerInvincibility(CONFIG.INVINCIBILITY_DURATION);
      this.particles.addFloatingText(this.player.x, this.player.y - 30, 'CRASH!', '#ef4444', 22);
    } else {
      // Game Over
      this.triggerGameOver();
    }
  }

  triggerGameOver() {
    this.state = GAME_STATES.GAME_OVER;
    Audio.stopEngine();

    // Check for High Score & Save Persistence
    this.isNewHighScore = Storage.setHighScore(this.score);
    Storage.setBestDistance(this.distanceMeters);

    this.ui.showGameOver(
      this.score,
      this.distanceMeters,
      this.runCoins,
      this.level,
      this.isNewHighScore
    );
  }

  render() {
    this.ctx.save();

    // Apply Screen Shake Camera Transform Offset
    const shake = this.particles.getShakeOffset();
    this.ctx.translate(shake.x, shake.y);

    // 1. Draw Road & Environment
    this.road.draw(this.ctx);

    // 2. Draw Game Objects
    const isNight = (this.road.timeOfDay === 2);
    this.coins.draw(this.ctx);
    this.powerups.draw(this.ctx);
    this.traffic.draw(this.ctx, isNight);
    this.player.draw(this.ctx, isNight);

    // 3. Draw Particle Effects & Floating Text
    this.particles.draw(this.ctx);

    this.ctx.restore();
  }
}
