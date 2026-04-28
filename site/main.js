import { SHARED_MODEL_FIELDS, fieldById } from "./data/sharedModel.js";
import { SCENES } from "./data/scenes.js";
import { stakeholderById } from "./data/stakeholders.js";
import { CONSEQUENCES } from "./data/consequences.js";
import { MODES, MODE_LABEL, MODE_C_SECTIONS, validateModeCResponse, computeRoundDeltas, applyDeltas } from "./lib/scoring.js";
import { clamp, nowIso, pick, uniq } from "./lib/utils.js";
import { TransitionManager } from "./lib/transitions.js";
import { AudioManager } from "./lib/audio.js";
import { AdaptiveDifficulty } from "./lib/adaptive.js";
import {
  saveGameState,
  loadGameState,
  clearGameState,
  saveHighScore,
  loadHighScores,
  saveSessionStats,
  loadSessionStats,
  calculateFinalScore,
} from "./lib/persistence.js";
import {
  TRAINING_STEPS,
  TRAINING_SCENE,
  isTrainingCompleted,
  markTrainingCompleted,
  resetTrainingCompletion,
  getTrainingStep,
  saveTrainingStep,
} from "./data/training.js";

const audioManager = new AudioManager();
const adaptiveDifficulty = new AdaptiveDifficulty();

const $ = (sel) => document.querySelector(sel);

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const canvas = $("#game-canvas");
const ctx = canvas.getContext("2d");
const screenRoot = $("#screen-root");
const stageHint = $("#stage-hint");
const modalRoot = $("#modal-root");

const btnReset = $("#btn-reset");
const btnFullscreen = $("#btn-fullscreen");
const btnHelp = $("#btn-help");
const btnCanvas = $("#btn-canvas");
const btnGlossary = $("#btn-glossary");
const btnAudio = $("#btn-audio");

const DEFAULT_METERS = {
  sharedModelStability: 100,
  visionIntegrity: 80,
  stakeholderConfidence: 70,
  systemHealth: 70,
  burnRate: 20,
};

const DIFFICULTY = {
  training: { label: "Training", seconds: 150, injectionPauses: true },
  standard: { label: "Standard", seconds: 120, injectionPauses: false },
  hardcore: { label: "Hardcore", seconds: 105, injectionPauses: false },
  expert: { label: "Expert – Chaos", seconds: 90, injectionPauses: false, extraInterrupts: true },
};

const SHARED_MODEL_CANVAS = {
  vision:
    "Reduce rural emergency response time by 30% through a coordinated national drone response network people can trust.",
  scope:
    "Emergency-response dispatch + drone operations + incident reporting. Out of scope: non-emergency commercial use and defense missions.",
  rationale:
    "Rural response times are too long; preventable harm occurs when responders can’t reach scenes quickly and safely.",
  as_is_state:
    "Fragmented regional dispatch systems, inconsistent training, limited telemetry, and brittle integrations with legacy IT.",
  strategy:
    "Ship a safe core dispatch + telemetry platform; integrate with legacy via stable interfaces; iterate with field feedback loops and transparent KPIs.",
  success_criteria:
    "Within 12 months: (1) 30% median response-time reduction in pilot regions (baseline: 18 min → target: 12.6 min), (2) Zero safety incidents during pilot operations, (3) 95% training completion rate for field responders, (4) 99.5% system uptime during emergency hours, (5) Public trust survey score ≥ 4.2/5.0, (6) Regulatory compliance maintained across all jurisdictions.",
  kpis:
    "Median rural response time; safety incidents per 1,000 flights; training completion; demo uptime; sustainment cost trend; trust survey score.",
  internal_stakeholders:
    "Engineering, Operations, Safety/Training, Procurement, Legal/Compliance, Finance, Executive sponsors.",
  external_stakeholders:
    "First responders, regulators, rural communities, media, interoperability partners, vendors/contractors.",
  resources_knowledge:
    "Runbooks, incident reviews, decision logs, onboarding pack, shared glossary, and structured retrospectives after each release.",
  tools_processes:
    "GitHub Issues, incident timeline tool, architecture decision records (ADRs), CI/CD pipelines, integration test harness, and comms playbook for public demos.",
  logistical_constraints:
    "Budget capped; ministerial demo dates; multi-time-zone teams; regulatory approvals; legacy system constraints.",
  team_governance:
    "Weekly alignment review; decision records; explicit escalation paths; stakeholder updates at set cadence; ‘stop–think–reflect’ reset allowed.",
  team: "Engineering, Ops, Safety, Procurement, Data/AI, External contractor representatives.",
  project_manager: "Program Lead (rotates in training simulation).",
  responsible: "Feature owner per workstream; named on each 48h action.",
  accountable: "Program Lead accountable for integrated outcome and public trust posture.",
};

let state = makeFreshState();
const SMOKE = new URLSearchParams(window.location.search).get("smoke") === "1";
const FORCE_TRAINING = new URLSearchParams(window.location.search).get("training") === "1";

// Auto-launch training mode if forced via URL parameter
if (FORCE_TRAINING && !state.trainingCompleted) {
  setTimeout(() => startTrainingMode(), 500);
}

function makeFreshState() {
  return {
    version: 1,
    createdAt: nowIso(),
    screen: "title",
    difficulty: "standard",
    roundIndex: 0,
    meters: { ...DEFAULT_METERS },
    displayMeters: { ...DEFAULT_METERS },
    previousMeters: { ...DEFAULT_METERS },
    tacticalCount: 0,
    persistentMods: {},
    lastConsequence: null,
    lastRoundSummary: null,
    tagsUsedCounts: Object.fromEntries(SHARED_MODEL_FIELDS.map((f) => [f.id, 0])),
    driftTimeline: [],
    decisionFingerprint: { modeACount: 0, visionTagUsed: 0, totalRoundsPlayed: 0, modeCSuccessCount: 0, tagCoverageHistory: [] },
    round: null,
    ui: { update: () => {} },
    trainingMode: false,
    trainingStep: 0,
    trainingCompleted: isTrainingCompleted(),
  };
}

function resetAll() {
  closeModal();
  clearGameState();
  adaptiveDifficulty.reset();
  state = makeFreshState();
  setScreen("title");
  stageHint.textContent = "Tip: Use the Shared Model tags. If it’s not tagged, it doesn’t count.";
}

btnReset.addEventListener("click", () => {
  if (state.screen !== "title") {
    openModal({
      title: "Reset Game?",
      body: "All progress will be lost. Are you sure?",
      buttons: [
        { label: "Cancel", variant: "btn--ghost", onClick: closeModal },
        { label: "Reset", variant: "btn--danger", onClick: resetAll },
      ],
    });
  } else {
    resetAll();
  }
});

window.addEventListener("beforeunload", () => {
  if (state.screen === "round" || state.screen === "debrief") {
    saveGameState(state);
  }
});

function updateAudioButton() {
  if (!btnAudio) return;
  const icon = btnAudio.querySelector(".audio-icon");
  if (icon) icon.textContent = audioManager.isMuted() ? "🔇" : "🔊";
}

if (btnAudio) {
  btnAudio.addEventListener("click", () => {
    audioManager.init();
    audioManager.toggleMute();
    updateAudioButton();
  });
  updateAudioButton();
}

document.addEventListener("click", function initOnce() {
  audioManager.init();
  document.removeEventListener("click", initOnce);
}, { once: true });

btnFullscreen.addEventListener("click", () => toggleFullscreen());
document.addEventListener("keydown", (e) => {
  if (e.key === "f" || e.key === "F" || e.key === "F11") {
    e.preventDefault();
    toggleFullscreen();
  }
});

document.addEventListener("fullscreenchange", () => {
  updateFullscreenIndicator();
  handleFullscreenResize();
});

window.addEventListener("resize", () => {
  if (document.fullscreenElement) {
    handleFullscreenResize();
  }
});

function handleFullscreenResize() {
  if (document.fullscreenElement) {
    const container = canvas.parentElement;
    if (container) {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      renderCanvas();
    }
  } else {
    canvas.width = 960;
    canvas.height = 640;
    renderCanvas();
  }
}

btnCanvas?.addEventListener("click", () => showSharedModelCanvasModal());
btnGlossary?.addEventListener("click", () => showGlossaryModal());
btnHelp?.addEventListener("click", () => showHelpModal());

const btnCbMode = $("#btn-cb-mode");
if (btnCbMode) {
  const savedCbMode = localStorage.getItem("sharedModelGame_cbMode") === "true";
  if (savedCbMode) {
    document.body.classList.add("cb-safe");
    btnCbMode.setAttribute("aria-pressed", "true");
  }
  btnCbMode.addEventListener("click", () => {
    document.body.classList.toggle("cb-safe");
    const isActive = document.body.classList.contains("cb-safe");
    btnCbMode.setAttribute("aria-pressed", String(isActive));
    localStorage.setItem("sharedModelGame_cbMode", String(isActive));
  });
}
document.addEventListener("keydown", (e) => {
  if (e.key === "?" || (e.shiftKey && e.key === "/")) showHelpModal();
  if (e.altKey && (e.key === "c" || e.key === "C")) {
    e.preventDefault();
    showSharedModelCanvasModal();
  }
  if (e.altKey && (e.key === "g" || e.key === "G")) {
    e.preventDefault();
    showGlossaryModal();
  }
});

function toggleFullscreen() {
  const el = document.documentElement;
  if (!document.fullscreenElement) {
    el.requestFullscreen?.().catch((err) => {
      console.warn("Fullscreen request failed:", err);
    });
  } else {
    document.exitFullscreen?.();
  }
}

function updateFullscreenIndicator() {
  const isFullscreen = document.fullscreenElement !== null;
  btnFullscreen.setAttribute("aria-pressed", isFullscreen.toString());
  
  const icon = btnFullscreen.querySelector(".fullscreen-icon");
  const text = btnFullscreen.querySelector(".fullscreen-text");
  
  if (isFullscreen) {
    if (icon) icon.textContent = "❐";
    if (text) text.textContent = "Exit (F11)";
  } else {
    if (icon) icon.textContent = "⛶";
    if (text) text.textContent = "Fullscreen (F)";
  }
}

// ---------- Modal ----------
function openModal({ title, body, tone = "default", buttons = [] }) {
  modalRoot.hidden = false;
  modalRoot.innerHTML = "";

  const modal = document.createElement("div");
  modal.className = "modal";

  const head = document.createElement("div");
  head.className = "modal__head";

  const h = document.createElement("div");
  h.className = "modal__title";
  h.textContent = title;
  head.appendChild(h);

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "btn btn--ghost";
  closeBtn.textContent = "Close (Esc)";
  closeBtn.addEventListener("click", closeModal);
  head.appendChild(closeBtn);

  const content = document.createElement("div");
  content.className = "modal__body";
  if (tone === "danger") content.classList.add("danger");
  if (typeof body === "string") content.textContent = body;
  else content.appendChild(body);

  const footer = document.createElement("div");
  footer.className = "card";

  const row = document.createElement("div");
  row.className = "row";
  for (const b of buttons) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `btn ${b.variant || "btn--primary"}`;
    btn.textContent = b.label;
    btn.addEventListener("click", () => {
      if (b.onClick) b.onClick();
    });
    row.appendChild(btn);
  }
  footer.appendChild(row);

  modal.appendChild(head);
  modal.appendChild(content);
  if (buttons.length) modal.appendChild(footer);

  modalRoot.appendChild(modal);
}

function closeModal() {
  modalRoot.hidden = true;
  modalRoot.innerHTML = "";
  if (state.trainingMode && state.trainingStep < 4) {
    hideTrainingProgressOverlay();
  }
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modalRoot.hidden) closeModal();
});

// ---------- Screens ----------
const transitionManager = new TransitionManager({ duration: 300 });
let _transitionId = 0;

function getTransitionType(from, to) {
  if (to === "title") return "reset";
  if (from === "title" && to === "briefing") return "forward";
  if (from === "briefing" && to === "round") return "forward";
  if (from === "round" && to === "debrief") return "submit";
  if (from === "debrief" && to === "briefing") return "forward";
  if (from === "debrief" && to === "end") return "submit";
  return "forward";
}

async function setScreen(next) {
  const myId = ++_transitionId;
  const previousScreen = state.screen;
  const transitionType = getTransitionType(previousScreen, next);
  const oldContent = screenRoot.firstChild;

  screenRoot.classList.add("screen-transition-container");

  if (oldContent) {
    oldContent.classList.add("screen-exit-overlay");
    await transitionManager.exit(oldContent, transitionType);
    if (_transitionId !== myId) return;
  }

  state.screen = next;
  if (state._undoCleanup) {
    state._undoCleanup();
    state._undoCleanup = null;
  }
  screenRoot.innerHTML = "";

  if (next === "title") renderTitle();
  else if (next === "briefing") renderBriefing();
  else if (next === "round") renderRound();
  else if (next === "debrief") renderDebrief();
  else if (next === "end") renderEnd();
  else renderTitle();

  const newContent = screenRoot.firstChild;

  if (newContent) {
    await transitionManager.enter(newContent, transitionType);
    if (_transitionId !== myId) return;
  }

  screenRoot.classList.remove("screen-transition-container");
  renderCanvas();

  screenRoot.setAttribute("tabindex", "-1");
  const focusable = screenRoot.querySelector("button, textarea, [tabindex='0']");
  if (focusable) {
    focusable.focus();
  } else {
    screenRoot.focus();
  }
}

function renderTitle() {
  const wrap = document.createElement("div");
  wrap.className = "card";

  const title = document.createElement("h2");
  title.className = "card__title";
  title.textContent = "Enter the Arena (Solo)";
  wrap.appendChild(title);

  const desc = document.createElement("div");
  desc.className = "card__desc";
  desc.innerHTML =
    "<strong>You are the Leader.</strong> Stakeholders interrupt on a script. Your job is to keep the Shared Model alive under pressure.<br/><br/><strong>Rule:</strong> if a response isn’t tagged to Shared Model fields, it doesn’t count.";
  wrap.appendChild(desc);

  const divider = document.createElement("div");
  divider.className = "divider";
  wrap.appendChild(divider);

  const img = document.createElement("img");
  img.className = "hero-img";
  img.alt = "Shared Model template graphic";
  img.src = "./assets/cohort9_shared_model_template.svg";
  wrap.appendChild(img);

  const how = document.createElement("div");
  how.className = "callout";
  how.innerHTML =
    "<strong>How to play (90 seconds):</strong><ol class='steps'>" +
    "<li>Click <strong>Start</strong> to begin Round 1.</li>" +
    "<li>Pick Mode A / B / C (Mode C is best, but stricter).</li>" +
    "<li>Write your response <strong>and</strong> select Shared Model tag chips for each section.</li>" +
    "<li>When interrupted, satisfy the new required tag before submitting.</li>" +
    "<li>Submit → read the Debrief → next round.</li>" +
    "</ol>";
  wrap.appendChild(how);

  const row = document.createElement("div");
  row.className = "row";

  const diffLabel = document.createElement("div");
  diffLabel.className = "pill";
  diffLabel.innerHTML = `<span class="pill__dot" style="background: var(--teal)"></span> Difficulty`;
  row.appendChild(diffLabel);

  for (const [id, cfg] of Object.entries(DIFFICULTY)) {
    const b = document.createElement("button");
    b.type = "button";
    
    let buttonClass = "btn ";
    if (state.difficulty === id) {
      buttonClass += id === "expert" ? "btn--expert" : "btn--primary";
    } else {
      buttonClass += "btn--ghost";
    }
    
    b.className = buttonClass;
    const expertBadge = id === "expert" ? " ⚡" : "";
    b.textContent = `${cfg.label} (${cfg.seconds}s)${expertBadge}`;
    b.addEventListener("click", () => {
      state.difficulty = id;
      setScreen("title");
    });
    row.appendChild(b);
  }
  wrap.appendChild(row);

  const divider2 = document.createElement("div");
  divider2.className = "divider";
  wrap.appendChild(divider2);

  const actions = document.createElement("div");
  actions.className = "row";

  const saved = loadGameState();
  if (saved) {
    const resume = document.createElement("button");
    resume.type = "button";
    resume.className = "btn btn--ghost";
    resume.textContent = "Resume Game";
    resume.addEventListener("click", () => {
      const s = loadGameState();
      if (!s) return;
      state.screen = s.screen;
      state.difficulty = s.difficulty;
      state.roundIndex = s.roundIndex;
      state.meters = { ...s.meters };
      state.displayMeters = { ...s.meters };
      state.previousMeters = { ...s.previousMeters };
      state.tacticalCount = s.tacticalCount;
      state.persistentMods = { ...(s.persistentMods || {}) };
      state.tagsUsedCounts = { ...(s.tagsUsedCounts || {}) };
      state.driftTimeline = [...(s.driftTimeline || [])];
      state.lastRoundSummary = s.lastRoundSummary ? { ...s.lastRoundSummary } : null;
      state.trainingCompleted = !!s.trainingCompleted;
      setScreen("briefing");
    });
    actions.appendChild(resume);
  }

  const start = document.createElement("button");
  start.id = "start-btn";
  start.type = "button";
  start.className = "btn btn--primary";
  start.textContent = "Start";
  start.addEventListener("click", () => {
    beginRound();
    setScreen("round");
  });
  actions.appendChild(start);

  const canvasBtn = document.createElement("button");
  canvasBtn.type = "button";
  canvasBtn.className = "btn btn--ghost";
  canvasBtn.textContent = "Canvas";
  canvasBtn.addEventListener("click", () => showSharedModelCanvasModal());
  actions.appendChild(canvasBtn);

  const glossaryBtn = document.createElement("button");
  glossaryBtn.type = "button";
  glossaryBtn.className = "btn btn--ghost";
  glossaryBtn.textContent = "Glossary";
  glossaryBtn.addEventListener("click", () => showGlossaryModal());
  actions.appendChild(glossaryBtn);

  wrap.appendChild(actions);

  const divider3 = document.createElement("div");
  divider3.className = "divider";
  wrap.appendChild(divider3);

  const trainingSection = document.createElement("div");
  trainingSection.className = "training-section";
  
  const trainingTitle = document.createElement("div");
  trainingTitle.className = "card__desc";
  trainingTitle.innerHTML = "<strong>New to the game?</strong> Try Training Mode to learn the mechanics.";
  trainingSection.appendChild(trainingTitle);

  const trainingRow = document.createElement("div");
  trainingRow.className = "row";
  trainingRow.style.marginTop = "12px";

  const trainingBtn = document.createElement("button");
  trainingBtn.type = "button";
  trainingBtn.className = "btn btn--primary";
  trainingBtn.innerHTML = "<span style='opacity:.85'>📚</span> Training Mode";
  trainingBtn.addEventListener("click", () => {
    startTrainingMode();
  });
  trainingRow.appendChild(trainingBtn);

  if (state.trainingCompleted) {
    const completedBadge = document.createElement("div");
    completedBadge.className = "pill training-badge";
    completedBadge.innerHTML = "<span class='pill__dot' style='background: var(--lime-success)'></span>✓ Training Complete";
    trainingRow.appendChild(completedBadge);
  }

  trainingSection.appendChild(trainingRow);
  wrap.appendChild(trainingSection);

  const highScores = loadHighScores();
  const diffScores = highScores[state.difficulty] || [];
  if (diffScores.length > 0) {
    const divider4 = document.createElement("div");
    divider4.className = "divider";
    wrap.appendChild(divider4);

    const hsTitle = document.createElement("div");
    hsTitle.className = "card__desc";
    hsTitle.innerHTML = "<strong>High Scores (" + (DIFFICULTY[state.difficulty]?.label || state.difficulty) + "):</strong>";
    wrap.appendChild(hsTitle);

    const hsList = document.createElement("div");
    hsList.className = "grid";
    const ordinals = ["1st", "2nd", "3rd", "4th", "5th"];
    diffScores.forEach((entry, i) => {
      hsList.appendChild(metricLine(ordinals[i], entry.score + " pts (" + entry.date + ")"));
    });
    wrap.appendChild(hsList);
  }

  screenRoot.appendChild(wrap);

  state.ui.update = () => {};
}

function renderBriefing() {
  const scene = SCENES[state.roundIndex];
  const wrap = document.createElement("div");
  wrap.className = "card";

  const title = document.createElement("h2");
  title.className = "card__title";
  title.textContent = "Briefing";
  wrap.appendChild(title);

  const desc = document.createElement("div");
  desc.className = "card__desc";
  desc.textContent =
    "Single fictional system. Scripted scenes. Your job: hold the shared model under pressure.";
  wrap.appendChild(desc);

  const divider = document.createElement("div");
  divider.className = "divider";
  wrap.appendChild(divider);

  const sceneCard = document.createElement("div");
  sceneCard.className = "grid";

  const pillRow = document.createElement("div");
  pillRow.className = "row";

  const p1 = pill("Round", `${state.roundIndex + 1} / ${SCENES.length}`, "var(--amber)");
  const p2 = pill("Phase", scene.phase, "var(--teal)");
  pillRow.appendChild(p1);
  pillRow.appendChild(p2);
  sceneCard.appendChild(pillRow);

  const t = document.createElement("div");
  t.className = "card__desc";
  t.textContent = `${scene.title}: ${scene.setup}`;
  sceneCard.appendChild(t);

  const st = document.createElement("div");
  st.className = "card__desc";
  st.textContent = `System context: ${scene.system_context}`;
  sceneCard.appendChild(st);

  const constraints = document.createElement("div");
  constraints.className = "card__desc";
  constraints.textContent = `Constraints: ${scene.constraints.join(" • ")}`;
  sceneCard.appendChild(constraints);

  wrap.appendChild(sceneCard);

  const divider2 = document.createElement("div");
  divider2.className = "divider";
  wrap.appendChild(divider2);

  const actions = document.createElement("div");
  actions.className = "row";

  const openCanvas = document.createElement("button");
  openCanvas.type = "button";
  openCanvas.className = "btn btn--ghost";
  openCanvas.textContent = "Canvas";
  openCanvas.addEventListener("click", () => showSharedModelCanvasModal());
  actions.appendChild(openCanvas);

  const openGlossary = document.createElement("button");
  openGlossary.type = "button";
  openGlossary.className = "btn btn--ghost";
  openGlossary.textContent = "Glossary";
  openGlossary.addEventListener("click", () => showGlossaryModal());
  actions.appendChild(openGlossary);

  const begin = document.createElement("button");
  begin.type = "button";
  begin.className = "btn btn--primary";
  begin.textContent = "Begin Round";
  begin.addEventListener("click", () => {
    beginRound();
    setScreen("round");
  });
  actions.appendChild(begin);

  wrap.appendChild(actions);
  screenRoot.appendChild(wrap);
  state.ui.update = () => {};
}

function getSceneModifiers(scene, fingerprint) {
  const mods = { extraConstraint: null, extraInjection: null, modifiedSetup: null, modelMomentum: false };

  if (fingerprint.modeACount >= 3) {
    mods.extraConstraint = "⚠ Accumulated tactical debt from previous Mode A responses is increasing system fragility.";
    mods.extraInjection = {
      at_s: 45,
      window: 10,
      from: pick(scene.stakeholders, 0),
      line: "Previous tactical patches are compounding. The system can't absorb more shortcuts.",
    };
  }

  if (fingerprint.totalRoundsPlayed > 0 && fingerprint.visionTagUsed < fingerprint.totalRoundsPlayed * 0.3) {
    mods.modifiedSetup = scene.setup + " The team is losing sight of the original purpose — organizational drift is setting in.";
    mods.extraInjection = {
      at_s: 50,
      window: 10,
      from: "comms_i",
      line: "Nobody's talking about the vision anymore. Are we still building what we set out to build?",
    };
  }

  const avgCoverage = fingerprint.tagCoverageHistory.length > 0
    ? fingerprint.tagCoverageHistory.reduce((a, b) => a + b, 0) / fingerprint.tagCoverageHistory.length
    : 0;
  if (avgCoverage > 80 && fingerprint.modeCSuccessCount >= 2) {
    mods.modelMomentum = true;
  }

  return mods;
}

function showMomentumIndicator() {
  const el = $("#pressure-indicator");
  if (!el) return;
  el.className = "pressure-indicator pressure-indicator--momentum";
  el.textContent = "Model Momentum ✓";
  el.hidden = false;
  el.setAttribute("aria-hidden", "false");
  setTimeout(() => {
    el.hidden = true;
    el.setAttribute("aria-hidden", "true");
    el.className = "pressure-indicator";
  }, 2000);
}

function showPressureIndicator(direction) {
  const el = $("#pressure-indicator");
  if (!el) return;
  el.className = `pressure-indicator pressure-indicator--${direction}`;
  el.textContent = direction === "up" ? "Pressure ↑" : "Pressure ↓";
  el.hidden = false;
  el.setAttribute("aria-hidden", "false");
  setTimeout(() => {
    el.hidden = true;
    el.setAttribute("aria-hidden", "true");
    el.className = "pressure-indicator";
  }, 3000);
}

function beginRound() {
  audioManager.playRoundStart();
  lastAnnouncedMilestone = null;
  const diff = DIFFICULTY[state.difficulty] || DIFFICULTY.standard;
  const scene = { ...SCENES[state.roundIndex], constraints: [...SCENES[state.roundIndex].constraints], injections: [...SCENES[state.roundIndex].injections] };
  const stakeholders = scene.stakeholders.map(stakeholderById).filter(Boolean);

  const isTraining = state.difficulty === "training";
  const modifiers = isTraining ? { extraConstraint: null, extraInjection: null, modifiedSetup: null, modelMomentum: false } : getSceneModifiers(scene, state.decisionFingerprint);
  if (modifiers.extraConstraint) scene.constraints.push(modifiers.extraConstraint);
  if (modifiers.extraInjection) {
    scene.injections.push(modifiers.extraInjection);
    scene.injections.sort((a, b) => a.at_s - b.at_s);
  }
  if (modifiers.modifiedSetup) scene.setup = modifiers.modifiedSetup;

  const injectionSchedule = calculateInjectionSchedule(scene.injections, diff.seconds, isTraining);

  state.round = {
    id: scene.id,
    startedAt: nowIso(),
    scene,
    stakeholders,
    secondsTotal: diff.seconds,
    secondsLeft: diff.seconds,
    injectionIndex: 0,
    activeInjection: null,
    requiredTags: new Set(),
    pausedForInjection: false,
    injectionSchedule,
    mode: null,
    textBySection: {},
    tagsBySection: {},
    tagHistory: [],
    timedOut: false,
    activeModeCSection: 0,
    sceneModifiers: modifiers,
    adaptivePauses: false,
    pressureDirection: null,
  };

  if (!isTraining) {
    const adjustments = adaptiveDifficulty.getAdjustments();
    state.round.secondsTotal = Math.max(30, state.round.secondsTotal + adjustments.timerAdjust);
    state.round.secondsLeft = Math.max(30, state.round.secondsLeft + adjustments.timerAdjust);
    if (adjustments.extraInterrupt) {
      scene.injections.push({
        at_s: Math.min(state.round.secondsTotal * 0.6, 60),
        window: 10,
        from: pick(scene.stakeholders, state.roundIndex + 3),
        line: "Adaptive pressure: an unexpected stakeholder demand escalates the situation!",
        extra: true,
      });
      scene.injections.sort((a, b) => a.at_s - b.at_s);
      state.round.injectionSchedule = calculateInjectionSchedule(scene.injections, state.round.secondsTotal, false);
    }
    if (adjustments.interruptPauses) {
      state.round.adaptivePauses = true;
    }
    state.round.pressureDirection = adjustments.pressureDirection;
    if (adjustments.pressureDirection) {
      showPressureIndicator(adjustments.pressureDirection);
    }
  }
}

function calculateInjectionSchedule(injections, roundDuration, isTraining) {
  if (isTraining) {
    return injections.map((inj) => ({
      ...inj,
      randomizedTime: inj.at_s,
    }));
  }

  const MIN_SPACING = 20;
  const schedule = [];
  let lastTime = 0;

  for (const inj of injections) {
    const windowSize = inj.window ?? 10;
    const minTime = Math.max(lastTime + MIN_SPACING, inj.at_s - windowSize);
    const maxTime = Math.min(roundDuration - 5, inj.at_s + windowSize);

    let randomizedTime;
    if (minTime >= maxTime) {
      randomizedTime = minTime;
    } else {
      randomizedTime = minTime + Math.random() * (maxTime - minTime);
    }

    schedule.push({
      ...inj,
      randomizedTime,
    });
    lastTime = randomizedTime;
  }

  return schedule;
}

function renderRound() {
  const wrap = document.createElement("div");
  wrap.className = "card";

  const panelTimer = document.createElement("div");
  panelTimer.className = "timer-display";
  panelTimer.id = "panel-timer";
  panelTimer.textContent = formatTimer(state.round.secondsLeft);
  wrap.appendChild(panelTimer);

  const title = document.createElement("h2");
  title.className = "card__title";
  title.textContent = "Round";
  wrap.appendChild(title);

  const topRow = document.createElement("div");
  topRow.className = "row";

  const timerPill = pill("Timer", "", "var(--rose)");
  timerPill.id = "pill-timer";
  topRow.appendChild(timerPill);

  const modePill = pill("Mode", "Choose A/B/C", "var(--amber)");
  modePill.id = "pill-mode";
  topRow.appendChild(modePill);

  wrap.appendChild(topRow);

  const desc = document.createElement("div");
  desc.className = "card__desc";
  desc.id = "round-scene-desc";
  desc.textContent = `${state.round.scene.title}: ${state.round.scene.setup}`;
  wrap.appendChild(desc);

  const divider = document.createElement("div");
  divider.className = "divider";
  wrap.appendChild(divider);

  const modeRow = document.createElement("div");
  modeRow.className = "row";

  const btnA = modeButton("1", MODE_LABEL[MODES.A], "btn--danger", () => selectMode(MODES.A));
  btnA.title = "⚠ Stability -8, Vision -7, Health -6, Burn +10, Confidence +4";
  const btnB = modeButton("2", MODE_LABEL[MODES.B], "btn--ghost", () => selectMode(MODES.B));
  btnB.title = "↔ Stability -2, Vision +1, Health +4, Burn +2, Confidence -3";
  const btnC = modeButton("3", MODE_LABEL[MODES.C], "btn--primary", () => selectMode(MODES.C));
  btnC.title = "✓ Stability +10, Vision +8, Health +6, Burn -3, Confidence +4 (if complete)";
  modeRow.appendChild(btnA);
  modeRow.appendChild(btnB);
  modeRow.appendChild(btnC);
  wrap.appendChild(modeRow);

  const divider2 = document.createElement("div");
  divider2.className = "divider";
  wrap.appendChild(divider2);

  const required = document.createElement("div");
  required.id = "required-tags";
  required.className = "card__desc";
  required.textContent = "Interrupt requirements: (none yet)";
  wrap.appendChild(required);

  const guidance = document.createElement("div");
  guidance.id = "round-guidance";
  guidance.className = "callout";
  guidance.innerHTML =
    "<strong>Tip:</strong> Tags are the scoring system. Under pressure, the model disappears first—fight that drift.";
  wrap.appendChild(guidance);

  const formRoot = document.createElement("div");
  formRoot.id = "form-root";
  wrap.appendChild(formRoot);

  const divider3 = document.createElement("div");
  divider3.className = "divider";
  wrap.appendChild(divider3);

  const actions = document.createElement("div");
  actions.className = "row";

  const canvasBtn = document.createElement("button");
  canvasBtn.type = "button";
  canvasBtn.className = "btn btn--ghost";
  canvasBtn.textContent = "Canvas";
  canvasBtn.addEventListener("click", () => showSharedModelCanvasModal());
  actions.appendChild(canvasBtn);

  const glossaryBtn = document.createElement("button");
  glossaryBtn.type = "button";
  glossaryBtn.className = "btn btn--ghost";
  glossaryBtn.textContent = "Glossary";
  glossaryBtn.addEventListener("click", () => showGlossaryModal());
  actions.appendChild(glossaryBtn);

  const submit = document.createElement("button");
  submit.type = "button";
  submit.className = "btn btn--primary";
  submit.id = "btn-submit";
  submit.textContent = "Submit (Enter)";
  submit.addEventListener("click", () => submitRound());
  actions.appendChild(submit);

  wrap.appendChild(actions);
  screenRoot.appendChild(wrap);

  const update = () => {
    const t = $("#pill-timer");
    if (t) t.querySelector(".pill__value").textContent = formatTimer(state.round.secondsLeft);
    const m = $("#pill-mode");
    if (m) m.querySelector(".pill__value").textContent = state.round.mode ? MODE_LABEL[state.round.mode] : "Choose A/B/C";

    const pt = $("#panel-timer");
    if (pt) {
      pt.textContent = formatTimer(state.round.secondsLeft);
      const sl = state.round.secondsLeft;
      pt.classList.remove("timer-display--urgent", "timer-display--critical");
      if (sl < 15) pt.classList.add("timer-display--critical");
      else if (sl < 30) pt.classList.add("timer-display--urgent");
    }

    const req = $("#required-tags");
    const reqTags = Array.from(state.round.requiredTags);
    if (req) {
      req.textContent = reqTags.length
        ? `Interrupt requirements: ${reqTags
            .map((id) => fieldById(id)?.label || id)
            .join(" • ")}`
        : "Interrupt requirements: (none yet)";
    }

    const guidance = $("#round-guidance");
    if (guidance) {
      const allTags = uniq(
        Object.values(state.round.tagsBySection || {})
          .flat()
          .filter(Boolean),
      );
      const unmetReq = reqTags.filter((t) => !new Set(allTags).has(t));

      if (state.round.mode === MODES.C) {
        const v = validateModeCResponse({
          textBySection: state.round.textBySection,
          tagsBySection: state.round.tagsBySection,
        });
        const checklist = v.ok
          ? "<strong>Mode C checklist:</strong> All required tags + sections are satisfied. Submit when ready."
          : `<strong>Mode C checklist:</strong> ${
              v.violations.length ? v.violations[0].message : "Complete all sections + add at least one tag per section."
            }`;
        const reqLine = unmetReq.length
          ? `<div class="card__desc" style="margin-top:6px"><strong>Interrupt tags missing:</strong> ${unmetReq
              .map((t) => fieldById(t)?.label || t)
              .join(", ")}</div>`
          : "";
        guidance.innerHTML = `${checklist}${reqLine}`;
      } else if (state.round.mode) {
        const tagCount = allTags.length;
        const reqLine = unmetReq.length
          ? ` Missing interrupt tag(s): ${unmetReq.map((t) => fieldById(t)?.label || t).join(", ")}.`
          : "";
        guidance.innerHTML = `<strong>Mode ${state.round.mode === MODES.A ? "A" : "B"} tip:</strong> Choose tags that anchor your message (aim for 2+). Tag count: ${tagCount}.${reqLine}`;
      } else {
        guidance.innerHTML =
          "<strong>Tip:</strong> Tags are the scoring system. Under pressure, the model disappears first—fight that drift.";
      }
    }
  };

  state.ui.update = update;
  update();
  renderModeForm();

  const undoKeyHandler = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "z") {
      e.preventDefault();
      performTagUndo();
    }
  };
  document.addEventListener("keydown", undoKeyHandler);
  const origUpdate = update;
  state.ui.update = () => {
    origUpdate();
  };
  const cleanupUndo = () => {
    document.removeEventListener("keydown", undoKeyHandler);
  };
  const prevSetScreen = setScreen;
  state._undoCleanup = cleanupUndo;

  if (SMOKE) runSmokeScriptForCurrentRound();
}

function runSmokeScriptForCurrentRound() {
  if (!state.round || state.round.__smokeDone) return;
  state.round.__smokeDone = true;

  // Minimal deterministic “autoplay” for the Playwright loop.
  // Goal: exercise interrupts + required tags + Mode C scoring + debrief.
  queueMicrotask(() => {
    selectMode(MODES.C);

    state.round.textBySection.purpose_anchor = "Purpose: shorten rural emergency response time safely, without compromising trust.";
    state.round.tagsBySection.purpose_anchor = ["vision", "rationale"];

    state.round.textBySection.immediate_48h_action =
      "Within 48h: triage defects by impact on responder outcomes; assign an owner; publish a focused mitigation plan.";
    state.round.tagsBySection.immediate_48h_action = ["strategy", "responsible"];

    state.round.textBySection.boundary_statement =
      "Non‑negotiables: safety checks remain; scope stays on emergency missions; budget/time constraints are explicit.";
    state.round.tagsBySection.boundary_statement = ["scope", "logistical_constraints"];

    state.round.textBySection.lifecycle_impact =
      "Lifecycle: prioritize telemetry and integration tests to avoid invisible sustainment cost and rework cascades.";
    state.round.tagsBySection.lifecycle_impact = ["kpis", "as_is_state"];

    state.round.textBySection.stakeholder_message =
      "Message: align internal/external stakeholders on what won’t be compromised and how we govern decisions under pressure.";
    state.round.tagsBySection.stakeholder_message = ["external_stakeholders", "team_governance"];

    // Trigger interrupts (30s/60s/90s) deterministically.
    window.advanceTime(95000);
    if (!modalRoot.hidden) closeModal();

    submitRound();
  });
}

function renderModeForm() {
  const root = $("#form-root");
  if (!root) return;
  root.innerHTML = "";

  if (!state.round.mode) {
    const msg = document.createElement("div");
    msg.className = "card__desc";
    msg.textContent = "Choose a response mode. Under pressure, your default will be revealed.";
    root.appendChild(msg);
    return;
  }

  if (state.round.mode === MODES.C) {
    root.appendChild(renderModeCForm());
    return;
  }

  // Mode A/B: smaller structured response (still taggable).
  const label = document.createElement("label");
  label.textContent = "One-line plan (tag it to the Shared Model)";
  root.appendChild(label);

  const ta = document.createElement("textarea");
  ta.placeholder = "Write a concise response. If you don’t tag it, it doesn’t count.";
  ta.value = state.round.textBySection.summary || "";
  ta.addEventListener("input", () => {
    state.round.textBySection.summary = ta.value;
  });
  root.appendChild(ta);

  const tagLabel = document.createElement("label");
  tagLabel.style.marginTop = "10px";
  tagLabel.textContent = "Tags";
  root.appendChild(tagLabel);

  const chips = createChipset({
    selected: new Set(state.round.tagsBySection.summary || []),
    sectionId: "summary",
    onToggle: (id, isSelected) => {
      const next = new Set(state.round.tagsBySection.summary || []);
      if (isSelected) next.add(id);
      else next.delete(id);
      state.round.tagsBySection.summary = Array.from(next);
    },
  });
  root.appendChild(chips);
}

function renderModeCForm() {
  const MODE_C_META = [
    { id: "purpose_anchor", title: "Purpose Anchor", helper: "Vision + Rationale/Success Criteria/KPIs" },
    { id: "immediate_48h_action", title: "Immediate 48h Action", helper: "Strategy + Responsible or Accountable" },
    { id: "boundary_statement", title: "Boundary Statement / Non‑negotiables", helper: "Scope + Logistical Constraints" },
    { id: "lifecycle_impact", title: "Lifecycle / Whole-of-life Impact", helper: "KPIs and/or As-is State" },
    { id: "stakeholder_message", title: "Stakeholder Message", helper: "Internal/External Stakeholder + Team Governance" },
  ];

  const activeIdx = state.round.activeModeCSection ?? 0;

  const isSectionComplete = (sectionId) => {
    const hasText = (state.round.textBySection[sectionId] || "").trim().length > 0;
    const hasTags = (state.round.tagsBySection[sectionId] || []).length > 0;
    return hasText && hasTags;
  };

  const findNextIncomplete = (fromIdx) => {
    for (let i = fromIdx + 1; i < MODE_C_META.length; i++) {
      if (!isSectionComplete(MODE_C_META[i].id)) return i;
    }
    for (let i = 0; i < fromIdx; i++) {
      if (!isSectionComplete(MODE_C_META[i].id)) return i;
    }
    return fromIdx;
  };

  const container = document.createElement("div");
  container.className = "mode-c-stepper";

  const incompleteSections = state.round._modeCIncompleteSections;

  MODE_C_META.forEach((meta, idx) => {
    const step = document.createElement("div");
    step.className = "mode-c-step";

    const completed = isSectionComplete(meta.id);
    const isActive = idx === activeIdx;
    const isIncomplete = incompleteSections && incompleteSections.has(meta.id);

    if (isIncomplete) step.classList.add("mode-c-step--incomplete");
    else if (isActive) step.classList.add("mode-c-step--active");
    else if (completed) step.classList.add("mode-c-step--completed");

    const header = document.createElement("div");
    header.className = "mode-c-step__header";

    const indicator = document.createElement("div");
    indicator.className = "mode-c-step__indicator";
    indicator.textContent = completed ? "✓" : String(idx + 1);

    const title = document.createElement("div");
    title.className = "mode-c-step__title";
    title.textContent = meta.title;

    const helper = document.createElement("div");
    helper.className = "mode-c-step__helper";
    helper.textContent = meta.helper;

    header.appendChild(indicator);
    header.appendChild(title);
    header.appendChild(helper);

    header.addEventListener("click", () => {
      state.round.activeModeCSection = idx;
      delete state.round._modeCIncompleteSections;
      renderModeForm();
      state.ui.update();
    });

    const body = document.createElement("div");
    body.className = "mode-c-step__body";
    body.appendChild(
      modeCSection({
        id: meta.id,
        placeholder: getPlaceholderForSection(meta.id),
        onChipToggle: () => {
          delete state.round._modeCIncompleteSections;
          if (isSectionComplete(meta.id) && state.round.activeModeCSection === idx) {
            const nextIdx = findNextIncomplete(idx);
            if (nextIdx !== idx) {
              setTimeout(() => {
                state.round.activeModeCSection = nextIdx;
                renderModeForm();
                state.ui.update();
              }, 500);
            }
          }
        },
      }),
    );

    step.appendChild(header);
    step.appendChild(body);
    container.appendChild(step);
  });

  return container;
}

function getPlaceholderForSection(sectionId) {
  const placeholders = {
    purpose_anchor: "Restate the long-term product intent without corporate wallpaper.",
    immediate_48h_action: "What happens in the next 48 hours? Who owns it?",
    boundary_statement: "What will not be compromised? Where is the boundary under pressure?",
    lifecycle_impact: "What invisible system costs or consequences might emerge later?",
    stakeholder_message: "What message aligns stakeholders without hiding reality?",
  };
  return placeholders[sectionId] || "";
}

function modeCSection({ id, placeholder, onChipToggle }) {
  const sec = document.createElement("div");
  sec.className = "grid";

  const ta = document.createElement("textarea");
  ta.placeholder = placeholder;
  ta.value = state.round.textBySection[id] || "";
  ta.addEventListener("input", () => {
    state.round.textBySection[id] = ta.value;
  });
  sec.appendChild(ta);

  const chips = createChipset({
    selected: new Set(state.round.tagsBySection[id] || []),
    sectionId: id,
    onToggle: (tagId, isSelected) => {
      const next = new Set(state.round.tagsBySection[id] || []);
      if (isSelected) next.add(tagId);
      else next.delete(tagId);
      state.round.tagsBySection[id] = Array.from(next);
      if (onChipToggle) onChipToggle();
    },
  });
  sec.appendChild(chips);

  return sec;
}

function createChipset({ selected, onToggle, sectionId }) {
  const container = document.createElement("div");
  container.className = "chipset";

  const tagLabel = document.createElement("span");
  tagLabel.style.fontSize = "12px";
  tagLabel.style.color = "var(--text-muted)";
  tagLabel.style.fontWeight = "700";
  tagLabel.style.textTransform = "uppercase";
  tagLabel.style.letterSpacing = "0.5px";
  tagLabel.style.marginRight = "8px";
  tagLabel.textContent = "Tags";

  const undoBtn = document.createElement("button");
  undoBtn.type = "button";
  undoBtn.className = "btn btn--ghost";
  undoBtn.style.fontSize = "11px";
  undoBtn.style.padding = "4px 10px";
  undoBtn.textContent = "Undo";
  undoBtn.addEventListener("click", (e) => {
    e.preventDefault();
    performTagUndo();
  });

  const headerRow = document.createElement("div");
  headerRow.style.display = "flex";
  headerRow.style.alignItems = "center";
  headerRow.style.gap = "8px";
  headerRow.style.marginBottom = "6px";
  headerRow.appendChild(tagLabel);
  headerRow.appendChild(undoBtn);
  container.appendChild(headerRow);

  for (const f of SHARED_MODEL_FIELDS) {
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.dataset.selected = selected.has(f.id) ? "true" : "false";
    chip.setAttribute("role", "button");
    chip.setAttribute("tabindex", "0");
    chip.setAttribute("aria-pressed", selected.has(f.id) ? "true" : "false");
    chip.innerHTML = `<span class="chip__mini" style="background:${chipColor(f.id)}"></span>${f.label}`;
    const toggle = () => {
      const nextSelected = chip.dataset.selected !== "true";
      chip.dataset.selected = nextSelected ? "true" : "false";
      chip.setAttribute("aria-pressed", nextSelected ? "true" : "false");
      onToggle(f.id, nextSelected);
      if (state.round && state.round.tagHistory) {
        state.round.tagHistory.push({
          sectionId,
          tagId: f.id,
          action: nextSelected ? "add" : "remove",
        });
      }
      audioManager.playChipToggle();
    };
    chip.addEventListener("click", toggle);
    chip.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle();
      }
    });
    container.appendChild(chip);
  }
  return container;
}

function performTagUndo() {
  if (!state.round || !state.round.tagHistory || state.round.tagHistory.length === 0) return;
  const last = state.round.tagHistory.pop();
  const tags = state.round.tagsBySection[last.sectionId];
  if (!tags) return;
  const tagSet = new Set(tags);
  if (last.action === "add") {
    tagSet.delete(last.tagId);
  } else {
    tagSet.add(last.tagId);
  }
  state.round.tagsBySection[last.sectionId] = Array.from(tagSet);
  renderModeForm();
  state.ui.update();
}

function selectMode(mode) {
  audioManager.playClick();
  state.round.mode = mode;
  renderModeForm();
  state.ui.update();
}

function submitRound() {
  if (!state.round?.mode) {
    openModal({
      title: "Pick a mode first",
      body: "Mode choice is part of the training. Choose A, B, or C.",
      buttons: [{ label: "OK", variant: "btn--primary", onClick: closeModal }],
    });
    return;
  }

  const scene = state.round.scene;
  const stakeholders = scene.stakeholders.map(stakeholderById).filter(Boolean);
  const requiredTags = Array.from(state.round.requiredTags);

  const diff = DIFFICULTY[state.difficulty] || DIFFICULTY.standard;
  const averageMeterValue = (state.meters.sharedModelStability + state.meters.visionIntegrity + state.meters.stakeholderConfidence + state.meters.systemHealth + (100 - state.meters.burnRate)) / 5;
  const adaptiveModifiers = state.difficulty !== "training" ? { pressureDirection: state.round.pressureDirection } : null;
  const { deltas, notes, triggers, tagCoverage, allTags } = computeRoundDeltas({
    mode: state.round.mode,
    timedOut: state.round.timedOut,
    textBySection: state.round.textBySection,
    tagsBySection: state.round.tagsBySection,
    stakeholders,
    modeACountTotal: state.tacticalCount,
    persistentMods: state.persistentMods,
    requiredTags,
    difficulty: state.difficulty,
    adaptiveModifiers,
  });

  if (state.difficulty !== "training") {
    adaptiveDifficulty.recordRound({
      averageMeterValue,
      tagCoverage,
      modeUsed: state.round.mode,
    });
  }

  const unmetReq = requiredTags.filter((t) => !new Set(allTags).has(t));
  const modeCValidation =
    state.round.mode === MODES.C
      ? validateModeCResponse({ textBySection: state.round.textBySection, tagsBySection: state.round.tagsBySection })
      : null;

  if (modeCValidation && !modeCValidation.ok && !state.round.timedOut) {
    const allProblemSections = [...new Set([...modeCValidation.missingText, ...modeCValidation.missingTags])];
    const violationSections = modeCValidation.violations.map((v) => {
      if (v.code === "purpose_anchor_requirements") return "purpose_anchor";
      if (v.code === "immediate_action_requirements") return "immediate_48h_action";
      if (v.code === "boundary_requirements") return "boundary_statement";
      if (v.code === "lifecycle_requirements") return "lifecycle_impact";
      if (v.code === "stakeholder_requirements") return "stakeholder_message";
      return null;
    }).filter(Boolean);
    const allSections = [...allProblemSections, ...violationSections];
    const firstProblemIdx = allSections.length
      ? MODE_C_SECTIONS.indexOf(allSections[0])
      : 0;
    if (firstProblemIdx >= 0) state.round.activeModeCSection = firstProblemIdx;
    state.round._modeCIncompleteSections = new Set(allSections);
    renderModeForm();
    state.ui.update();
    return;
  }

  state.previousMeters = { ...state.meters };
  state.meters = applyDeltas(state.meters, deltas);

  for (const [key, delta] of Object.entries(deltas)) {
    if (delta && Math.abs(delta) > 0) {
      showMeterNotification(key, delta);
    }
  }

  const meterLabels = {
    sharedModelStability: "Shared Model Stability",
    visionIntegrity: "Vision Integrity",
    stakeholderConfidence: "Stakeholder Confidence",
    systemHealth: "System Health",
    burnRate: "Burn Rate",
  };
  const meterMessages = [];
  for (const [key, delta] of Object.entries(deltas)) {
    if (delta && delta !== 0) {
      const prev = state.previousMeters[key];
      const curr = state.meters[key];
      const direction = delta > 0 ? "increased" : "decreased";
      meterMessages.push(`${meterLabels[key] || key} ${direction} from ${prev} to ${curr}`);
    }
  }
  if (meterMessages.length > 0) {
    const ariaMeterEl = $("#aria-meter-changes");
    if (ariaMeterEl) {
      ariaMeterEl.textContent = meterMessages.join(". ") + ".";
      setTimeout(() => { ariaMeterEl.textContent = ""; }, 3000);
    }
  }

  const netDelta = Object.values(deltas).reduce((sum, d) => sum + (d || 0), 0);
  if (netDelta > 0) audioManager.playMeterPositive();
  else if (netDelta < 0) audioManager.playMeterNegative();

  audioManager.playSubmit();
  if (state.round.mode === MODES.A) state.tacticalCount += 1;

  for (const tagId of allTags) {
    if (state.tagsUsedCounts[tagId] !== undefined) state.tagsUsedCounts[tagId] += 1;
  }

  if (state.round.mode === MODES.C) {
    const hasVision = (state.round.tagsBySection?.purpose_anchor || []).includes("vision");
    if (!hasVision) state.driftTimeline.push({ round: state.roundIndex + 1, when: "Purpose Anchor", note: "Vision dropped." });
  }

  if (state.difficulty !== "training") {
    const fp = state.decisionFingerprint;
    if (state.round.mode === MODES.A) fp.modeACount += 1;
    const allSectionTags = Object.values(state.round.tagsBySection || {}).flat().filter(Boolean);
    if (allSectionTags.includes("vision")) fp.visionTagUsed += 1;
    fp.totalRoundsPlayed += 1;
    if (state.round.mode === MODES.C && modeCValidation && modeCValidation.ok) fp.modeCSuccessCount += 1;
    fp.tagCoverageHistory.push(tagCoverage);
  }

  if (state.round.sceneModifiers?.modelMomentum) {
    const momentumDeltas = { sharedModelStability: 3, stakeholderConfidence: 2, visionIntegrity: 0, systemHealth: 0, burnRate: 0 };
    state.meters = applyDeltas(state.meters, momentumDeltas);
    showMomentumIndicator();
  }

  let consequence = null;
  for (const trig of triggers) {
    if (trig === "rework_cascade") {
      consequence = CONSEQUENCES.rework_cascade;
      state.persistentMods = { ...(state.persistentMods || {}), ...(consequence.persistent || {}) };
      state.lastConsequence = consequence;
      state.meters = applyDeltas(state.meters, consequence.effects);
    }
  }

  if (fp.modeACount === 5) {
    consequence = CONSEQUENCES.tactical_debt_accumulation;
    state.persistentMods = { ...(state.persistentMods || {}), ...(consequence.persistent || {}) };
    state.lastConsequence = consequence;
    state.meters = applyDeltas(state.meters, consequence.effects);
  }

  // Round summary snapshot
  state.lastRoundSummary = {
    round: state.roundIndex + 1,
    sceneTitle: scene.title,
    mode: state.round.mode,
    tagCoverage,
    requiredTags,
    unmetReq,
    deltas,
    notes,
    consequence: consequence ? consequence.id : null,
    metersAfter: { ...state.meters },
    modeCValidation,
    // Save user's text responses for debrief
    textBySection: { ...state.round.textBySection },
    tagsBySection: { ...state.round.tagsBySection },
  };

  // End conditions
  const failed =
    state.meters.sharedModelStability <= 0 || state.meters.systemHealth <= 0 || state.meters.burnRate >= 100;

  saveGameState(state);

  state.round = null;
  if (failed) {
    setScreen("end");
    return;
  }

  setScreen("debrief");
}

function findBestMatchingStakeholder(sectionId, tags) {
  if (!state.round?.scene) return null;
  const stakeholders = state.round.scene.stakeholders.map(stakeholderById).filter(Boolean);
  if (!stakeholders.length) return null;
  
  let bestMatch = null;
  let bestScore = -1;
  
  for (const st of stakeholders) {
    const rewards = st.rewards || {};
    let score = 0;
    for (const tag of tags) {
      if (rewards[tag]) {
        score += rewards[tag];
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = st;
    }
  }
  
  return bestMatch;
}

function generateTagFeedback(sectionId, tags, stakeholder) {
  const rewards = stakeholder.rewards || {};
  const dislikes = stakeholder.dislikes || {};
  
  const wellTagged = tags.filter(tag => (rewards[tag] || 0) >= 2);
  const neutralTags = tags.filter(tag => rewards[tag] && !wellTagged.includes(tag) && !dislikes[tag]);
  const dislikedTags = tags.filter(tag => dislikes[tag]);
  const missingHighValue = Object.entries(rewards)
    .filter(([tag, value]) => value >= 2 && !tags.includes(tag))
    .map(([tag]) => tag);
  
  let feedbackParts = [];
  
  if (wellTagged.length > 0) {
    feedbackParts.push(`<span style="color: var(--lime-success)">✓ Well tagged!</span> ${wellTagged.map(t => fieldById(t)?.label).join(", ")} aligns with ${stakeholder.name}'s priorities.`);
  }
  
  if (dislikedTags.length > 0) {
    feedbackParts.push(`<span style="color: var(--rose-danger)">⚠ Consider:</span> ${dislikedTags.map(t => fieldById(t)?.label).join(", ")} may not resonate with ${stakeholder.name}.`);
  }
  
  if (missingHighValue.length > 0 && tags.length < 4) {
    const suggestion = missingHighValue.slice(0, 1).map(tag => fieldById(tag)?.label).join(", ");
    if (suggestion) {
      feedbackParts.push(`<span style="color: var(--amber-primary)">💡 Consider adding:</span> ${suggestion} would strengthen this response for ${stakeholder.name}.`);
    }
  }
  
  if (feedbackParts.length === 0) {
    feedbackParts.push(`<span style="color: var(--text-secondary)">Tags are reasonable but could be stronger.</span>`);
  }
  
  return feedbackParts.join(" ");
}

function renderDebrief() {
  const s = state.lastRoundSummary;
  const wrap = document.createElement("div");
  wrap.className = "card";

  const title = document.createElement("h2");
  title.className = "card__title";
  title.textContent = "Debrief";
  wrap.appendChild(title);

  const desc = document.createElement("div");
  desc.className = "card__desc";
  desc.textContent = `${s.sceneTitle} • ${MODE_LABEL[s.mode]} • Tag coverage: ${s.tagCoverage}`;
  wrap.appendChild(desc);

  const divider = document.createElement("div");
  divider.className = "divider";
  wrap.appendChild(divider);

  if (s.textBySection && Object.keys(s.textBySection).length > 0) {
    const responsesSection = document.createElement("div");
    responsesSection.className = "debrief-responses";

    const responsesTitle = document.createElement("div");
    responsesTitle.className = "section-header";
    responsesTitle.textContent = "Your Responses";
    responsesSection.appendChild(responsesTitle);

    const MODE_C_FIELD_LABELS = {
      purpose_anchor: "Purpose Anchor",
      immediate_48h_action: "Immediate 48h Action",
      boundary_statement: "Boundary Statement",
      lifecycle_impact: "Lifecycle Impact",
      stakeholder_message: "Stakeholder Message",
      summary: "Summary",
    };

    for (const [sectionId, text] of Object.entries(s.textBySection)) {
      if (!text || !text.trim()) continue;

      const responseCard = document.createElement("div");
      responseCard.className = "debrief-response-card";

      const cardHeader = document.createElement("div");
      cardHeader.className = "debrief-response-card__header";
      cardHeader.textContent = MODE_C_FIELD_LABELS[sectionId] || sectionId;
      responseCard.appendChild(cardHeader);

      const responseText = document.createElement("div");
      responseText.className = "debrief-response-card__text";
      responseText.textContent = text;
      responseCard.appendChild(responseText);

      const tags = s.tagsBySection?.[sectionId] || [];
      if (tags.length > 0) {
        const tagsContainer = document.createElement("div");
        tagsContainer.className = "debrief-response-card__tags";

        const tagsLabel = document.createElement("span");
        tagsLabel.className = "debrief-response-card__tags-label";
        tagsLabel.textContent = "Tags: ";
        tagsContainer.appendChild(tagsLabel);

        tags.forEach(tagId => {
          const tagChip = document.createElement("span");
          tagChip.className = "debrief-tag-chip";
          tagChip.style.borderColor = chipColor(tagId);
          tagChip.textContent = fieldById(tagId)?.label || tagId;
          tagsContainer.appendChild(tagChip);
        });

        responseCard.appendChild(tagsContainer);

        const stakeholder = findBestMatchingStakeholder(sectionId, tags);
        if (stakeholder) {
          const feedback = generateTagFeedback(sectionId, tags, stakeholder);
          if (feedback) {
            const feedbackEl = document.createElement("div");
            feedbackEl.className = "debrief-response-card__feedback";
            feedbackEl.innerHTML = feedback;
            responseCard.appendChild(feedbackEl);
          }
        }
      }

      responsesSection.appendChild(responseCard);
    }

    wrap.appendChild(responsesSection);

    const divider1b = document.createElement("div");
    divider1b.className = "divider";
    wrap.appendChild(divider1b);
  }

  const meterDeltaSection = document.createElement("div");
  meterDeltaSection.className = "section-group";

  const meterDeltaHeader = document.createElement("div");
  meterDeltaHeader.className = "section-header";
  meterDeltaHeader.textContent = "Meter Changes";
  meterDeltaSection.appendChild(meterDeltaHeader);

  const METER_INFO = [
    { key: "sharedModelStability", label: "Stability" },
    { key: "visionIntegrity", label: "Vision" },
    { key: "stakeholderConfidence", label: "Confidence" },
    { key: "systemHealth", label: "Health" },
    { key: "burnRate", label: "Burn Rate" },
  ];

  for (const mi of METER_INFO) {
    const prev = state.previousMeters[mi.key] ?? 0;
    const curr = state.meters[mi.key] ?? 0;
    const delta = curr - prev;

    const bar = document.createElement("div");
    bar.className = "delta-bar";

    const barLabel = document.createElement("div");
    barLabel.className = "delta-bar__label";
    barLabel.textContent = mi.label;
    bar.appendChild(barLabel);

    const track = document.createElement("div");
    track.className = "delta-bar__track";

    const ghost = document.createElement("div");
    ghost.className = "delta-bar__ghost";
    ghost.style.width = clamp(prev, 0, 100) + "%";
    track.appendChild(ghost);

    const fill = document.createElement("div");
    fill.className = "delta-bar__fill";
    fill.style.width = clamp(curr, 0, 100) + "%";
    fill.style.background = gaugeZoneColor(curr);
    track.appendChild(fill);

    bar.appendChild(track);

    const val = document.createElement("div");
    val.className = "delta-bar__value";
    if (delta >= 0) {
      val.classList.add("delta-bar__value--positive");
      val.textContent = "+" + Math.round(delta);
    } else {
      val.classList.add("delta-bar__value--negative");
      val.textContent = Math.round(delta);
    }
    bar.appendChild(val);

    meterDeltaSection.appendChild(bar);
  }

  wrap.appendChild(meterDeltaSection);

  const dividerMeters = document.createElement("div");
  dividerMeters.className = "divider";
  wrap.appendChild(dividerMeters);

  const alignmentSection = document.createElement("div");
  alignmentSection.className = "section-group";

  const alignmentHeader = document.createElement("div");
  alignmentHeader.className = "section-header";
  alignmentHeader.textContent = "Stakeholder Alignment";
  alignmentSection.appendChild(alignmentHeader);

  const scene = SCENES[state.roundIndex];
  const stakeholders = scene ? scene.stakeholders.map(stakeholderById).filter(Boolean) : [];
  const allUsedTags = uniq(
    Object.values(s.tagsBySection || {})
      .flat()
      .filter(Boolean),
  );
  const DISC_COLORS = { D: "#ff3366", i: "#ffb700", S: "#00d4aa", C: "#6b8afd" };

  for (const st of stakeholders) {
    let rawScore = 0;
    const rewards = st.rewards || {};
    for (const [tag, w] of Object.entries(rewards)) {
      if (allUsedTags.includes(tag)) rawScore += w;
    }
    const dislikes = st.dislikes || {};
    for (const [tag, w] of Object.entries(dislikes)) {
      if (allUsedTags.includes(tag)) rawScore -= w;
    }
    const normScore = clamp(Math.round((rawScore + 6) / 16 * 100), 0, 100);
    let label;
    if (normScore <= 25) label = "Misaligned";
    else if (normScore <= 50) label = "Partial";
    else if (normScore <= 75) label = "Aligned";
    else label = "Strong";

    const scoreEl = document.createElement("div");
    scoreEl.className = "alignment-score";

    const avatar = document.createElement("div");
    avatar.className = "alignment-score__avatar";
    avatar.style.background = DISC_COLORS[st.disc] || "#6b8afd";
    avatar.textContent = st.name.charAt(0);
    scoreEl.appendChild(avatar);

    const info = document.createElement("div");
    info.className = "alignment-score__info";

    const nameEl = document.createElement("div");
    nameEl.className = "alignment-score__name";
    nameEl.textContent = st.name;
    info.appendChild(nameEl);

    const labelEl = document.createElement("div");
    labelEl.className = "alignment-score__label";
    labelEl.textContent = label;
    info.appendChild(labelEl);

    scoreEl.appendChild(info);

    const valueEl = document.createElement("div");
    valueEl.className = "alignment-score__value";
    valueEl.textContent = normScore;
    scoreEl.appendChild(valueEl);

    alignmentSection.appendChild(scoreEl);
  }

  wrap.appendChild(alignmentSection);

  const dividerAlign = document.createElement("div");
  dividerAlign.className = "divider";
  wrap.appendChild(dividerAlign);

  const radarSection = document.createElement("div");
  radarSection.className = "section-group";

  const radarHeader = document.createElement("div");
  radarHeader.className = "section-header";
  radarHeader.textContent = "Tag Coverage Radar";
  radarSection.appendChild(radarHeader);

  const radarCanvas = document.createElement("canvas");
  radarCanvas.id = "radar-chart-canvas";
  radarCanvas.width = 360;
  radarCanvas.height = 280;
  radarCanvas.style.width = "100%";
  radarCanvas.style.maxWidth = "360px";
  radarCanvas.style.height = "auto";
  radarSection.appendChild(radarCanvas);

  wrap.appendChild(radarSection);

  const dividerRadar = document.createElement("div");
  dividerRadar.className = "divider";
  wrap.appendChild(dividerRadar);

  let biggestDeltaKey = null;
  let biggestDeltaAbs = 0;
  for (const mi of METER_INFO) {
    const d = Math.abs((state.meters[mi.key] ?? 0) - (state.previousMeters[mi.key] ?? 0));
    if (d > biggestDeltaAbs) {
      biggestDeltaAbs = d;
      biggestDeltaKey = mi.key;
    }
  }

  if (biggestDeltaKey) {
    const insightEl = document.createElement("div");
    insightEl.className = "key-insight";

    const insightLabel = document.createElement("div");
    insightLabel.className = "key-insight__label";
    insightLabel.textContent = "Key Insight";
    insightEl.appendChild(insightLabel);

    const insightText = document.createElement("div");
    insightText.className = "key-insight__text";

    const delta = (state.meters[biggestDeltaKey] ?? 0) - (state.previousMeters[biggestDeltaKey] ?? 0);
    const meterInfo = METER_INFO.find(m => m.key === biggestDeltaKey);
    const meterName = meterInfo ? meterInfo.label : biggestDeltaKey;

    if (delta >= 0) {
      insightText.textContent = `Your ${MODE_LABEL[s.mode]} response strengthened ${meterName} by ${Math.round(delta)} points — the biggest gain this round.`;
    } else {
      insightText.textContent = `${meterName} dropped by ${Math.round(Math.abs(delta))} points. Consider more strategic responses next round.`;
    }

    insightEl.appendChild(insightText);
    wrap.appendChild(insightEl);

    const dividerInsight = document.createElement("div");
    dividerInsight.className = "divider";
    wrap.appendChild(dividerInsight);
  }

  const recSection = document.createElement("div");
  recSection.className = "section-group";

  const recHeader = document.createElement("div");
  recHeader.className = "section-header";
  recHeader.textContent = "Recommendations";
  recSection.appendChild(recHeader);

  const tagCov = s.tagCoverage;
  if (tagCov < 60) {
    const card = document.createElement("div");
    card.className = "recommendation-card recommendation-card--warning";
    card.textContent = "Your tag coverage is low. Try to anchor responses to at least 2-3 model fields per section.";
    recSection.appendChild(card);
  }

  for (const mi of METER_INFO) {
    if ((state.meters[mi.key] ?? 0) < 30) {
      const card = document.createElement("div");
      card.className = "recommendation-card recommendation-card--danger";
      card.textContent = `${mi.label} is critically low. Focus on decisions that protect this dimension.`;
      recSection.appendChild(card);
    }
  }

  if (s.mode === MODES.A) {
    const card = document.createElement("div");
    card.className = "recommendation-card recommendation-card--warning";
    card.textContent = "Tactical patches provide short-term relief but accumulate debt. Consider Mode B or C when possible.";
    recSection.appendChild(card);
  }

  if (s.unmetReq && s.unmetReq.length > 0) {
    const card = document.createElement("div");
    card.className = "recommendation-card recommendation-card--danger";
    card.textContent = "You missed interrupt requirements. Always address stakeholder-required tags first.";
    recSection.appendChild(card);
  }

  const nonBurnMetersAbove70 = METER_INFO.filter(mi => mi.key !== "burnRate").every(mi => (state.meters[mi.key] ?? 0) > 70);
  const burnRateLow = (state.meters.burnRate ?? 100) < 30;
  if (nonBurnMetersAbove70 && burnRateLow && tagCov > 70) {
    const card = document.createElement("div");
    card.className = "recommendation-card";
    card.textContent = "Excellent round! Your model discipline is paying off.";
    recSection.appendChild(card);
  }

  if (recSection.childNodes.length > 1) {
    wrap.appendChild(recSection);

    const dividerRec = document.createElement("div");
    dividerRec.className = "divider";
    wrap.appendChild(dividerRec);
  }

  const metrics = document.createElement("div");
  metrics.className = "grid";
  if (s.requiredTags.length) {
    metrics.appendChild(
      metricLine(
        "Interrupt requirements",
        s.unmetReq.length
          ? `Unmet: ${s.unmetReq.map((id) => fieldById(id)?.label || id).join(", ")}`
          : "All met.",
      ),
    );
  }
  if (s.consequence) {
    const c = CONSEQUENCES[s.consequence] || state.lastConsequence;
    if (c) metrics.appendChild(metricLine("Consequence", c.title));
  }
  if (metrics.childNodes.length > 0) {
    wrap.appendChild(metrics);
  }

  if (s.modeCValidation && !s.modeCValidation.ok) {
    const warn = document.createElement("div");
    warn.className = "card__desc";
    const items = [
      ...s.modeCValidation.missingText.map((x) => `Missing text: ${x}`),
      ...s.modeCValidation.missingTags.map((x) => `Missing tags: ${x}`),
      ...s.modeCValidation.violations.map((v) => v.message),
    ];
    warn.textContent = `Mode C was incomplete: ${items.slice(0, 4).join(" • ")}${items.length > 4 ? " • …" : ""}`;
    wrap.appendChild(document.createElement("div")).className = "divider";
    wrap.appendChild(warn);
  }

  const divider2 = document.createElement("div");
  divider2.className = "divider";
  wrap.appendChild(divider2);

  const actions = document.createElement("div");
  actions.className = "row";

  const openCanvas = document.createElement("button");
  openCanvas.type = "button";
  openCanvas.className = "btn btn--ghost";
  openCanvas.textContent = "Canvas";
  openCanvas.addEventListener("click", () => showSharedModelCanvasModal());
  actions.appendChild(openCanvas);

  const openGlossary = document.createElement("button");
  openGlossary.type = "button";
  openGlossary.className = "btn btn--ghost";
  openGlossary.textContent = "Glossary";
  openGlossary.addEventListener("click", () => showGlossaryModal());
  actions.appendChild(openGlossary);

  const next = document.createElement("button");
  next.type = "button";
  next.className = "btn btn--primary";
  next.textContent = state.roundIndex + 1 >= SCENES.length ? "Final Debrief" : "Next Round";
  next.addEventListener("click", () => {
    state.roundIndex += 1;
    if (state.roundIndex >= SCENES.length) setScreen("end");
    else setScreen("briefing");
  });
  actions.appendChild(next);

  wrap.appendChild(actions);
  screenRoot.appendChild(wrap);

  setTimeout(() => {
    const radarEl = document.getElementById("radar-chart-canvas");
    if (radarEl) drawRadarChart(radarEl);
  }, 0);

  state.ui.update = () => {};
}

function renderEnd() {
  const wrap = document.createElement("div");
  wrap.className = "card";

  const title = document.createElement("h2");
  title.className = "card__title";
  title.textContent = "Meta‑Debrief";
  wrap.appendChild(title);

  const desc = document.createElement("div");
  desc.className = "card__desc";
  desc.textContent =
    "Transfer happens here: compare what you said vs what the shared model required. Then refine the game design.";
  wrap.appendChild(desc);

  const divider = document.createElement("div");
  divider.className = "divider";
  wrap.appendChild(divider);

  const meters = document.createElement("div");
  meters.className = "card__desc";
  meters.textContent = `Final meters — Stability ${state.meters.sharedModelStability} • Vision ${state.meters.visionIntegrity} • Confidence ${state.meters.stakeholderConfidence} • Health ${state.meters.systemHealth} • Burn ${state.meters.burnRate}`;
  wrap.appendChild(meters);

  const divider2 = document.createElement("div");
  divider2.className = "divider";
  wrap.appendChild(divider2);

  const heatTitle = document.createElement("div");
  heatTitle.className = "card__desc";
  heatTitle.textContent = "Shared Model field usage heatmap (higher = better):";
  wrap.appendChild(heatTitle);

  const heat = document.createElement("div");
  heat.className = "chipset";
  const maxCount = Math.max(1, ...Object.values(state.tagsUsedCounts));
  for (const f of SHARED_MODEL_FIELDS) {
    const count = state.tagsUsedCounts[f.id] || 0;
    const intensity = count / maxCount;
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.dataset.selected = "true";
    chip.style.background = `rgba(29, 226, 198, ${0.08 + 0.26 * intensity})`;
    chip.style.outlineColor = `rgba(29, 226, 198, ${0.22 + 0.4 * intensity})`;
    chip.innerHTML = `<span class="chip__mini" style="background:${chipColor(f.id)}"></span>${f.label} <span style="opacity:.75">(${count})</span>`;
    heat.appendChild(chip);
  }
  wrap.appendChild(heat);

  if (state.driftTimeline.length) {
    const divider3 = document.createElement("div");
    divider3.className = "divider";
    wrap.appendChild(divider3);

    const drift = document.createElement("div");
    drift.className = "card__desc";
    drift.textContent = "Drift timeline:";
    wrap.appendChild(drift);

    const list = document.createElement("div");
    list.className = "grid";
    for (const d of state.driftTimeline.slice(0, 6)) {
      list.appendChild(metricLine(`Round ${d.round}`, `${d.when}: ${d.note}`));
    }
    wrap.appendChild(list);
  }

  const finalScore = calculateFinalScore(state.meters, state.difficulty, state.roundIndex, Object.values(state.tagsUsedCounts).reduce((a, b) => a + b, 0));
  saveHighScore(state.difficulty, finalScore, state.meters);

  const modeDistribution = { a: 0, b: 0, c: 0 };
  if (state.lastRoundSummary) {
    const m = state.lastRoundSummary.mode;
    if (m === "tactical_patch") modeDistribution.a = 1;
    else if (m === "strategic_pause") modeDistribution.b = 1;
    else if (m === "model_reframe") modeDistribution.c = 1;
  }
  saveSessionStats({
    tagCoverage: Object.values(state.tagsUsedCounts).reduce((a, b) => a + b, 0),
    rounds: state.roundIndex + 1,
    modeDistribution,
    tagsUsedCounts: state.tagsUsedCounts,
  });

  const sessionStats = loadSessionStats();

  const divider4 = document.createElement("div");
  divider4.className = "divider";
  wrap.appendChild(divider4);

  const scoreLine = document.createElement("div");
  scoreLine.className = "card__desc";
  scoreLine.innerHTML = "<strong>Final Score:</strong> " + finalScore + " pts";
  wrap.appendChild(scoreLine);

  if (sessionStats.gamesPlayed > 0) {
    const avgCoverage = sessionStats.totalRounds > 0
      ? (sessionStats.totalTagCoverage / sessionStats.totalRounds).toFixed(1)
      : "0";
    const modeEntries = Object.entries(sessionStats.modeDistribution || {});
    const preferredMode = modeEntries.sort((a, b) => b[1] - a[1])[0];
    const modeLabels = { a: "Tactical Patch", b: "Strategic Pause", c: "Model Reframe" };
    const tagEntries = Object.entries(sessionStats.tagsUsedCounts || {});
    const mostUsedTag = tagEntries.sort((a, b) => b[1] - a[1])[0];

    const statsDiv = document.createElement("div");
    statsDiv.className = "grid";
    statsDiv.appendChild(metricLine("Session Stats", ""));
    statsDiv.appendChild(metricLine("Games Played", String(sessionStats.gamesPlayed)));
    statsDiv.appendChild(metricLine("Avg Tag Coverage", avgCoverage));
    if (preferredMode && preferredMode[1] > 0) {
      statsDiv.appendChild(metricLine("Preferred Mode", modeLabels[preferredMode[0]] || preferredMode[0]));
    }
    if (mostUsedTag && mostUsedTag[1] > 0) {
      const field = fieldById(mostUsedTag[0]);
      statsDiv.appendChild(metricLine("Most-Used Field", (field?.label || mostUsedTag[0]) + " (" + mostUsedTag[1] + ")"));
    }
    wrap.appendChild(statsDiv);
  }

  const divider5 = document.createElement("div");
  divider5.className = "divider";
  wrap.appendChild(divider5);

  const actions = document.createElement("div");
  actions.className = "row";

  const restart = document.createElement("button");
  restart.type = "button";
  restart.className = "btn btn--primary";
  restart.textContent = "Play Again";
  restart.addEventListener("click", resetAll);
  actions.appendChild(restart);

  const openCanvas = document.createElement("button");
  openCanvas.type = "button";
  openCanvas.className = "btn btn--ghost";
  openCanvas.textContent = "Canvas";
  openCanvas.addEventListener("click", () => showSharedModelCanvasModal());
  actions.appendChild(openCanvas);

  const openGlossary = document.createElement("button");
  openGlossary.type = "button";
  openGlossary.className = "btn btn--ghost";
  openGlossary.textContent = "Glossary";
  openGlossary.addEventListener("click", () => showGlossaryModal());
  actions.appendChild(openGlossary);

  wrap.appendChild(actions);
  screenRoot.appendChild(wrap);
  state.ui.update = () => {};
}

// ---------- Training Mode Functions ----------
function startTrainingMode() {
  state.trainingMode = true;
  state.trainingStep = 0;
  state.difficulty = "training";
  saveTrainingStep(0);
  
  const scene = TRAINING_SCENE;
  state.roundIndex = -1;
  
  openModal({
    title: "Welcome to Training Mode",
    body: createTrainingIntroBody(),
    buttons: [
      { label: "Skip Training", variant: "btn--ghost", onClick: () => {
        state.trainingMode = false;
        state.difficulty = "standard";
        setScreen("title");
      }},
      { label: "Start Training", variant: "btn--primary", onClick: () => {
        beginTrainingStep(0);
      }}
    ]
  });
}

function createTrainingIntroBody() {
  const body = document.createElement("div");
  body.className = "grid";
  
  const intro = document.createElement("div");
  intro.textContent = "Training Mode will guide you through 5 steps to learn the game mechanics. No pressure, no negative consequences—just learning!";
  body.appendChild(intro);
  
  const steps = document.createElement("div");
  steps.className = "grid";
  steps.style.marginTop = "16px";
  
  TRAINING_STEPS.forEach((step, index) => {
    const stepItem = document.createElement("div");
    stepItem.className = "training-step-preview";
    stepItem.innerHTML = `<strong>Step ${index + 1}:</strong> ${step.title}`;
    steps.appendChild(stepItem);
  });
  
  body.appendChild(steps);
  return body;
}

function beginTrainingStep(stepIndex) {
  state.trainingStep = stepIndex;
  saveTrainingStep(stepIndex);
  
  const stepData = TRAINING_STEPS[stepIndex];
  
  setScreen("briefing");
  
  setTimeout(() => {
    showTrainingStepModal(stepData);
  }, 500);
}

function showTrainingStepModal(stepData) {
  renderTrainingProgressOverlay();
  
  const body = document.createElement("div");
  body.className = "grid";
  
  const title = document.createElement("div");
  title.className = "training-step-title";
  title.innerHTML = `<strong>Step ${stepData.step + 1} of 5:</strong> ${stepData.title}`;
  body.appendChild(title);
  
  const instruction = document.createElement("div");
  instruction.className = "card__desc";
  instruction.textContent = stepData.instruction;
  body.appendChild(instruction);
  
  if (stepData.action === "auto-open-canvas") {
    showSharedModelCanvasModal();
    setTimeout(() => {
      const highlightInfo = document.createElement("div");
      highlightInfo.className = "callout";
      highlightInfo.innerHTML = `<strong>Focus on:</strong> ${stepData.highlightFields.map(f => fieldById(f)?.label || f).join(", ")}`;
      body.appendChild(highlightInfo);
    }, 300);
  }
  
  if (stepData.action === "select-mode") {
    const modeInfo = document.createElement("div");
    modeInfo.className = "callout";
    modeInfo.innerHTML = `<strong>Recommendation:</strong> ${stepData.explanation}`;
    body.appendChild(modeInfo);
  }
  
  if (stepData.action === "tag-response") {
    const example = document.createElement("div");
    example.className = "card__desc";
    example.innerHTML = `<em>Example:</em> ${stepData.example}`;
    body.appendChild(example);
  }
  
  if (stepData.action === "handle-interrupt") {
    const interruptInfo = document.createElement("div");
    interruptInfo.className = "callout";
    interruptInfo.innerHTML = `<strong>Get ready:</strong> A stakeholder will interrupt shortly. Include the <strong>${fieldById(stepData.simulatedInterrupt.requiredTag)?.label}</strong> tag in your response.`;
    body.appendChild(interruptInfo);
  }
  
  if (stepData.action === "review-debrief") {
    const debriefPreview = document.createElement("div");
    debriefPreview.className = "grid";
    debriefPreview.innerHTML = `
      <div class="card__desc"><strong>Tag Coverage:</strong> ${stepData.mockDebrief.tagCoverage}</div>
      <div class="card__desc"><strong>Meter Changes:</strong> ${stepData.mockDebrief.meterChanges}</div>
      <div class="callout">${stepData.mockDebrief.feedback}</div>
    `;
    body.appendChild(debriefPreview);
  }
  
  const buttons = [];
  if (stepData.continueButton) {
    buttons.push({
      label: stepData.continueButton,
      variant: "btn--primary",
      onClick: () => {
        completeTrainingStep(stepData);
      }
    });
  }
  buttons.push({
    label: "Retry Step",
    variant: "btn--ghost",
    onClick: () => {
      closeModal();
      showTrainingStepModal(stepData);
    }
  });
  
  if (stepIndex > 0) {
    buttons.unshift({
      label: "Previous Step",
      variant: "btn--ghost",
      onClick: () => {
        closeModal();
        beginTrainingStep(stepIndex - 1);
      }
    });
  }
  
  openModal({
    title: "Training Mode",
    body,
    buttons
  });
  
  if (stepData.action === "auto-open-canvas") {
    const modal = modalRoot.querySelector(".modal");
    if (modal) {
      modal.style.zIndex = "1001";
    }
  }
}

function completeTrainingStep(stepData) {
  closeModal();
  
  const reward = stepData.reward;
  if (reward) {
    openModal({
      title: "✓ Step Complete!",
      body: createRewardBody(reward),
      buttons: [
        {
          label: stepData.step === 4 ? "Finish Training" : "Next Step",
          variant: "btn--primary",
          onClick: () => {
            closeModal();
            if (stepData.step === 4) {
              completeTraining();
            } else {
              beginTrainingStep(stepData.step + 1);
            }
          }
        }
      ]
    });
  }
}

function createRewardBody(reward) {
  const body = document.createElement("div");
  body.className = "grid";
  
  const message = document.createElement("div");
  message.className = "card__desc";
  message.textContent = reward.message;
  body.appendChild(message);
  
  if (reward.meters) {
    const metersInfo = document.createElement("div");
    metersInfo.className = "callout";
    metersInfo.innerHTML = "<strong>Reward:</strong> +5 to all meters (practice round)";
    body.appendChild(metersInfo);
  }
  
  if (reward.badge) {
    const badge = document.createElement("div");
    badge.className = "pill training-badge";
    badge.innerHTML = `<span class='pill__dot' style='background: var(--amber-primary)'></span>🏆 ${reward.badge}`;
    body.appendChild(badge);
  }
  
  return body;
}

function completeTraining() {
  state.trainingCompleted = true;
  markTrainingCompleted();
  state.trainingMode = false;
  state.difficulty = "standard";
  hideTrainingProgressOverlay();
  
  openModal({
    title: "🎉 Training Complete!",
    body: createTrainingCompletionBody(),
    buttons: [
      {
        label: "Start Real Game",
        variant: "btn--primary",
        onClick: () => {
          closeModal();
          setScreen("title");
        }
      }
    ]
  });
}

function createTrainingCompletionBody() {
  const body = document.createElement("div");
  body.className = "grid";
  
  const congrats = document.createElement("div");
  congrats.className = "card__desc";
  congrats.textContent = "Congratulations! You've completed the training and earned the 'Training Graduate' badge. You're now ready to face the real challenge!";
  body.appendChild(congrats);
  
  const badge = document.createElement("div");
  badge.className = "pill training-badge";
  badge.innerHTML = "<span class='pill__dot' style='background: var(--amber-primary)'></span>🏆 Training Graduate";
  body.appendChild(badge);
  
  const tips = document.createElement("div");
  tips.className = "callout";
  tips.innerHTML = "<strong>Pro tip:</strong> Remember, if it's not tagged, it doesn't count. Use the Shared Model Canvas as your anchor under pressure.";
  body.appendChild(tips);
  
  return body;
}

function renderTrainingProgressOverlay() {
  if (!state.trainingMode) return;
  
  let overlay = document.getElementById("training-progress-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "training-progress-overlay";
    overlay.className = "training-progress-container";
    document.body.appendChild(overlay);
  }
  
  const progress = ((state.trainingStep + 1) / 5) * 100;
  
  overlay.innerHTML = `
    <div class="training-progress-header">
      <div class="training-progress-title">Training Progress</div>
      <div class="training-progress-step">Step ${state.trainingStep + 1} of 5</div>
    </div>
    <div class="training-progress-bar">
      <div class="training-progress-fill" style="width: ${progress}%"></div>
    </div>
    <div class="training-steps-list">
      ${TRAINING_STEPS.map((step, index) => `
        <div class="training-step-item ${index < state.trainingStep ? "completed" : ""} ${index === state.trainingStep ? "active" : ""} ${index > state.trainingStep ? "pending" : ""}">
          <div class="training-step-indicator">${index < state.trainingStep ? "✓" : index + 1}</div>
          <div class="training-step-label">${step.title}</div>
        </div>
      `).join("")}
    </div>
  `;
}

function hideTrainingProgressOverlay() {
  const overlay = document.getElementById("training-progress-overlay");
  if (overlay) {
    overlay.remove();
  }
}

// ---------- Shared Model Canvas Modal ----------
function showSharedModelCanvasModal() {
  const body = document.createElement("div");
  body.className = "grid";

  const img = document.createElement("img");
  img.className = "hero-img";
  img.alt = "Shared Model template graphic";
  img.src = "./assets/cohort9_shared_model_template.svg";
  body.appendChild(img);

  const intro = document.createElement("div");
  intro.textContent =
    "This is the only authoritative source. If a response doesn’t reference a model element (via tags), it doesn’t count.";
  body.appendChild(intro);

  const cards = document.createElement("div");
  cards.className = "grid";
  for (const f of SHARED_MODEL_FIELDS) {
    const line = document.createElement("div");
    line.className = "card__desc";
    const value = SHARED_MODEL_CANVAS[f.id] || "(not set)";
    line.innerHTML = `<span style="font-weight:850;color:rgba(255,255,255,.92)">${f.label}:</span> ${escapeHtml(
      value,
    )}`;
    cards.appendChild(line);
  }
  body.appendChild(cards);

  openModal({
    title: "Shared Model Canvas (Reference)",
    body,
    buttons: [{ label: "Got it", variant: "btn--primary", onClick: closeModal }],
  });
}

function showGlossaryModal() {
  const body = document.createElement("div");
  body.className = "glossary-grid";

  const intro = document.createElement("div");
  intro.className = "card__desc";
  intro.textContent =
    "Field definitions with prompts and examples. Use this as a quick reference during gameplay.";
  body.appendChild(intro);

  for (const f of SHARED_MODEL_FIELDS) {
    const card = document.createElement("div");
    card.className = "glossary-card";
    card.style.borderColor = chipColor(f.id);
    
    const header = document.createElement("div");
    header.className = "glossary-card__header";
    header.style.background = `linear-gradient(135deg, ${chipColor(f.id)}22, transparent)`;
    
    const colorDot = document.createElement("span");
    colorDot.className = "glossary-card__dot";
    colorDot.style.background = chipColor(f.id);
    
    const fieldName = document.createElement("span");
    fieldName.className = "glossary-card__title";
    fieldName.textContent = f.label;
    
    header.appendChild(colorDot);
    header.appendChild(fieldName);
    card.appendChild(header);
    
    const prompt = document.createElement("div");
    prompt.className = "glossary-card__section";
    prompt.innerHTML = `<span class="glossary-card__label">Prompt:</span> ${escapeHtml(f.prompt)}`;
    card.appendChild(prompt);
    
    const example = document.createElement("div");
    example.className = "glossary-card__section";
    const exampleValue = SHARED_MODEL_CANVAS[f.id] || "(example not set)";
    example.innerHTML = `<span class="glossary-card__label">Example:</span> ${escapeHtml(exampleValue)}`;
    card.appendChild(example);
    
    body.appendChild(card);
  }

  openModal({
    title: "Shared Model Glossary",
    body,
    buttons: [{ label: "Got it", variant: "btn--primary", onClick: closeModal }],
  });
}

function showHelpModal() {
  const body = document.createElement("div");
  body.className = "grid";

  const top = document.createElement("div");
  top.innerHTML =
    "<strong>Quick start</strong><ol class='steps'>" +
    "<li><strong>Start</strong> a round.</li>" +
    "<li>Pick a mode (A/B/C).</li>" +
    "<li>Write + tag your response sections.</li>" +
    "<li>Meet any required tags from interrupts.</li>" +
    "<li>Submit and read the debrief.</li>" +
    "</ol>";
  body.appendChild(top);

  const controls = document.createElement("div");
  controls.className = "callout";
  controls.innerHTML =
    "<strong>Controls</strong><div class='card__desc' style='margin-top:6px'>" +
    "1/2/3 = Mode A/B/C • Enter = Submit • F/F11 = Fullscreen • Esc = Close popups • ? = Help<br/>" +
    "<strong>References:</strong> Alt+C = Canvas • Alt+G = Glossary" +
    "</div>";
  body.appendChild(controls);

  openModal({
    title: "Help",
    body,
    buttons: [{ label: "Close", variant: "btn--primary", onClick: closeModal }],
  });
}

// ---------- Interrupt Pop-up Component ----------
let interruptPopupElement = null;

function showInterruptPopup(injection, timerPaused) {
  hideInterruptPopup();
  
  const popup = document.createElement("div");
  popup.className = "interrupt-popup interrupt-popup--entering";
  popup.id = "interrupt-popup";
  
  const header = document.createElement("div");
  header.className = "interrupt-popup__header";
  
  const titleRow = document.createElement("div");
  titleRow.className = "interrupt-popup__title-row";
  
  const stakeholderName = document.createElement("span");
  stakeholderName.className = "interrupt-popup__name";
  stakeholderName.textContent = injection.fromStakeholder?.name || "Stakeholder";
  
  const stakeholderRole = document.createElement("span");
  stakeholderRole.className = "interrupt-popup__role";
  stakeholderRole.textContent = injection.fromStakeholder?.role || "";
  
  const discBadge = document.createElement("span");
  discBadge.className = "interrupt-popup__disc";
  discBadge.textContent = `DiSC ${injection.fromStakeholder?.disc || ""}`;
  
  titleRow.appendChild(stakeholderName);
  titleRow.appendChild(stakeholderRole);
  titleRow.appendChild(discBadge);
  
  const closeBtn = document.createElement("button");
  closeBtn.className = "interrupt-popup__close";
  closeBtn.innerHTML = "&times;";
  closeBtn.addEventListener("click", () => dismissInterruptPopup(timerPaused));
  
  header.appendChild(titleRow);
  header.appendChild(closeBtn);
  
  const content = document.createElement("div");
  content.className = "interrupt-popup__content";
  
  const message = document.createElement("div");
  message.className = "interrupt-popup__message";
  message.textContent = injection.line;
  content.appendChild(message);
  
  if (injection.fromStakeholder) {
    const aboutSection = document.createElement("div");
    aboutSection.className = "interrupt-popup__about";
    
    const aboutTitle = document.createElement("div");
    aboutTitle.className = "interrupt-popup__about-title";
    aboutTitle.innerHTML = `<strong>About ${injection.fromStakeholder.name}:</strong>`;
    aboutSection.appendChild(aboutTitle);
    
    const background = document.createElement("div");
    background.className = "interrupt-popup__background";
    background.textContent = injection.fromStakeholder.background;
    aboutSection.appendChild(background);
    
    const systemRole = document.createElement("div");
    systemRole.className = "interrupt-popup__system-role";
    systemRole.innerHTML = `<span class="interrupt-popup__label">System Role:</span> ${injection.fromStakeholder.systemRole}`;
    aboutSection.appendChild(systemRole);
    
    const motivationsPressures = document.createElement("div");
    motivationsPressures.className = "interrupt-popup__context";
    
    const motivations = document.createElement("div");
    motivations.className = "interrupt-popup__motivations";
    motivations.innerHTML = `<span class="interrupt-popup__label">Motivations:</span> ${injection.fromStakeholder.motivations.slice(0, 2).join(" • ")}`;
    motivationsPressures.appendChild(motivations);
    
    const pressures = document.createElement("div");
    pressures.className = "interrupt-popup__pressures";
    pressures.innerHTML = `<span class="interrupt-popup__label">Current Pressures:</span> ${injection.fromStakeholder.pressures.slice(0, 2).join(" • ")}`;
    motivationsPressures.appendChild(pressures);
    
    aboutSection.appendChild(motivationsPressures);
    content.appendChild(aboutSection);
  }
  
  if (injection.requiredTag) {
    const requiredSection = document.createElement("div");
    requiredSection.className = "interrupt-popup__required";
    requiredSection.style.fontSize = "15px";

    const requiredLabel = document.createElement("div");
    requiredLabel.className = "interrupt-popup__label";
    requiredLabel.innerHTML = "<strong>Required tag:</strong>";

    const requiredTag = document.createElement("div");
    requiredTag.className = "interrupt-popup__tag-highlight";
    requiredTag.textContent = fieldById(injection.requiredTag)?.label || injection.requiredTag;

    requiredSection.appendChild(requiredLabel);
    requiredSection.appendChild(requiredTag);
    content.appendChild(requiredSection);
  }
  
  const preselectedSection = document.createElement("div");
  preselectedSection.className = "interrupt-popup__preselected";
  
  const preselectedLabel = document.createElement("div");
  preselectedLabel.className = "interrupt-popup__label";
  preselectedLabel.innerHTML = "<strong>Recommended tags (pre-selected):</strong>";
  
  const preselectedChips = document.createElement("div");
  preselectedChips.className = "interrupt-popup__chips";
  
  injection.preselectedTags.forEach(tagId => {
    const chip = document.createElement("div");
    chip.className = "interrupt-popup__chip interrupt-popup__chip--selected";
    chip.dataset.tagId = tagId;
    chip.textContent = fieldById(tagId)?.label || tagId;
    chip.addEventListener("click", () => {
      chip.classList.toggle("interrupt-popup__chip--selected");
      injection.tagSelectionModified = true;
    });
    preselectedChips.appendChild(chip);
  });
  
  preselectedSection.appendChild(preselectedLabel);
  preselectedSection.appendChild(preselectedChips);
  content.appendChild(preselectedSection);
  
  const footer = document.createElement("div");
  footer.className = "interrupt-popup__footer";
  
  const hint = document.createElement("div");
  hint.className = "interrupt-popup__hint";
  hint.textContent = timerPaused ? "Timer paused • Press Enter to continue" : "Timer running • Press Enter to continue";
  footer.appendChild(hint);
  
  popup.appendChild(header);
  popup.appendChild(content);
  popup.appendChild(footer);
  
  document.body.appendChild(popup);
  interruptPopupElement = popup;
  
  setTimeout(() => {
    popup.classList.add("interrupt-popup--visible");
    popup.classList.remove("interrupt-popup--entering");
  }, 300);
  
  const handleEnterKey = (e) => {
    if (e.key === "Enter") {
      document.removeEventListener("keydown", handleEnterKey);
      dismissInterruptPopup(timerPaused);
    }
  };
  document.addEventListener("keydown", handleEnterKey);
}

function dismissInterruptPopup(timerPaused) {
  if (!interruptPopupElement) return;
  
  interruptPopupElement.classList.remove("interrupt-popup--visible");
  
  setTimeout(() => {
    hideInterruptPopup();
    if (state.round) {
      state.round.pausedForInjection = false;
      state.round.activeInjection = null;
    }
    closeModal();
  }, 300);
}

function hideInterruptPopup() {
  if (interruptPopupElement) {
    interruptPopupElement.remove();
    interruptPopupElement = null;
  }
}

// ---------- Loop / Timing ----------
let rafId = null;
let lastTs = null;
let lastTickTime = 0;
let lastUrgentTime = 0;
let lastAnnouncedMilestone = null;

function startLoop() {
  stopLoop();
  lastTs = null;
  const tick = (ts) => {
    if (lastTs == null) lastTs = ts;
    const dt = clamp(ts - lastTs, 0, 80);
    lastTs = ts;
    step(dt);
    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);
}

function stopLoop() {
  if (rafId != null) cancelAnimationFrame(rafId);
  rafId = null;
}

function step(dtMs) {
  for (const key of Object.keys(state.meters)) {
    state.displayMeters[key] = state.displayMeters[key] + (state.meters[key] - state.displayMeters[key]) * 0.05;
    if (Math.abs(state.displayMeters[key] - state.meters[key]) < 0.1) {
      state.displayMeters[key] = state.meters[key];
    }
  }

  if (state.screen === "round" && state.round) {
    const diff = DIFFICULTY[state.difficulty] || DIFFICULTY.standard;

    const shouldPauseForInjection = (diff.injectionPauses || state.round.adaptivePauses) && state.round.pausedForInjection;
    if (!shouldPauseForInjection) {
      state.round.secondsLeft = clamp(state.round.secondsLeft - dtMs / 1000, 0, state.round.secondsTotal);
    }

    maybeTriggerInjection();

    const secondsLeft = state.round.secondsLeft;
    const now = performance.now();
    if (secondsLeft < 15 && now - lastUrgentTime >= 500) {
      audioManager.playTimerUrgent();
      lastUrgentTime = now;
    } else if (secondsLeft >= 15 && secondsLeft < 30 && now - lastTickTime >= 1000) {
      audioManager.playTimerTick();
      lastTickTime = now;
    }

    const ariaTimerEl = $("#aria-timer-updates");
    const milestones = [
      { at: 60, msg: "One minute remaining" },
      { at: 30, msg: "Thirty seconds remaining" },
      { at: 15, msg: "Fifteen seconds remaining — urgency" },
      { at: 5, msg: "Five seconds remaining" },
    ];
    for (const m of milestones) {
      if (secondsLeft <= m.at && lastAnnouncedMilestone !== m.at) {
        lastAnnouncedMilestone = m.at;
        if (ariaTimerEl) {
          ariaTimerEl.textContent = m.msg;
          setTimeout(() => { ariaTimerEl.textContent = ""; }, 3000);
        }
        break;
      }
    }

    if (state.round.secondsLeft <= 0 && !state.round.timedOut) {
      state.round.timedOut = true;
      submitRound();
      return;
    }
  }

  state.ui.update?.();
  renderCanvas();
}

function maybeTriggerInjection() {
  const r = state.round;
  if (!r) return;
  const diff = DIFFICULTY[state.difficulty] || DIFFICULTY.standard;

  const secondsPassed = r.secondsTotal - r.secondsLeft;
  const injections = [...r.scene.injections];

  // Expert mode: add one extra injection late in the round (chaos mode).
  if (diff.extraInterrupts) {
    injections.push({
      at_s: Math.min(r.secondsTotal * 0.7, 65),
      window: 10,
      from: pick(r.scene.stakeholders, state.roundIndex + 2),
      line: "Chaos injection: unexpected stakeholder demand conflicts with previous commitments!",
      extra: true,
    });
    injections.sort((a, b) => a.at_s - b.at_s);
  }

  // Persistent mod: add one extra injection for rework cascade consequence.
  if (state.persistentMods?.injectionExtra && !diff.extraInterrupts) {
    injections.push({
      at_s: Math.min(r.secondsTotal - 12, 102),
      window: 10,
      from: pick(r.scene.stakeholders, state.roundIndex + 2),
      line: "Rework shock: an integration defect cascades across interfaces. Stakeholders are fragmenting.",
      extra: true,
    });
    injections.sort((a, b) => a.at_s - b.at_s);
  }

  if (r.injectionIndex >= r.injectionSchedule.length) return;
  const next = r.injectionSchedule[r.injectionIndex];
  if (secondsPassed + 1e-6 < next.randomizedTime) return;

  r.injectionIndex += 1;
  const st = stakeholderById(next.from);
  const recommendedTags = st?.recommendedTags || [];
  const preselectedTags = recommendedTags.slice(0, 3);
  
  r.activeInjection = {
    ...next,
    fromStakeholder: st,
    requiredTag: recommendedRequiredTagForStakeholder(st),
    preselectedTags: preselectedTags,
    tagSelectionModified: false,
  };

  if (r.activeInjection.requiredTag) r.requiredTags.add(r.activeInjection.requiredTag);

  r.pausedForInjection = diff.injectionPauses || r.adaptivePauses;

  showInterruptPopup(r.activeInjection, diff.injectionPauses || r.adaptivePauses);
  audioManager.playInterrupt(st?.disc);

  const ariaAlertEl = $("#aria-interrupt-alerts");
  if (ariaAlertEl && r.activeInjection) {
    const inj = r.activeInjection;
    const name = inj.fromStakeholder?.name || "Stakeholder";
    const role = inj.fromStakeholder?.role || "";
    const reqTag = inj.requiredTag ? fieldById(inj.requiredTag)?.label || inj.requiredTag : "";
    let msg = `${name}`;
    if (role) msg += `, ${role}`;
    msg += ", is interrupting.";
    if (reqTag) msg += ` Required tag: ${reqTag}.`;
    ariaAlertEl.textContent = msg;
    setTimeout(() => { ariaAlertEl.textContent = ""; }, 5000);
  }
}

function recommendedRequiredTagForStakeholder(stakeholder) {
  if (!stakeholder) return null;
  switch (stakeholder.disc) {
    case "D":
      return "responsible";
    case "i":
      return "vision";
    case "S":
      return "team_governance";
    case "C":
      return "kpis";
    default:
      return null;
  }
}

// ---------- Canvas render ----------
function renderCanvas() {
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "rgba(255, 176, 32, 0.085)");
  g.addColorStop(1, "rgba(29, 226, 198, 0.085)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "900 26px Fraunces";
  ctx.fillText("Shared Model Under Pressure", 28, 44);

  const meters = state.displayMeters;
  const previousMeters = state.previousMeters;
  const gaugeSpacing = Math.min(w / 6, 160);
  const gaugeCx = w / 2;
  const gaugeCy = 120;
  drawGaugeMeters(gaugeCx, gaugeCy, gaugeSpacing, meters, previousMeters);

  const midY = 240;
  drawStakeholderAvatars(w * 0.28, midY);
  drawCoherenceTower(w * 0.72, midY, meters.sharedModelStability);

  if (state.screen === "round" && state.round) {
    drawTimer(w * 0.72, midY + 120);
  }

  const statusBaseY = midY + 80;
  ctx.font = "650 13px Instrument Sans";
  ctx.fillStyle = "rgba(255,255,255,0.82)";
  const status =
    state.screen === "round" ? "LIVE" : state.screen === "debrief" ? "DEBRIEF" : state.screen === "end" ? "META" : "READY";
  ctx.fillText(`Status: ${status}`, 28, statusBaseY);

  const hint =
    state.screen === "round"
      ? "Pressure is scripted. The drift is real. Tag your thinking to the model."
      : "Start when ready. Use Fullscreen (F/F11) for presence.";
  stageHint.textContent = hint;

  if (state.screen === "round" && state.round) {
    const sceneLabel = state.round.scene.title;
    ctx.fillText(`Scene: ${sceneLabel}`, 28, statusBaseY + 24);

    const reqTags = Array.from(state.round.requiredTags);
    if (reqTags.length) {
      ctx.fillStyle = "rgba(255, 77, 109, 0.85)";
      ctx.fillText(
        `Required tags: ${reqTags.map((t) => fieldById(t)?.label || t).join(" • ")}`,
        28,
        statusBaseY + 48,
      );
    }
  }

  if (state.screen === "debrief" && state.lastRoundSummary) {
    ctx.fillStyle = "rgba(255,255,255,0.82)";
    ctx.fillText(`Last mode: ${MODE_LABEL[state.lastRoundSummary.mode]}`, 28, statusBaseY + 24);
    ctx.fillText(
      `Tag coverage: ${state.lastRoundSummary.tagCoverage} • Tactical patches so far: ${state.tacticalCount}`,
      28,
      statusBaseY + 48,
    );

    const radarCx = w * 0.5;
    const radarCy = midY + 160;
    const radarR = 70;
    const radarCategories = [
      { label: "Purpose", tags: ["vision", "rationale", "success_criteria"] },
      { label: "Strategy", tags: ["strategy", "scope", "kpis"] },
      { label: "Execution", tags: ["as_is_state", "logistical_constraints", "responsible", "accountable"] },
      { label: "Stakeholders", tags: ["internal_stakeholders", "external_stakeholders", "team_governance"] },
      { label: "Learning", tags: ["resources_knowledge", "tools_processes"] },
    ];
    const radarUsedTags = new Set(
      Object.values(state.lastRoundSummary.tagsBySection || {})
        .flat()
        .filter(Boolean),
    );
    const radarValues = radarCategories.map(cat => {
      const used = cat.tags.filter(t => radarUsedTags.has(t)).length;
      return used / cat.tags.length;
    });
    const rn = radarCategories.length;

    for (let ring = 1; ring <= 4; ring++) {
      const rr = radarR * (ring / 4);
      ctx.beginPath();
      for (let i = 0; i < rn; i++) {
        const angle = -Math.PI / 2 + (2 * Math.PI * i) / rn;
        const x = radarCx + Math.cos(angle) * rr;
        const y = radarCy + Math.sin(angle) * rr;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    for (let i = 0; i < rn; i++) {
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / rn;
      ctx.beginPath();
      ctx.moveTo(radarCx, radarCy);
      ctx.lineTo(radarCx + Math.cos(angle) * radarR, radarCy + Math.sin(angle) * radarR);
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.beginPath();
    for (let i = 0; i < rn; i++) {
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / rn;
      const r = radarR * radarValues[i];
      const x = radarCx + Math.cos(angle) * r;
      const y = radarCy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = "rgba(29, 226, 198, 0.15)";
    ctx.fill();
    ctx.strokeStyle = "rgba(29, 226, 198, 0.6)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = "600 9px Instrument Sans";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let i = 0; i < rn; i++) {
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / rn;
      const lx = radarCx + Math.cos(angle) * (radarR + 16);
      const ly = radarCy + Math.sin(angle) * (radarR + 16);
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fillText(radarCategories[i].label, lx, ly);
    }
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }

  drawRoundDots(w / 2, h - 30);
}

function drawRadarChart(canvasEl) {
  if (!canvasEl) return;
  const rctx = canvasEl.getContext("2d");
  const w = canvasEl.width;
  const h = canvasEl.height;
  rctx.clearRect(0, 0, w, h);

  const s = state.lastRoundSummary;
  if (!s) return;

  const allUsedTags = new Set(
    Object.values(s.tagsBySection || {})
      .flat()
      .filter(Boolean),
  );

  const categories = [
    { label: "Purpose Anchor", tags: ["vision", "rationale", "success_criteria"] },
    { label: "Strategic Core", tags: ["strategy", "scope", "kpis"] },
    { label: "Execution", tags: ["as_is_state", "logistical_constraints", "responsible", "accountable"] },
    { label: "Stakeholders", tags: ["internal_stakeholders", "external_stakeholders", "team_governance"] },
    { label: "Learning", tags: ["resources_knowledge", "tools_processes"] },
  ];

  const values = categories.map(cat => {
    const used = cat.tags.filter(t => allUsedTags.has(t)).length;
    return used / cat.tags.length;
  });

  const cx = w / 2;
  const cy = h / 2 + 10;
  const maxR = Math.min(w, h) / 2 - 40;
  const n = categories.length;

  for (let ring = 1; ring <= 4; ring++) {
    const r = maxR * (ring / 4);
    rctx.beginPath();
    for (let i = 0; i < n; i++) {
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) rctx.moveTo(x, y);
      else rctx.lineTo(x, y);
    }
    rctx.closePath();
    rctx.strokeStyle = "rgba(255,255,255,0.1)";
    rctx.lineWidth = 1;
    rctx.stroke();
  }

  for (let i = 0; i < n; i++) {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
    rctx.beginPath();
    rctx.moveTo(cx, cy);
    rctx.lineTo(cx + Math.cos(angle) * maxR, cy + Math.sin(angle) * maxR);
    rctx.strokeStyle = "rgba(255,255,255,0.12)";
    rctx.lineWidth = 1;
    rctx.stroke();
  }

  rctx.beginPath();
  for (let i = 0; i < n; i++) {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
    const r = maxR * values[i];
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) rctx.moveTo(x, y);
    else rctx.lineTo(x, y);
  }
  rctx.closePath();
  rctx.fillStyle = "rgba(29, 226, 198, 0.2)";
  rctx.fill();
  rctx.strokeStyle = "rgba(29, 226, 198, 0.8)";
  rctx.lineWidth = 2;
  rctx.stroke();

  for (let i = 0; i < n; i++) {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
    const r = maxR * values[i];
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    rctx.beginPath();
    rctx.arc(x, y, 3, 0, 2 * Math.PI);
    rctx.fillStyle = "#1de2c6";
    rctx.fill();
  }

  rctx.textAlign = "center";
  rctx.textBaseline = "middle";
  rctx.font = "600 10px Instrument Sans";
  for (let i = 0; i < n; i++) {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
    const labelR = maxR + 20;
    const lx = cx + Math.cos(angle) * labelR;
    const ly = cy + Math.sin(angle) * labelR;
    rctx.fillStyle = "rgba(255,255,255,0.7)";
    rctx.fillText(categories[i].label, lx, ly);
  }
}

function drawGaugeMeters(cx, cy, spacing, meters, previousMeters) {
  const items = [
    ["Stability", meters.sharedModelStability, previousMeters?.sharedModelStability],
    ["Vision", meters.visionIntegrity, previousMeters?.visionIntegrity],
    ["Confidence", meters.stakeholderConfidence, previousMeters?.stakeholderConfidence],
    ["Health", meters.systemHealth, previousMeters?.systemHealth],
    ["Burn Rate", meters.burnRate, previousMeters?.burnRate],
  ];

  const radius = 35;
  const lineWidth = 7;
  const startX = cx - ((items.length - 1) * spacing) / 2;

  for (let i = 0; i < items.length; i++) {
    const [label, val, prevVal] = items[i];
    const gx = startX + i * spacing;
    const gy = cy;
    const fraction = clamp(val, 0, 100) / 100;
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + 2 * Math.PI * fraction;

    ctx.beginPath();
    ctx.arc(gx, gy, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = lineWidth;
    ctx.stroke();

    const arcColor = gaugeZoneColor(val);
    ctx.beginPath();
    ctx.arc(gx, gy, radius, startAngle, endAngle);
    ctx.strokeStyle = arcColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.lineCap = "butt";

    if (prevVal !== undefined && Math.abs(prevVal - val) > 0.5) {
      const prevFraction = clamp(prevVal, 0, 100) / 100;
      const prevAngle = startAngle + 2 * Math.PI * prevFraction;
      ctx.beginPath();
      ctx.arc(gx, gy, radius, prevAngle - 0.03, prevAngle + 0.03);
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth = lineWidth + 2;
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = "900 20px Fraunces";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(Math.round(val), gx, gy);

    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "600 10px Instrument Sans";
    ctx.textBaseline = "top";
    ctx.fillText(label, gx, gy + radius + 10);
  }

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

function gaugeZoneColor(val) {
  if (val <= 25) return "#ff3366";
  if (val <= 50) return "#ff6b35";
  if (val <= 75) return "#ffb700";
  return "#00d4aa";
}

function drawCoherenceTower(cx, cy, stability) {
  const radius = 50;
  const lineWidth = 10;
  const fraction = clamp(stability, 0, 100) / 100;
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + 2 * Math.PI * fraction;

  ctx.save();
  ctx.textAlign = "center";

  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "900 14px Fraunces";
  ctx.fillText("Strategic Coherence", cx, cy - radius - 22);

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = lineWidth;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, radius, startAngle, endAngle);
  ctx.strokeStyle = gaugeZoneColor(stability);
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.lineCap = "butt";

  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = "900 24px Fraunces";
  ctx.textBaseline = "middle";
  ctx.fillText(Math.round(stability), cx, cy);

  const zoneLabels = [
    { angle: Math.PI * 0.75, label: "Critical", color: "#ff3366" },
    { angle: Math.PI * 0.25, label: "Low", color: "#ff6b35" },
    { angle: -Math.PI * 0.25, label: "Medium", color: "#ffb700" },
    { angle: -Math.PI * 0.75, label: "High", color: "#00d4aa" },
  ];

  ctx.font = "600 9px Instrument Sans";
  ctx.textBaseline = "middle";
  for (const z of zoneLabels) {
    const zx = cx + Math.cos(z.angle) * (radius + 18);
    const zy = cy + Math.sin(z.angle) * (radius + 18);
    ctx.fillStyle = z.color;
    ctx.globalAlpha = 0.7;
    ctx.fillText(z.label, zx, zy);
  }
  ctx.globalAlpha = 1;

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.restore();
}

function drawStakeholderAvatars(cx, cy) {
  const scene = state.round?.scene || SCENES[state.roundIndex];
  if (!scene) return;
  const stakeholders = scene.stakeholders.map(stakeholderById).filter(Boolean);
  if (!stakeholders.length) return;

  const discColors = { D: "#ff3366", i: "#ffb700", S: "#00d4aa", C: "#6b8afd" };
  const avatarR = 20;
  const spacing = 70;
  const startX = cx - ((stakeholders.length - 1) * spacing) / 2;

  ctx.textAlign = "center";

  for (let i = 0; i < stakeholders.length; i++) {
    const st = stakeholders[i];
    const ax = startX + i * spacing;
    const color = discColors[st.disc] || "#6b8afd";

    ctx.beginPath();
    ctx.arc(ax, cy, avatarR, 0, 2 * Math.PI);
    ctx.fillStyle = color + "33";
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = "800 16px Instrument Sans";
    ctx.textBaseline = "middle";
    ctx.fillText(st.name.charAt(0), ax, cy);

    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = "700 10px Instrument Sans";
    ctx.textBaseline = "top";
    ctx.fillText(st.name, ax, cy + avatarR + 6);

    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = "600 9px Instrument Sans";
    ctx.fillText(st.role, ax, cy + avatarR + 20);
  }

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

function drawTimer(cx, cy) {
  if (!state.round) return;
  const secondsLeft = state.round.secondsLeft;
  const text = formatTimer(secondsLeft);

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.font = "900 48px Fraunces";
  ctx.fillStyle = "rgba(255,255,255,0.95)";

  if (secondsLeft < 15) {
    if (!prefersReducedMotion()) {
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 200);
      ctx.shadowColor = "#ff3366";
      ctx.shadowBlur = 20 + pulse * 20;
    } else {
      ctx.shadowColor = "#ff3366";
      ctx.shadowBlur = 20;
    }
  } else if (secondsLeft < 30) {
    ctx.shadowColor = "#ffb700";
    ctx.shadowBlur = 15;
  }

  ctx.fillText(text, cx, cy);
  ctx.shadowBlur = 0;

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.restore();
}

function drawRoundDots(cx, cy) {
  const total = SCENES.length;
  const current = state.roundIndex;
  const dotR = 5;
  const spacing = 18;
  const startX = cx - ((total - 1) * spacing) / 2;

  for (let i = 0; i < total; i++) {
    const dx = startX + i * spacing;
    ctx.beginPath();
    ctx.arc(dx, cy, dotR, 0, 2 * Math.PI);

    if (i < current) {
      ctx.fillStyle = "rgba(0,212,170,0.8)";
    } else if (i === current) {
      ctx.fillStyle = "#ffb700";
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.15)";
    }
    ctx.fill();
  }
}

function showMeterNotification(meterName, delta) {
  if (prefersReducedMotion()) return;
  const container = $("#meter-notifications");
  if (!container) return;

  const el = document.createElement("div");
  el.className = `meter-notification meter-notification--${delta >= 0 ? "positive" : "negative"}`;
  el.textContent = `${delta >= 0 ? "+" : ""}${Math.round(delta)}`;

  const gaugePositions = {
    sharedModelStability: 0,
    visionIntegrity: 1,
    stakeholderConfidence: 2,
    systemHealth: 3,
    burnRate: 4,
  };
  const idx = gaugePositions[meterName];
  if (idx !== undefined) {
    const canvasRect = canvas.getBoundingClientRect();
    const spacing = Math.min(canvasRect.width / 6, 160);
    const gaugeX = canvasRect.width / 2 - ((4) * spacing) / 2 + idx * spacing;
    el.style.left = gaugeX + "px";
    el.style.top = "80px";
  }

  container.appendChild(el);
  setTimeout(() => el.remove(), 1500);
}

function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
}

// ---------- Helpers ----------
function pill(k, v, dotColor) {
  const el = document.createElement("div");
  el.className = "pill";
  el.innerHTML = `<span class="pill__dot" style="background:${dotColor}"></span><span style="opacity:.85">${escapeHtml(
    k,
  )}:</span> <span class="pill__value" style="opacity:.95">${escapeHtml(v)}</span>`;
  return el;
}

function metricLine(k, v) {
  const el = document.createElement("div");
  el.className = "card__desc";
  el.innerHTML = `<span style="font-weight:850;color:rgba(255,255,255,.92)">${escapeHtml(
    k,
  )}:</span> ${escapeHtml(v)}`;
  return el;
}

function modeButton(kbd, label, variant, onClick) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = `btn ${variant}`;
  b.innerHTML = `<span style="opacity:.85">[${escapeHtml(kbd)}]</span> ${escapeHtml(label)}`;
  b.addEventListener("click", onClick);
  return b;
}

function formatTimer(seconds) {
  const s = Math.ceil(seconds);
  const mm = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function chipColor(fieldId) {
  const palette = [
    "var(--amber)",
    "var(--teal)",
    "var(--tangerine)",
    "var(--lime)",
    "var(--rose)",
  ];
  const idx = SHARED_MODEL_FIELDS.findIndex((f) => f.id === fieldId);
  return palette[Math.max(0, idx) % palette.length];
}

// Keyboard shortcuts
document.addEventListener("keydown", (e) => {
  if (state.screen !== "round" || !state.round) return;

  if (e.key === "1") selectMode(MODES.A);
  if (e.key === "2") selectMode(MODES.B);
  if (e.key === "3") selectMode(MODES.C);
  if (e.key === "Enter") submitRound();
});

// ---------- Required globals for test harness ----------
function renderGameToText() {
  const payload = {
    note:
      "No world-coordinate gameplay; canvas is informational. Interactions happen via DOM buttons/fields.",
    screen: state.screen,
    difficulty: state.difficulty,
    smoke: SMOKE,
    roundIndex: state.roundIndex,
    meters: { ...state.meters },
    tacticalCount: state.tacticalCount,
    lastConsequence: state.lastConsequence ? state.lastConsequence.id : null,
    round:
      state.round && state.screen === "round"
        ? {
            sceneId: state.round.scene.id,
            secondsLeft: Number(state.round.secondsLeft.toFixed(3)),
            secondsTotal: state.round.secondsTotal,
            mode: state.round.mode,
            requiredTags: Array.from(state.round.requiredTags),
          }
        : null,
  };
  return JSON.stringify(payload);
}

window.render_game_to_text = renderGameToText;

window.advanceTime = (ms) => {
  const stepMs = 1000 / 60;
  const n = Math.max(1, Math.round(ms / stepMs));
  for (let i = 0; i < n; i++) step(stepMs);
  renderCanvas();
};

// Boot
resetAll();
startLoop();
