import type { GameMode as SharedGameMode } from "../game/mode-classification.js";
import type { MgbaButton } from "../mgba/MgbaTypes.js";

export type GameMode = SharedGameMode;

export type ReadinessLockReason =
  | "joy-ignore"
  | "walk-animation"
  | "text-window";

export interface ReadinessState {
  readonly joyIgnore: number;
  readonly lockReasons: readonly ReadinessLockReason[];
  /**
   * Evidence-only convenience for overworld-style movement readiness.
   * InputGate must still make intent-specific decisions instead of treating this
   * as a universal input predicate.
   */
  readonly overworldReady: boolean;
  readonly walkCounter: number;
  readonly windowY: number;
}

export interface MiniState {
  readonly battle: number;
  readonly joyIgnore: number;
  readonly letterDelay: number;
  readonly mapId: number;
  readonly mode: GameMode;
  readonly namingScreenType: number;
  readonly partyCount: number;
  readonly readiness: ReadinessState;
  readonly screenText: string;
  readonly textBoxId: number;
  readonly walkCounter: number;
  readonly windowY: number;
  readonly x: number;
  readonly y: number;
}

export type StateTransitionKind = "mode" | "map" | "movement" | "none";

export interface StateTransition {
  readonly after: MiniState;
  readonly before: MiniState;
  readonly from?: Readonly<{ y: number; x: number }>;
  readonly fromMapId?: number;
  readonly fromMode?: GameMode;
  readonly kind: StateTransitionKind;
  readonly to?: Readonly<{ y: number; x: number }>;
  readonly toMapId?: number;
  readonly toMode?: GameMode;
}

export type InputSource =
  | "agent"
  | "auto"
  | "manual"
  | "cli"
  | "supervisor"
  | "test";

export interface InputIntent {
  readonly button: MgbaButton;
  readonly frames: number;
  readonly reason?: string;
  readonly source: InputSource;
}

export interface InputResult {
  readonly after: MiniState;
  readonly before: MiniState;
  readonly event?: SessionEvent;
  readonly executed: boolean;
  readonly intent: InputIntent;
  readonly reason?: string;
  readonly transition: StateTransition;
}

export type SessionPhase =
  | "idle"
  | "syncing"
  | "synced"
  | "input"
  | "auto"
  | "agent-turn"
  | "stopped";

export type SessionEventKind =
  | "input"
  | "transition"
  | "mode-mismatch"
  | "diagnostic";

export interface SessionEvent {
  readonly kind: SessionEventKind;
  readonly message: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly miniState?: MiniState;
  readonly mode: GameMode;
  readonly phase: SessionPhase;
  readonly transition?: StateTransition;
}

export interface SessionState {
  readonly events: readonly SessionEvent[];
  readonly miniState: MiniState;
  /**
   * Authoritative mode for tools, observations, executors, supervisor decisions,
   * and command routing. Raw domain readers may provide evidence, but disagreement
   * is diagnostic data and must not become a competing downstream authority.
   */
  readonly mode: GameMode;
  readonly phase: SessionPhase;
}

export function createSessionState(
  miniState: MiniState,
  events: readonly SessionEvent[] = []
): SessionState {
  return {
    mode: miniState.mode,
    miniState,
    phase: "synced",
    events,
  };
}

export function createModeMismatchEvent(input: {
  readonly sessionState: Pick<SessionState, "mode" | "miniState">;
  readonly evidenceMode: GameMode;
  readonly evidenceSource: string;
}): SessionEvent {
  const { evidenceMode, evidenceSource, sessionState } = input;
  return {
    kind: "mode-mismatch",
    phase: "syncing",
    mode: sessionState.mode,
    message: `Mode evidence from ${evidenceSource} disagreed with SessionState mode`,
    miniState: sessionState.miniState,
    metadata: {
      authoritativeMode: sessionState.mode,
      evidenceMode,
      evidenceSource,
    },
  };
}
