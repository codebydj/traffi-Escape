/**
 * TRAFFIC ESCAPE — LocalStorage Persistence Manager
 * Implements safe storage methods with fallbacks for private browsing / blocked storage.
 */

const STORAGE_KEYS = {
  HIGH_SCORE: 'traffic_escape_high_score',
  BEST_DISTANCE: 'traffic_escape_best_distance',
  TOTAL_COINS: 'traffic_escape_total_coins',
  SELECTED_CAR: 'traffic_escape_selected_car',
  UNLOCKED_CARS: 'traffic_escape_unlocked_cars',
  SOUND_ENABLED: 'traffic_escape_sound_enabled'
};

class StorageManager {
  constructor() {
    this.memoryStore = {};
    this.isLocalStorageAvailable = this.checkAvailability();
  }

  checkAvailability() {
    try {
      const testKey = '__test__';
      window.localStorage.setItem(testKey, testKey);
      window.localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      console.warn('LocalStorage unavailable, using in-memory store instead.');
      return false;
    }
  }

  getItem(key, defaultValue) {
    if (this.isLocalStorageAvailable) {
      try {
        const item = window.localStorage.getItem(key);
        return item !== null ? JSON.parse(item) : defaultValue;
      } catch (e) {
        console.error('Error reading key from localStorage:', key, e);
        return defaultValue;
      }
    }
    return this.memoryStore[key] !== undefined ? this.memoryStore[key] : defaultValue;
  }

  setItem(key, value) {
    if (this.isLocalStorageAvailable) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        console.error('Error writing key to localStorage:', key, e);
      }
    }
    this.memoryStore[key] = value;
  }

  // Helper getters/setters for specific keys
  getHighScore() {
    return this.getItem(STORAGE_KEYS.HIGH_SCORE, 0);
  }

  setHighScore(score) {
    if (score > this.getHighScore()) {
      this.setItem(STORAGE_KEYS.HIGH_SCORE, Math.floor(score));
      return true; // Return true if new high score set
    }
    return false;
  }

  getBestDistance() {
    return this.getItem(STORAGE_KEYS.BEST_DISTANCE, 0);
  }

  setBestDistance(dist) {
    if (dist > this.getBestDistance()) {
      this.setItem(STORAGE_KEYS.BEST_DISTANCE, Math.floor(dist));
    }
  }

  getTotalCoins() {
    return this.getItem(STORAGE_KEYS.TOTAL_COINS, 0);
  }

  addCoins(amount) {
    const current = this.getTotalCoins();
    const updated = Math.max(0, current + amount);
    this.setItem(STORAGE_KEYS.TOTAL_COINS, updated);
    return updated;
  }

  getSelectedCar() {
    return this.getItem(STORAGE_KEYS.SELECTED_CAR, 'red');
  }

  setSelectedCar(carId) {
    this.setItem(STORAGE_KEYS.SELECTED_CAR, carId);
  }

  getUnlockedCars() {
    return this.getItem(STORAGE_KEYS.UNLOCKED_CARS, ['red']);
  }

  unlockCar(carId) {
    const unlocked = this.getUnlockedCars();
    if (!unlocked.includes(carId)) {
      unlocked.push(carId);
      this.setItem(STORAGE_KEYS.UNLOCKED_CARS, unlocked);
    }
  }

  getSoundEnabled() {
    return this.getItem(STORAGE_KEYS.SOUND_ENABLED, true);
  }

  setSoundEnabled(enabled) {
    this.setItem(STORAGE_KEYS.SOUND_ENABLED, Boolean(enabled));
  }
}

export const Storage = new StorageManager();
