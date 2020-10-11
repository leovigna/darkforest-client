import { ChunkFootprint } from '../_types/global/GlobalTypes';
import { WorldCoords } from './Coordinates';

export enum MiningPatternType {
  Home,
  Target,
  Spiral,
  Cone,
  Grid,
  ETH,
  Cheese
}

export interface MiningPattern {
  type: MiningPatternType;
  fromChunk: ChunkFootprint;
  nextChunk: (prevLoc: ChunkFootprint) => ChunkFootprint;
}

export class SpiralPattern implements MiningPattern {
  type: MiningPatternType = MiningPatternType.Spiral;
  fromChunk: ChunkFootprint;
  chunkSideLength: number;

  constructor(center: WorldCoords, chunkSize: number) {
    const bottomLeftX = Math.floor(center.x / chunkSize) * chunkSize;
    const bottomLeftY = Math.floor(center.y / chunkSize) * chunkSize;
    const bottomLeft = { x: bottomLeftX, y: bottomLeftY };
    this.fromChunk = {
      bottomLeft,
      sideLength: chunkSize,
    };
    this.chunkSideLength = chunkSize;
  }

  nextChunk(chunk: ChunkFootprint): ChunkFootprint {
    const homeX = this.fromChunk.bottomLeft.x;
    const homeY = this.fromChunk.bottomLeft.y;
    const currX = chunk.bottomLeft.x;
    const currY = chunk.bottomLeft.y;

    const nextBottomLeft = { x: currX, y: currY };

    if (currX === homeX && currY === homeY) {
      nextBottomLeft.y = homeY + this.chunkSideLength;
    } else if (
      currY - currX > homeY - homeX &&
      currY + currX >= homeX + homeY
    ) {
      if (currY + currX === homeX + homeY) {
        // break the circle
        nextBottomLeft.y = currY + this.chunkSideLength;
      } else {
        nextBottomLeft.x = currX + this.chunkSideLength;
      }
    } else if (
      currX + currY > homeX + homeY &&
      currY - currX <= homeY - homeX
    ) {
      nextBottomLeft.y = currY - this.chunkSideLength;
    } else if (
      currX + currY <= homeX + homeY &&
      currY - currX < homeY - homeX
    ) {
      nextBottomLeft.x = currX - this.chunkSideLength;
    } else {
      // if (currX + currY < homeX + homeY && currY - currX >= homeY - homeX)
      nextBottomLeft.y = currY + this.chunkSideLength;
    }

    return {
      bottomLeft: nextBottomLeft,
      sideLength: this.chunkSideLength,
    };
  }
}

export class CheesePattern implements MiningPattern {
  type: MiningPatternType = MiningPatternType.Spiral;
  fromChunk: ChunkFootprint;
  chunkSideLength: number;
  deltaMultiplier: number

  constructor(center: WorldCoords, chunkSize: number, deltaMultiplier: number) {
    const bottomLeftX = Math.floor(center.x / chunkSize) * chunkSize;
    const bottomLeftY = Math.floor(center.y / chunkSize) * chunkSize;
    const bottomLeft = { x: bottomLeftX, y: bottomLeftY };
    this.deltaMultiplier = deltaMultiplier
    this.fromChunk = {
      bottomLeft,
      sideLength: chunkSize,
    };
    this.chunkSideLength = chunkSize;
  }

  nextChunk(chunk: ChunkFootprint): ChunkFootprint {
    const delta = this.chunkSideLength * this.deltaMultiplier;

    const homeX = this.fromChunk.bottomLeft.x;
    const homeY = this.fromChunk.bottomLeft.y;
    const currX = chunk.bottomLeft.x;
    const currY = chunk.bottomLeft.y;
    const cadd = currY + currX;
    const csub = currY - currX;
    const hadd = homeY + homeX;
    const hsub = homeY - homeX;

    const nextBottomLeft = { x: currX, y: currY };

    if (currX === homeX && currY === homeY) {
      nextBottomLeft.y = homeY + delta;
    } else if (csub > hsub && cadd >= hadd) {
      if (cadd === hadd) {
        nextBottomLeft.y = currY + delta;
      } else {
        nextBottomLeft.x = currX + delta;
      }
    } else if (cadd > hadd && csub <= hsub) {
      nextBottomLeft.y = currY - delta;
    } else if (cadd <= hadd && csub < hsub) {
      nextBottomLeft.x = currX - delta;
    } else {
      nextBottomLeft.y = currY + delta;
    }

    return {
      bottomLeft: nextBottomLeft,
      sideLength: this.chunkSideLength,
    };
  }
}