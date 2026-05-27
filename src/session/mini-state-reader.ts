import { RED_BLUE_MEMORY_MAP } from "../game/memoryMap.js";
import { type RamClient, readRangeExact } from "../game/RamClient.js";
import { decodeGen1Text } from "../game/TextCodec.js";
import type {
  GameMode,
  MiniState,
  ReadinessLockReason,
  ReadinessState,
} from "./types.js";

export const RWY_ADDRESS = 0xff_4a;
export const WINDOW_HIDDEN_Y = 144;
export const NAMING_SCREEN_MARKERS = [
  "lower case",
  "UPPER CASE",
  "ED Mr.",
] as const;

const map = RED_BLUE_MEMORY_MAP;

export interface MiniStateFlags {
  readonly battle: number;
  readonly joyIgnore: number;
  readonly letterDelay: number;
  readonly mapId: number;
  readonly namingScreenType: number;
  readonly partyCount: number;
  readonly screenText: string;
  readonly textBoxId: number;
  readonly walkCounter: number;
  readonly windowY: number;
  readonly x: number;
  readonly y: number;
}

export class MiniStateReader {
  private readonly client: RamClient;

  constructor(client: RamClient) {
    this.client = client;
  }

  async read(): Promise<MiniState> {
    const [
      battle,
      textBoxId,
      letterDelay,
      mapId,
      coords,
      partyCount,
      walkCounter,
      joyIgnore,
      namingScreenType,
      windowY,
      tileMap,
    ] = await Promise.all([
      this.client.read8(map.wIsInBattle),
      this.client.read8(map.wTextBoxID),
      this.client.read8(map.wLetterPrintingDelayFlags),
      this.client.read8(map.wCurMap),
      readRangeExact(this.client, map.wYCoord, 2, "miniState.coords"),
      this.client.read8(map.wPartyCount),
      this.client.read8(map.wWalkCounter),
      this.client.read8(map.wJoyIgnore),
      this.client.read8(map.wNamingScreenType),
      this.client.read8(RWY_ADDRESS),
      readRangeExact(
        this.client,
        map.wTileMap,
        map.wTileMapLength,
        "miniState.tileMap"
      ),
    ]);

    return createMiniState({
      battle,
      textBoxId,
      letterDelay,
      mapId,
      y: coords[0],
      x: coords[1],
      partyCount,
      walkCounter,
      joyIgnore,
      namingScreenType,
      windowY,
      screenText: decodeGen1Text(tileMap),
    });
  }
}

export function createMiniState(flags: MiniStateFlags): MiniState {
  return {
    mode: classifyMiniStateMode(flags),
    mapId: flags.mapId,
    y: flags.y,
    x: flags.x,
    partyCount: flags.partyCount,
    battle: flags.battle,
    textBoxId: flags.textBoxId,
    letterDelay: flags.letterDelay,
    joyIgnore: flags.joyIgnore,
    walkCounter: flags.walkCounter,
    namingScreenType: flags.namingScreenType,
    windowY: flags.windowY,
    screenText: flags.screenText,
    readiness: createReadinessState(flags),
  };
}

export function classifyMiniStateMode(flags: MiniStateFlags): GameMode {
  if (isAllZeroState(flags)) {
    return "title";
  }

  if (flags.battle !== 0) {
    return "battle";
  }

  if (isNamingScreen(flags)) {
    return "naming";
  }

  if (isDialogActive(flags)) {
    return "dialog";
  }

  return "overworld";
}

function createReadinessState(flags: MiniStateFlags): ReadinessState {
  const lockReasons: ReadinessLockReason[] = [];
  if (flags.joyIgnore !== 0) {
    lockReasons.push("joy-ignore");
  }
  if (flags.walkCounter !== 0) {
    lockReasons.push("walk-animation");
  }
  if (isDialogActive(flags)) {
    lockReasons.push("text-window");
  }

  return {
    overworldReady: lockReasons.length === 0,
    joyIgnore: flags.joyIgnore,
    walkCounter: flags.walkCounter,
    windowY: flags.windowY,
    lockReasons,
  };
}

function isDialogActive(flags: MiniStateFlags): boolean {
  return flags.windowY < WINDOW_HIDDEN_Y;
}

function isNamingScreen(flags: MiniStateFlags): boolean {
  if (flags.namingScreenType === 0) {
    return false;
  }
  return NAMING_SCREEN_MARKERS.some((marker) =>
    flags.screenText.includes(marker)
  );
}

function isAllZeroState(flags: MiniStateFlags): boolean {
  return (
    flags.mapId === 0 &&
    flags.y === 0 &&
    flags.x === 0 &&
    flags.partyCount === 0 &&
    flags.battle === 0 &&
    flags.textBoxId === 0 &&
    flags.joyIgnore === 0 &&
    flags.walkCounter === 0
  );
}
