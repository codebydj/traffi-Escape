/**
 * TRAFFIC ESCAPE — Garage & Car Customization System
 * Manages car skin previews, coin purchases, and skin selection persistence.
 */

import { CONFIG } from './config.js';
import { Storage } from './storage.js';
import { Player } from './player.js';
import { Audio } from './audio.js';

export class GarageManager {
  constructor(uiElements) {
    this.elements = uiElements;
    this.previewCanvas = document.getElementById('garagePreviewCanvas');
    this.previewCtx = this.previewCanvas ? this.previewCanvas.getContext('2d') : null;
    this.selectedSkinId = Storage.getSelectedCar();
  }

  init() {
    this.renderSkinList();
    this.updatePreview();
    this.bindEvents();
  }

  updateGarageView() {
    this.selectedSkinId = Storage.getSelectedCar();
    this.renderSkinList();
    this.updatePreview();
    if (this.elements.garageCoins) {
      this.elements.garageCoins.textContent = Storage.getTotalCoins().toLocaleString();
    }
  }

  renderSkinList() {
    const listContainer = document.getElementById('skinList');
    if (!listContainer) return;

    listContainer.innerHTML = '';
    const unlocked = Storage.getUnlockedCars();
    const currentEquipped = Storage.getSelectedCar();

    CONFIG.SKINS.forEach(skin => {
      const isUnlocked = unlocked.includes(skin.id);
      const isSelected = skin.id === this.selectedSkinId;
      const isEquipped = skin.id === currentEquipped;

      const card = document.createElement('div');
      card.className = `skin-card ${isSelected ? 'selected' : ''} ${isUnlocked ? 'unlocked' : ''}`;
      
      let statusText = isEquipped ? 'EQUIPPED' : (isUnlocked ? 'UNLOCKED' : `🪙 ${skin.price}`);

      card.innerHTML = `
        <div class="skin-preview-swatch" style="background: ${skin.color}"></div>
        <div class="skin-title">${skin.name}</div>
        <div class="skin-status">${statusText}</div>
      `;

      card.addEventListener('click', () => {
        Audio.playClick();
        this.selectedSkinId = skin.id;
        this.renderSkinList();
        this.updatePreview();
      });

      listContainer.appendChild(card);
    });

    // Update Main Action Button Text
    const equipBtn = document.getElementById('equipBtn');
    if (equipBtn) {
      const selectedSkin = CONFIG.SKINS.find(s => s.id === this.selectedSkinId);
      const isUnlocked = unlocked.includes(this.selectedSkinId);

      if (this.selectedSkinId === currentEquipped) {
        equipBtn.textContent = 'CURRENTLY EQUIPPED';
        equipBtn.className = 'btn btn-secondary';
        equipBtn.disabled = true;
      } else if (isUnlocked) {
        equipBtn.textContent = 'SELECT CAR';
        equipBtn.className = 'btn btn-primary';
        equipBtn.disabled = false;
      } else {
        const totalCoins = Storage.getTotalCoins();
        const canAfford = totalCoins >= selectedSkin.price;
        equipBtn.textContent = `UNLOCK FOR 🪙 ${selectedSkin.price}`;
        equipBtn.className = canAfford ? 'btn btn-primary' : 'btn btn-secondary';
        equipBtn.disabled = !canAfford;
      }
    }
  }

  updatePreview() {
    if (!this.previewCtx || !this.previewCanvas) return;
    const skin = CONFIG.SKINS.find(s => s.id === this.selectedSkinId) || CONFIG.SKINS[0];

    const skinNameEl = document.getElementById('skinName');
    if (skinNameEl) skinNameEl.textContent = skin.name;

    // Clear and draw preview car
    this.previewCtx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
    Player.drawPreview(this.previewCtx, this.previewCanvas.width / 2, this.previewCanvas.height / 2 + 5, skin);
  }

  bindEvents() {
    const equipBtn = document.getElementById('equipBtn');
    if (equipBtn) {
      equipBtn.addEventListener('click', () => {
        const unlocked = Storage.getUnlockedCars();
        const selectedSkin = CONFIG.SKINS.find(s => s.id === this.selectedSkinId);

        if (unlocked.includes(this.selectedSkinId)) {
          // Equip unlocked skin
          Storage.setSelectedCar(this.selectedSkinId);
          Audio.playPowerup();
          this.updateGarageView();
        } else {
          // Attempt purchase
          const currentCoins = Storage.getTotalCoins();
          if (currentCoins >= selectedSkin.price) {
            Storage.addCoins(-selectedSkin.price);
            Storage.unlockCar(this.selectedSkinId);
            Storage.setSelectedCar(this.selectedSkinId);
            Audio.playLevelUp();
            this.updateGarageView();
          }
        }
      });
    }
  }
}
