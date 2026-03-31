import { SHARED_MODEL_FIELDS, fieldById } from "./data/sharedModel.js";
import { SCENES } from "./data/scenes.js";
import { stakeholderById } from "./data/stakeholders.js";
import { CONSEQUENCES } from "./data/consequences.js";
import { MODES, MODE_LABEL, validateModeCResponse, computeRoundDeltas, applyDeltas } from "./lib/scoring.js";
import { clamp, nowIso, pick, uniq } from "./lib/utils.js";
import {
  TRAINING_STEPS,
  TRAINING_SCENE,
  isTrainingCompleted,
  markTrainingCompleted,
  resetTrainingCompletion,
  getTrainingStep,
  saveTrainingStep,
} from "./data/training.js";

const $ = (sel) => document.querySelector(sel);

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
    previousMeters: { ...DEFAULT_METERS },
    tacticalCount: 0,
    persistentMods: {},
    lastConsequence: null,
    lastRoundSummary: null,
    tagsUsedCounts: Object.fromEntries(SHARED_MODEL_FIELDS.map((f) => [f.id, 0])),
    driftTimeline: [],
    round: null,
    ui: { update: () => {} },
    // Training mode state
    trainingMode: false,
    trainingStep: 0,
    trainingCompleted: isTrainingCompleted(),
  };
}

function resetAll() {
  closeModal();
  state = makeFreshState();
  setScreen("title");
  stageHint.textContent = "Tip: Use the Shared Model tags. If it’s not tagged, it doesn’t count.";
}

btnReset.addEventListener("click", resetAll);

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
function setScreen(next) {
  state.screen = next;
  screenRoot.innerHTML = "";
  if (next === "title") renderTitle();
  else if (next === "briefing") renderBriefing();
  else if (next === "round") renderRound();
  else if (next === "debrief") renderDebrief();
  else if (next === "end") renderEnd();
  else renderTitle();
  renderCanvas();
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

function beginRound() {
  const diff = DIFFICULTY[state.difficulty] || DIFFICULTY.standard;
  const scene = SCENES[state.roundIndex];
  const stakeholders = scene.stakeholders.map(stakeholderById).filter(Boolean);

  const isTraining = state.difficulty === "training";
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
    timedOut: false,
  };
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
  const btnB = modeButton("2", MODE_LABEL[MODES.B], "btn--ghost", () => selectMode(MODES.B));
  const btnC = modeButton("3", MODE_LABEL[MODES.C], "btn--primary", () => selectMode(MODES.C));
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
  const container = document.createElement("div");
  container.className = "grid";

  container.appendChild(
    modeCSection({
      id: "purpose_anchor",
      title: "Purpose Anchor",
      helper: "Must tag: Vision + one of Rationale / Success Criteria / KPIs",
      placeholder: "Restate the long-term product intent without corporate wallpaper.",
    }),
  );

  container.appendChild(
    modeCSection({
      id: "immediate_48h_action",
      title: "Immediate 48h Action",
      helper: "Must tag: Strategy + Responsible or Accountable",
      placeholder: "What happens in the next 48 hours? Who owns it?",
    }),
  );

  container.appendChild(
    modeCSection({
      id: "boundary_statement",
      title: "Boundary Statement / Non‑negotiables",
      helper: "Must tag: Scope + Logistical Constraints",
      placeholder: "What will not be compromised? Where is the boundary under pressure?",
    }),
  );

  container.appendChild(
    modeCSection({
      id: "lifecycle_impact",
      title: "Lifecycle / Whole-of-life Impact",
      helper: "Must tag: KPIs and/or As-is State",
      placeholder: "What invisible system costs or consequences might emerge later?",
    }),
  );

  container.appendChild(
    modeCSection({
      id: "stakeholder_message",
      title: "Stakeholder Message",
      helper: "Must tag: Internal/External Stakeholder Context + Team Governance",
      placeholder: "What message aligns stakeholders without hiding reality?",
    }),
  );

  return container;
}

function modeCSection({ id, title, helper, placeholder }) {
  const sec = document.createElement("div");
  sec.className = "grid";

  const label = document.createElement("label");
  label.textContent = `${title} — ${helper}`;
  sec.appendChild(label);

  const ta = document.createElement("textarea");
  ta.placeholder = placeholder;
  ta.value = state.round.textBySection[id] || "";
  ta.addEventListener("input", () => {
    state.round.textBySection[id] = ta.value;
  });
  sec.appendChild(ta);

  const chips = createChipset({
    selected: new Set(state.round.tagsBySection[id] || []),
    onToggle: (tagId, isSelected) => {
      const next = new Set(state.round.tagsBySection[id] || []);
      if (isSelected) next.add(tagId);
      else next.delete(tagId);
      state.round.tagsBySection[id] = Array.from(next);
    },
  });
  sec.appendChild(chips);

  return sec;
}

function createChipset({ selected, onToggle }) {
  const container = document.createElement("div");
  container.className = "chipset";
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

function selectMode(mode) {
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
  });

  const unmetReq = requiredTags.filter((t) => !new Set(allTags).has(t));
  const modeCValidation =
    state.round.mode === MODES.C
      ? validateModeCResponse({ textBySection: state.round.textBySection, tagsBySection: state.round.tagsBySection })
      : null;

  state.previousMeters = { ...state.meters };
  state.meters = applyDeltas(state.meters, deltas);
  if (state.round.mode === MODES.A) state.tacticalCount += 1;

  for (const tagId of allTags) {
    if (state.tagsUsedCounts[tagId] !== undefined) state.tagsUsedCounts[tagId] += 1;
  }

  if (state.round.mode === MODES.C) {
    const hasVision = (state.round.tagsBySection?.purpose_anchor || []).includes("vision");
    if (!hasVision) state.driftTimeline.push({ round: state.roundIndex + 1, when: "Purpose Anchor", note: "Vision dropped." });
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

  // User Responses Section
  if (s.textBySection && Object.keys(s.textBySection).length > 0) {
    const responsesSection = document.createElement("div");
    responsesSection.className = "debrief-responses";
    
    const responsesTitle = document.createElement("div");
    responsesTitle.className = "card__title";
    responsesTitle.style.fontSize = "16px";
    responsesTitle.style.marginBottom = "12px";
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
        
        // Tag feedback
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

  const metrics = document.createElement("div");
  metrics.className = "grid";
  metrics.appendChild(
    metricLine(
      "Meters",
      `Stability ${s.metersAfter.sharedModelStability} • Vision ${s.metersAfter.visionIntegrity} • Confidence ${s.metersAfter.stakeholderConfidence} • Health ${s.metersAfter.systemHealth} • Burn ${s.metersAfter.burnRate}`,
    ),
  );
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
  wrap.appendChild(metrics);

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

  const divider4 = document.createElement("div");
  divider4.className = "divider";
  wrap.appendChild(divider4);

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
  popup.className = "interrupt-popup";
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
  }, 10);
  
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
  if (state.screen === "round" && state.round) {
    const diff = DIFFICULTY[state.difficulty] || DIFFICULTY.standard;

    const shouldPauseForInjection = diff.injectionPauses && state.round.pausedForInjection;
    if (!shouldPauseForInjection) {
      state.round.secondsLeft = clamp(state.round.secondsLeft - dtMs / 1000, 0, state.round.secondsTotal);
    }

    maybeTriggerInjection();

    if (state.round.secondsLeft <= 0 && !state.round.timedOut) {
      state.round.timedOut = true;
      // Auto-submit on timeout.
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

  r.pausedForInjection = diff.injectionPauses;

  showInterruptPopup(r.activeInjection, diff.injectionPauses);
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

  // Background frame
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "rgba(255, 176, 32, 0.085)");
  g.addColorStop(1, "rgba(29, 226, 198, 0.085)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Header
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "900 26px Fraunces";
  ctx.fillText("Shared Model Under Pressure", 28, 44);

  // Meters
  const meters = state.meters;
  const previousMeters = state.previousMeters;
  const meterY = 76;
  const meterX = 28;
  const meterW = w - 56;
  drawMeterRow(meterX, meterY, meterW, meters, previousMeters);
  const metersHeight = 5 * 14 + 4 * 12;
  
  ctx.font = "600 10px Instrument Sans";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillText("Light markers show previous round values", meterX, meterY + metersHeight + 18);
  
  const statusBaseY = meterY + metersHeight + 30;

  // Vision Jenga / Coherence Tower
  drawCoherenceTower(w - 260, 260, 220, 60, meters.sharedModelStability);

  // Status strip (avoid overlapping the bars)
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
    ctx.fillText(`Time: ${formatTimer(state.round.secondsLeft)} remaining`, 28, statusBaseY + 46);

    const reqTags = Array.from(state.round.requiredTags);
    if (reqTags.length) {
      ctx.fillStyle = "rgba(255, 77, 109, 0.85)";
      ctx.fillText(
        `Required tags: ${reqTags.map((t) => fieldById(t)?.label || t).join(" • ")}`,
        28,
        statusBaseY + 70,
      );
    }
  }

  if (state.screen === "debrief" && state.lastRoundSummary) {
    ctx.fillStyle = "rgba(255,255,255,0.82)";
    ctx.fillText(`Last mode: ${MODE_LABEL[state.lastRoundSummary.mode]}`, 28, statusBaseY + 24);
    ctx.fillText(
      `Tag coverage: ${state.lastRoundSummary.tagCoverage} • Tactical patches so far: ${state.tacticalCount}`,
      28,
      statusBaseY + 46,
    );
  }
}

function drawMeterRow(x, y, w, meters, previousMeters) {
  const items = [
    ["Shared Model Stability", meters.sharedModelStability, "rgba(29, 226, 198, 0.95)", previousMeters?.sharedModelStability],
    ["Vision Integrity", meters.visionIntegrity, "rgba(255, 176, 32, 0.98)", previousMeters?.visionIntegrity],
    ["Stakeholder Confidence", meters.stakeholderConfidence, "rgba(255, 107, 53, 0.95)", previousMeters?.stakeholderConfidence],
    ["System Health", meters.systemHealth, "rgba(198, 255, 58, 0.9)", previousMeters?.systemHealth],
    ["Burn Rate", meters.burnRate, "rgba(255, 77, 109, 0.9)", previousMeters?.burnRate],
  ];

  const rowH = 14;
  const gap = 12;
  let cy = y;

  ctx.font = "700 12px Instrument Sans";
  for (const [label, val, color, prevVal] of items) {
    const barH = rowH;
    const barW = w;
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    roundRect(ctx, x, cy, barW, barH, 9);
    ctx.fill();

    ctx.fillStyle = color;
    roundRect(ctx, x, cy, (barW * clamp(val, 0, 100)) / 100, barH, 9);
    ctx.fill();

    if (prevVal !== undefined && prevVal !== val) {
      const prevX = (barW * clamp(prevVal, 0, 100)) / 100;
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.fillRect(x + prevX - 2, cy, 4, barH);
      
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.fillRect(x + prevX - 1, cy, 2, barH);
    }

    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.fillText(`${label} — ${val}`, x + 10, cy + 11);

    cy += barH + gap;
  }
}

function drawCoherenceTower(x, y, w, h, stability) {
  const barWidth = w;
  const barHeight = 24;
  const segments = 10;
  const segmentWidth = (barWidth - (segments + 1) * 3) / segments;
  const filledSegments = Math.max(0, Math.round((segments * stability) / 100));
  
  ctx.save();
  ctx.translate(x, y);
  
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = "900 16px Fraunces";
  ctx.textAlign = "center";
  ctx.fillText("Strategic Coherence", barWidth / 2, -20);
  
  ctx.font = "700 12px Instrument Sans";
  ctx.fillStyle = `rgba(255, 255, 255, ${0.7 + (stability / 100) * 0.3})`;
  ctx.fillText(`${Math.round(stability)}/100`, barWidth / 2, -4);
  
  const bgGradient = ctx.createLinearGradient(0, 0, barWidth, 0);
  bgGradient.addColorStop(0, "rgba(255, 77, 109, 0.15)");
  bgGradient.addColorStop(0.25, "rgba(255, 107, 53, 0.15)");
  bgGradient.addColorStop(0.5, "rgba(255, 183, 0, 0.15)");
  bgGradient.addColorStop(1, "rgba(29, 226, 198, 0.15)");
  
  ctx.fillStyle = bgGradient;
  roundRect(ctx, 0, 0, barWidth, barHeight, 6);
  ctx.fill();
  
  ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
  ctx.lineWidth = 2;
  roundRect(ctx, 0, 0, barWidth, barHeight, 6);
  ctx.stroke();
  
  for (let i = 0; i < segments; i++) {
    const segmentX = 3 + i * (segmentWidth + 3);
    let segmentColor;
    
    if (i < 2) {
      segmentColor = "rgba(255, 77, 109, 0.3)";
    } else if (i < 5) {
      segmentColor = "rgba(255, 107, 53, 0.3)";
    } else if (i < 7) {
      segmentColor = "rgba(255, 183, 0, 0.3)";
    } else {
      segmentColor = "rgba(29, 226, 198, 0.3)";
    }
    
    ctx.fillStyle = segmentColor;
    roundRect(ctx, segmentX, 0, segmentWidth, barHeight, 4);
    ctx.fill();
    
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1;
    roundRect(ctx, segmentX, 0, segmentWidth, barHeight, 4);
    ctx.stroke();
  }
  
  if (filledSegments > 0) {
    for (let i = 0; i < filledSegments; i++) {
      const segmentX = 3 + i * (segmentWidth + 3);
      let fillColor;
      let glowColor;
      
      if (i < 2) {
        fillColor = "rgba(255, 77, 109, 0.85)";
        glowColor = "rgba(255, 77, 109, 0.6)";
      } else if (i < 5) {
        fillColor = "rgba(255, 107, 53, 0.85)";
        glowColor = "rgba(255, 107, 53, 0.6)";
      } else if (i < 7) {
        fillColor = "rgba(255, 183, 0, 0.85)";
        glowColor = "rgba(255, 183, 0, 0.6)";
      } else {
        fillColor = "rgba(29, 226, 198, 0.85)";
        glowColor = "rgba(29, 226, 198, 0.6)";
      }
      
      ctx.fillStyle = fillColor;
      roundRect(ctx, segmentX, 0, segmentWidth, barHeight, 4);
      ctx.fill();
      
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 8;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
      ctx.lineWidth = 1.5;
      roundRect(ctx, segmentX, 0, segmentWidth, barHeight, 4);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }
  
  const zoneLabels = [
    { at: 0, label: "Critical", color: "rgba(255, 77, 109, 0.7)" },
    { at: 25, label: "Low", color: "rgba(255, 107, 53, 0.7)" },
    { at: 50, label: "Medium", color: "rgba(255, 183, 0, 0.7)" },
    { at: 75, label: "High", color: "rgba(29, 226, 198, 0.7)" },
  ];
  
  ctx.font = "600 10px Instrument Sans";
  ctx.textAlign = "left";
  zoneLabels.forEach((zone) => {
    const zoneX = (zone.at / 100) * barWidth;
    ctx.fillStyle = zone.color;
    ctx.fillText(zone.label, zoneX, barHeight + 14);
  });
  
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.font = "600 11px Instrument Sans";
  ctx.textAlign = "center";
  ctx.fillText("Health", barWidth / 2, barHeight + 28);
  
  ctx.restore();
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
