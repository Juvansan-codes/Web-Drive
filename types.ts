export interface Controls {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
}

export interface Obstacle {
  x: number;
  y: number; // This will be treated as the Z coordinate in 3D space
  width: number;
  height: number; // This will be treated as the Z-depth in 3D space
}