import type { MiniState, StateTransition } from "./types.js";

export class TransitionDetector {
  detect(before: MiniState, after: MiniState): StateTransition {
    if (before.mode !== after.mode) {
      return {
        kind: "mode",
        before,
        after,
        fromMode: before.mode,
        toMode: after.mode,
      };
    }

    if (before.mapId !== after.mapId) {
      return {
        kind: "map",
        before,
        after,
        fromMapId: before.mapId,
        toMapId: after.mapId,
      };
    }

    if (before.y !== after.y || before.x !== after.x) {
      return {
        kind: "movement",
        before,
        after,
        from: { y: before.y, x: before.x },
        to: { y: after.y, x: after.x },
      };
    }

    return {
      kind: "none",
      before,
      after,
    };
  }
}

export function detectStateTransition(
  before: MiniState,
  after: MiniState
): StateTransition {
  return new TransitionDetector().detect(before, after);
}
