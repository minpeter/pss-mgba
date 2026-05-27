import { describe, expect, it } from "vitest";
import { RED_BLUE_MEMORY_MAP } from "../../src/game/memoryMap.js";
import {
  RWY_ADDRESS,
  WINDOW_HIDDEN_Y,
} from "../../src/game/mode-classification.js";
import {
  classifyMiniStateMode,
  createMiniState,
  type MiniStateFlags,
  MiniStateReader,
} from "../../src/session/mini-state-reader.js";

const map = RED_BLUE_MEMORY_MAP;

function flags(overrides: Partial<MiniStateFlags> = {}): MiniStateFlags {
  return {
    battle: 0,
    textBoxId: 0,
    letterDelay: 0,
    mapId: 1,
    y: 7,
    x: 4,
    partyCount: 1,
    walkCounter: 0,
    joyIgnore: 0,
    namingScreenType: 0,
    windowY: WINDOW_HIDDEN_Y,
    screenText: "",
    ...overrides,
  };
}

function createReader(values: {
  readonly battle?: number;
  readonly textBoxId?: number;
  readonly letterDelay?: number;
  readonly mapId?: number;
  readonly y?: number;
  readonly x?: number;
  readonly partyCount?: number;
  readonly walkCounter?: number;
  readonly joyIgnore?: number;
  readonly namingScreenType?: number;
  readonly windowY?: number;
  readonly tileMap?: Uint8Array;
}) {
  const read8Calls: number[] = [];
  const readRangeCalls: Array<{ address: number; length: number }> = [];

  return {
    client: {
      read8(address: number): Promise<number> {
        read8Calls.push(address);
        if (address === map.wIsInBattle) {
          return Promise.resolve(values.battle ?? 0);
        }
        if (address === map.wTextBoxID) {
          return Promise.resolve(values.textBoxId ?? 0);
        }
        if (address === map.wLetterPrintingDelayFlags) {
          return Promise.resolve(values.letterDelay ?? 0);
        }
        if (address === map.wCurMap) {
          return Promise.resolve(values.mapId ?? 1);
        }
        if (address === map.wPartyCount) {
          return Promise.resolve(values.partyCount ?? 1);
        }
        if (address === map.wWalkCounter) {
          return Promise.resolve(values.walkCounter ?? 0);
        }
        if (address === map.wJoyIgnore) {
          return Promise.resolve(values.joyIgnore ?? 0);
        }
        if (address === map.wNamingScreenType) {
          return Promise.resolve(values.namingScreenType ?? 0);
        }
        if (address === RWY_ADDRESS) {
          return Promise.resolve(values.windowY ?? WINDOW_HIDDEN_Y);
        }
        return Promise.resolve(0);
      },
      read16(): Promise<number> {
        return Promise.resolve(0);
      },
      readRange(address: number, length: number): Promise<Uint8Array> {
        readRangeCalls.push({ address, length });
        if (address === map.wYCoord) {
          return Promise.resolve(
            Uint8Array.from([values.y ?? 7, values.x ?? 4])
          );
        }
        return Promise.resolve(values.tileMap ?? new Uint8Array(length));
      },
    },
    read8Calls,
    readRangeCalls,
  };
}

describe("classifyMiniStateMode", () => {
  it("classifies the all-zero boot state as title", () => {
    expect(
      classifyMiniStateMode(
        flags({ mapId: 0, y: 0, x: 0, partyCount: 0, battle: 0, textBoxId: 0 })
      )
    ).toBe("title");
  });

  it("prioritizes battle over naming and dialog evidence", () => {
    expect(
      classifyMiniStateMode(
        flags({
          battle: 2,
          namingScreenType: 1,
          screenText: "lower case",
          windowY: 120,
        })
      )
    ).toBe("battle");
  });

  it("classifies naming screens before ordinary dialog", () => {
    expect(
      classifyMiniStateMode(
        flags({ namingScreenType: 1, screenText: "lower case", windowY: 120 })
      )
    ).toBe("naming");
  });

  it("classifies visible windows as dialog", () => {
    expect(classifyMiniStateMode(flags({ windowY: 120 }))).toBe("dialog");
  });

  it("falls back to overworld when no modal state is active", () => {
    expect(classifyMiniStateMode(flags())).toBe("overworld");
  });
});

describe("createMiniState", () => {
  it("records readiness lock reasons from joyIgnore, walk animation, and dialog", () => {
    const mini = createMiniState(
      flags({ joyIgnore: 0xff, walkCounter: 2, windowY: 120 })
    );

    expect(mini.readiness.overworldReady).toBe(false);
    expect(mini.readiness.lockReasons).toEqual([
      "joy-ignore",
      "walk-animation",
      "text-window",
    ]);
  });
});

describe("MiniStateReader", () => {
  it("reads the mini-state RAM addresses and returns a classified state", async () => {
    const reader = createReader({
      battle: 1,
      mapId: 12,
      y: 3,
      x: 9,
      partyCount: 2,
    });

    const state = await new MiniStateReader(reader.client).read();

    expect(state.mode).toBe("battle");
    expect(state.mapId).toBe(12);
    expect(state.y).toBe(3);
    expect(state.x).toBe(9);
    expect(state.partyCount).toBe(2);
    expect(reader.read8Calls).toEqual(
      expect.arrayContaining([
        map.wIsInBattle,
        map.wTextBoxID,
        map.wLetterPrintingDelayFlags,
        map.wCurMap,
        map.wPartyCount,
        map.wWalkCounter,
        map.wJoyIgnore,
        map.wNamingScreenType,
        RWY_ADDRESS,
      ])
    );
    expect(reader.readRangeCalls).toEqual(
      expect.arrayContaining([
        { address: map.wYCoord, length: 2 },
        { address: map.wTileMap, length: map.wTileMapLength },
      ])
    );
  });

  it("rejects short coordinate reads instead of fabricating position evidence", async () => {
    const reader = createReader({});
    const originalReadRange = reader.client.readRange;
    reader.client.readRange = (address, length) => {
      if (address === map.wYCoord) {
        return Promise.resolve(Uint8Array.from([7]));
      }
      return originalReadRange(address, length);
    };

    await expect(
      new MiniStateReader(reader.client).read()
    ).rejects.toMatchObject({
      code: "INVALID_RAM_STATE",
    });
  });

  it("rejects short tilemap reads instead of decoding partial screen evidence", async () => {
    const reader = createReader({});
    const originalReadRange = reader.client.readRange;
    reader.client.readRange = (address, length) => {
      if (address === map.wTileMap) {
        return Promise.resolve(new Uint8Array(length - 1));
      }
      return originalReadRange(address, length);
    };

    await expect(
      new MiniStateReader(reader.client).read()
    ).rejects.toMatchObject({
      code: "INVALID_RAM_STATE",
    });
  });
});
