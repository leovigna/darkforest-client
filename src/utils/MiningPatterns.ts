import { ThemeConsumer } from 'styled-components';
import { textChangeRangeIsUnchanged } from 'typescript';
import LocalStorageManager from '../api/LocalStorageManager';
import perlin from '../miner/perlin';
import { ChunkFootprint, SpaceType } from '../_types/global/GlobalTypes';
import { getChunkKey, getSiblingLocations, getTemperature } from './ChunkUtils';
import { WorldCoords } from './Coordinates';

export enum MiningPatternType {
  Home,
  Target,
  Spiral,
  Cone,
  Grid,
  ETH,
  Cheese,
  List,
  Neighbor,
  Temp,
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
  type: MiningPatternType = MiningPatternType.Cheese;
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

export class ListPattern implements MiningPattern {
  type: MiningPatternType = MiningPatternType.List;
  fromChunk: ChunkFootprint;
  chunks: ChunkFootprint[];
  chunkIndex = 0

  constructor(chunks: ChunkFootprint[], localStorageManager: LocalStorageManager) {
    this.fromChunk = chunks[0]

    const chunkKeySet = new Set()
    this.chunks = []
    for (let c of chunks) {
      const chunkKey = getChunkKey(c)
      if (chunkKeySet.has(chunkKey)) continue;
      chunkKeySet.add(chunkKey)

      if (localStorageManager.getChunkById(chunkKey) == null) this.chunks.push(c)
    }

  }

  nextChunk(chunk: ChunkFootprint): ChunkFootprint {
    this.chunkIndex++
    if (this.chunkIndex < this.chunks.length) return this.chunks[this.chunkIndex]

    return this.fromChunk
  }
}

export class NeighborPattern implements MiningPattern {
  type: MiningPatternType = MiningPatternType.Neighbor;
  fromChunk: ChunkFootprint;
  chunks: ChunkFootprint[];
  chunkIndex = 0

  constructor(chunks: ChunkFootprint[], localStorageManager: LocalStorageManager) {
    this.fromChunk = chunks[0]

    const chunkNeighbors: ChunkFootprint[] = []
    for (let c of chunks) {
      const siblings = getSiblingLocations(c)
      chunkNeighbors.push(...siblings)
    }
    chunks.push(...chunkNeighbors)

    const chunkKeySet = new Set()
    this.chunks = []

    for (let c of chunks) {
      const chunkKey = getChunkKey(c)
      if (chunkKeySet.has(chunkKey)) continue;
      chunkKeySet.add(chunkKey)

      if (localStorageManager.getChunkById(chunkKey) == null) this.chunks.push(c)
    }
  }

  nextChunk(chunk: ChunkFootprint): ChunkFootprint {
    this.chunkIndex++
    if (this.chunkIndex < this.chunks.length) return this.chunks[this.chunkIndex]

    return this.fromChunk
  }
}

export class TempPattern implements MiningPattern {
  type: MiningPatternType = MiningPatternType.Temp;
  fromChunk: ChunkFootprint;
  chunks: ChunkFootprint[];
  chunkIndex = 0

  constructor(localStorageManager: LocalStorageManager) {
    const exploredChunks = Array.from(localStorageManager.allChunks())
      .sort((a, b) => (16 - a.perlin) * 16 - (16 - b.perlin) * 16)


    const chunkNeighbors: ChunkFootprint[] = []
    for (let c of exploredChunks) {
      const siblings = getSiblingLocations(c.chunkFootprint)
      chunkNeighbors.push(...siblings)
    }

    const chunkKeySet = new Set()
    this.chunks = []

    for (let c of chunkNeighbors) {
      const chunkKey = getChunkKey(c)
      if (chunkKeySet.has(chunkKey)) continue;
      chunkKeySet.add(chunkKey)

      if (localStorageManager.getChunkById(chunkKey) == null) this.chunks.push(c)
    }

    this.fromChunk = this.chunks[0]
  }

  nextChunk(chunk: ChunkFootprint): ChunkFootprint {
    console.debug(getTemperature(chunk))
    this.chunkIndex++
    if (this.chunkIndex < this.chunks.length) return this.chunks[this.chunkIndex]

    return this.fromChunk
  }
}

export class SpiralThresholdPattern implements MiningPattern {
  type: MiningPatternType = MiningPatternType.Spiral;
  fromChunk: ChunkFootprint;
  chunkSideLength: number;
  threshold: number;

  constructor(
    center: WorldCoords,
    chunkSize: number,
    threshold: number) {

    const bottomLeftX = Math.floor(center.x / chunkSize) * chunkSize;
    const bottomLeftY = Math.floor(center.y / chunkSize) * chunkSize;
    const bottomLeft = { x: bottomLeftX, y: bottomLeftY };
    this.fromChunk = {
      bottomLeft,
      sideLength: chunkSize,
    };
    this.chunkSideLength = chunkSize;
    this.threshold = threshold
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

    const nextChunk = {
      bottomLeft: nextBottomLeft,
      sideLength: this.chunkSideLength,
    };

    if (perlin(nextChunk.bottomLeft) >= this.threshold) return nextChunk

    return this.nextChunk(nextChunk)
  }
}