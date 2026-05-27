import type { MgbaHttpClient } from "../mgba/MgbaHttpClient.js";
import { type MapLayoutSnapshot, readMapLayout } from "./MapLayout.js";
import { RED_BLUE_MEMORY_MAP } from "./memoryMap.js";
import {
  classifyGameMode,
  type ModeClassificationFlags,
  NAMING_SCREEN_MARKERS as SHARED_NAMING_SCREEN_MARKERS,
  RWY_ADDRESS as SHARED_RWY_ADDRESS,
  WINDOW_HIDDEN_Y as SHARED_WINDOW_HIDDEN_Y,
  type GameMode as SharedGameMode,
} from "./mode-classification.js";
import { readSprites, type SpriteSnapshot } from "./SpriteReader.js";
import { decodeGen1Text } from "./TextCodec.js";
import {
  readTileCollisionData,
  type TileCollisionData,
} from "./TilesetData.js";
import { readWarps, type WarpSnapshot } from "./WarpReader.js";

export type GameMode = SharedGameMode;
export const NAMING_SCREEN_MARKERS = SHARED_NAMING_SCREEN_MARKERS;
export const RWY_ADDRESS = SHARED_RWY_ADDRESS;
export const WINDOW_HIDDEN_Y = SHARED_WINDOW_HIDDEN_Y;

type RamClient = Pick<MgbaHttpClient, "read8" | "read16" | "readRange">;

const map = RED_BLUE_MEMORY_MAP;

interface ModeFlags extends ModeClassificationFlags {
  readonly battle: number;
  readonly curMap: number;
  readonly joyIgnore: number;
  readonly letterDelay: number;
  readonly namingScreenType: number;
  readonly partyCount: number;
  readonly screenText: string;
  readonly textBoxId: number;
  readonly walkCounter: number;
  readonly windowY: number;
  readonly xCoord: number;
  readonly yCoord: number;
}

export interface GameWorldSnapshot {
  readonly grassRate: number;
  readonly mapLayout: MapLayoutSnapshot;
  readonly mode: GameMode;
  readonly modeFlags: ModeFlags;
  readonly playerCoords: { readonly y: number; readonly x: number };
  readonly sprites: SpriteSnapshot;
  readonly tileCollision: TileCollisionData;
  readonly tileInFront: number;
  readonly tileMapBytes: Uint8Array;
  readonly tileStandingOn: number;
  readonly warps: WarpSnapshot;
}

interface GameWorldReadOptions {
  readonly tileMapBytes?: Uint8Array;
}

interface ModeFlagsRead {
  readonly flags: ModeFlags;
  readonly tileMapBytes: Uint8Array;
}

async function readModeFlags(
  client: RamClient,
  options: GameWorldReadOptions = {}
): Promise<ModeFlagsRead> {
  const tileMapPromise =
    options.tileMapBytes === undefined
      ? client.readRange(map.wTileMap, map.wTileMapLength)
      : Promise.resolve(options.tileMapBytes);
  const [
    battle,
    textBoxId,
    letterDelay,
    curMap,
    coords,
    partyCount,
    walkCounter,
    joyIgnore,
    namingScreenType,
    windowY,
    tileMapBytes,
  ] = await Promise.all([
    client.read8(map.wIsInBattle),
    client.read8(map.wTextBoxID),
    client.read8(map.wLetterPrintingDelayFlags),
    client.read8(map.wCurMap),
    client.readRange(map.wYCoord, 2),
    client.read8(map.wPartyCount),
    client.read8(map.wWalkCounter),
    client.read8(map.wJoyIgnore),
    client.read8(map.wNamingScreenType),
    client.read8(RWY_ADDRESS),
    tileMapPromise,
  ]);

  return {
    flags: {
      battle,
      textBoxId,
      letterDelay,
      curMap,
      yCoord: coords[0],
      xCoord: coords[1],
      partyCount,
      walkCounter,
      joyIgnore,
      namingScreenType,
      screenText: decodeGen1Text(tileMapBytes),
      windowY,
    },
    tileMapBytes,
  };
}

export async function readGameWorld(
  client: RamClient,
  options: GameWorldReadOptions = {}
): Promise<GameWorldSnapshot> {
  const { flags: modeFlags, tileMapBytes } = await readModeFlags(
    client,
    options
  );
  const mode = classifyGameMode(modeFlags);

  const emptySnapshot: GameWorldSnapshot = {
    mode,
    modeFlags,
    tileMapBytes,
    mapLayout: { mapId: modeFlags.curMap, tilesetId: 0, height: 0, width: 0 },
    sprites: { player: undefined, npcs: [], spriteCount: 0 },
    warps: {
      warps: [],
      connections: {
        north: undefined,
        south: undefined,
        west: undefined,
        east: undefined,
      },
    },
    tileCollision: {
      tilesetId: 0,
      walkableTiles: new Set(),
      grassTile: undefined,
    },
    playerCoords: { y: modeFlags.yCoord, x: modeFlags.xCoord },
    tileInFront: 0,
    tileStandingOn: 0,
    grassRate: 0,
  };

  if (mode === "title" || mode === "naming") {
    return emptySnapshot;
  }

  const [
    mapLayout,
    sprites,
    warps,
    tileCollision,
    tileInFront,
    tileStandingOn,
    grassRate,
  ] = await Promise.all([
    readMapLayout(client),
    readSprites(client),
    readWarps(client),
    readTileCollisionData(client),
    client.read8(map.wTileInFrontOfPlayer),
    client.read8(map.wTilePlayerStandingOn),
    client.read8(map.wGrassRate),
  ]);

  return {
    mode,
    modeFlags,
    tileMapBytes,
    mapLayout,
    sprites,
    warps,
    tileCollision,
    playerCoords: { y: modeFlags.yCoord, x: modeFlags.xCoord },
    tileInFront,
    tileStandingOn,
    grassRate,
  };
}
