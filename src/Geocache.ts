interface Momento<T> {
  toMomento(): T;
  fromMomento(momento: T): void;
}

import { Cell } from "./Cell.ts";
import { Coin } from "./main.ts";

export class Geocache implements Momento<string> {
  location: Cell;
  numCoins: number = 0;
  localCoins: Coin[] = [];
  constructor(cell: Cell) {
    this.location = cell;
  }
  toMomento() {
    return JSON.stringify(this.localCoins);
  }

  fromMomento(momento: string) {
    if (momento != "") {
      this.localCoins = JSON.parse(momento) as Coin[];
      this.numCoins = this.localCoins.length;
    }
  }

  addCoin(Coin: Coin) {
    this.numCoins++;
    this.localCoins.push(Coin);
  }
  popCoin(): Coin {
    if (this.localCoins.length > 0) {
      this.numCoins--;
      return this.localCoins.pop()!;
    }
    throw new Error("No coins left to pop");
  }
  //Used for testing mostly
  getTopCoin(): Coin {
    if (this.localCoins.length > 0) {
      return this.localCoins[this.localCoins.length - 1];
    }
    throw new Error("No coins left to pop");
  }
}
