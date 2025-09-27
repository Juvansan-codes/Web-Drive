// Game Dimensions
export const GRID_SIZE = 25; // The number of cells in the grid (e.g., 25x25)
export const CELL_SIZE = 300; // The dimension of each grid cell in world units
export const WORLD_SIZE = GRID_SIZE * CELL_SIZE;
export const ROAD_WIDTH = 50;
export const BUILDING_HEIGHT = 150;

// Car Dimensions (3D)
export const CAR_WIDTH = 10;
export const CAR_BODY_HEIGHT = 4;
export const CAR_LENGTH = 20;

// Car Physics
export const MAX_SPEED = 15;
export const ENGINE_FORCE = 0.25;
export const DRAG_FORCE = 0.01; // Air resistance
export const FRICTION = 0.08; // Ground friction/rolling resistance
export const BRAKE_FORCE = 0.2;
export const TURN_SPEED = 0.05; // Radians
export const DRIFT_CONTROL = 0.25; // How much grip tires have (0=ice, 1=full grip)

// Damage Modeling
export const MAX_DAMAGE = 100;
export const DAMAGE_SCALAR = 4; // Multiplier for damage from impact speed

// AI Cars
export const NUM_AI_CARS = 25;
export const AI_CAR_SPEED = 8;
export const AI_AVOIDANCE_DISTANCE = 35; // How far AI cars look ahead to avoid collisions

// Stylistic choices
export const BUILDING_COLORS = [
    0x4299e1, // blue
    0x48bb78, // green
    0xed8936, // orange
    0x9f7aea, // purple
    0xf56565, // red
    0x38b2ac, // teal
    0xed64a6, // pink
    0xa0aec0, // gray
];

export const ROAD_COLOR = 0x666f7b;
export const SIDEWALK_COLOR = 0xb8c2d1;