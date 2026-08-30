/**
 * TRAFFIC ESCAPE — Game Configuration & Balancing Constants
 */

export const CONFIG = {
  // Virtual Canvas Native Resolution
  CANVAS_WIDTH: 450,
  CANVAS_HEIGHT: 800,

  // Lane Configuration (Game starts directly with a 4-lane highway!)
  LANE_COUNT: 4,
  ROAD_WIDTH_PERCENT: 0.88, // Road takes 88% of total canvas width for 4 lanes

  // Gameplay Balancing
  PLAYER_LIVES: 3,
  STARTING_SPEED: 7.5,       // Base scrolling & movement speed
  MAX_SPEED: 24.0,           // Top speed cap
  SPEED_ACCELERATION: 0.06,  // Speed increase rate per 100 meters
  COIN_VALUE: 10,            // Base points per coin
  NEAR_MISS_BONUS: 100,      // Score bonus for dodge close calls
  LEVEL_DISTANCE: 320,       // Distance (meters) needed per level up

  // Timers & Powerup Durations (in seconds)
  INVINCIBILITY_DURATION: 2.0,
  BOOST_DURATION: 5.0,
  MAGNET_DURATION: 7.0,
  MAGNET_RADIUS: 240,        // Pixel pull distance for magnetic coins

  // Spawning Intervals (in frames at 60 FPS)
  TRAFFIC_SPAWN_INTERVAL_MIN: 45,
  TRAFFIC_SPAWN_INTERVAL_MAX: 110,
  COIN_SPAWN_CHANCE: 0.85,    // High coin spawn probability for rich coin trails
  POWERUP_SPAWN_INTERVAL: 750,

  // Car Skins Catalog
  SKINS: [
    {
      id: 'red',
      name: 'CLASSIC RED',
      price: 0,
      color: '#f43f5e',
      accent: '#ffe4e6',
      unlocked: true,
      swatch: '#f43f5e'
    },
    {
      id: 'blue',
      name: 'COBALT BLUE',
      price: 300,
      color: '#0284c7',
      accent: '#bae6fd',
      unlocked: false,
      swatch: '#0284c7'
    },
    {
      id: 'black',
      name: 'STEALTH BLACK',
      price: 750,
      color: '#1e293b',
      accent: '#94a3b8',
      unlocked: false,
      swatch: '#1e293b'
    },
    {
      id: 'yellow',
      name: 'SPEED YELLOW',
      price: 1200,
      color: '#eab308',
      accent: '#fef08a',
      unlocked: false,
      swatch: '#eab308'
    },
    {
      id: 'neon',
      name: 'NEON CYBER',
      price: 2000,
      color: '#a855f7',
      accent: '#22d3ee',
      unlocked: false,
      swatch: '#a855f7'
    }
  ]
};
