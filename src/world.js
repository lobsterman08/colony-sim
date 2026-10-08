import { CHUNK_SIZE, TILE_SIZE, TERRAIN_COLORS, WORLD_SIZE } from './config.js';

export class World {
  constructor(seed = Math.random() * 1000) {
    this.seed = seed;
    this.tiles = new Map();
    this.resourceNodes = [];
    this.structures = [];
    this.cropPlots = [];
    this.tilesById = new Map();
    this.generate();
  }

  key(x, y) {
    return `${Math.floor(x / CHUNK_SIZE)}:${Math.floor(y / CHUNK_SIZE)}:${x}:${y}`;
  }

  getTile(x, y) {
    if (x < 0 || y < 0 || x >= WORLD_SIZE || y >= WORLD_SIZE) return 'water';
    return this.tiles.get(`${x}:${y}`) || 'grass';
  }

  setTile(x, y, type) {
    if (x < 0 || y < 0 || x >= WORLD_SIZE || y >= WORLD_SIZE) return;
    this.tiles.set(`${x}:${y}`, type);
  }

  generate() {
    for (let y = 0; y < WORLD_SIZE; y++) {
      for (let x = 0; x < WORLD_SIZE; x++) {
        const nx = x / WORLD_SIZE;
        const ny = y / WORLD_SIZE;
        const noise = Math.sin((nx + this.seed) * 18) + Math.cos((ny - this.seed) * 13);
        let tile = 'grass';

        if (noise > 1.5) tile = 'water';
        if (noise < -1.3) tile = 'stone';
        if ((x > WORLD_SIZE * 0.7 && x < WORLD_SIZE * 0.9) || (y > WORLD_SIZE * 0.7 && y < WORLD_SIZE * 0.9)) {
          tile = 'sand';
        }

        this.setTile(x, y, tile);
      }
    }

    for (let i = 0; i < WORLD_SIZE * 4.5; i++) {
      const x = Math.floor(Math.random() * WORLD_SIZE);
      const y = Math.floor(Math.random() * WORLD_SIZE);
      if (this.getTile(x, y) !== 'water') {
        this.resourceNodes.push({ type: 'tree', x, y, hp: 4 });
      }
    }

    for (let i = 0; i < WORLD_SIZE * 2.2; i++) {
      const x = Math.floor(Math.random() * WORLD_SIZE);
      const y = Math.floor(Math.random() * WORLD_SIZE);
      if (this.getTile(x, y) !== 'water') {
        this.resourceNodes.push({ type: 'rock', x, y, hp: 5 });
      }
    }
  }

  isPassable(x, y) {
    if (x < 0 || y < 0 || x >= WORLD_SIZE || y >= WORLD_SIZE) return false;
    const tile = this.getTile(x, y);
    if (tile === 'water') return false;
    return !this.structures.some((s) => s.x === x && s.y === y && s.type !== 'floor');
  }

  hasStructureAt(x, y) {
    return this.structures.some((s) => s.x === x && s.y === y);
  }

  addStructure(type, x, y, built = false) {
    if (this.hasStructureAt(x, y)) return false;
    const s = { type, x, y, built, progress: 0, hp: 100, rotation: 0 };
    this.structures.push(s);
    return s;
  }

  addCropPlot(x, y, cropType = 'wheat') {
    if (this.hasStructureAt(x, y)) return null;
    const plot = { x, y, cropType, growth: 0.1, mature: false };
    this.cropPlots.push(plot);
    return plot;
  }

  findNearestResource(x, y, type) {
    let best = null;
    let bestDistance = Infinity;

    for (const node of this.resourceNodes) {
      if (node.type !== type) continue;
      const d = Math.hypot(node.x - x, node.y - y);
      if (d < bestDistance) {
        bestDistance = d;
        best = node;
      }
    }

    return best;
  }

  collectResource(x, y, type) {
    const nodeIndex = this.resourceNodes.findIndex((n) => n.x === x && n.y === y && n.type === type);
    if (nodeIndex === -1) return false;

    const node = this.resourceNodes[nodeIndex];
    node.hp -= 1;
    if (node.hp <= 0) {
      this.resourceNodes.splice(nodeIndex, 1);
      this.setTile(x, y, 'grass');
    }
    return true;
  }

  update(dt) {
    for (const plot of this.cropPlots) {
      plot.growth += dt * 0.04 * (this.getTile(plot.x, plot.y) === 'grass' ? 1 : 0.8);
      if (plot.growth >= 1) {
        plot.mature = true;
      }
    }

    for (const structure of this.structures) {
      if (!structure.built) {
        structure.progress += dt * 0.4;
        if (structure.progress >= 1) {
          structure.built = true;
          structure.progress = 1;
        }
      }
    }
  }

  harvestCrop(x, y) {
    const plot = this.cropPlots.find((p) => p.x === x && p.y === y && p.mature);
    if (!plot) return 0;
    const amount = { wheat: 3, potato: 2, berry: 2 }[plot.cropType] || 1;
    plot.growth = 0.1;
    plot.mature = false;
    return amount;
  }

  buildPreviewTile(x, y) {
    if (x < 0 || y < 0 || x >= WORLD_SIZE || y >= WORLD_SIZE) return false;
    const occupied = this.hasStructureAt(x, y);
    return !occupied && this.getTile(x, y) !== 'water';
  }

  getTileColor(x, y) {
    const tile = this.getTile(x, y);
    return TERRAIN_COLORS[tile] || '#4d8c5a';
  }
}
