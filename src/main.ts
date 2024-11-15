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

interface Cell {
  readonly i: number;
  readonly j: number;
}

interface Coin {
  readonly i: number;
  readonly j: number;
  serial: number;
}

//Create an inventory for the player
const inventory: Coin[] = [];

// Convert a lat/lng coordinate to a cell number
function latLngToCell(latlng: leaflet.LatLng): Cell {
  return {
    i: Math.round((latlng.lat) / TILE_DEGREES),
    j: Math.round((latlng.lng) / TILE_DEGREES),
  };
}
function coordinatesToCell(lat: number, lng: number): Cell {
  return {
    i: Math.round(lat / TILE_DEGREES),
    j: Math.round(lng / TILE_DEGREES),
  };
}

export class Board {
  readonly tileWidth: number;
  readonly tileVisibilityRadius: number;

  private knownCells: Map<string, Cell> = new Map();

  constructor(tileWidthConstr: number, tileVisibilityRadiusConstr: number) {
    this.tileWidth = tileWidthConstr;
    this.tileVisibilityRadius = tileVisibilityRadiusConstr;
  }

  addKnownCell(cell: Cell) {
    const { i, j } = cell;
    const key = [i, j].toString();
    this.knownCells.set(key, cell);
  }

  private getCanonicalCell(cell: Cell): Cell {
    const { i, j } = cell;
    const key = [i, j].toString();
    //not sure if this is correct
    if (!this.knownCells.has(key)) {
      this.addKnownCell(cell);
    }
    return this.knownCells.get(key)!;
  }

  getCellForPoint(point: leaflet.LatLng): Cell {
    return this.getCanonicalCell(latLngToCell(point));
  }

  getCellBounds(cell: Cell): leaflet.LatLngBounds {
    const { i, j } = cell;
    return leaflet.latLngBounds([
      [
        OAKES_CLASSROOM.lat + i * this.tileWidth,
        OAKES_CLASSROOM.lng + j * this.tileWidth,
      ],
      [
        OAKES_CLASSROOM.lat + (i + 1) * this.tileWidth,
        OAKES_CLASSROOM.lng + (j + 1) * this.tileWidth,
      ],
    ]);
  }

  getCellsNearPoint(point: leaflet.LatLng): Cell[] {
    const resultCells: Cell[] = [];
    const originCell = this.getCellForPoint(point);
    //Prob Broken
    for (
      let i = -this.tileVisibilityRadius;
      i <= this.tileVisibilityRadius;
      i++
    ) {
      for (
        let j = -this.tileVisibilityRadius;
        j <= this.tileVisibilityRadius;
        j++
      ) {
        const cell = { i: originCell.i + i, j: originCell.j + j };
        const bounds = this.getCellBounds(cell);
        if (map.getBounds().intersects(bounds)) {
          resultCells.push(cell);
        }
      }
    }
    return resultCells;
  }
}

// Create a board object
const board = new Board(TILE_DEGREES, NEIGHBORHOOD_SIZE);

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
  const bounds = leaflet.latLngBounds([
    [i, j],
    [i + 1 * TILE_DEGREES, j + 1 * TILE_DEGREES],
  ]);

  board.addKnownCell(coordinatesToCell(i, j));
  const cellRefernce: Cell = board.getCellForPoint(bounds.getCenter());

  // Add a rectangle to the map to represent the cache
  const rect = leaflet.rectangle(bounds);
  rect.setStyle({ color: "#ebff35", weight: 1 });
  rect.addTo(map);

  let pointValue = Math.floor(luck([i, j, "initialValue"].toString()) * 100);
  //Create local array of coins
  const coins: Coin[] = [];
  //For every point value we will create a coin object
  for (let k = 0; k < pointValue; k++) {
    coins.push({ i: cellRefernce.i, j: cellRefernce.j, serial: k });
  }

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
      `<div>There is a cache here at "${cellRefernce.i},${cellRefernce.j}". It has value <span id="value">${pointValue}</span>.</div>
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
          inventory.push(coins.pop()!);
          console.log(
            "Collected: ",
            inventory[inventory.length - 1].i,
            inventory[inventory.length - 1].j,
            "#",
            inventory[inventory.length - 1].serial,
          );
          playerPoints += 1;
          pointValue -= 1;
          updateValueText();
          updatePlayerPoints();
          updateRectWeight(pointValue);
        }
      });
    localPopupDiv.querySelector<HTMLButtonElement>("#deposit")!
      .addEventListener("click", () => {
        if (playerPoints > 0 && inventory.length > 0) {
          coins.push(inventory.pop()!);
          console.log(
            "Deposited: ",
            coins[coins.length - 1].i,
            coins[coins.length - 1].j,
            "#",
            coins[coins.length - 1].serial,
          );
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
  const bounds = map.getBounds();
  const southWest = bounds.getSouthWest();
  const northEast = bounds.getNorthEast();

  for (let lat = southWest.lat; lat <= northEast.lat; lat += TILE_DEGREES) {
    for (let lng = southWest.lng; lng <= northEast.lng; lng += TILE_DEGREES) {
      if (luck([lat, lng].toString()) < CACHE_SPAWN_PROBABILITY) {
        spawnCache(lat, lng);
      }
    }
  }
}
beginCacheGeneration();
