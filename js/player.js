/**
 * TRAFFIC ESCAPE — Player Car Entity
 * Handles smooth 3-lane movement, custom vector car skin drawing, invincibility, and power-up visual states.
 */

import { CONFIG } from './config.js';
import { lerp } from './utils.js';

export class Player {
  constructor(road) {
    this.road = road;
    this.width = 44;
    this.height = 80;

    // Start in center lane (Lane 1)
    this.currentLane = 1;
    this.targetX = this.road.getLaneCenter(this.currentLane);
    this.x = this.targetX;
    this.y = this.road.height - this.height - 70;

    // Car Appearance Configuration
    this.skin = CONFIG.SKINS.find(s => s.id === 'red') || CONFIG.SKINS[0];

    // Status Flags & Timers
    this.lives = CONFIG.PLAYER_LIVES;
    this.isInvincible = false;
    this.invincibilityTimer = 0;
    this.flashTimer = 0;

    // Active Powerup Timers
    this.shieldActive = false;
    this.boostTimer = 0;
    this.magnetTimer = 0;
  }

  setSkin(skinId) {
    const found = CONFIG.SKINS.find(s => s.id === skinId);
    if (found) {
      this.skin = found;
    }
  }

  reset() {
    this.lives = CONFIG.PLAYER_LIVES;
    this.currentLane = 1;
    this.targetX = this.road.getLaneCenter(this.currentLane);
    this.x = this.targetX;
    this.isInvincible = false;
    this.invincibilityTimer = 0;
    this.shieldActive = false;
    this.boostTimer = 0;
    this.magnetTimer = 0;
  }

  moveLeft() {
    if (this.currentLane > 0) {
      this.currentLane--;
      this.targetX = this.road.getLaneCenter(this.currentLane);
      return true;
    }
    return false;
  }

  moveRight() {
    if (this.currentLane < this.road.laneCount - 1) {
      this.currentLane++;
      this.targetX = this.road.getLaneCenter(this.currentLane);
      return true;
    }
    return false;
  }

  triggerInvincibility(duration = CONFIG.INVINCIBILITY_DURATION) {
    this.isInvincible = true;
    this.invincibilityTimer = duration;
  }

  getBounds() {
    return {
      x: this.x - this.width / 2,
      y: this.y - this.height / 2,
      width: this.width,
      height: this.height
    };
  }

  update(dt) {
    // Smooth lane transition X interpolation
    this.x = lerp(this.x, this.targetX, 16 * dt);

    // Handle Invincibility Flash Timer
    if (this.isInvincible) {
      this.invincibilityTimer -= dt;
      this.flashTimer += dt * 30;
      if (this.invincibilityTimer <= 0) {
        this.isInvincible = false;
      }
    }

    // Handle Power-up Timers
    if (this.boostTimer > 0) this.boostTimer -= dt;
    if (this.magnetTimer > 0) this.magnetTimer -= dt;
  }

  draw(ctx, isNight = false) {
    // Skip rendering frame during invincibility flashing for flicker effect
    if (this.isInvincible && Math.floor(this.flashTimer) % 2 === 0) {
      return;
    }

    ctx.save();
    ctx.translate(this.x, this.y);

    // Subtle tilt angle when changing lanes
    const tilt = (this.targetX - this.x) * 0.008;
    ctx.rotate(tilt);

    // 1. Draw Car Drop Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 8, this.width * 0.55, this.height * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Draw Main Car Chassis Body
    const w = this.width;
    const h = this.height;

    // Underglow if Neon Cyber skin or Boost Active
    if (this.skin.id === 'neon' || this.boostTimer > 0) {
      ctx.shadowColor = this.boostTimer > 0 ? '#facc15' : '#22d3ee';
      ctx.shadowBlur = 18;
    }

    // Body Paint Base
    ctx.fillStyle = this.skin.color;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, [14, 14, 10, 10]);
    ctx.fill();

    ctx.shadowBlur = 0; // Reset shadow

    // 3. Roof / Racing Stripe Details
    ctx.fillStyle = this.skin.accent;
    ctx.fillRect(-w * 0.15, -h * 0.35, w * 0.3, h * 0.7);

    // 4. Windows (Front Windshield & Rear Window)
    ctx.fillStyle = '#0f172a'; // Tinted glass
    // Front Windshield
    ctx.beginPath();
    ctx.roundRect(-w * 0.38, -h * 0.25, w * 0.76, h * 0.2, [4, 4, 2, 2]);
    ctx.fill();
    // Rear Window
    ctx.beginPath();
    ctx.roundRect(-w * 0.35, h * 0.15, w * 0.7, h * 0.14, [2, 2, 4, 4]);
    ctx.fill();

    // 5. Wheels / Tires (4 tires)
    ctx.fillStyle = '#020617';
    ctx.fillRect(-w / 2 - 3, -h * 0.35, 4, 16); // Front Left
    ctx.fillRect(w / 2 - 1, -h * 0.35, 4, 16);  // Front Right
    ctx.fillRect(-w / 2 - 3, h * 0.2, 4, 16);   // Rear Left
    ctx.fillRect(w / 2 - 1, h * 0.2, 4, 16);    // Rear Right

    // 6. Headlights (Bright Yellow/White Lights pointing up)
    ctx.fillStyle = '#fffbeb';
    ctx.fillRect(-w * 0.4, -h / 2, 8, 4);
    ctx.fillRect(w * 0.4 - 8, -h / 2, 8, 4);

    // 7. Taillights (Red Glowing Rear Lights facing down)
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-w * 0.4, h / 2 - 4, 10, 4);
    ctx.fillRect(w * 0.4 - 10, h / 2 - 4, 10, 4);

    // 8. Player Headlight Beams (Night Mode Projection UPWARDS)
    if (isNight) {
      const beamLength = 220;
      const beamSpread = w * 0.85;
      const beamGrad = ctx.createLinearGradient(0, -h / 2, 0, -h / 2 - beamLength);
      beamGrad.addColorStop(0, 'rgba(254, 243, 199, 0.55)');
      beamGrad.addColorStop(0.3, 'rgba(254, 243, 199, 0.22)');
      beamGrad.addColorStop(1, 'rgba(254, 243, 199, 0)');

      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.moveTo(-w * 0.35, -h / 2);
      ctx.lineTo(-w * 0.35 - beamSpread, -h / 2 - beamLength);
      ctx.lineTo(w * 0.35 + beamSpread, -h / 2 - beamLength);
      ctx.lineTo(w * 0.35, -h / 2);
      ctx.closePath();
      ctx.fill();

      // Taillight Red Glow at rear bumper at night
      const tailGlowLeft = ctx.createRadialGradient(-w * 0.35, h / 2, 1, -w * 0.35, h / 2, 14);
      tailGlowLeft.addColorStop(0, 'rgba(239, 68, 68, 0.85)');
      tailGlowLeft.addColorStop(1, 'rgba(239, 68, 68, 0)');
      ctx.fillStyle = tailGlowLeft;
      ctx.beginPath();
      ctx.arc(-w * 0.35, h / 2, 14, 0, Math.PI * 2);
      ctx.fill();

      const tailGlowRight = ctx.createRadialGradient(w * 0.35, h / 2, 1, w * 0.35, h / 2, 14);
      tailGlowRight.addColorStop(0, 'rgba(239, 68, 68, 0.85)');
      tailGlowRight.addColorStop(1, 'rgba(239, 68, 68, 0)');
      ctx.fillStyle = tailGlowRight;
      ctx.beginPath();
      ctx.arc(w * 0.35, h / 2, 14, 0, Math.PI * 2);
      ctx.fill();
    }

    // 9. Power-up Aura Indicators
    // Shield Forcefield Ring
    if (this.shieldActive) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(w, h) * 0.65, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
      ctx.fill();
    }

    // Magnet Aura Pulse
    if (this.magnetTimer > 0) {
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(w, h) * 0.75, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  // Render Car Preview specifically for the Garage Screen
  static drawPreview(ctx, x, y, skin) {
    ctx.save();
    ctx.translate(x, y);

    const w = 60;
    const h = 110;

    // Drop Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 10, w * 0.55, h * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = skin.color;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, [18, 18, 14, 14]);
    ctx.fill();

    // Accent Stripe
    ctx.fillStyle = skin.accent;
    ctx.fillRect(-w * 0.15, -h * 0.35, w * 0.3, h * 0.7);

    // Windshield
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(-w * 0.38, -h * 0.25, w * 0.76, h * 0.2, [6, 6, 3, 3]);
    ctx.fill();

    ctx.beginPath();
    ctx.roundRect(-w * 0.35, h * 0.15, w * 0.7, h * 0.14, [3, 3, 6, 6]);
    ctx.fill();

    // Tires
    ctx.fillStyle = '#020617';
    ctx.fillRect(-w / 2 - 4, -h * 0.35, 5, 22);
    ctx.fillRect(w / 2 - 1, -h * 0.35, 5, 22);
    ctx.fillRect(-w / 2 - 4, h * 0.2, 5, 22);
    ctx.fillRect(w / 2 - 1, h * 0.2, 5, 22);

    // Lights
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(-w * 0.4, -h / 2, 12, 5);
    ctx.fillRect(w * 0.4 - 12, -h / 2, 12, 5);

    ctx.restore();
  }
}
