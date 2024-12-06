import L from "leaflet";
import { GAME_CONFIG } from "./config.ts";

// Create the map
export function initializeMap(
  containerID: string,
  startCoords: L.latlng,
) {
  return L.map(document.getElementById(containerID)!, {
    center: startCoords,
    zoom: GAME_CONFIG.zoomLevel,
    zoomControl: false,
    scrollWheelZoom: false,
    dragging: false,
  });
}

export function createLatLng(i: number, j: number): L.LatLng {
  return L.latLng(
    i * GAME_CONFIG.cacheTileDegrees,
    j * GAME_CONFIG.cacheTileDegrees,
  );
}
