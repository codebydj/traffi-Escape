/**
 * TRAFFIC ESCAPE — Power-up System
 * Manages 🛡️ Shield, ⚡ Speed Boost, and 🧲 Coin Magnet item spawning and duration handling.
 */

import { CONFIG } from './config.js';
import { randomInt, randomChoice, checkAABB } from './utils.js';

export const POWERUP_TYPES = {
  shield: {
    id: 'shield',
    icon: '🛡️',
    name: 'SHIELD',
    color: '#38bdf8'
  },
  boost: {
    id: 'boost',
    icon: '⚡',
    name: 'SPEED BOOST',
    color: '#facc15',
    duration: CONFIG.BOOST_DURATION
  },
  magnet: {
    id: 'magnet',
    icon: '🧲',
    name: 'COIN MAGNET',
    color: '#a855f7',
    duration: CONFIG.MAGNET_DURATION
  }
};

export class PowerupItem {
  constructor(lane, y, typeKey, road) {
    this.lane = lane;
    this.road = road;
    this.typeKey = typeKey;
    this.type = POWERUP_TYPES[typeKey];
    this.x = this.road.getLaneCenter(lane);
    this.y = y;
    this.size = 32;
    this.pulseTimer = 0;
  }

  getBounds() {
    return {
      x: this.x - this.size / 2,
      y: this.y - this.size / 2,
      width: this.size,
      height: this.size
    };
  }

  update(speed, dt) {
    this.y += speed * 60 * dt;
    this.pulseTimer += dt * 6;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    const scale = 1 + Math.sin(this.pulseTimer) * 0.1;
    ctx.scale(scale, scale);

    // Glowing Outer Halo Ring
    ctx.shadowColor = this.type.color;
    ctx.shadowBlur = 15;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = this.type.color;
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;

    // Icon Emoji Text
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.type.icon, 0, 1);

    ctx.restore();
  }
}

export class PowerupManager {
  constructor(road) {
    this.road = road;
    this.items = [];
    this.spawnTimer = 0;
  }

  reset() {
    this.items = [];
    this.spawnTimer = 0;
  }

  update(speed, player, dt, onCollectPowerup) {
    this.spawnTimer++;

    if (this.spawnTimer >= CONFIG.POWERUP_SPAWN_INTERVAL) {
      this.spawnTimer = 0;
      this.spawnRandomPowerup();
    }

    for (let i = this.items.length - 1; i >= 0; i--) {
      const p = this.items[i];
      p.update(speed, dt);

      // Check Collision with Player
      if (checkAABB(player.getBounds(), p.getBounds(), 2, 2)) {
        onCollectPowerup(p.type);
        this.items.splice(i, 1);
        continue;
      }

      // Cleanup offscreen
      if (p.y > this.road.height + 60) {
        this.items.splice(i, 1);
      }
    }
  }

  spawnRandomPowerup() {
    const lane = randomInt(0, CONFIG.LANE_COUNT - 1);
    const typeKey = randomChoice(['shield', 'boost', 'magnet']);
    this.items.push(new PowerupItem(lane, -50, typeKey, this.road));
  }

  draw(ctx) {
    for (let p of this.items) {
      p.draw(ctx);
    }
  }
}
