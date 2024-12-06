import {
  Cell,
  fromCellToKey,
  latLngToCell,
  latLngToCellNoConversion,
} from "./Cell.ts";
import leaflet from "leaflet";

export class Board {
  readonly tileWidth: number;
  readonly tileVisibilityRadius: number;

  knownCells: Map<string, Cell> = new Map();
  momentoMap: Map<Cell, string> = new Map();

  constructor(tileWidthConstr: number, tileVisibilityRadiusConstr: number) {
    this.tileWidth = tileWidthConstr;
    this.tileVisibilityRadius = tileVisibilityRadiusConstr;
  }

  addKnownCell(cell: Cell) {
    const key = fromCellToKey(cell);
    this.knownCells.set(key, cell);
  }

  private getCanonicalCell(cell: Cell): Cell {
    const key = fromCellToKey(cell);
    //not sure if this is correct
    if (!this.knownCells.has(key)) {
      this.knownCells.set(key, cell);
    }
    return this.knownCells.get(key)!;
  }

  setMomento(cell: Cell, momento: string) {
    this.momentoMap.set(cell, momento);
  }

  getMomento(cell: Cell): string {
    if (this.momentoMap.has(cell)) {
      return this.momentoMap.get(cell)!;
    } else return "";
  }

  getCellForPoint(point: leaflet.LatLng): Cell {
    if (this.doesCellExist(latLngToCell(point))) {
      return this.getCanonicalCell(latLngToCell(point));
    }
    const tempCell = latLngToCell(point);
    return tempCell;
  }

  getCellForPointNoConversion(point: leaflet.LatLng): Cell {
    const key = fromCellToKey(latLngToCellNoConversion(point));
    if (this.knownCells.has(key)) {
      return this.knownCells.get(key)!;
    }
    return latLngToCell(point);
  }
  doesCellExist(cell: Cell): boolean {
    if (this.knownCells.has(fromCellToKey(cell))) {
      return true;
    }
    return false;
  }
}
