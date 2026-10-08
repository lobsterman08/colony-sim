export const TILE_SIZE = 32;
export const CHUNK_SIZE = 16;
export const WORLD_SIZE = 120;
export const WORLD_PIXELS = WORLD_SIZE * TILE_SIZE;

export const BUILDINGS = {
  wall: { label: 'Wall', color: '#c8d0d5', cost: { stone: 2 }, time: 4 },
  floor: { label: 'Floor', color: '#7e8d9d', cost: { wood: 1 }, time: 2 },
  bed: { label: 'Bed', color: '#d7a55d', cost: { wood: 2, cloth: 1 }, time: 5 },
  storage: { label: 'Storage', color: '#dab788', cost: { wood: 3, stone: 1 }, time: 6 },
  campfire: { label: 'Campfire', color: '#f49a44', cost: { wood: 2, stone: 1 }, time: 6 },
  farm: { label: 'Crop Plot', color: '#7bc86a', cost: { wood: 2 }, time: 5 }
};

export const CROPS = {
  wheat: { label: 'Wheat', growthRate: 0.3, yield: 4 },
  potato: { label: 'Potato', growthRate: 0.28, yield: 3 },
  berry: { label: 'Berry', growthRate: 0.25, yield: 3 }
};

export const DEFAULT_RESOURCES = {
  wood: 30,
  stone: 20,
  food: 18,
  cloth: 4,
  metal: 0
};

export const BUILD_CATEGORIES = {
  Structures: ['wall', 'floor'],
  Furniture: ['bed', 'storage'],
  Utilities: ['campfire'],
  Farming: ['farm']
};

export const TERRAIN_COLORS = {
  grass: '#5ea468',
  dirt: '#8b6d4d',
  stone: '#7d7f8b',
  water: '#2c6f8a',
  sand: '#d6b56e'
};
