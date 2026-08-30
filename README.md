# 🚗 TRAFFIC ESCAPE — Complete Game Documentation

Developed by **codebydj** (GitHub: [github.com/codebydj](https://github.com/codebydj))

A polished, responsive, high-performance top-down 2D/3D-styled arcade highway driving game built with **HTML5 Canvas API, Vanilla JavaScript (ES Modules), and Modern CSS**. 

Zero external dependencies, zero image asset files, zero audio asset files — everything is rendered procedurally with Canvas vector graphics and synthesized using the browser's Web Audio API.

---

## 🎯 About the Game

In **Traffic Escape**, the player controls a high-speed arcade vehicle driving continuously down a dynamic highway. Avoid oncoming traffic, collect spinning gold coins, grab superpowers, dodge close calls, survive through dynamic weather conditions, and adapt as the road expands into a **4-lane highway**!

```text
START GAME
   │
   ▼
Drive Automatically ──► Avoid Traffic (◀ / ▶) ──► Near-Miss Dodges (+100 pts)
   │
   ├─► Collect Coins (🪙) ──► Unlock Car Skins in Garage
   ├─► Grab Power-ups (🛡️ Shield, ⚡ Speed Boost, 🧲 Coin Magnet)
   ├─► Dynamic Weather (Clear ──► Rain & Lightning ──► Fog ──► Snow)
   ├─► Level 4+ Highway Expansion (3 Lanes ──► 4 Lanes)
   │
   ▼
Crash into Traffic ──► 3-Life System / Shield Absorption ──► GAME OVER ──► Try Again!
```

---

## 🎮 How to Play

1. **Drive & Dodge**: Your vehicle drives continuously up the highway. Use your controls to switch lanes and dodge oncoming traffic.
2. **Collect Coins**: Gather gold coin trails along the road to spend in the Garage.
3. **Grab Power-Ups**: Collect 🛡️ **Shield**, ⚡ **Speed Boost**, and 🧲 **Coin Magnet** items to survive longer and score faster.
4. **Perform Near-Misses**: Drive extremely close to traffic vehicles without crashing to trigger a **NEAR MISS!** score bonus (+100 pts).
5. **Adapt to Weather & Road Expansion**: As your distance increases, weather shifts dynamically and the highway expands into a 4-lane road at **Level 4**!

---

## 🕹️ Game Controls

| Action | Desktop Keyboard | Mobile Touch |
| :--- | :--- | :--- |
| **Move Left** | `←` (Left Arrow) or `A` | ◀ **LEFT** Button |
| **Move Right** | `→` (Right Arrow) or `D` | **RIGHT** ▶ Button |
| **Pause / Resume** | `P` or `Esc` | ⏸️ Pause Button |

---

## ✨ Core Game Features

### 1. 🛣️ Dynamic 4-Lane Highway Expansion (Level 4+)
- **Smooth Road Width Transition**: The highway starts as a 3-lane road (Lanes 0, 1, 2). Upon reaching **Level 4**, the road smoothly expands over ~1.5 seconds into a **4-lane highway** (Lanes 0, 1, 2, 3).
- **Animated Dividers & Guard Rails**: Dashed lane dividers dynamically adapt from 2 inner lines to 3 inner lines. Red and white curb guard rails feature sub-pixel smooth scrolling at 60 FPS without popping.
- **Level & Weather Floating Banners**: Reaching Level 4 displays a popup: `"LEVEL 4! 4-LANE HIGHWAY!"`.

### 2. 🚘 9 Distinct Traffic Vehicle Types
Oncoming traffic features 9 distinct vehicle types with custom vector designs and special behaviors:
- 🚗 **Small Hatchback**: Fast speed, compact size.
- 🚙 **Sedan**: Executive sedan proportions.
- 🏎️ **Sports Supercar**: Sleek low aerodynamic profile, dual racing stripes, twin rear spoiler wing.
- 🚔 **Police Cruiser**: Stealth black body with white doors and **flashing RED & BLUE siren strobe lights**!
- 🚑 **Ambulance**: Emergency medical van with red cross emblem and **flashing red roof strobes**!
- 🚐 **Delivery Cargo Van**: Boxy tall cargo panel van with rear doors.
- 📐 **Cyber Truck**: Angular geometric armor body with a **Full-Width Horizon LED Light Bar**!
- 🚛 **Semi-Truck**: Long cargo trailer body.
- 🚌 **City Bus**: Wide & long body.
- **Dynamic Lane Changing**: Traffic vehicles signal with flashing amber blinker lights (`#f59e0b`) and switch into open adjacent lanes smoothly while checking safety distances.

### 3. 🌦️ Multi-Weather Atmosphere System
Weather shifts dynamically based on game progression, displaying a floating text notification banner at the level popup position whenever the weather changes:
- ☀️ **Clear Skies**: Sunny daylight / warm sunset / dark night cycles.
- 🌧️ **Heavy Rainstorm & Lightning**: Slanted rain drops, splash particles, and occasional **distant lightning flashes** with screen overlays.
- 🌫️ **Dense Highway Fog**: Volumetric rolling fog clouds through which vehicle headlights cut dramatically.
- ❄️ **Snowstorm & Frost**: Swirling falling snowflakes with frosted ground side borders.

### 4. ⚡ Power-Ups System
- 🛡️ **Shield**: Protects against 1 traffic collision with a forcefield glow and brief invincibility window.
- ⚡ **Speed Boost (5s)**: Boosts speed by 40%, applies a 2x score multiplier, motion blur effects, and speed lines.
- 🧲 **Coin Magnet (7s)**: Dynamically pulls nearby coins towards your car using magnetic attraction physics.

### 5. 🔊 Procedural Web Audio API Synthesizer
Zero external audio files required! Synthesizes sound programmatically:
- **Starter Ignition Cue**: Starter relay click, low ignition pulse, and restrained rev sweep when Play / "GO!" appears.
- **Sports-Car Engine Synth**: Dual `triangle` and `sine` oscillators with warm lowpass filtering for smooth motor rumble.
- **FX Suite**: Countdown ticks, melodic coin chimes, rising power-up sweeps, near-miss zaps, crash impact rumbles, and level-up fanfare.

### 6. 🎨 Garage & Car Customization
- **5 Unlockable Car Skins**:
  - 🔴 **Classic Red**: Default (Free)
  - 🔵 **Cobalt Blue**: 300 Coins
  - ⬛ **Stealth Black**: 750 Coins
  - 🟡 **Speed Yellow**: 1200 Coins
  - 🟣 **Neon Cyber**: 2000 Coins
- Interactive Mini-Canvas Preview in Garage screen.
- Total coin balance and skin purchases persist across browser refreshes.

---

## 📁 Project Architecture

```text
trafficEscape/
├── index.html          # HTML structure, UI overlays, HUD grid, and touch buttons
├── style.css           # Glassmorphism panels, CSS variables, typography, animations
└── js/
    ├── config.js       # Game balancing values, car skin catalog, resolution
    ├── utils.js        # Math helpers (clamp, lerp, random), collision AABB, formatting
    ├── storage.js      # Safe LocalStorage persistence manager with fallbacks
    ├── audio.js        # Procedural Web Audio API sound synthesizer engine
    ├── road.js         # Highway geometry, 4-lane expansion, smooth curbs & weather
    ├── player.js       # Player car physics, custom skin drawing, headlight beams
    ├── traffic.js      # 9 Traffic vehicle types, flashing sirens & lane switching
    ├── coin.js         # 3D spinning gold coins, long lines, double-lines & magnet physics
    ├── powerups.js     # Shield, Speed Boost & Coin Magnet items
    ├── particles.js    # Particle explosions, floating text popups & screen shake
    ├── garage.js       # Garage UI manager, skin purchasing & preview renderer
    ├── ui.js           # HUD manager, score displays & screen state navigation
    ├── game.js         # 60 FPS loop, state machine, collision & scoring logic
    └── main.js         # Entry point initialization, retina canvas scaling & event bindings
```

---

## 🚀 How to Run the Game

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/codebydj/traffi-Escape.git
   cd traffi-Escape
   ```
2. **Open in Browser**:
   Open `index.html` directly in modern web browsers (Chrome, Edge, Firefox, Safari), or serve using any static web server:
   ```bash
   npx serve -l 8080
   ```
3. Open `http://localhost:8080` in your browser and click **PLAY GAME**!

---

## 🏆 Data Persistence (`localStorage`)

The game automatically saves and persists data locally:
- `highScore`: Personal best score.
- `bestDistance`: Maximum distance driven (in km).
- `totalCoins`: Cumulative coins collected for spending in Garage.
- `selectedCar`: Equipped car skin ID.
- `unlockedCars`: Array of unlocked skin IDs.
- `soundEnabled`: Mute / Unmute setting.

---

## 👨‍💻 Developer & License

Created by **codebydj**  
GitHub Repository: [github.com/codebydj/traffi-Escape](https://github.com/codebydj/traffi-Escape)
