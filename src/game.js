import { BUILD_CATEGORIES, BUILDINGS, CROPS, DEFAULT_RESOURCES, TILE_SIZE } from './config.js';

const saveKey = 'colony-sim-save-v1';

export class Game {
  constructor() {
    this.world = null;
    this.colonists = [];
    this.resources = { ...DEFAULT_RESOURCES };
    this.camera = { x: 0, y: 0, zoom: 1 };
    this.state = {
      paused: false,
      speed: 1,
      time: 0,
      selectedColonistId: null,
      buildMode: null,
      buildOpen: true,
      alerts: ['The colony is calm. Prepare for the next challenge.'],
      log: ['World initialized.'],
      preview: null
    };

    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.bindUI();
    this.init();
    this.startLoop();
  }

  bindUI() {
    this.resourceBar = document.getElementById('resourceBar');
    this.colonistList = document.getElementById('colonistList');
    this.colonySummary = document.getElementById('colonySummary');
    this.selectedUnit = document.getElementById('selectedUnit');
    this.alerts = document.getElementById('alerts');
    this.eventLog = document.getElementById('eventLog');
    this.timeLabel = document.getElementById('timeLabel');
    this.toast = document.getElementById('toast');
    this.buildPanel = document.getElementById('buildPanel');
    this.buildCategories = document.getElementById('buildCategories');
    this.pauseBtn = document.getElementById('pauseBtn');

    document.getElementById('toggleBuildPanel').addEventListener('click', () => this.toggleBuildPanel());
    document.getElementById('buildToggleBtn').addEventListener('click', () => this.toggleBuildPanel());
    document.getElementById('saveBtn').addEventListener('click', () => this.saveGame());
    document.getElementById('loadBtn').addEventListener('click', () => this.loadGame());
    document.getElementById('randomizeBtn').addEventListener('click', () => this.resetWorld());
    this.pauseBtn.addEventListener('click', () => this.togglePause());

    document.querySelectorAll('.speed-btn').forEach((button) => {
      button.addEventListener('click', () => {
        this.state.speed = Number(button.dataset.speed);
        document.querySelectorAll('.speed-btn').forEach((btn) => btn.classList.toggle('active', btn === button));
      });
    });

    this.buildCategories.addEventListener('click', (event) => {
      const item = event.target.closest('.build-item');
      if (!item) return;
      const type = item.dataset.type;
      this.state.buildMode = type;
      document.querySelectorAll('.build-item').forEach((button) => button.classList.toggle('active', button === item));
      this.showToast(`Build mode: ${BUILDINGS[type].label}`);
    });

    window.addEventListener('resize', () => this.resizeCanvas());
    this.canvas.addEventListener('pointerdown', (event) => this.handlePointerDown(event));
    this.canvas.addEventListener('pointermove', (event) => this.handlePointerMove(event));
    this.canvas.addEventListener('pointerup', () => this.endDrag());
    this.canvas.addEventListener('pointerleave', () => this.endDrag());
    this.canvas.addEventListener('wheel', (event) => {
      event.preventDefault();
      const delta = event.deltaY * 0.001;
      this.camera.zoom = Math.min(2.5, Math.max(0.8, this.camera.zoom + delta));
    }, { passive: false });

    window.addEventListener('keydown', (event) => {
      if (event.key === ' ') {
        event.preventDefault();
        this.togglePause();
      }
      if (event.key.toLowerCase() === 'b') {
        this.toggleBuildPanel();
      }
      if (event.key.toLowerCase() === 's') {
        this.saveGame();
      }
    });
  }

  init() {
    this.world = new (await import('./world.js')).World();
    this.createInitialColonists();
    this.populateBuildMenu();
    this.resizeCanvas();
    this.camera.x = (this.world && this.world.tiles ? 32 * 20 : 0);
    this.camera.y = (this.world && this.world.tiles ? 32 * 20 : 0);
    this.renderUI();
  }

  async resetWorld() {
    this.world = new (await import('./world.js')).World(Math.random() * 1000);
    this.colonists = [];
    this.resources = { ...DEFAULT_RESOURCES };
    this.state.log = ['A new world is born.'];
    this.state.alerts = ['The start of a new settlement.'];
    this.createInitialColonists();
    this.populateBuildMenu();
    this.renderUI();
    this.showToast('New world generated');
  }

  createInitialColonists() {
    for (let i = 0; i < 5; i++) {
      const colonist = {
        id: `colonist-${i}-${Date.now()}`,
        name: ['Ari', 'Juno', 'Mira', 'Rowan', 'Tess'][i] || `N${i}`,
        x: 18 + i * 0.6,
        y: 18 + i * 0.4,
        vx: 0,
        vy: 0,
        mood: 0.7,
        needs: { hunger: 72, sleep: 80, fun: 70, health: 100 },
        job: 'wander',
        speed: 1.2,
        action: null,
        selected: false,
        traits: { practical: true, cheerful: i % 2 === 0 }
      };

      this.colonists.push(colonist);
    }

    this.state.selectedColonistId = this.colonists[0].id;
    this.world.addStructure('bed', 15, 15, true);
    this.world.addStructure('storage', 17, 15, true);
    this.world.addStructure('campfire', 19, 18, true);
  }

  populateBuildMenu() {
    this.buildCategories.innerHTML = '';
    Object.entries(BUILD_CATEGORIES).forEach(([category, entries]) => {
      const categoryEl = document.createElement('div');
      categoryEl.className = 'build-category';
      categoryEl.innerHTML = `
        <div class="build-category-title">${category}</div>
        <div class="build-items">
          ${entries.map((type) => `
            <button class="build-item" data-type="${type}">${BUILDINGS[type].label}</button>
          `).join('')}
        </div>
      `;
      this.buildCategories.appendChild(categoryEl);
    });
  }

  togglePause() {
    this.state.paused = !this.state.paused;
    this.pauseBtn.textContent = this.state.paused ? 'Resume' : 'Pause';
  }

  toggleBuildPanel() {
    this.state.buildOpen = !this.state.buildOpen;
    this.buildPanel.classList.toggle('closed', !this.state.buildOpen);
  }

  showToast(message) {
    this.toast.textContent = message;
    this.toast.classList.add('visible');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.classList.remove('visible'), 1200);
  }

  resizeCanvas() {
    const bounds = this.canvas.parentElement.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(320, bounds.width * ratio);
    this.canvas.height = Math.max(240, bounds.height * ratio);
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  handlePointerDown(event) {
    const pos = this.getCanvasPointer(event);
    const tileX = Math.floor((pos.x + this.camera.x) / TILE_SIZE);
    const tileY = Math.floor((pos.y + this.camera.y) / TILE_SIZE);

    this.state.preview = { x: tileX, y: tileY };
    this.canvas.setPointerCapture(event.pointerId);
    this.dragging = { active: true, x: pos.x, y: pos.y };

    if (this.state.buildMode) {
      const ok = this.world.buildPreviewTile(tileX, tileY);
      if (ok) {
        const building = BUILDINGS[this.state.buildMode];
        const canAfford = Object.entries(building.cost || {}).every(([resource, cost]) => this.resources[resource] >= cost);
        if (canAfford) {
          Object.entries(building.cost || {}).forEach(([resource, cost]) => {
            this.resources[resource] -= cost;
          });
          this.world.addStructure(this.state.buildMode, tileX, tileY, false);
          this.state.log.unshift(`Placed ${building.label} at ${tileX}, ${tileY}.`);
          this.showToast(`${building.label} placed`);
        } else {
          this.showToast('Not enough resources');
        }
      }
      return;
    }

    const clickedColonist = this.colonists.find((c) => Math.abs(c.x - tileX) < 0.7 && Math.abs(c.y - tileY) < 0.7);
    this.state.selectedColonistId = clickedColonist ? clickedColonist.id : this.state.selectedColonistId;
    this.renderUI();
  }

  handlePointerMove(event) {
    if (!this.dragging) return;
    const pos = this.getCanvasPointer(event);
    const dx = pos.x - this.dragging.x;
    const dy = pos.y - this.dragging.y;
    this.camera.x -= dx / this.camera.zoom;
    this.camera.y -= dy / this.camera.zoom;
    this.dragging.x = pos.x;
    this.dragging.y = pos.y;
  }

  endDrag() {
    this.dragging = null;
  }

  getCanvasPointer(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    return { x, y };
  }

  startLoop() {
    const frame = (time) => {
      const dt = Math.min(0.033, (time - (this.lastTime || time)) / 1000 || 0.016);
      this.lastTime = time;
      this.update(dt * this.state.speed);
      this.render();
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  update(dt) {
    if (this.state.paused) return;
    this.state.time += dt;
    this.world.update(dt);

    for (const colonist of this.colonists) {
      this.updateColonist(colonist, dt);
    }

    this.timeLabel.textContent = `Day ${Math.max(1, Math.floor(this.state.time / 15) + 1)}`;
    this.renderUI();
    this.maybeAutosave();
  }

  updateColonist(colonist, dt) {
    colonist.needs.hunger = Math.max(0, colonist.needs.hunger - dt * 0.8);
    colonist.needs.sleep = Math.max(0, colonist.needs.sleep - dt * 0.5);
    colonist.needs.fun = Math.max(0, colonist.needs.fun - dt * 0.2);

    if (colonist.needs.hunger < 30 && this.resources.food > 0) {
      colonist.job = 'eat';
      this.resources.food -= 1;
      colonist.needs.hunger = Math.min(100, colonist.needs.hunger + 45);
      this.state.log.unshift(`${colonist.name} ate a ration.`);
    }

    if (colonist.needs.sleep < 25) {
      colonist.job = 'rest';
      colonist.needs.sleep = Math.min(100, colonist.needs.sleep + dt * 24);
      return;
    }

    if (colonist.needs.hunger < 20) {
      const maturePlot = this.world.cropPlots.find((p) => p.mature);
      if (maturePlot) {
        this.resources.food += this.world.harvestCrop(maturePlot.x, maturePlot.y);
      }
    }

    if (Math.random() < 0.006) {
      const nearestTree = this.world.findNearestResource(colonist.x, colonist.y, 'tree');
      const nearestRock = this.world.findNearestResource(colonist.x, colonist.y, 'rock');

      if (nearestTree && this.resources.wood < 80) {
        this.gatherResource(colonist, nearestTree, 'tree', 'wood');
      } else if (nearestRock && this.resources.stone < 70) {
        this.gatherResource(colonist, nearestRock, 'rock', 'stone');
      } else {
        const crop = this.world.cropPlots.find((p) => p.mature);
        if (crop) {
          this.resources.food += this.world.harvestCrop(crop.x, crop.y);
        }
      }
    }

    if (this.state.time % 3 < dt) {
      this.world.cropPlots.forEach((crop) => {
        if (crop.mature) {
          this.resources.food += 0.05;
        }
      });
    }

    const driftX = (Math.random() - 0.5) * 0.08;
    const driftY = (Math.random() - 0.5) * 0.08;
    const newX = Math.max(0, Math.min(120, colonist.x + driftX));
    const newY = Math.max(0, Math.min(120, colonist.y + driftY));
    if (this.world.isPassable(Math.floor(newX), Math.floor(newY))) {
      colonist.x = newX;
      colonist.y = newY;
    }
  }

  gatherResource(colonist, node, nodeType, resourceType) {
    const dist = Math.hypot(node.x - colonist.x, node.y - colonist.y);
    if (dist < 1.2) {
      const collected = this.world.collectResource(node.x, node.y, nodeType);
      if (collected) {
        this.resources[resourceType] += 1 + (nodeType === 'tree' ? 1 : 0);
        colonist.needs.fun = Math.min(100, colonist.needs.fun + 4);
      }
      return;
    }

    const stepX = node.x - colonist.x;
    const stepY = node.y - colonist.y;
    const stepLength = Math.hypot(stepX, stepY) || 1;
    const moveX = (stepX / stepLength) * 0.12;
    const moveY = (stepY / stepLength) * 0.12;
    const nextX = Math.max(0, Math.min(120, colonist.x + moveX));
    const nextY = Math.max(0, Math.min(120, colonist.y + moveY));
    if (this.world.isPassable(Math.floor(nextX), Math.floor(nextY))) {
      colonist.x = nextX;
      colonist.y = nextY;
    }
  }

  render() {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    this.ctx.clearRect(0, 0, width, height);
    this.ctx.fillStyle = '#0d1b24';
    this.ctx.fillRect(0, 0, width, height);

    const viewLeft = this.camera.x;
    const viewTop = this.camera.y;
    const screenXOffset = width / 2 - this.camera.x * this.camera.zoom;
    const screenYOffset = height / 2 - this.camera.y * this.camera.zoom;

    const startX = Math.max(0, Math.floor(viewLeft / TILE_SIZE) - 1);
    const endX = Math.min(120, Math.ceil((viewLeft + width / this.camera.zoom) / TILE_SIZE) + 1);
    const startY = Math.max(0, Math.floor(viewTop / TILE_SIZE) - 1);
    const endY = Math.min(120, Math.ceil((viewTop + height / this.camera.zoom) / TILE_SIZE) + 1);

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const drawX = x * TILE_SIZE * this.camera.zoom + screenXOffset;
        const drawY = y * TILE_SIZE * this.camera.zoom + screenYOffset;
        this.ctx.fillStyle = this.world.getTileColor(x, y);
        this.ctx.fillRect(drawX, drawY, TILE_SIZE * this.camera.zoom, TILE_SIZE * this.camera.zoom);
      }
    }

    this.drawStructures(startX, endX, startY, endY, screenXOffset, screenYOffset);
    this.drawResourceNodes(startX, endX, startY, endY, screenXOffset, screenYOffset);
    this.drawColonists(startX, endX, startY, endY, screenXOffset, screenYOffset);

    if (this.state.preview && this.state.buildMode) {
      const px = this.state.preview.x * TILE_SIZE * this.camera.zoom + screenXOffset;
      const py = this.state.preview.y * TILE_SIZE * this.camera.zoom + screenYOffset;
      const valid = this.world.buildPreviewTile(this.state.preview.x, this.state.preview.y);
      this.ctx.strokeStyle = valid ? '#7be0b8' : '#ff8a80';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(px, py, TILE_SIZE * this.camera.zoom, TILE_SIZE * this.camera.zoom);
    }
  }

  drawStructures(startX, endX, startY, endY, screenXOffset, screenYOffset) {
    for (const structure of this.world.structures) {
      if (structure.x < startX || structure.x > endX || structure.y < startY || structure.y > endY) continue;
      const x = structure.x * TILE_SIZE * this.camera.zoom + screenXOffset;
      const y = structure.y * TILE_SIZE * this.camera.zoom + screenYOffset;
      this.ctx.fillStyle = BUILDINGS[structure.type].color;
      this.ctx.fillRect(x, y, TILE_SIZE * this.camera.zoom, TILE_SIZE * this.camera.zoom);
      if (!structure.built) {
        this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
        this.ctx.fillRect(x, y, (TILE_SIZE * this.camera.zoom) * structure.progress, 4);
      }
    }
  }

  drawResourceNodes(startX, endX, startY, endY, screenXOffset, screenYOffset) {
    for (const node of this.world.resourceNodes) {
      if (node.x < startX || node.x > endX || node.y < startY || node.y > endY) continue;
      const x = node.x * TILE_SIZE * this.camera.zoom + screenXOffset;
      const y = node.y * TILE_SIZE * this.camera.zoom + screenYOffset;
      this.ctx.fillStyle = node.type === 'tree' ? '#4b7d30' : '#9a9ea6';
      this.ctx.beginPath();
      this.ctx.arc(x + TILE_SIZE * this.camera.zoom * 0.5, y + TILE_SIZE * this.camera.zoom * 0.5, TILE_SIZE * this.camera.zoom * 0.28, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  drawColonists(startX, endX, startY, endY, screenXOffset, screenYOffset) {
    for (const colonist of this.colonists) {
      if (colonist.x < startX || colonist.x > endX || colonist.y < startY || colonist.y > endY) continue;
      const x = colonist.x * TILE_SIZE * this.camera.zoom + screenXOffset + TILE_SIZE * this.camera.zoom * 0.18;
      const y = colonist.y * TILE_SIZE * this.camera.zoom + screenYOffset + TILE_SIZE * this.camera.zoom * 0.18;
      const radius = TILE_SIZE * this.camera.zoom * 0.28;
      this.ctx.fillStyle = this.state.selectedColonistId === colonist.id ? '#7be0b8' : '#d9ebff';
      this.ctx.beginPath();
      this.ctx.arc(x + radius, y + radius, radius, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  renderUI() {
    const resourceEntries = Object.entries(this.resources);
    this.resourceBar.innerHTML = resourceEntries.map(([key, value]) => `
      <div class="resource-pill">${key}: ${Math.floor(value)}</div>
    `).join('');

    this.colonistList.innerHTML = this.colonists.map((colonist) => `
      <div class="colonist-item ${this.state.selectedColonistId === colonist.id ? 'selected' : ''}" data-colonist-id="${colonist.id}">
        <span class="avatar">${colonist.name.charAt(0)}</span>
        <div>
          <div>${colonist.name}</div>
          <small>${colonist.job}</small>
        </div>
      </div>
    `).join('');

    const selected = this.colonists.find((c) => c.id === this.state.selectedColonistId);
    if (selected) {
      this.selectedUnit.innerHTML = `
        <div class="status-line"><span>Name</span><strong>${selected.name}</strong></div>
        <div class="status-line"><span>Hunger</span><strong>${Math.round(selected.needs.hunger)}%</strong></div>
        <div class="status-line"><span>Sleep</span><strong>${Math.round(selected.needs.sleep)}%</strong></div>
        <div class="status-line"><span>Fun</span><strong>${Math.round(selected.needs.fun)}%</strong></div>
      `;
    }

    this.colonySummary.innerHTML = `
      <div class="status-line"><span>Colonists</span><strong>${this.colonists.length}</strong></div>
      <div class="status-line"><span>Food</span><strong>${Math.round(this.resources.food)}</strong></div>
      <div class="status-line"><span>Wood</span><strong>${Math.round(this.resources.wood)}</strong></div>
      <div class="status-line"><span>Stone</span><strong>${Math.round(this.resources.stone)}</strong></div>
    `;

    this.alerts.innerHTML = this.state.alerts.map((alert) => `<div class="alert-item">${alert}</div>`).join('');
    this.eventLog.innerHTML = this.state.log.slice(0, 6).map((entry) => `<div class="log-entry">${entry}</div>`).join('');

    this.colonistList.querySelectorAll('.colonist-item').forEach((el) => {
      el.addEventListener('click', () => {
        this.state.selectedColonistId = el.dataset.colonistId;
        this.renderUI();
      });
    });
  }

  maybeAutosave() {
    if (Math.floor(this.state.time) % 10 !== 0) return;
    this.saveGame(false);
  }

  saveGame(showMessage = true) {
    const state = {
      resources: this.resources,
      colonists: this.colonists,
      world: {
        tiles: Array.from(this.world.tiles.entries()),
        resourceNodes: this.world.resourceNodes,
        structures: this.world.structures,
        cropPlots: this.world.cropPlots
      },
      camera: this.camera,
      time: this.state.time,
      selectedColonistId: this.state.selectedColonistId
    };
    localStorage.setItem(saveKey, JSON.stringify(state));
    if (showMessage) this.showToast('Game saved');
  }

  loadGame() {
    const raw = localStorage.getItem(saveKey);
    if (!raw) {
      this.showToast('No save found');
      return;
    }

    try {
      const state = JSON.parse(raw);
      this.resources = state.resources || { ...DEFAULT_RESOURCES };
      this.colonists = state.colonists || [];
      this.camera = state.camera || { x: 0, y: 0, zoom: 1 };
      this.state.time = state.time || 0;
      this.state.selectedColonistId = state.selectedColonistId || this.colonists[0]?.id || null;

      this.world = new (await import('./world.js')).World();
      this.world.tiles = new Map(state.world.tiles || []);
      this.world.resourceNodes = state.world.resourceNodes || [];
      this.world.structures = state.world.structures || [];
      this.world.cropPlots = state.world.cropPlots || [];
      this.showToast('Game loaded');
      this.renderUI();
    } catch (error) {
      this.showToast('Save load failed');
    }
  }
}

new Game();
