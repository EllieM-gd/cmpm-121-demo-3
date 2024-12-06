import leaflet from "leaflet";

const TILE_DEGREES = 1e-4;

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
    i: Math.round((latlng.lat) * 10000 / TILE_DEGREES),
    j: Math.round((latlng.lng) * 10000 / TILE_DEGREES),
  };
}
export function latLngToCellNoConversion(latlng: leaflet.LatLng): Cell {
  return {
    i: Math.round((latlng.lat) / TILE_DEGREES),
    j: Math.round((latlng.lng) / TILE_DEGREES),
  };
}
