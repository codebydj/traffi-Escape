/**
 * TRAFFIC ESCAPE — Coin Spawning & Magnet Attraction Engine
 * Handles spinning 3D gold coins, pattern spawning, and magnetic vector attraction physics.
 */

import { CONFIG } from './config.js';
import { random, randomInt, randomChoice, checkAABB, distance, lerp } from './utils.js';

export class Coin {
  constructor(lane, y, road) {
    this.lane = lane;
    this.road = road;
    this.x = this.road.getLaneCenter(lane);
    this.y = y;
    this.radius = 12;
    this.spinAngle = Math.random() * Math.PI * 2;
    this.isCollected = false;
  }

  getBounds() {
    return {
      x: this.x - this.radius,
      y: this.y - this.radius,
      width: this.radius * 2,
      height: this.radius * 2
    };
  }

  update(speed, player, dt) {
    // Normal downward scrolling
    this.y += speed * 60 * dt;
    this.spinAngle += dt * 8;

    // Magnet Attraction Physics if Magnet Powerup is active
    if (player.magnetTimer > 0) {
      const dist = distance(this.x, this.y, player.x, player.y);
      if (dist < CONFIG.MAGNET_RADIUS) {
        // Accelerate coin towards player position
        const pullSpeed = (1 - dist / CONFIG.MAGNET_RADIUS) * 22 * 60 * dt;
        this.x = lerp(this.x, player.x, pullSpeed * 0.05);
        this.y = lerp(this.y, player.y, pullSpeed * 0.05);
      }
    }
  }

  draw(ctx) {
    if (this.isCollected) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    // 3D Horizontal Spin effect using sin scaling
    const scaleX = Math.sin(this.spinAngle);
    ctx.scale(Math.abs(scaleX) < 0.1 ? 0.1 : scaleX, 1);

    // Coin Drop Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.arc(0, 4, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Outer Gold Rim
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Inner Metallic Highlight
    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.7, 0, Math.PI * 2);
    ctx.fill();

    // Dollar/Star Center Symbol
    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', 0, 0);

    ctx.restore();
  }
}

export class CoinManager {
  constructor(road) {
    this.road = road;
    this.coins = [];
    this.spawnTimer = 0;
  }

  reset() {
    this.coins = [];
    this.spawnTimer = 0;
  }

  update(speed, player, dt, onCollectCoin) {
    this.spawnTimer++;

    // Attempt coin pattern spawn every ~120 frames
    if (this.spawnTimer >= 140) {
      this.spawnTimer = 0;
      if (Math.random() < CONFIG.COIN_SPAWN_CHANCE) {
        this.spawnCoinPattern();
      }
    }

    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      c.update(speed, player, dt);

      // Check Collection Collision with Player
      if (!c.isCollected && checkAABB(player.getBounds(), c.getBounds(), 2, 2)) {
        c.isCollected = true;
        onCollectCoin(c);
        this.coins.splice(i, 1);
        continue;
      }

      // Cleanup offscreen coins below screen
      if (c.y > this.road.height + 60) {
        this.coins.splice(i, 1);
      }
    }
  }

  spawnCoinPattern() {
    const lane = randomInt(0, CONFIG.LANE_COUNT - 1);
    const patternType = randomChoice(['single', 'line', 'line']);

    if (patternType === 'single') {
      this.coins.push(new Coin(lane, -40, this.road));
    } else if (patternType === 'line') {
      // 3 to 5 coins in a vertical line
      const count = randomInt(3, 5);
      for (let i = 0; i < count; i++) {
        this.coins.push(new Coin(lane, -40 - i * 36, this.road));
      }
    }
  }

  draw(ctx) {
    for (let c of this.coins) {
      c.draw(ctx);
    }
  }
}
