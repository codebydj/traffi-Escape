/**
 * TRAFFIC ESCAPE — Road & Environment Engine
 * Handles 3-lane / 4-lane highway rendering, dynamic lane expansion at Level 4+,
 * scrolling dash lines, roadside scenery, day/night cycles, and weather.
 */

import { CONFIG } from './config.js';
import { lerp } from './utils.js';

export class Road {
  constructor(canvasWidth, canvasHeight) {
    this.width = canvasWidth;
    this.height = canvasHeight;

    // Calculate Road Geometry
    this.roadWidth = this.width * CONFIG.ROAD_WIDTH_PERCENT;
    this.leftEdge = (this.width - this.roadWidth) / 2;
    this.rightEdge = this.leftEdge + this.roadWidth;

    // Default to 3 lanes; dynamically expands to 4 lanes at Level 4+
    this.laneCount = CONFIG.LANE_COUNT;
    this.updateLaneGeometry(this.laneCount);

    // Scrolling & Motion
    this.offsetY = 0;
    this.dashLength = 40;
    this.dashGap = 30;

    // Environmental Objects (Trees, Street Lights, Signs)
    this.sceneryObjects = [];
    this.initScenery();

    // Day/Night & Atmosphere Parameters
    this.timeOfDay = 0; // 0: Day, 1: Sunset, 2: Night, 3: Dawn
    this.ambientLight = 1.0; // 1.0 = Day, 0.35 = Dark Night

    // Weather Effects
    this.isRaining = false;
    this.rainDrops = [];
    this.initRain();
  }

  updateLaneGeometry(count) {
    this.laneCount = count;
    this.laneWidth = this.roadWidth / this.laneCount;
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

  initRain() {
    this.rainDrops = [];
    for (let i = 0; i < 60; i++) {
      this.rainDrops.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        length: Math.random() * 20 + 15,
        speed: Math.random() * 10 + 15
      });
    }
  }

  getLaneCenter(laneIndex) {
    const clampedIndex = Math.max(0, Math.min(this.laneCount - 1, laneIndex));
    return this.laneCenters[clampedIndex];
  }

  update(speed, distanceMeters, level = 1, dt = 0.016) {
    // Dynamic 4-Lane Highway Expansion at Level 4+
    const targetLanes = level >= 4 ? 4 : 3;
    if (this.laneCount !== targetLanes) {
      this.updateLaneGeometry(targetLanes);
    }

    // Scroll road markings
    const moveAmount = speed * 60 * dt;
    this.offsetY = (this.offsetY + moveAmount) % (this.dashLength + this.dashGap);

    // Update Scenery
    for (let obj of this.sceneryObjects) {
      obj.y += moveAmount;
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

    // Toggle Rain occasionally on higher levels
    this.isRaining = (distanceMeters > 600) && (Math.floor(distanceMeters / 1200) % 2 === 1);

    if (this.isRaining) {
      for (let drop of this.rainDrops) {
        drop.y += drop.speed + moveAmount * 0.3;
        drop.x -= 1.5;
        if (drop.y > this.height) {
          drop.y = -20;
          drop.x = Math.random() * (this.width + 50);
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

    ctx.fillStyle = grassColor;
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. Draw Main Asphalt Highway
    let asphaltColor = '#1e293b';
    if (this.timeOfDay === 2) asphaltColor = '#0f172a';

    ctx.fillStyle = asphaltColor;
    ctx.fillRect(this.leftEdge, 0, this.roadWidth, this.height);

    // 3. Draw Red/White Curb Guard Rails along edge
    const curbWidth = 10;
    const stripeHeight = 30;
    const curbOffsetY = this.offsetY % (stripeHeight * 2);

    for (let y = -stripeHeight * 2; y < this.height + stripeHeight; y += stripeHeight) {
      const isRed = Math.floor((y - curbOffsetY) / stripeHeight) % 2 === 0;
      ctx.fillStyle = isRed ? '#ef4444' : '#f8fafc';
      ctx.fillRect(this.leftEdge - curbWidth, y + curbOffsetY, curbWidth, stripeHeight);
      ctx.fillRect(this.rightEdge, y + curbOffsetY, curbWidth, stripeHeight);
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

    // 5. Draw Dashed Lane Dividers (2 lines for 3-lane road; 3 lines for 4-lane road)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 4;
    ctx.setLineDash([this.dashLength, this.dashGap]);
    ctx.lineDashOffset = -this.offsetY;

    for (let i = 1; i < this.laneCount; i++) {
      const lineX = this.leftEdge + this.laneWidth * i;
      ctx.beginPath();
      ctx.moveTo(lineX, -100);
      ctx.lineTo(lineX, this.height + 100);
      ctx.stroke();
    }

    ctx.setLineDash([]); // Reset line dash

    // 6. Draw Scenery Objects (Trees & Street Lamps)
    for (let obj of this.sceneryObjects) {
      if (obj.type === 'tree') {
        ctx.fillStyle = '#064e3b';
        ctx.beginPath();
        ctx.arc(obj.x, obj.y, 22, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#047857';
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

    // 7. Draw Night Darkness Overlay if Night
    if (this.ambientLight < 1.0) {
      ctx.fillStyle = `rgba(15, 23, 42, ${1 - this.ambientLight})`;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    // 8. Draw Rain Particles if Active
    if (this.isRaining) {
      ctx.strokeStyle = 'rgba(203, 213, 225, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let drop of this.rainDrops) {
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x - 3, drop.y + drop.length);
      }
      ctx.stroke();
    }

    ctx.restore();
  }
}
