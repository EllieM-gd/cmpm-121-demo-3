import leaflet from "leaflet";

// Style sheets
import "leaflet/dist/leaflet.css";
import "./style.css";

// Fix missing marker images
import "./leafletWorkaround.ts";
import luck from "./luck.ts";

// Location of our classroom (as identified on Google Maps)
const OAKES_CLASSROOM = leaflet.latLng(36.98949379578401, -122.06277128548504);

// Gameplay parameters
const GAMEPLAY_ZOOM_LEVEL = 19;
const MIN_ZOOM_LEVEL = 15;
const MAX_ZOOM_LEVEL = 19;
const NEIGHBORHOOD_SIZE = 16;
const CACHE_SPAWN_PROBABILITY = 0.05;
const TILE_DEGREES = 1e-4;

// Create the map
const map = leaflet.map(document.getElementById("map")!, {
  center: OAKES_CLASSROOM,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: MIN_ZOOM_LEVEL,
  maxZoom: MAX_ZOOM_LEVEL,
  zoomControl: true,
  scrollWheelZoom: true,
});

// Populate the map with a background tile layer
leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: MAX_ZOOM_LEVEL,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

// Add a marker to represent the player
const playerMarker = leaflet.marker(map.getCenter());
playerMarker.bindTooltip("You");
playerMarker.addTo(map);

//Navigation button function
function createNavigationButton(element: string, offset: [number, number]) {
  const button = document.getElementById(element);
  if (button !== null) {
    button.addEventListener("click", () => {
      map.panBy(offset);
    });
  }
}
//Create navigation buttons
createNavigationButton("north", [0, -100]);
createNavigationButton("south", [0, 100]);
createNavigationButton("west", [-100, 0]);
createNavigationButton("east", [100, 0]);

// Display the player's points
let playerPoints = 0;
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
function updatePlayerPoints() {
  if (playerPoints == 0) statusPanel.innerHTML = "No points...";
  else statusPanel.innerHTML = `${playerPoints} points accumulated`;
}
updatePlayerPoints();

function spawnCache(i: number, j: number) {
  // Convert cell numbers into lat/lng bounds
  const origin = OAKES_CLASSROOM;
  const bounds = leaflet.latLngBounds([
    [origin.lat + i * TILE_DEGREES, origin.lng + j * TILE_DEGREES],
    [origin.lat + (i + 1) * TILE_DEGREES, origin.lng + (j + 1) * TILE_DEGREES],
  ]);

  // Add a rectangle to the map to represent the cache
  const rect = leaflet.rectangle(bounds);
  rect.setStyle({ color: "#ebff35", weight: 1 });
  rect.addTo(map);

  let pointValue = Math.floor(luck([i, j, "initialValue"].toString()) * 100);

  function updateRectWeight(number: number) {
    let weightMultiplier = 1;
    if (number == 0) {
      weightMultiplier = 0;
    } else {
      weightMultiplier = Math.log(number * 2.5) + 2;
    }
    rect.setStyle({ color: "#ebff35", weight: weightMultiplier });
  }
  updateRectWeight(pointValue);

  // Handle interactions with the cache
  rect.bindPopup(() => {
    const localPopupDiv = document.createElement("div");
    //Display text and create buttons
    localPopupDiv.innerHTML =
      `<div>There is a cache here at "${i},${j}". It has value <span id="value">${pointValue}</span>.</div>
                <button id="poke">collect</button> Or <button id= "deposit">deposit</button>`;

    // Style the buttons
    const pokeButton = localPopupDiv.querySelector<HTMLButtonElement>("#poke")!;
    if (pokeButton !== null) pokeButton.style.backgroundColor = "#22ca7c";

    const depositButton = localPopupDiv.querySelector<HTMLButtonElement>(
      "#deposit",
    )!;
    if (depositButton !== null) depositButton.style.backgroundColor = "#fd3131";

    function updateValueText() {
      localPopupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML =
        pointValue.toString();
    }

    // Button Event Listeners
    // When the player clicks the button, the cache is collected or deposited
    localPopupDiv
      .querySelector<HTMLButtonElement>("#poke")!
      .addEventListener("click", () => {
        if (pointValue > 0) {
          playerPoints += 1;
          pointValue -= 1;
          updateValueText();
          updatePlayerPoints();
          updateRectWeight(pointValue);
        }
      });
    localPopupDiv.querySelector<HTMLButtonElement>("#deposit")!
      .addEventListener("click", () => {
        if (playerPoints > 0) {
          pointValue += 1;
          playerPoints -= 1;
          updateValueText();
          updatePlayerPoints();
          updateRectWeight(pointValue);
        }
      });
    return localPopupDiv;
  });
}

function beginCacheGeneration() {
  for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
    for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
      if (luck([i, j].toString()) < CACHE_SPAWN_PROBABILITY) {
        spawnCache(i, j);
      }
    }
  }
}
beginCacheGeneration();
