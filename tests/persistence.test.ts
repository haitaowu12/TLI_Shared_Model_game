import { describe, expect, it } from "vitest";
import { createInitialSession } from "../src/domain/session";
import { loadSession, migrateLegacySession, saveSession, type StorageLike } from "../src/persistence/sessionStorage";

function memoryStorage(seed: Record<string, string> = {}): StorageLike {
  const store = new Map(Object.entries(seed));
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
  };
}

describe("persistence", () => {
  it("saves and loads v2 session state", () => {
    const storage = memoryStorage();
    const session = createInitialSession("briefing");

    expect(saveSession(session, storage)).toBe(true);
    expect(loadSession(storage)?.phase).toBe("briefing");
  });

  it("starts at briefing when legacy training completion exists", () => {
    const storage = memoryStorage({ sharedModelGame_trainingCompleted: "true" });

    expect(migrateLegacySession(storage)?.phase).toBe("briefing");
  });
});
