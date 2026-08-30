/**
 * TRAFFIC ESCAPE — Traffic Vehicles & Fair Spawning System
 * Handles traffic generation, smooth lane changing with amber turn indicators,
 * forward vehicle light orientation, and progressive difficulty progression.
 */

import { CONFIG } from './config.js';
import { random, randomInt, randomChoice, lerp } from './utils.js';

export const TRAFFIC_TYPES = {
  small: {
    width: 42,
    height: 72,
    colors: ['#0284c7', '#22c55e', '#a855f7', '#ec4899', '#f97316'],
    speedMult: 0.95
  },
  sedan: {
    width: 46,
    height: 82,
    colors: ['#475569', '#2563eb', '#16a34a', '#d97706', '#9333ea'],
    speedMult: 0.90
  },
  truck: {
    width: 54,
    height: 135,
    colors: ['#dc2626', '#0284c7', '#ea580c', '#475569'],
    speedMult: 0.80
  },
  bus: {
    width: 52,
    height: 125,
    colors: ['#eab308', '#2563eb', '#16a34a'],
    speedMult: 0.84
  }
};

export class TrafficVehicle {
  constructor(lane, y, typeKey, gameSpeed, level = 1) {
    this.lane = lane;
    this.targetLane = lane;
    this.typeKey = typeKey;
    this.type = TRAFFIC_TYPES[typeKey];
    this.width = this.type.width;
    this.height = this.type.height;
    this.color = randomChoice(this.type.colors);

    this.x = 0; // Set by manager
    this.y = y;

    // Movement speed relative to road scrolling speed
    const levelSpeedBonus = Math.min(0.18, (level - 1) * 0.04);
    this.speedMult = (this.type.speedMult + levelSpeedBonus) * random(0.92, 1.08);
    this.speed = gameSpeed * this.speedMult;
    this.passedPlayer = false;

    // Dynamic Lane Changing Parameters
    this.isChangingLane = false;
    this.blinkerSide = null; // 'left', 'right', or null
    this.blinkerTimer = 0;
    this.laneChangeCooldown = randomInt(180, 400); // frames before considering lane change
  }

  getBounds() {
    return {
      x: this.x - this.width / 2,
      y: this.y - this.height / 2,
      width: this.width,
      height: this.height
    };
  }

  /**
   * Safe Dynamic Lane Change Logic:
   * Small cars & sedans look at adjacent lanes and signal with turn indicators before gliding into safe open lanes.
   */
  attemptLaneChange(road, allVehicles, player) {
    // Only small cars & sedans switch lanes for predictable gameplay
    if (this.typeKey !== 'small' && this.typeKey !== 'sedan') return;

    if (this.laneChangeCooldown > 0) {
      this.laneChangeCooldown--;
      return;
    }

    if (this.isChangingLane) return;

    // Don't switch lanes if too close to bottom or top of screen
    if (this.y < 80 || this.y > road.height - 180) return;

    const candidates = [];
    if (this.lane > 0) candidates.push(this.lane - 1);
    if (this.lane < CONFIG.LANE_COUNT - 1) candidates.push(this.lane + 1);

    if (candidates.length === 0) return;

    const target = randomChoice(candidates);

    // Safety Check 1: Other traffic vehicles in target lane
    for (let other of allVehicles) {
      if (other === this) continue;
      if (other.lane === target || other.targetLane === target) {
        if (Math.abs(other.y - this.y) < 170) {
          this.laneChangeCooldown = 90;
          return;
        }
      }
    }

    // Safety Check 2: Distance from player
    if (player.currentLane === target && Math.abs(player.y - this.y) < 220) {
      this.laneChangeCooldown = 120;
      return;
    }

    // Safe to switch!
    this.targetLane = target;
    this.blinkerSide = target < this.lane ? 'left' : 'right';
    this.isChangingLane = true;
    this.laneChangeCooldown = randomInt(300, 600);
  }

  update(roadSpeed, road, dt) {
    // Traffic moves downwards relative to player speed
    const relativeSpeed = roadSpeed - (this.speed * 0.42);
    this.y += relativeSpeed * 60 * dt;

    // Smooth X position interpolation towards target lane
    const targetX = road.getLaneCenter(this.targetLane);
    this.x = lerp(this.x, targetX, 5 * dt);

    if (Math.abs(this.x - targetX) < 1.5) {
      this.x = targetX;
      this.lane = this.targetLane;
      this.isChangingLane = false;
      this.blinkerSide = null;
    }

    this.blinkerTimer += dt * 8;
  }

  draw(ctx, isNight = false) {
    ctx.save();
    ctx.translate(this.x, this.y);

    const w = this.width;
    const h = this.height;

    // Subtle tilt angle when changing lanes
    const targetX = (this.laneChangeCooldown > 0 && this.targetLane !== undefined) ? 0 : (this.x - this.targetLane);
    const tilt = (this.isChangingLane && this.blinkerSide === 'left') ? -0.06 : ((this.isChangingLane && this.blinkerSide === 'right') ? 0.06 : 0);
    ctx.rotate(tilt);

    // 1. Drop Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 6, w * 0.55, h * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Main Chassis Body (Vehicle driving FORWARD / UPWARDS along highway)
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, [12, 12, 8, 8]);
    ctx.fill();

    // 3. Vehicle Specific Features (Facing FORWARD / UPWARDS)
    if (this.typeKey === 'truck') {
      // Semi-truck: Driver Cab at FRONT/TOP (-h/2), Cargo Trailer at REAR/BOTTOM (+h/2)
      ctx.fillStyle = '#f8fafc'; // Trailer roof
      ctx.fillRect(-w * 0.42, -h * 0.17, w * 0.84, h * 0.62);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'; // Trailer gap
      ctx.fillRect(-w * 0.42, -h * 0.17, w * 0.84, 4);

      // Cab Windshield at FRONT (facing up)
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(-w * 0.38, -h * 0.38, w * 0.76, h * 0.16, [4, 4, 2, 2]);
      ctx.fill();
    } else if (this.typeKey === 'bus') {
      // Bus: Windshield at FRONT/TOP (-h/2), Rear window at REAR/BOTTOM (+h/2)
      ctx.fillStyle = '#0f172a'; // Windows
      ctx.beginPath();
      ctx.roundRect(-w * 0.38, -h * 0.42, w * 0.76, h * 0.16, [4, 4, 2, 2]);
      ctx.fill();

      ctx.beginPath();
      ctx.roundRect(-w * 0.35, h * 0.30, w * 0.7, h * 0.12, [2, 2, 4, 4]);
      ctx.fill();

      ctx.fillRect(-w * 0.42, -h * 0.22, 3, h * 0.5);
      ctx.fillRect(w * 0.42 - 3, -h * 0.22, 3, h * 0.5);
    } else {
      // Small Car / Sedan
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(-w * 0.38, -h * 0.24, w * 0.76, h * 0.20, [4, 4, 2, 2]);
      ctx.fill();

      ctx.beginPath();
      ctx.roundRect(-w * 0.35, h * 0.18, w * 0.7, h * 0.15, [2, 2, 4, 4]);
      ctx.fill();
    }

    // 4. Wheels
    ctx.fillStyle = '#020617';
    ctx.fillRect(-w / 2 - 2, -h * 0.35, 3, 14); // Front wheels
    ctx.fillRect(w / 2 - 1, -h * 0.35, 3, 14);
    ctx.fillRect(-w / 2 - 2, h * 0.22, 3, 14);  // Rear wheels
    ctx.fillRect(w / 2 - 1, h * 0.22, 3, 14);

    // 5. RED TAILLIGHTS on REAR BUMPER (Bottom edge facing trailing player)
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-w * 0.4 + 2, h / 2 - 3, 8, 3);
    ctx.fillRect(w * 0.4 - 10, h / 2 - 3, 8, 3);

    // 6. WHITE HEADLIGHTS on FRONT BUMPER (Top edge facing forward up highway)
    ctx.fillStyle = '#fffbeb';
    ctx.fillRect(-w * 0.4 + 2, -h / 2, 8, 3);
    ctx.fillRect(w * 0.4 - 10, -h / 2, 8, 3);

    // 7. FLASHING AMBER TURN INDICATOR BLINKERS
    if (this.blinkerSide && Math.floor(this.blinkerTimer) % 2 === 0) {
      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 10;
      if (this.blinkerSide === 'left') {
        ctx.fillRect(-w / 2 - 3, -h / 2 + 2, 4, 6);
        ctx.fillRect(-w / 2 - 3, h / 2 - 8, 4, 6);
      } else {
        ctx.fillRect(w / 2 - 1, -h / 2 + 2, 4, 6);
        ctx.fillRect(w / 2 - 1, h / 2 - 8, 4, 6);
      }
      ctx.shadowBlur = 0;
    }

    // 8. NIGHT MODE HEADLIGHT BEAMS (Projecting UPWARD ahead into the dark highway)
    if (isNight) {
      const beamLength = 160;
      const beamSpread = w * 0.75;
      const beamGrad = ctx.createLinearGradient(0, -h / 2, 0, -h / 2 - beamLength);
      beamGrad.addColorStop(0, 'rgba(254, 243, 199, 0.45)');
      beamGrad.addColorStop(0.3, 'rgba(254, 243, 199, 0.18)');
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
      const tailGlowLeft = ctx.createRadialGradient(-w * 0.35, h / 2, 1, -w * 0.35, h / 2, 12);
      tailGlowLeft.addColorStop(0, 'rgba(239, 68, 68, 0.8)');
      tailGlowLeft.addColorStop(1, 'rgba(239, 68, 68, 0)');
      ctx.fillStyle = tailGlowLeft;
      ctx.beginPath();
      ctx.arc(-w * 0.35, h / 2, 12, 0, Math.PI * 2);
      ctx.fill();

      const tailGlowRight = ctx.createRadialGradient(w * 0.35, h / 2, 1, w * 0.35, h / 2, 12);
      tailGlowRight.addColorStop(0, 'rgba(239, 68, 68, 0.8)');
      tailGlowRight.addColorStop(1, 'rgba(239, 68, 68, 0)');
      ctx.fillStyle = tailGlowRight;
      ctx.beginPath();
      ctx.arc(w * 0.35, h / 2, 12, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

export class TrafficManager {
  constructor(road) {
    this.road = road;
    this.vehicles = [];
    this.spawnTimer = 0;
  }

  reset() {
    this.vehicles = [];
    this.spawnTimer = 0;
  }

  update(gameSpeed, player, level, distanceMeters, dt) {
    this.spawnTimer++;

    // Level-based spawn interval formula
    const levelBonus = Math.min(45, (level - 1) * 8);
    const currentInterval = Math.max(
      CONFIG.TRAFFIC_SPAWN_INTERVAL_MIN,
      CONFIG.TRAFFIC_SPAWN_INTERVAL_MAX - levelBonus - Math.floor(gameSpeed * 1.5)
    );

    if (this.spawnTimer >= currentInterval) {
      this.spawnTimer = 0;
      this.attemptSpawnTraffic(gameSpeed, player.currentLane, level, distanceMeters);
    }

    // Update position and lane-changing behavior of all vehicles
    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const v = this.vehicles[i];

      // Initialize X if not yet set
      if (v.x === 0) {
        v.x = this.road.getLaneCenter(v.lane);
      }

      v.attemptLaneChange(this.road, this.vehicles, player);
      v.update(gameSpeed, this.road, dt);

      // Cleanup offscreen vehicles below screen
      if (v.y > this.road.height + 220) {
        this.vehicles.splice(i, 1);
      }
    }
  }

  /**
   * LEVEL & DISTANCE PROGRESSIVE SPAWNING SYSTEM
   */
  attemptSpawnTraffic(gameSpeed, playerLane, level, distanceMeters) {
    const occupiedLanes = new Set();
    for (let v of this.vehicles) {
      if (v.y < 220) {
        occupiedLanes.add(v.lane);
        if (v.targetLane !== undefined) occupiedLanes.add(v.targetLane);
      }
    }

    // ANTI-TRAP RULE: Always keep at least 1 lane completely free at top!
    if (occupiedLanes.size >= CONFIG.LANE_COUNT - 1) {
      return;
    }

    const availableLanes = [];
    for (let l = 0; l < CONFIG.LANE_COUNT; l++) {
      if (!occupiedLanes.has(l)) {
        availableLanes.push(l);
      }
    }

    if (availableLanes.length === 0) return;

    let spawnCount = 1;
    if (level >= 2 && availableLanes.length >= 2) {
      const multiSpawnChance = Math.min(0.45, 0.15 + (level - 2) * 0.10);
      if (Math.random() < multiSpawnChance) {
        spawnCount = 2;
      }
    }

    for (let s = 0; s < spawnCount; s++) {
      if (availableLanes.length === 0) break;
      if (occupiedLanes.size >= CONFIG.LANE_COUNT - 1) break;

      const laneIndex = randomInt(0, availableLanes.length - 1);
      const chosenLane = availableLanes.splice(laneIndex, 1)[0];

      // Safe Buffer Rule: Ensure a 320px vertical gap in player lane
      const vehicleInPlayerLane = this.vehicles.find(v => v.lane === chosenLane || v.targetLane === chosenLane);
      if (chosenLane === playerLane && vehicleInPlayerLane && vehicleInPlayerLane.y < 320) {
        continue;
      }

      const typeRoll = Math.random();
      let typeKey = 'small';
      const heavyChance = Math.min(0.60, 0.20 + (level - 1) * 0.10);

      if (typeRoll < heavyChance) {
        typeKey = Math.random() > 0.5 ? 'truck' : 'bus';
      } else if (typeRoll < heavyChance + 0.3) {
        typeKey = 'sedan';
      } else {
        typeKey = 'small';
      }

      const spawnY = -120 - (s * 30);
      const vehicle = new TrafficVehicle(chosenLane, spawnY, typeKey, gameSpeed, level);
      vehicle.x = this.road.getLaneCenter(chosenLane);
      this.vehicles.push(vehicle);
      occupiedLanes.add(chosenLane);
    }
  }

  draw(ctx, isNight = false) {
    for (let v of this.vehicles) {
      v.draw(ctx, isNight);
    }
  }
}
