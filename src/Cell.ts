import leaflet from "leaflet";

import { GAME_CONFIG } from "./config.ts";

export interface Cell {
  readonly i: number;
  readonly j: number;
}

// Convert cells to keys and back, used for saving data.
export function fromCellToKey(cell: Cell): string {
  return `${cell.i},${cell.j}`;
}
export function fromKeyToCell(key: string): Cell {
  const [i, j] = key.split(",").map(Number);
  return { i, j };
}

// Convert a lat/lng coordinate to a cell number
export function latLngToCell(latlng: leaflet.LatLng): Cell {
  return {
    i: Math.round((latlng.lat) * 10000 / GAME_CONFIG.cacheTileDegrees),
    j: Math.round((latlng.lng) * 10000 / GAME_CONFIG.cacheTileDegrees),
  };
}
export function latLngToCellNoConversion(latlng: leaflet.LatLng): Cell {
  return {
    i: Math.round((latlng.lat) / GAME_CONFIG.cacheTileDegrees),
    j: Math.round((latlng.lng) / GAME_CONFIG.cacheTileDegrees),
  };
}
