import { describe, expect, it } from "vitest";
import { createMiniState } from "../../src/session/mini-state-reader.js";
import { detectStateTransition } from "../../src/session/transition-detector.js";
import type { MiniState } from "../../src/session/types.js";

function mini(overrides: Partial<MiniState> = {}): MiniState {
  const state = createMiniState({
    battle: 0,
    textBoxId: 0,
    letterDelay: 0,
    mapId: 1,
    y: 5,
    x: 4,
    partyCount: 1,
    walkCounter: 0,
    joyIgnore: 0,
    namingScreenType: 0,
    windowY: 144,
    screenText: "",
  });
  return { ...state, ...overrides };
}

describe("detectStateTransition", () => {
  it("prioritizes mode transitions over map and coordinate changes", () => {
    const before = mini({ mode: "overworld", mapId: 1, y: 5, x: 4 });
    const after = mini({ mode: "battle", mapId: 2, y: 6, x: 7 });

    const transition = detectStateTransition(before, after);

    expect(transition.kind).toBe("mode");
    expect(transition.fromMode).toBe("overworld");
    expect(transition.toMode).toBe("battle");
  });

  it("prioritizes map changes over coordinate changes", () => {
    const before = mini({ mapId: 1, y: 5, x: 4 });
    const after = mini({ mapId: 2, y: 6, x: 7 });

    const transition = detectStateTransition(before, after);

    expect(transition.kind).toBe("map");
    expect(transition.fromMapId).toBe(1);
    expect(transition.toMapId).toBe(2);
  });

  it("detects movement when only coordinates change", () => {
    const before = mini({ y: 5, x: 4 });
    const after = mini({ y: 5, x: 5 });

    const transition = detectStateTransition(before, after);

    expect(transition.kind).toBe("movement");
    expect(transition.from).toEqual({ y: 5, x: 4 });
    expect(transition.to).toEqual({ y: 5, x: 5 });
  });

  it("returns none when mini states are stable", () => {
    const before = mini();
    const after = mini();

    expect(detectStateTransition(before, after).kind).toBe("none");
  });
});
