export type GameMode =
  | "title"
  | "overworld"
  | "dialog"
  | "battle"
  | "naming"
  | "menu";

export const NAMING_SCREEN_MARKERS = [
  "lower case",
  "UPPER CASE",
  "ED Mr.",
] as const;

// Game Boy IO register rWY (0xFF4A) controls the Window layer Y position.
// Gen 1 Pokemon sets rWY < 144 when a text window is on-screen and resets
// it to 144 ($90) in CloseTextDisplay. This is the most reliable signal
// for detecting whether a dialog box is actually visible.
export const RWY_ADDRESS = 0xff_4a;
export const WINDOW_HIDDEN_Y = 144;

export interface ModeClassificationFlags {
  readonly battle: number;
  readonly curMap: number;
  readonly joyIgnore: number;
  readonly namingScreenType: number;
  readonly partyCount: number;
  readonly screenText: string;
  readonly textBoxId: number;
  readonly walkCounter: number;
  readonly windowY: number;
  readonly xCoord: number;
  readonly yCoord: number;
}

export function classifyGameMode(flags: ModeClassificationFlags): GameMode {
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

export function isDialogActive(
  flags: Pick<ModeClassificationFlags, "windowY">
): boolean {
  return flags.windowY < WINDOW_HIDDEN_Y;
}

export function isNamingScreen(
  flags: Pick<ModeClassificationFlags, "namingScreenType" | "screenText">
): boolean {
  if (flags.namingScreenType === 0) {
    return false;
  }
  return NAMING_SCREEN_MARKERS.some((marker) =>
    flags.screenText.includes(marker)
  );
}

export function isAllZeroState(
  flags: Pick<
    ModeClassificationFlags,
    | "battle"
    | "curMap"
    | "joyIgnore"
    | "partyCount"
    | "textBoxId"
    | "walkCounter"
    | "xCoord"
    | "yCoord"
  >
): boolean {
  return (
    flags.curMap === 0 &&
    flags.yCoord === 0 &&
    flags.xCoord === 0 &&
    flags.partyCount === 0 &&
    flags.battle === 0 &&
    flags.textBoxId === 0 &&
    flags.joyIgnore === 0 &&
    flags.walkCounter === 0
  );
}
