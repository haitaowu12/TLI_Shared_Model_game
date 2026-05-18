import { createInitialSession } from "../domain/session";
import type { GameSession } from "../types";

export const STORAGE_KEY = "shared-model-game-session-v2";
export const LEGACY_KEYS = ["sharedModelGame_state", "sharedModelGame_trainingCompleted", "sharedModelGame_trainingStep"];

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function isGameSession(value: unknown): value is GameSession {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as GameSession).version === 2 &&
      (value as GameSession).response &&
      (value as GameSession).meters,
  );
}

export function migrateLegacySession(storage: StorageLike): GameSession | null {
  const hasLegacyTraining = storage.getItem("sharedModelGame_trainingCompleted") === "true";
  const hasLegacyState = LEGACY_KEYS.some((key) => storage.getItem(key) !== null);

  if (!hasLegacyState) return null;

  const session = createInitialSession(hasLegacyTraining ? "briefing" : "onboarding");
  return {
    ...session,
    eventLog: [
      ...session.eventLog,
      {
        id: `legacy-${Date.now()}`,
        at: new Date().toISOString(),
        label: "Legacy state detected",
        detail: "Static prototype progress was detected; new production session started cleanly.",
      },
    ],
  };
}

export function loadSession(storage: StorageLike = window.localStorage): GameSession | null {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isGameSession(parsed)) return parsed;
    }
    return migrateLegacySession(storage);
  } catch {
    return null;
  }
}

export function saveSession(session: GameSession, storage: StorageLike = window.localStorage): boolean {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(session));
    return true;
  } catch {
    return false;
  }
}

export function clearSession(storage: StorageLike = window.localStorage): void {
  storage.removeItem(STORAGE_KEY);
}

export function exportSession(session: GameSession): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      session,
    },
    null,
    2,
  );
}
