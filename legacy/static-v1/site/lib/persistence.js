const STATE_KEY = "sharedModelGame_state";
const HIGH_SCORES_KEY = "sharedModelGame_highScores";
const SESSION_STATS_KEY = "sharedModelGame_sessionStats";

const DIFFICULTY_MULTIPLIERS = {
  training: 0.8,
  standard: 1.0,
  hardcore: 1.2,
  expert: 1.5,
};

const DEFAULT_SESSION_STATS = {
  gamesPlayed: 0,
  totalTagCoverage: 0,
  totalRounds: 0,
  modeDistribution: { a: 0, b: 0, c: 0 },
  tagsUsedCounts: {},
};

export function saveGameState(state) {
  try {
    const data = {
      screen: state.screen,
      difficulty: state.difficulty,
      roundIndex: state.roundIndex,
      meters: { ...state.meters },
      previousMeters: { ...state.previousMeters },
      tacticalCount: state.tacticalCount,
      persistentMods: { ...(state.persistentMods || {}) },
      tagsUsedCounts: { ...(state.tagsUsedCounts || {}) },
      driftTimeline: [...(state.driftTimeline || [])],
      lastRoundSummary: state.lastRoundSummary ? { ...state.lastRoundSummary } : null,
      trainingCompleted: !!state.trainingCompleted,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(STATE_KEY, JSON.stringify(data));
  } catch (_) {}
}

export function loadGameState() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (
      typeof data !== "object" ||
      typeof data.screen !== "string" ||
      typeof data.difficulty !== "string" ||
      typeof data.roundIndex !== "number" ||
      typeof data.meters !== "object"
    ) {
      return null;
    }
    return data;
  } catch (_) {
    return null;
  }
}

export function clearGameState() {
  try {
    localStorage.removeItem(STATE_KEY);
  } catch (_) {}
}

export function saveHighScore(difficulty, score, meters) {
  try {
    const all = loadHighScores();
    if (!all[difficulty]) all[difficulty] = [];
    all[difficulty].push({
      score,
      meters: { ...meters },
      date: new Date().toISOString().slice(0, 10),
    });
    all[difficulty].sort((a, b) => b.score - a.score);
    all[difficulty] = all[difficulty].slice(0, 5);
    localStorage.setItem(HIGH_SCORES_KEY, JSON.stringify(all));
  } catch (_) {}
}

export function loadHighScores() {
  try {
    const raw = localStorage.getItem(HIGH_SCORES_KEY);
    if (!raw) return { training: [], standard: [], hardcore: [], expert: [] };
    const data = JSON.parse(raw);
    if (typeof data !== "object") return { training: [], standard: [], hardcore: [], expert: [] };
    return data;
  } catch (_) {
    return { training: [], standard: [], hardcore: [], expert: [] };
  }
}

export function saveSessionStats(stats) {
  try {
    const existing = loadSessionStats();
    const merged = {
      gamesPlayed: (existing.gamesPlayed || 0) + 1,
      totalTagCoverage: (existing.totalTagCoverage || 0) + (stats.tagCoverage || 0),
      totalRounds: (existing.totalRounds || 0) + (stats.rounds || 0),
      modeDistribution: {
        a: (existing.modeDistribution?.a || 0) + (stats.modeDistribution?.a || 0),
        b: (existing.modeDistribution?.b || 0) + (stats.modeDistribution?.b || 0),
        c: (existing.modeDistribution?.c || 0) + (stats.modeDistribution?.c || 0),
      },
      tagsUsedCounts: { ...(existing.tagsUsedCounts || {}) },
    };
    const incoming = stats.tagsUsedCounts || {};
    for (const [k, v] of Object.entries(incoming)) {
      merged.tagsUsedCounts[k] = (merged.tagsUsedCounts[k] || 0) + v;
    }
    localStorage.setItem(SESSION_STATS_KEY, JSON.stringify(merged));
  } catch (_) {}
}

export function loadSessionStats() {
  try {
    const raw = localStorage.getItem(SESSION_STATS_KEY);
    if (!raw) return { ...DEFAULT_SESSION_STATS, tagsUsedCounts: {} };
    const data = JSON.parse(raw);
    if (typeof data !== "object") return { ...DEFAULT_SESSION_STATS, tagsUsedCounts: {} };
    return data;
  } catch (_) {
    return { ...DEFAULT_SESSION_STATS, tagsUsedCounts: {} };
  }
}

export function calculateFinalScore(meters, difficulty, roundIndex, tagCoverage) {
  const nonBurnAverage =
    (meters.sharedModelStability + meters.visionIntegrity + meters.stakeholderConfidence + meters.systemHealth) / 4;
  const burnInverted = 100 - meters.burnRate;
  const baseScore = (nonBurnAverage + burnInverted) / 2;
  const multiplier = DIFFICULTY_MULTIPLIERS[difficulty] || 1.0;
  return Math.floor(baseScore * multiplier);
}
