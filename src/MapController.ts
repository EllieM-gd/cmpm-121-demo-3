import L from "leaflet";
const TILE_DEGREES = 1e-4;

// Create the map
export function initializeMap(
  containerID: string,
  startCoords: L.latlng,
  zoomLevel: number,
) {
  return L.map(document.getElementById(containerID)!, {
    center: startCoords,
    zoom: zoomLevel,
    zoomControl: false,
    scrollWheelZoom: false,
    dragging: false,
  });
}

export function createLatLng(i: number, j: number): L.LatLng {
  return L.latLng(i * TILE_DEGREES, j * TILE_DEGREES);
}
