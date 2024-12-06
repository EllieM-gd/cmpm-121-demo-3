import leaflet from "leaflet";

// Style sheets
import "leaflet/dist/leaflet.css";
import "./style.css";

// Fix missing marker images
import "./leafletWorkaround.ts";
import luck from "./luck.ts";
import { Cell } from "./Cell.ts";
import { fromCellToKey, fromKeyToCell, latLngToCell } from "./Cell.ts";
import { Board } from "./Board.ts";
import { Geocache } from "./Geocache.ts";
import { createLatLng, initializeMap } from "./MapController.ts";

// Location of our classroom (as identified on Google Maps)
const OAKES_CLASSROOM = leaflet.latLng(36.98949379578401, -122.06277128548504);

// Gameplay parameters
const GAMEPLAY_ZOOM_LEVEL = 19;
const NEIGHBORHOOD_SIZE = 16;
const CACHE_SPAWN_PROBABILITY = 0.05;
const TILE_DEGREES = 1e-4;

// Create the map
const map = initializeMap("map", OAKES_CLASSROOM, GAMEPLAY_ZOOM_LEVEL);

export interface Coin {
  readonly i: number;
  readonly j: number;
  serial: number;
}

//Create an inventory for the player
let inventory: Coin[] = [];

function _printInventory() {
  console.log("Inventory: ");
  for (let i = 0; i < inventory.length; i++) {
    console.log(inventory[i].i, inventory[i].j, "#", inventory[i].serial);
  }
}

// Create a board object
const board = new Board(TILE_DEGREES, NEIGHBORHOOD_SIZE);
const rectangeList: leaflet.rectangle[] = [];

// Populate the map with a background tile layer
leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: GAMEPLAY_ZOOM_LEVEL,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

// Add a marker to represent the player
const playerMarker = leaflet.marker(OAKES_CLASSROOM);
playerMarker.bindTooltip("You");
playerMarker.addTo(map);

//Inventory Button
const inventoryButton = document.getElementById("inventory");
inventoryButton?.addEventListener("click", _printInventory);

//set to current location button
const locationButton = document.getElementById("location");
locationButton?.addEventListener("click", () => {
  globalThis.navigator.geolocation.getCurrentPosition((position) => {
    playerMarker.setLatLng([
      position.coords.latitude,
      position.coords.longitude,
    ]);
    map.setView(playerMarker.getLatLng());
    _regerateCache();
  });
});

function resetButtonFunction() {
  if (
    globalThis.confirm(
      "Are you sure you want to reset your progress? This action cannot be undone.",
    )
  ) {
    latlngs.length = 0;
    localStorage.clear();
    initializeDefaultSave();
  }
}
const resetButton = document.getElementById("reset");
resetButton?.addEventListener("click", resetButtonFunction);

//Polyline
const latlngs: Cell[] = [];

//Update the polyline
function updatePolyLine() {
  latlngs.push(playerMarker.getLatLng());
  const polyline = leaflet.polyline(latlngs, { color: "blue" });
  polyline.addTo(map);
}

//Navigation button function
function createNavigationButton(element: string, offset: [number, number]) {
  const button = document.getElementById(element);
  if (button !== null) {
    button.addEventListener("click", () => {
      let latLng = playerMarker.getLatLng();
      latLng = {
        lat: latLng.lat + (offset[1] * TILE_DEGREES),
        lng: latLng.lng + (offset[0] * TILE_DEGREES),
      };
      playerMarker.setLatLng(latLng);
      map.setView(playerMarker.getLatLng());
      _regerateCache();
      updatePolyLine();
    });
  }
}
//Create navigation buttons
createNavigationButton("north", [0, 1]);
createNavigationButton("south", [0, -1]);
createNavigationButton("west", [-1, 0]);
createNavigationButton("east", [1, 0]);

// Display the player's points
let playerPoints = 0;
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
function updatePlayerPoints() {
  playerPoints = inventory.length;
  if (playerPoints == 0) statusPanel.innerHTML = "No points...";
  else statusPanel.innerHTML = `${playerPoints} points accumulated`;
}
updatePlayerPoints();

function updateGeocacheMomento(cache: Geocache) {
  const cell = cache.location;
  board.setMomento(cell, cache.toMomento());
}

function spawnCache(i: number, j: number) {
  const geocacheCell = board.getCellForPoint(createLatLng(i, j));
  const GeocacheObj = new Geocache(geocacheCell);

  if (board.doesCellExist(geocacheCell)) {
    GeocacheObj.fromMomento(board.getMomento(geocacheCell));
  } else {
    const pointValue = Math.floor(
      luck([i, j, "initialValue"].toString()) * 100,
    );
    //For every point value we will create a coin object and add it to the cache
    for (let k = 0; k < pointValue; k++) {
      GeocacheObj.addCoin({
        i: GeocacheObj.location.i,
        j: GeocacheObj.location.j,
        serial: k,
      });
    }
    updateGeocacheMomento(GeocacheObj);
    board.addKnownCell(geocacheCell);
  }

  // Convert cell numbers into lat/lng bounds
  const bounds = leaflet.latLngBounds([
    [i, j],
    [i + 1 * TILE_DEGREES, j + 1 * TILE_DEGREES],
  ]);

  // Add a rectangle to the map to represent the cache
  const rect = leaflet.rectangle(bounds);
  rect.setStyle({ color: "#ebff35", weight: 1 });
  rect.addTo(map);
  rectangeList.push(rect);

  function updateRectWeight(number: number) {
    let weightMultiplier = 1;
    if (number == 0) {
      weightMultiplier = 0;
    } else {
      weightMultiplier = Math.log(number * 2.5) + 2;
    }
    rect.setStyle({ color: "#ebff35", weight: weightMultiplier });
  }
  updateRectWeight(GeocacheObj.numCoins);

  // Handle interactions with the cache
  rect.bindPopup(() => {
    const localPopupDiv = document.createElement("div");
    //Display text and create buttons
    localPopupDiv.innerHTML =
      `<div>There is a cache here at "${geocacheCell.i},${geocacheCell.j}". It has value <span id="value">${GeocacheObj.numCoins}</span>.</div>
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
        GeocacheObj.numCoins.toString();
    }

    // Button Event Listeners
    // When the player clicks the button, the cache is collected or deposited
    localPopupDiv
      .querySelector<HTMLButtonElement>("#poke")!
      .addEventListener("click", () => {
        if (GeocacheObj.numCoins > 0) {
          inventory.push(GeocacheObj.popCoin());
          console.log(
            "Collected: ",
            inventory[inventory.length - 1].i,
            inventory[inventory.length - 1].j,
            "#",
            inventory[inventory.length - 1].serial,
          );
          playerPoints += 1;
          updateValueText();
          updatePlayerPoints();
          updateRectWeight(GeocacheObj.numCoins);
          updateGeocacheMomento(GeocacheObj);
        }
      });
    localPopupDiv.querySelector<HTMLButtonElement>("#deposit")!
      .addEventListener("click", () => {
        if (playerPoints > 0 && inventory.length > 0) {
          GeocacheObj.addCoin(inventory.pop()!);
          console.log(
            "Deposited: ",
            GeocacheObj.getTopCoin().i,
            GeocacheObj.getTopCoin().j,
            "#",
            GeocacheObj.getTopCoin().serial,
          );
          playerPoints -= 1;
          updateValueText();
          updatePlayerPoints();
          updateRectWeight(GeocacheObj.numCoins);
          updateGeocacheMomento(GeocacheObj);
        }
      });
    return localPopupDiv;
  });
}

//Delete all rectanges from the map
function _regerateCache() {
  for (let i = 0; i < rectangeList.length; i++) {
    rectangeList[i].remove();
  }
  rectangeList.length = 0;
  beginCacheGeneration();
}

interface SaveData {
  inventoryData: Coin[];
  knownCells: [string, string][]; //Second data is a cell
  momentoMap: [string, string][]; //First data is a cell
  playerPositionData: leaflet.LatLng;
}

function saveData() {
  const localSaveData: SaveData = {
    inventoryData: inventory,
    knownCells: Array.from(board.knownCells.entries()).map((
      [key, cell],
    ) => [key, fromCellToKey(cell)]),
    momentoMap: Array.from(board.momentoMap.entries()).map((
      [cell, momento],
    ) => [fromCellToKey(cell), momento]),
    playerPositionData: playerMarker.getLatLng(),
  };
  localStorage.setItem("playerData", JSON.stringify(localSaveData));
}

function loadLocalSave() {
  const loadData = localStorage.getItem("playerData");
  if (loadData) {
    try {
      const data = JSON.parse(loadData) as SaveData;
      // Safely apply the loaded data
      inventory = data.inventoryData ?? [];
      board.knownCells = new Map(
        data.knownCells.map(([key, cell]) => [key, fromKeyToCell(cell)]),
      );
      data.momentoMap.map(([cell, momento]) => {
        const key = board.knownCells.get(cell);
        if (key != undefined) board.momentoMap.set(key, momento);
      });
      playerMarker.setLatLng(data.playerPositionData);
      map.setView(playerMarker.getLatLng());
      updatePolyLine();
    } catch (err) {
      console.error("Failed to parse save data:", err);
      initializeDefaultSave();
    }
  } else {
    initializeDefaultSave();
  }
  updatePlayerPoints();
}

function initializeDefaultSave() {
  // Provide default, fallback values here
  const data: SaveData = {
    inventoryData: [],
    playerPositionData: OAKES_CLASSROOM,
    knownCells: [],
    momentoMap: [],
  };
  inventory = data.inventoryData;
  board.knownCells = new Map();
  board.momentoMap = new Map();
  playerMarker.setLatLng(data.playerPositionData);
  updatePolyLine();
  map.setView(playerMarker.getLatLng());
  _regerateCache();
  updatePlayerPoints();
}

function saveEveryTick() {
  saveData();
  requestAnimationFrame(saveEveryTick);
}
loadLocalSave();
saveEveryTick();

function beginCacheGeneration() {
  const center = playerMarker.getLatLng();

  const southWestlat = center.lat - NEIGHBORHOOD_SIZE * TILE_DEGREES;
  const southWestlng = center.lng - NEIGHBORHOOD_SIZE * TILE_DEGREES;
  const northEastlat = center.lat + NEIGHBORHOOD_SIZE * TILE_DEGREES;
  const northEastlng = center.lng + NEIGHBORHOOD_SIZE * TILE_DEGREES;
  for (let lat = southWestlat; lat <= northEastlat; lat += TILE_DEGREES) {
    for (let lng = southWestlng; lng <= northEastlng; lng += TILE_DEGREES) {
      if (board.doesCellExist(latLngToCell({ lat, lng }))) {
        spawnCache(lat, lng);
      } else if (luck([lat, lng].toString()) < CACHE_SPAWN_PROBABILITY) {
        spawnCache(lat, lng);
      }
    }
  }
}
beginCacheGeneration();
