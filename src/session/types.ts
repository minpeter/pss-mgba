import type { MgbaButton } from "../mgba/MgbaTypes.js";

export type GameMode = "title" | "overworld" | "dialog" | "battle" | "naming" | "menu";

export type ReadinessLockReason = "joy-ignore" | "walk-animation" | "text-window";

export interface ReadinessState {
  readonly ready: boolean;
  readonly joyIgnore: number;
  readonly walkCounter: number;
  readonly windowY: number;
  readonly lockReasons: readonly ReadinessLockReason[];
}

export interface MiniState {
  readonly mode: GameMode;
  readonly mapId: number;
  readonly y: number;
  readonly x: number;
  readonly partyCount: number;
  readonly battle: number;
  readonly textBoxId: number;
  readonly letterDelay: number;
  readonly joyIgnore: number;
  readonly walkCounter: number;
  readonly namingScreenType: number;
  readonly windowY: number;
  readonly screenText: string;
  readonly readiness: ReadinessState;
}

export type StateTransitionKind = "mode" | "map" | "movement" | "none";

export interface StateTransition {
  readonly kind: StateTransitionKind;
  readonly before: MiniState;
  readonly after: MiniState;
  readonly fromMode?: GameMode;
  readonly toMode?: GameMode;
  readonly fromMapId?: number;
  readonly toMapId?: number;
  readonly from?: Readonly<{ y: number; x: number }>;
  readonly to?: Readonly<{ y: number; x: number }>;
}

export type InputSource = "agent" | "auto" | "manual" | "cli" | "supervisor" | "test";

export interface InputIntent {
  readonly source: InputSource;
  readonly button: MgbaButton;
  readonly frames: number;
  readonly reason?: string;
}

export interface InputResult {
  readonly intent: InputIntent;
  readonly executed: boolean;
  readonly before: MiniState;
  readonly after: MiniState;
  readonly transition: StateTransition;
  readonly reason?: string;
  readonly event?: SessionEvent;
}

export type SessionPhase = "idle" | "syncing" | "ready" | "input" | "auto" | "agent-turn" | "stopped";

export type SessionEventKind = "input" | "transition" | "mode-mismatch" | "diagnostic";

export interface SessionEvent {
  readonly kind: SessionEventKind;
  readonly phase: SessionPhase;
  readonly mode: GameMode;
  readonly message: string;
  readonly transition?: StateTransition;
  readonly miniState?: MiniState;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface SessionState {
  /**
   * Authoritative mode for tools, observations, executors, supervisor decisions,
   * and command routing. Raw domain readers may provide evidence, but disagreement
   * is diagnostic data and must not become a competing downstream authority.
   */
  readonly mode: GameMode;
  readonly miniState: MiniState;
  readonly phase: SessionPhase;
  readonly events: readonly SessionEvent[];
}

export function createSessionState(miniState: MiniState, events: readonly SessionEvent[] = []): SessionState {
  return {
    mode: miniState.mode,
    miniState,
    phase: "ready",
    events,
  };
}

export function createModeMismatchEvent(input: {
  readonly miniState: MiniState;
  readonly evidenceMode: GameMode;
  readonly evidenceSource: string;
}): SessionEvent {
  const { evidenceMode, evidenceSource, miniState } = input;
  return {
    kind: "mode-mismatch",
    phase: "syncing",
    mode: miniState.mode,
    message: `Mode evidence from ${evidenceSource} disagreed with SessionState mode`,
    miniState,
    metadata: {
      authoritativeMode: miniState.mode,
      evidenceMode,
      evidenceSource,
    },
  };
}
