import { CropNode, CropType, MovingObstacle, Vec2 } from './types';

export const FIELD_HALF_SIZE = 22; // 44m x 44m playable farm
export const GRID_SIZE = 44; // 1m per cell
export const CELL_SIZE = (FIELD_HALF_SIZE * 2) / GRID_SIZE; // 1.0m

// Build exactly 33 harvestable crops across 3 distinct agronomic blocks (11 crops per block)
export function createFieldCrops(
  missingIndices: number[] = [],
  criticalIndices: number[] = []
): CropNode[] {
  const missingSet = new Set(missingIndices);
  const criticalSet = new Set(criticalIndices);
  const crops: CropNode[] = [];
  let idx = 1;

  // Block A (West Wheat Strip)
  const blockACoords: [number, number, CropType][] = [
    [-15.5, -13.5, 'wheat'],
    [-15.5, -8.5, 'wheat'],
    [-15.5, -3.5, 'wheat'],
    [-15.5, 1.5, 'wheat'],
    [-15.5, 6.5, 'wheat'],
    [-10.5, -13.5, 'wheat'],
    [-10.5, -8.5, 'wheat'],
    [-10.5, -3.5, 'wheat'],
    [-10.5, 1.5, 'wheat'],
    [-10.5, 6.5, 'wheat'],
    [-13.0, -11.0, 'wheat'],
  ];

  // Block B (Central Maize Terrace)
  const blockBCoords: [number, number, CropType][] = [
    [-3.5, -13.5, 'maize'],
    [-3.5, -8.0, 'maize'],
    [-3.5, -2.5, 'maize'],
    [-3.5, 3.0, 'maize'],
    [0.0, -11.0, 'maize'],
    [0.0, -5.5, 'maize'],
    [0.0, 0.5, 'maize'],
    [3.5, -13.5, 'maize'],
    [3.5, -8.0, 'maize'],
    [3.5, -2.5, 'maize'],
    [3.5, 3.0, 'maize'],
  ];

  // Block C (East Sunflower Plot)
  const blockCCoords: [number, number, CropType][] = [
    [10.5, -13.5, 'sunflower'],
    [10.5, -8.5, 'sunflower'],
    [10.5, -3.5, 'sunflower'],
    [10.5, 1.5, 'sunflower'],
    [10.5, 6.5, 'sunflower'],
    [15.5, -13.5, 'sunflower'],
    [15.5, -8.5, 'sunflower'],
    [15.5, -3.5, 'sunflower'],
    [15.5, 1.5, 'sunflower'],
    [15.5, 6.5, 'sunflower'],
    [13.0, -6.0, 'sunflower'],
  ];

  const allBlocks: { plotId: string; items: [number, number, CropType][] }[] = [
    { plotId: 'Plot-West', items: blockACoords },
    { plotId: 'Plot-Center', items: blockBCoords },
    { plotId: 'Plot-East', items: blockCCoords },
  ];

  let zeroIdx = 0;
  for (const block of allBlocks) {
    for (const [x, z, cropType] of block.items) {
      const isMissing = missingSet.has(zeroIdx);
      crops.push({
        id: `CROP-${String(idx).padStart(2, '0')}`,
        plotId: block.plotId,
        cropType,
        position: { x, z },
        discovered: false,
        harvested: isMissing, // Missing crop slots have no harvestable plant
        harvestProgress: isMissing ? 1 : 0,
        claimedBy: null,
        leaseExpiresAt: 0,
        cooldownUntil: 0,
        yieldKg: isMissing ? 0 : cropType === 'maize' ? 42 : cropType === 'wheat' ? 35 : 28,
        isMissing,
        verifiedEmpty: false,
        priority: criticalSet.has(zeroIdx) ? 'critical' : 'normal',
      });
      idx++;
      zeroIdx++;
    }
  }

  return crops;
}

export function createMovingObstacles(speedScale: number): MovingObstacle[] {
  return [
    {
      id: 'OBS-TRACTOR',
      name: 'John-09 Heavy Tractor',
      kind: 'tractor',
      position: { x: -18, z: -5.5 },
      heading: Math.PI / 2,
      speed: 2.85 * speedScale,
      radius: 1.85,
      waypoints: [
        { x: -18, z: -5.5 },
        { x: 18, z: -5.5 },
        { x: 18, z: 9.5 },
        { x: -18, z: 9.5 },
      ],
      currentWaypointIndex: 1,
      wheelRotation: 0,
      activeWarning: false,
    },
    {
      id: 'OBS-CART',
      name: 'Hauler Utility Cart',
      kind: 'utility_cart',
      position: { x: 7.0, z: -17.5 },
      heading: 0,
      speed: 2.35 * speedScale,
      radius: 1.45,
      waypoints: [
        { x: 7.0, z: -17.5 },
        { x: 7.0, z: 11.0 },
        { x: -7.0, z: 11.0 },
        { x: -7.0, z: -17.5 },
      ],
      currentWaypointIndex: 1,
      wheelRotation: 0,
      activeWarning: false,
    },
    {
      id: 'OBS-SPRAYER',
      name: 'Auto-Irrigator Rig',
      kind: 'sprayer',
      position: { x: 18, z: -16.5 },
      heading: -Math.PI / 2,
      speed: 2.1 * speedScale,
      radius: 1.4,
      waypoints: [
        { x: 18, z: -16.5 },
        { x: -18, z: -16.5 },
        { x: -18, z: -10.5 },
        { x: 18, z: -10.5 },
      ],
      currentWaypointIndex: 1,
      wheelRotation: 0,
      activeWarning: false,
    },
  ];
}

export const STATION_SPECS: { id: string; name: string; position: Vec2; waitPosition: Vec2 }[] = [
  {
    id: 'CHG-WEST',
    name: 'Solar Dock Alpha',
    position: { x: -9.0, z: 16.5 },
    waitPosition: { x: -9.0, z: 12.2 },
  },
  {
    id: 'CHG-EAST',
    name: 'Solar Dock Beta',
    position: { x: 9.0, z: 16.5 },
    waitPosition: { x: 9.0, z: 12.2 },
  },
];

export const ROBOT_START_SPECS: {
  id: string;
  name: string;
  callsign: string;
  accentColor: string;
  position: Vec2;
  heading: number;
}[] = [
  {
    id: 'AS-01',
    name: 'Harvester Alpha',
    callsign: 'ALPHA',
    accentColor: '#22d3ee',
    position: { x: -13.0, z: 14.0 },
    heading: Math.PI,
  },
  {
    id: 'AS-02',
    name: 'Harvester Beta',
    callsign: 'BETA',
    accentColor: '#a3e635',
    position: { x: 0.0, z: 14.5 },
    heading: Math.PI,
  },
  {
    id: 'AS-03',
    name: 'Harvester Gamma',
    callsign: 'GAMMA',
    accentColor: '#fbbf24',
    position: { x: 13.0, z: 14.0 },
    heading: Math.PI,
  },
];
