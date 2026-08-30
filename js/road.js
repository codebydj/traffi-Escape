/**
 * TRAFFIC ESCAPE — Road & Weather Atmosphere Engine
 * Features smooth sub-pixel curb scrolling, animated highway expansion (3 to 4 lanes),
 * roadside scenery, day/night cycles, and multi-weather atmospheric effects.
 */

import { CONFIG } from './config.js';
import { lerp } from './utils.js';

export class Road {
  constructor(canvasWidth, canvasHeight) {
    this.width = canvasWidth;
    this.height = canvasHeight;

    // Calculate Initial 4-Lane Road Geometry
    this.laneCount = CONFIG.LANE_COUNT; // 4 lanes
    this.targetLaneCount = 4;
    
    this.currentRoadWidth = this.width * CONFIG.ROAD_WIDTH_PERCENT;
    
    this.leftEdge = (this.width - this.currentRoadWidth) / 2;
    this.rightEdge = this.leftEdge + this.currentRoadWidth;
    this.laneWidth = this.currentRoadWidth / this.laneCount;

    this.laneCenters = [];
    this.updateLaneGeometry();

    // Scrolling & Motion
    this.offsetY = 0;
    this.curbScrollY = 0;
    this.dashLength = 40;
    this.dashGap = 30;

    // Environmental Objects (Trees, Street Lights)
    this.sceneryObjects = [];
    this.initScenery();

    // Day/Night & Atmosphere Parameters
    this.timeOfDay = 0; // 0: Day, 1: Sunset, 2: Night, 3: Dawn
    this.ambientLight = 1.0;

    // Weather Engine System ('clear', 'rain', 'fog', 'snow')
    this.weatherType = 'clear';
    this.rainDrops = [];
    this.snowFlakes = [];
    this.fogClouds = [];
    this.lightningTimer = 0;
    this.flashAlpha = 0;

    this.initWeather();
  }

  updateLaneGeometry() {
    this.laneWidth = this.currentRoadWidth / this.laneCount;
    this.laneCenters = [];
    for (let i = 0; i < this.laneCount; i++) {
      this.laneCenters.push(this.leftEdge + this.laneWidth * (i + 0.5));
    }
  }

  initScenery() {
    this.sceneryObjects = [];
    for (let y = -200; y < this.height + 200; y += 120) {
      this.sceneryObjects.push({
        side: 'left',
        x: this.leftEdge - 30,
        y: y,
        type: Math.random() > 0.4 ? 'tree' : 'lamp'
      });
      this.sceneryObjects.push({
        side: 'right',
        x: this.rightEdge + 30,
        y: y + 60,
        type: Math.random() > 0.4 ? 'tree' : 'lamp'
      });
    }
  }

  initWeather() {
    this.rainDrops = [];
    for (let i = 0; i < 70; i++) {
      this.rainDrops.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        length: Math.random() * 22 + 16,
        speed: Math.random() * 12 + 16
      });
    }

    this.snowFlakes = [];
    for (let i = 0; i < 60; i++) {
      this.snowFlakes.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        radius: Math.random() * 3 + 1.5,
        speed: Math.random() * 2.5 + 1.5,
        sway: Math.random() * Math.PI * 2
      });
    }

    this.fogClouds = [];
    for (let i = 0; i < 12; i++) {
      this.fogClouds.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        radius: Math.random() * 80 + 70,
        speed: Math.random() * 0.8 + 0.4
      });
    }
  }

  getLaneCenter(laneIndex) {
    const clampedIndex = Math.max(0, Math.min(this.laneCount - 1, laneIndex));
    return this.laneCenters[clampedIndex];
  }

  update(speed, distanceMeters, level = 1, dt = 0.016) {
    this.laneCount = 4;
    this.targetLaneCount = 4;
    this.currentRoadWidth = this.width * CONFIG.ROAD_WIDTH_PERCENT;

    this.leftEdge = (this.width - this.currentRoadWidth) / 2;
    this.rightEdge = this.leftEdge + this.currentRoadWidth;
    this.updateLaneGeometry();

    // Scroll road markings & continuous sub-pixel curb offset
    const moveAmount = speed * 60 * dt;
    this.offsetY = (this.offsetY + moveAmount) % (this.dashLength + this.dashGap);
    this.curbScrollY += moveAmount;

    // Update Scenery positions along edges
    for (let obj of this.sceneryObjects) {
      obj.y += moveAmount;
      obj.x = obj.side === 'left' ? this.leftEdge - 30 : this.rightEdge + 30;

      if (obj.y > this.height + 100) {
        obj.y -= this.height + 200;
        obj.type = Math.random() > 0.4 ? 'tree' : 'lamp';
      }
    }

    // Update Day/Night Cycle based on distance
    const cycleProgress = (distanceMeters % 3200) / 3200;
    if (cycleProgress < 0.4) {
      this.ambientLight = 1.0;
      this.timeOfDay = 0;
    } else if (cycleProgress < 0.5) {
      this.ambientLight = lerp(1.0, 0.65, (cycleProgress - 0.4) / 0.1);
      this.timeOfDay = 1;
    } else if (cycleProgress < 0.85) {
      this.ambientLight = 0.35;
      this.timeOfDay = 2;
    } else {
      this.ambientLight = lerp(0.35, 1.0, (cycleProgress - 0.85) / 0.15);
      this.timeOfDay = 3;
    }

    // Multi-Weather Transition Logic based on Level
    if (level === 1) {
      this.weatherType = 'clear';
    } else if (level === 2) {
      this.weatherType = 'rain';
    } else if (level === 3) {
      this.weatherType = 'fog';
    } else if (level === 4) {
      this.weatherType = 'snow';
    } else {
      const wModeIndex = Math.floor(distanceMeters / 500) % 4;
      const wModes = ['clear', 'rain', 'fog', 'snow'];
      this.weatherType = wModes[wModeIndex];
    }

    // Update Weather Effects
    if (this.weatherType === 'rain') {
      for (let drop of this.rainDrops) {
        drop.y += drop.speed + moveAmount * 0.3;
        drop.x -= 1.5;
        if (drop.y > this.height) {
          drop.y = -20;
          drop.x = Math.random() * (this.width + 50);
        }
      }

      this.lightningTimer += dt;
      if (this.flashAlpha > 0) this.flashAlpha -= dt * 3;
      if (this.lightningTimer > 7 && Math.random() < 0.02) {
        this.flashAlpha = 0.35;
        this.lightningTimer = 0;
      }
    } else if (this.weatherType === 'snow') {
      for (let flake of this.snowFlakes) {
        flake.y += flake.speed + moveAmount * 0.15;
        flake.sway += dt * 2;
        flake.x += Math.sin(flake.sway) * 0.8;
        if (flake.y > this.height) {
          flake.y = -10;
          flake.x = Math.random() * this.width;
        }
      }
    } else if (this.weatherType === 'fog') {
      for (let cloud of this.fogClouds) {
        cloud.y += cloud.speed + moveAmount * 0.1;
        if (cloud.y > this.height + cloud.radius) {
          cloud.y = -cloud.radius;
          cloud.x = Math.random() * this.width;
        }
      }
    }
  }

  draw(ctx) {
    ctx.save();

    // 1. Draw Roadside Grass / Ground
    let grassColor = '#1e293b';
    if (this.timeOfDay === 0) grassColor = '#15803d'; // Rich green
    else if (this.timeOfDay === 1) grassColor = '#78350f'; // Sunset warm amber
    else if (this.timeOfDay === 2) grassColor = '#0f172a'; // Deep night slate

    if (this.weatherType === 'snow') grassColor = '#334155';

    ctx.fillStyle = grassColor;
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. Draw Main Asphalt Highway
    let asphaltColor = '#1e293b';
    if (this.timeOfDay === 2) asphaltColor = '#0f172a';
    if (this.weatherType === 'snow') asphaltColor = '#1e293b';

    ctx.fillStyle = asphaltColor;
    ctx.fillRect(this.leftEdge, 0, this.currentRoadWidth, this.height);

    // 3. BUTTER-SMOOTH CONTINUOUS SUB-PIXEL SCROLLING CURB GUARD RAILS
    const curbWidth = 10;
    const stripeH = 32;
    const scrollOffset = this.curbScrollY % (stripeH * 2);

    for (let y = -stripeH * 2; y < this.height + stripeH * 2; y += stripeH) {
      const drawY = y + scrollOffset;
      const stripeIdx = Math.floor((drawY - this.curbScrollY) / stripeH);
      const isRed = Math.abs(stripeIdx) % 2 === 0;

      ctx.fillStyle = isRed ? '#ef4444' : '#f8fafc';
      // Left Curb
      ctx.fillRect(this.leftEdge - curbWidth, drawY, curbWidth, stripeH + 0.5);
      // Right Curb
      ctx.fillRect(this.rightEdge, drawY, curbWidth, stripeH + 0.5);
    }

    // 4. Draw White Solid Road Outer Borders
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(this.leftEdge, 0);
    ctx.lineTo(this.leftEdge, this.height);
    ctx.moveTo(this.rightEdge, 0);
    ctx.lineTo(this.rightEdge, this.height);
    ctx.stroke();

    // 5. Draw Dashed Lane Dividers
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 4;
    ctx.setLineDash([this.dashLength, this.dashGap]);
    ctx.lineDashOffset = -this.offsetY;

    for (let i = 1; i < this.targetLaneCount; i++) {
      const lineX = this.leftEdge + (this.currentRoadWidth / this.targetLaneCount) * i;
      ctx.beginPath();
      ctx.moveTo(lineX, -100);
      ctx.lineTo(lineX, this.height + 100);
      ctx.stroke();
    }

    ctx.setLineDash([]); // Reset line dash

    // 6. Draw Scenery Objects (Trees & Street Lamps)
    for (let obj of this.sceneryObjects) {
      if (obj.type === 'tree') {
        ctx.fillStyle = this.weatherType === 'snow' ? '#14532d' : '#064e3b';
        ctx.beginPath();
        ctx.arc(obj.x, obj.y, 22, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = this.weatherType === 'snow' ? '#e2e8f0' : '#047857';
        ctx.beginPath();
        ctx.arc(obj.x - 4, obj.y - 4, 15, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#64748b';
        ctx.fillRect(obj.x - 3, obj.y - 12, 6, 24);

        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(obj.x, obj.y - 12, 6, 0, Math.PI * 2);
        ctx.fill();

        if (this.timeOfDay === 2) {
          const glowGrad = ctx.createRadialGradient(obj.x, obj.y - 12, 4, obj.x, obj.y - 12, 80);
          glowGrad.addColorStop(0, 'rgba(254, 240, 138, 0.35)');
          glowGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
          ctx.fillStyle = glowGrad;
          ctx.beginPath();
          ctx.arc(obj.x, obj.y - 12, 80, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 7. Draw Night Darkness Overlay
    if (this.ambientLight < 1.0) {
      ctx.fillStyle = `rgba(15, 23, 42, ${1 - this.ambientLight})`;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    // 8. Weather Atmosphere Overlays
    if (this.weatherType === 'rain') {
      ctx.strokeStyle = 'rgba(203, 213, 225, 0.48)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let drop of this.rainDrops) {
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x - 3, drop.y + drop.length);
      }
      ctx.stroke();

      if (this.flashAlpha > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.flashAlpha})`;
        ctx.fillRect(0, 0, this.width, this.height);
      }
    } else if (this.weatherType === 'snow') {
      ctx.fillStyle = 'rgba(248, 250, 252, 0.85)';
      ctx.beginPath();
      for (let flake of this.snowFlakes) {
        ctx.moveTo(flake.x, flake.y);
        ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
      }
      ctx.fill();
    } else if (this.weatherType === 'fog') {
      for (let cloud of this.fogClouds) {
        const fogGrad = ctx.createRadialGradient(cloud.x, cloud.y, 10, cloud.x, cloud.y, cloud.radius);
        fogGrad.addColorStop(0, 'rgba(226, 232, 240, 0.28)');
        fogGrad.addColorStop(0.7, 'rgba(226, 232, 240, 0.12)');
        fogGrad.addColorStop(1, 'rgba(226, 232, 240, 0)');

        ctx.fillStyle = fogGrad;
        ctx.beginPath();
        ctx.arc(cloud.x, cloud.y, cloud.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }
}
