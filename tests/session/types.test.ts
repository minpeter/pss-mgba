import { describe, expect, it } from "vitest";
import { createMiniState } from "../../src/session/mini-state-reader.js";
import {
  createModeMismatchEvent,
  createSessionState,
} from "../../src/session/types.js";

function miniState(modeEvidence: "overworld" | "battle" = "overworld") {
  return createMiniState({
    battle: modeEvidence === "battle" ? 1 : 0,
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
}

describe("session type helpers", () => {
  it("makes SessionState.mode the authoritative mode", () => {
    const mini = miniState("overworld");

    const sessionState = createSessionState(mini);

    expect(sessionState.mode).toBe("overworld");
    expect(sessionState.miniState).toBe(mini);
    expect(sessionState.phase).toBe("synced");
  });

  it("records raw mode disagreement as a diagnostic event without changing authority", () => {
    const mini = miniState("overworld");
    const sessionState = createSessionState(mini);

    const event = createModeMismatchEvent({
      sessionState,
      evidenceMode: "battle",
      evidenceSource: "GameWorld.mode",
    });

    expect(event.kind).toBe("mode-mismatch");
    expect(event.mode).toBe("overworld");
    expect(event.miniState).toBe(mini);
    expect(event.metadata).toEqual({
      authoritativeMode: "overworld",
      evidenceMode: "battle",
      evidenceSource: "GameWorld.mode",
    });
  });
});
