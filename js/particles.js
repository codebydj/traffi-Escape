/**
 * TRAFFIC ESCAPE — Particle & Visual Effects Engine
 * Manages crash explosions, coin sparklers, speed lines, floating text popups, and screen shake.
 */

import { random, randomInt } from './utils.js';

export class Particle {
  constructor(x, y, vx, vy, color, size, life, shape = 'circle') {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.size = size;
    this.maxLife = life;
    this.life = life;
    this.shape = shape;
    this.alpha = 1.0;
  }

  update(dt) {
    this.x += this.vx * 60 * dt;
    this.y += this.vy * 60 * dt;
    this.life -= dt;
    this.alpha = Math.max(0, this.life / this.maxLife);
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;

    if (this.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(this.x, this.y, Math.max(0.5, this.size * this.alpha), 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    }

    ctx.restore();
  }
}

export class FloatingText {
  constructor(x, y, text, color = '#facc15', fontSize = 20) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.fontSize = fontSize;
    this.life = 1.2; // seconds
    this.maxLife = 1.2;
  }

  update(dt) {
    this.y -= 40 * dt; // Float upwards
    this.life -= dt;
  }

  draw(ctx) {
    ctx.save();
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.font = `900 ${this.fontSize}px 'Outfit', sans-serif`;
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 8;
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

export class ParticleEngine {
  constructor() {
    this.particles = [];
    this.floatingTexts = [];
    
    // Screen Shake Trauma System
    this.trauma = 0; // 0 to 1
    this.maxShakeOffset = 18;
  }

  reset() {
    this.particles = [];
    this.floatingTexts = [];
    this.trauma = 0;
  }

  addTrauma(amount) {
    this.trauma = Math.min(1.0, this.trauma + amount);
  }

  getShakeOffset() {
    if (this.trauma <= 0) return { x: 0, y: 0 };
    const shake = Math.pow(this.trauma, 2) * this.maxShakeOffset;
    return {
      x: (Math.random() * 2 - 1) * shake,
      y: (Math.random() * 2 - 1) * shake
    };
  }

  // --- PRESET PARTICLE EMITTERS ---

  emitCoinSparkles(x, y) {
    for (let i = 0; i < 10; i++) {
      const angle = random(0, Math.PI * 2);
      const speed = random(2, 6);
      this.particles.push(new Particle(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        '#facc15',
        random(3, 6),
        random(0.3, 0.6)
      ));
    }
  }

  emitCrashDebris(x, y, carColor = '#ef4444') {
    for (let i = 0; i < 35; i++) {
      const angle = random(0, Math.PI * 2);
      const speed = random(4, 14);
      const color = Math.random() > 0.3 ? carColor : (Math.random() > 0.5 ? '#f8fafc' : '#f59e0b');
      this.particles.push(new Particle(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        color,
        random(4, 10),
        random(0.5, 1.2),
        Math.random() > 0.5 ? 'square' : 'circle'
      ));
    }
    this.addTrauma(0.8);
  }

  emitExhaustSmoke(x, y) {
    this.particles.push(new Particle(
      x + random(-6, 6),
      y + 40,
      random(-0.5, 0.5),
      random(2, 4),
      'rgba(203, 213, 225, 0.4)',
      random(4, 8),
      0.4
    ));
  }

  addFloatingText(x, y, text, color = '#facc15', fontSize = 20) {
    this.floatingTexts.push(new FloatingText(x, y, text, color, fontSize));
  }

  update(dt) {
    // Decay Trauma
    if (this.trauma > 0) {
      this.trauma = Math.max(0, this.trauma - dt * 1.5);
    }

    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.update(dt);
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update Floating Texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.update(dt);
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    for (let p of this.particles) {
      p.draw(ctx);
    }
    for (let ft of this.floatingTexts) {
      ft.draw(ctx);
    }
  }
}
